// src/views/ImportarCartaBalance.jsx
// Importador de Carta Balance POR CONTEOS. En lugar de re-capturar 475 celdas,
// se ingresan los conteos por código y trabajador (el bloque "ORDEN DE DATOS"
// que ya traen los formatos GP-GCR-FOR). Genera el array de observaciones que
// consume el motor de análisis y guarda en Cartas_Balance.

import React, { useState, useMemo, useCallback } from 'react';
import { collection, addDoc, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE, CB_COL, CARGOS, CARGOS_CORTO, inp } from '../utils/styles';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import VistaHeader from '../components/VistaHeader';
import ConfirmModal from '../components/ConfirmModal';

// Catálogos de códigos POR TIPO de actividad. Cada formato GP-GCR-FOR usa su
// propia leyenda de códigos (acero ≠ encofrado: p.ej. AP=Aplomado en acero pero
// AP=Apuntalamiento en encofrado). El importador cambia de catálogo según el tipo.
const CATALOGOS = {
  ACERO: {
    TP: [
      { cod: 'ACE', desc: 'Armado de acero' },
      { cod: 'AMA', desc: 'Amarrando acero' },
    ],
    TC: [
      { cod: 'AM', desc: 'Acarreo de materiales' },
      { cod: 'AV', desc: 'Alineado vertical (aplomado)' },
      { cod: 'AP', desc: 'Alineado vertical / Aplomado' },
      { cod: 'NA', desc: 'Nivelando acero' },
      { cod: 'SA', desc: 'Subiendo acero' },
      { cod: 'MD', desc: 'Midiendo distancias' },
      { cod: 'COO', desc: 'Coordinación' },
      { cod: 'CI', desc: 'Colocación de instrumentos' },
      { cod: 'AA', desc: 'Armado de andamio' },
      { cod: 'CA', desc: 'Cortando acero' },
    ],
    TNC: [
      { cod: 'VI', desc: 'Viaje' },
      { cod: 'TR', desc: 'Trabajo rehecho' },
      { cod: 'BA', desc: 'Baño' },
      { cod: 'ES', desc: 'Tiempo de espera' },
      { cod: 'DE', desc: 'Descanso' },
      { cod: 'CO', desc: 'Conversación' },
    ],
  },
  ENCOFRADO: {
    TP: [
      { cod: 'CE', desc: 'Colocación de encofrado' },
    ],
    TC: [
      { cod: 'AM', desc: 'Acarreo de materiales' },
      { cod: 'AV', desc: 'Alineamiento y verticalidad' },
      { cod: 'AP', desc: 'Apuntalamiento' },
      { cod: 'CD', desc: 'Colocación de desmoldante' },
      { cod: 'PT', desc: 'Perfilar el terreno' },
      { cod: 'CM', desc: 'Cortar madera' },
      { cod: 'PM', desc: 'Plataforma de madera' },
      { cod: 'CC', desc: 'Colocación de cachimba' },
      { cod: 'UT', desc: 'Uso de tizalínea' },
      { cod: 'COO', desc: 'Coordinación' },
    ],
    TNC: [
      { cod: 'VI', desc: 'Viaje' },
      { cod: 'TR', desc: 'Trabajo rehecho' },
      { cod: 'BA', desc: 'Baño' },
      { cod: 'ES', desc: 'Tiempo de espera' },
      { cod: 'D', desc: 'Descanso' },
      { cod: 'CO', desc: 'Conversación' },
    ],
  },
  EXCAVACION: {
    TP: [
      { cod: 'EX', desc: 'Excavación' },
      { cod: 'EXP', desc: 'Excavación con pala' },
      { cod: 'EXM', desc: 'Excavación con rotomartillo' },
    ],
    TC: [
      { cod: 'AM', desc: 'Acarreo de materiales' },
      { cod: 'SP', desc: 'Selección de piedras' },
      { cod: 'ME', desc: 'Medición de la calzadura' },
      { cod: 'UT', desc: 'Uso de la tizalínea' },
      { cod: 'COO', desc: 'Coordinación' },
    ],
    TNC: [
      { cod: 'VI', desc: 'Viaje' },
      { cod: 'TR', desc: 'Trabajo rehecho' },
      { cod: 'BA', desc: 'Baño' },
      { cod: 'ES', desc: 'Tiempo de espera' },
      { cod: 'D', desc: 'Descanso' },
      { cod: 'CO', desc: 'Conversación' },
    ],
  },
  VACIADO: {
    TP: [
      { cod: 'VC', desc: 'Vaciado de concreto' },
      { cod: 'CC', desc: 'Colocación de piedras' },
    ],
    TC: [
      { cod: 'AM', desc: 'Acarreo de materiales' },
      { cod: 'ST', desc: 'Sostener tubería' },
      { cod: 'CP', desc: 'Sostener tubería (chute)' },
      { cod: 'PC', desc: 'Preparar chute' },
      { cod: 'VB', desc: 'Vibrado de concreto' },
      { cod: 'CA', desc: 'Cachipa' },
      { cod: 'COO', desc: 'Coordinación' },
    ],
    TNC: [
      { cod: 'VI', desc: 'Viaje' },
      { cod: 'TR', desc: 'Trabajo rehecho' },
      { cod: 'BA', desc: 'Baño' },
      { cod: 'ES', desc: 'Tiempo de espera' },
      { cod: 'D', desc: 'Descanso' },
      { cod: 'CO', desc: 'Conversación' },
    ],
  },
};
const TIPOS = [
  { id: 'ACERO', label: '🔩 Acero' },
  { id: 'ENCOFRADO', label: '🪵 Encofrado de madera' },
  { id: 'EXCAVACION', label: '⛏️ Excavación localizada' },
  { id: 'VACIADO', label: '🏗️ Vaciado de concreto' },
];
// Construye los mapas DESC (cod→descripción) y CAT_DE (cod→TP/TC/TNC) de un catálogo.
const mapasDe = (cat) => {
  const desc = {}, catDe = {};
  Object.entries(cat).forEach(([k, arr]) => arr.forEach((c) => { desc[c.cod] = c.desc; catDe[c.cod] = k; }));
  return { desc, catDe };
};

// Plantillas precargadas (cartas reales ya digitadas) — se cargan con el selector.
const PLANTILLAS = [
  {
    key: 'd08', label: 'CREDITEX · 08-ene · Colocación de Acero (5)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-08', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'CALLE LOS HORNOS 185 URB. VULCANO, ATE', horaInicio: '11:30', horaFin: '12:30',
      trabajadores: [
        { letra: 'A', nombre: 'LIDER LOPEZ VILLANUEVA', cargo: 'Operario' },
        { letra: 'B', nombre: 'SERGIO OLIVERIO PIMPINCO CRUZADO', cargo: 'Operario' },
        { letra: 'C', nombre: 'OSWALDO VALDEZ GAMBOA', cargo: 'Operario' },
        { letra: 'D', nombre: 'SANTIAGO ALFONSO RUIZ RIOS', cargo: 'Operario' },
        { letra: 'E', nombre: 'RICHARD ARENA RODRIGUEZ', cargo: 'Ayudante' },
      ],
      conteos: {
        A: { ACE: 27, AMA: 16, AM: 11, NA: 21, SA: 13, COO: 4, ES: 2, CO: 4 },
        B: { ACE: 41, AMA: 16, AM: 3, NA: 6, SA: 13, MD: 4, COO: 3, BA: 2, ES: 9, DE: 3 },
        C: { ACE: 36, AMA: 14, AM: 27, NA: 15, SA: 18, COO: 4, AA: 2, ES: 11 },
        D: { ACE: 27, AMA: 12, AM: 3, NA: 8, SA: 29, CI: 5, AA: 4, ES: 1, CO: 4 },
        E: { ACE: 7, AM: 28, NA: 8, SA: 3, COO: 2, ES: 8, DE: 1 },
      },
    },
  },
  {
    key: 'd12', label: 'CREDITEX · 12-ene · Colocación de Acero (7)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-12', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '09:30', horaFin: '12:00',
      conclusiones: 'TP 50% (armado y amarrado de acero). El TNC fue casi todo ESPERA (90.7%) por falta de sincronización entre quien sube el acero y quien lo arma. Recomendación: un grupo sube el acero de forma continua y otro lo arma de inmediato; poner a los trabajadores más rápidos en la parte inferior para marcar el ritmo.',
      trabajadores: [
        { letra: 'A', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'B', nombre: 'PIMPINCO CRUZADO, SERGIO OLIVERIO', cargo: 'Operario' },
        { letra: 'C', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'D', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Operario' },
        { letra: 'E', nombre: 'VALDEZ GAMBOA, OSWALDO', cargo: 'Operario' },
        { letra: 'F', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'G', nombre: 'LOPEZ VILLANUEVA, LIDER', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 49, AMA: 29, AV: 31, SA: 11, COO: 3, ES: 26 },
        B: { ACE: 47, AMA: 50, AV: 24, SA: 5, ES: 19, CO: 1 },
        C: { ACE: 32, AMA: 42, AM: 6, AV: 5, SA: 1, COO: 3, AA: 2, BA: 3, ES: 48, DE: 2, CO: 1 },
        D: { ACE: 15, AMA: 25, AM: 14, SA: 68, MD: 2, COO: 2, ES: 22 },
        E: { ACE: 51, AMA: 33, AV: 8, SA: 20, MD: 3, COO: 7, CI: 3, BA: 3, ES: 20 },
        F: { ACE: 24, AMA: 24, AM: 42, SA: 8, MD: 24, BA: 3, ES: 23 },
        G: { ACE: 47, AMA: 50, AM: 7, AV: 15, SA: 3, MD: 12, COO: 1, BA: 3, ES: 7, CO: 1 },
      },
    },
  },
  {
    key: 'd15', label: 'CREDITEX · 15-ene · Colocación de Acero (7)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-15', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '09:30', horaFin: '12:30',
      conclusiones: 'TP 49% (colocación y amarrado de acero). El TC se concentró en acarreo (32%), aplomado (31%) y subida de acero (21%) por la lejanía del acopio y el trabajo en altura. El TNC (15%) fue dominado por ESPERA (85.9%) por descoordinación en el izaje. Recomendación: reubicar el acopio más cerca del frente y definir una secuencia clara de izaje con roles fijos.',
      trabajadores: [
        { letra: 'A', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'B', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'C', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'D', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Operario' },
        { letra: 'E', nombre: 'CRISTOBAL MORENO, JUAN CARLOS', cargo: 'Operario' },
        { letra: 'F', nombre: 'LOPEZ VILLANUEVA, LIDER', cargo: 'Operario' },
        { letra: 'G', nombre: 'PIMPINCO CRUZADO, SERGIO OLIVERIO', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 21, AMA: 26, AM: 55, AV: 10, SA: 21, MD: 5, COO: 1, VI: 6, ES: 27 },
        B: { ACE: 33, AMA: 44, AM: 23, AV: 20, SA: 11, MD: 6, COO: 1, VI: 1, ES: 19, DE: 4 },
        C: { ACE: 12, AMA: 34, AM: 37, AV: 15, SA: 30, MD: 8, COO: 4, ES: 23, CO: 4 },
        D: { ACE: 29, AMA: 67, AM: 16, AV: 19, SA: 3, MD: 4, COO: 5, AA: 1, ES: 8 },
        E: { ACE: 42, AMA: 64, AM: 3, AV: 12, SA: 6, MD: 9, COO: 2, AA: 8, ES: 18 },
        F: { ACE: 41, AMA: 61, AV: 12, SA: 9, MD: 2, COO: 2, VI: 2, ES: 36, DE: 8 },
        G: { ACE: 28, AMA: 67, AV: 41, SA: 7, MD: 8, ES: 15 },
      },
    },
  },
  {
    key: 'd28', label: 'CREDITEX · 28-ene · Colocación de Acero (5)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-28', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '10:00', horaFin: '12:00',
      conclusiones: 'TP 51%. El TC estuvo dominado por el acarreo de materiales (79.4%) por la entrada pequeña a la zona de trabajo. El TNC (10%) se generó por tiempo de espera (47.9%) y baño (33.3%) por el acceso complicado. Recomendación: mejorar el acceso a la zona de trabajo y añadir un rol fijo de acarreo para subir la productividad.',
      trabajadores: [
        { letra: 'A', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Oficial' },
        { letra: 'B', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'C', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'D', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'E', nombre: 'VELARDE MENDOZA, SAMUEL MOISES', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 40, AMA: 44, AM: 7, AP: 8, COO: 1, ES: 4 },
        B: { ACE: 37, AMA: 22, AM: 15, AP: 5, MD: 2, COO: 1, CA: 10, ES: 6, DE: 3 },
        C: { ACE: 18, AMA: 23, AM: 38, MD: 1, COO: 4, BA: 16, ES: 4, DE: 1 },
        D: { ACE: 3, AMA: 4, AM: 77, COO: 7, VI: 2, ES: 9, CO: 3 },
        E: { ACE: 39, AMA: 18, AM: 13 },
      },
    },
  },
  // ── ENCOFRADO DE MADERA (CREDITEX · dic-2025) ── códigos del catálogo ENCOFRADO ──
  {
    key: 'enc051225', label: 'CREDITEX · 05-dic · Encofrado de madera (2)', tipo: 'ENCOFRADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-05', actividad: 'ENCOFRADO DE MADERA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '14:52', horaFin: '15:42',
      conclusiones: '1. El Tiempo Productivo (TP) fue muy bajo (9.3%) debido a que la actividad evaluada estaba enfocada únicamente en la colocación del encofrado. Esto explica que el porcentaje de aporte directo sea reducido. 2. El Tiempo Contributorio (TC) representó la mayor parte del análisis (84.5%), evidenciando que los obreros dedicaron la mayor parte del tiempo a labores necesarias para preparar o habilitar la actividad principal. Las tareas de acarreo de materiales, alineamiento, corte de madera y preparación del terreno fueron predominantes. 3. El Tiempo No Contributorio (TNC) fue 6.2% en el análisis general, asociado principalmente al tiempo que se tomo en ir al baño. El análisis realizado en un lapso de 50 minutos y con 2 obreros muestra que la mayor parte de las ineficiencias no provienen de descansos o paradas, sino de la alta proporción de trabajos complementarios previos que son necesarios para iniciar la actividad productiva.',
      trabajadores: [
        { letra: 'A', nombre: 'CAVERO LOPEZ, JUAN ALBERTO', cargo: 'Operario' },
        { letra: 'B', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
      ],
      conteos: {
        A: { AM: 9, CE: 6, AV: 16, AP: 18 },
        B: { AM: 21, CD: 2, CE: 3, AV: 5, AP: 11, BA: 6 },
      },
    },
  },
  {
    key: 'enc061225', label: 'CREDITEX · 06-dic · Encofrado de madera (5)', tipo: 'ENCOFRADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-06', actividad: 'ENCOFRADO DE MADERA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '11:10', horaFin: '12:46',
      conclusiones: '1. El Trabajo Productivo (TP) fue solo 7.8% porque la actividad principal del momento era únicamente colocar el encofrado. 2. El Tiempo No Contributivo (TNC) llegó a 8.5%, y dentro de ese porcentaje, lo que más pesó fue el Tiempo de Espera, porque los trabajadores esperaban a que les alcancen madera, herramientas u otros materiales. También se registró un 23.5% de viaje, que corresponde a trabajadores caminando a distintos lugares sin material en la mano, lo cual muestra que la zona no estaba lo suficientemente preparada antes de iniciar. 3. El Tiempo Contributivo (TC) fue el más alto con 83.7%, principalmente por actividades necesarias como cortar madera, acarrear materiales, alinear y verificar verticalidad, trabajos previos indispensables para poder encofrar. RECOMENDACIONES: Tener la madera lista en el área de trabajo: se recomienda que el encofrado y madera necesaria esté previamente cortada y ubicada cerca del frente, porque durante la actividad se perdió tiempo buscando piezas fuera de la zona. Desencofrar calzaduras anteriores antes de iniciar: si se libera el área con anticipación, se evita que el lugar esté saturado cuando ya se está trabajando, ya que caminar y trasladar madera entre demasiados obstáculos genera retrasos.',
      trabajadores: [
        { letra: 'A', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'B', nombre: 'CAVERO LOPEZ, JUAN ALBERTO', cargo: 'Operario' },
        { letra: 'C', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
        { letra: 'D', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
        { letra: 'E', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
      ],
      conteos: {
        A: { ES: 2, AM: 9, VI: 2, BA: 6, CO: 1 },
        B: { AM: 7, AP: 55, COO: 5, AV: 4, CE: 11, D: 3, ES: 3, PT: 3, CM: 1 },
        C: { AM: 44, AV: 9, CE: 8, AP: 25, CM: 3, PM: 1, ES: 2, VI: 3 },
        D: { AM: 21, AP: 33, CD: 1, CE: 10, AV: 14, ES: 2, CC: 14 },
        E: { AM: 49, AP: 26, COO: 5, AV: 1, CD: 1, CE: 2, ES: 6, VI: 3, CO: 1, CC: 2 },
      },
    },
  },
  {
    key: 'enc091225', label: 'CREDITEX · 09-dic · Encofrado de madera (4)', tipo: 'ENCOFRADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-09', actividad: 'ENCOFRADO DE MADERA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '11:35', horaFin: '12:25',
      conclusiones: '',
      trabajadores: [
        { letra: 'A', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
        { letra: 'B', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'C', nombre: 'GUTIERRES MIRANDA, JORGE LUIS', cargo: 'Capataz' },
        { letra: 'D', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
      ],
      conteos: {
        A: { AP: 33, COO: 1, AM: 7, CE: 3, AV: 6 },
        B: { AM: 5, PM: 1 },
        C: { CE: 3, AM: 4, COO: 3, AP: 7, AV: 3 },
        D: { CE: 1, PT: 1, COO: 1, AM: 4, VI: 1 },
      },
    },
  },
  {
    key: 'enc111225', label: 'CREDITEX · 11-dic · Encofrado de madera (3)', tipo: 'ENCOFRADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-11', actividad: 'ENCOFRADO DE MADERA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '13:40', horaFin: '14:40',
      conclusiones: '1. El Trabajo Productivo (TP) fue solo 8.6%, lo que indica que el equipo dedicó muy poco tiempo al trabajo principal del encofrado, esto debido a que se requiere un trabajo previo para su colocación. 2. El Trabajo Contributivo (TC) fue el dominante con 86.4%, concentrándose principalmente en acarreo de materiales (39%) y apuntalamiento (30%), lo que muestra que gran parte del tiempo se utilizó en mover materiales y asegurar la estructura al encofrar. 3. El Tiempo No Contributivo (TNC) llegó a 5%, siendo casi todo por tiempo de espera (71.4%) y viajes (28.6%). Esto se relaciona directamente con la falta de herramientas puntuales. RECOMENDACIÓN: ordenar y preparar los materiales y herramientas antes de iniciar. Contar con las maderas, herramientas y accesorios listos en un punto fijo reducirá viajes y esperas, lo que permitirá que los trabajadores pasen más tiempo en la actividad principal y menos en buscar o mover materiales.',
      trabajadores: [
        { letra: 'A', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Oficial' },
        { letra: 'B', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
        { letra: 'C', nombre: 'GUTIERRES MIRANDA, JORGE LUIS', cargo: 'Capataz' },
      ],
      conteos: {
        A: { AM: 18, VI: 1, CM: 9, PT: 10, ES: 4, CE: 4, AP: 13, AV: 1 },
        B: { AM: 14, VI: 1, PT: 9, CD: 2, COO: 1, CE: 6, AP: 22, ES: 1, AV: 4 },
        C: { AM: 15, CE: 2, AP: 1, COO: 1, AV: 1 },
      },
    },
  },
  // ── EXCAVACIÓN LOCALIZADA (CREDITEX · dic-2025) ── catálogo EXCAVACION ──
  {
    key: 'exc051225', label: 'CREDITEX · 05-dic · Excavación localizada (4)', tipo: 'EXCAVACION',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-05', actividad: 'EXCAVACIÓN LOCALIZADA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '12:04', horaFin: '12:30',
      conclusiones: '1. Las actividades productivas (51.9%) muestran un desempeño adecuado para la excavación de calzaduras, donde el espacio reducido obliga al personal a turnarse, generando un trabajo continuo pero alternado. 2. El tiempo no contributivo (36.5%) se explica principalmente por descansos (89.5%), necesarios por el esfuerzo físico intenso de la excavación manual prolongada; el resto es baño (7.9%) y esperas (2.6%). 3. El tiempo contributivo (11.5%) se compone del uso de la tizalínea (75%) y acarreo de materiales (25%), necesarios para asegurar precisión en las dimensiones aunque no generen avance directo.',
      trabajadores: [
        { letra: 'A', nombre: 'RENGIFO IZQUIERDO, AARON', cargo: 'Ayudante' },
        { letra: 'B', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'C', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
        { letra: 'D', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
      ],
      conteos: {
        A: { EX: 13, D: 5, BA: 3, AM: 2, UT: 3 },
        B: { EX: 10, D: 11, ES: 1, AM: 1, UT: 3 },
        C: { EX: 14, D: 10, UT: 2 },
        D: { EX: 17, D: 8, UT: 1 },
      },
    },
  },
  {
    key: 'exc061225', label: 'CREDITEX · 06-dic · Excavación localizada (3)', tipo: 'EXCAVACION',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-06', actividad: 'EXCAVACIÓN LOCALIZADA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '10:15', horaFin: '11:05',
      conclusiones: '1. El Trabajo Productivo (54.7%) tuvo el mayor porcentaje porque la cuadrilla estuvo la mayor parte del tiempo en la excavación directa con pala y martillo demoledor. 2. El Tiempo Contributivo (3.3%) se usó en acarreo del material excavado y toma de niveles para verificar dimensiones de la calzadura. 3. El TNC fue 42%: los descansos por hidratación representaron 61.9%, las esperas 22.2% (primero se retiraba material con la pala para luego continuar con el martillo) y la conversación 15.9%. Se recomienda que el almacén cuente con bebidas (agua fría/gaseosa) para el personal, o que las adquieran antes de ingresar a obra, evitando que un obrero salga a comprar durante la jornada.',
      trabajadores: [
        { letra: 'A', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'B', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
        { letra: 'C', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
      ],
      conteos: {
        A: { EX: 35, D: 15 },
        B: { EX: 25, AM: 2, CO: 5, ES: 6, D: 12 },
        C: { EX: 22, AM: 1, UT: 2, ES: 8, CO: 5, D: 12 },
      },
    },
  },
  {
    key: 'exc091225', label: 'CREDITEX · 09-dic · Excavación localizada (5)', tipo: 'EXCAVACION',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-09', actividad: 'EXCAVACIÓN LOCALIZADA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '08:20', horaFin: '09:20',
      conclusiones: '1. El TP total es 58.3%: poco más de la mitad del tiempo se avanzó en la excavación con pala y rotomartillo, pero sigue siendo bajo para este trabajo, indicando interrupciones que redujeron el ritmo. 2. El TC total es 11.9%, concentrado en coordinación (40%) y acarreo (38.7%) por coordinaciones constantes entre ingeniero, capataz y obreros; medición (4%) y selección de piedras (17.3%) tuvieron poca participación. 3. El TNC total es 29.7%, y el 82.9% es tiempo de espera, generado por turnarse durante la actividad (solo uno trabaja mientras el otro espera). RECOMENDACIONES: elaborar antes de iniciar una lista del orden de trabajo y recursos/herramientas para evitar pausas y tiempos muertos; en la calzadura, iniciar con 2 trabajadores solo en la etapa de mayor movimiento de tierra y continuar con 1 al dar forma, reasignando al segundo a otra tarea.',
      trabajadores: [
        { letra: 'A', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
        { letra: 'B', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'C', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
        { letra: 'D', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
        { letra: 'E', nombre: 'GUTIERRES MIRANDA, JORGE LUIS', cargo: 'Capataz' },
      ],
      conteos: {
        A: { EXP: 62, COO: 9, ES: 37, D: 2, CO: 3, AM: 2, VI: 1, EXM: 9, ME: 1 },
        B: { EXP: 76, EXM: 22, D: 1, AM: 9, ES: 24, COO: 4, SP: 3, CO: 1 },
        C: { EXP: 48, EXM: 43, COO: 4, ES: 40, D: 3, AM: 2, BA: 3, VI: 1, SP: 5, ME: 1 },
        D: { ES: 47, EXP: 71, ME: 1, COO: 6, D: 5, AM: 3, CO: 1, EXM: 4, SP: 5, BA: 6 },
        E: { EXP: 23, EXM: 9, COO: 7, D: 3, ES: 7, AM: 13, VI: 1, CO: 1 },
      },
    },
  },
  {
    key: 'exc111225', label: 'CREDITEX · 11-dic · Excavación localizada (4)', tipo: 'EXCAVACION',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-11', actividad: 'EXCAVACIÓN LOCALIZADA - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '11:45', horaFin: '12:25',
      conclusiones: '1. El Trabajo Productivo (TP) alcanzó 51.4%: más de la mitad del tiempo se dedicó a la excavación localizada, mostrando buen avance en la actividad principal. 2. El Trabajo Contributivo (TC) fue 16.9%, concentrado en acarreo de materiales (75%), lo que indica que aún se invierte bastante tiempo en mover herramientas/insumos. 3. El Tiempo No Contributivo (TNC) fue alto (31.7%), casi todo tiempo de espera (95.6%): un rotomartillo se malogró y, además, los trabajadores debían turnarse (mientras uno usaba el rotomartillo, el otro retiraba tierra con pala), generando pausas. RECOMENDACIÓN: realizar chequeo diario y seguimiento periódico de herramientas críticas, especialmente rotomartillos, para evitar fallas en plena excavación.',
      trabajadores: [
        { letra: 'A', nombre: 'ESCOBAR CHAVEZ, NEHEMIAS', cargo: 'Ayudante' },
        { letra: 'B', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Oficial' },
        { letra: 'C', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
        { letra: 'D', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
      ],
      conteos: {
        A: { EXM: 29, ES: 21, EXP: 41, AM: 2, BA: 2, CO: 1, SP: 2 },
        B: { ES: 22, EXP: 15, EXM: 1, AM: 6 },
        C: { AM: 11, EXM: 18, EXP: 6, ES: 7, SP: 3 },
        D: { AM: 17, ES: 36, EXP: 33, CO: 1, SP: 7, EXM: 4 },
      },
    },
  },
  // ── VACIADO DE CONCRETO (CREDITEX · dic-2025) ── catálogo VACIADO ──
  {
    key: 'vac051225', label: 'CREDITEX · 05-dic · Vaciado de concreto (5)', tipo: 'VACIADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-05', actividad: 'VACIADO DE CONCRETO - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '15:50', horaFin: '16:50',
      conclusiones: '1. El trabajo productivo (TP) llegó al 19.6%, principalmente por el vaciado de concreto, actividad directa que solo requería orientar la tubería para un vaciado continuo. 2. El trabajo contributivo (TC) alcanzó 42.4%, siendo "sostener la tubería" lo que más tiempo consumió (54% del TC); el resto fue acarreo (11%) y colocación de piedras (34.6%). 3. El tiempo no contributivo (TNC) llegó a 38%, casi todo (95.1%) por esperas: los trabajadores se detuvieron por causas ajenas, como esperar a que se solucionen los problemas en el chute, ya que el concreto no fluía correctamente. RECOMENDACIÓN: revisar y asegurar el buen estado del chute y la tubería antes de iniciar el vaciado.',
      trabajadores: [
        { letra: 'A', nombre: 'RENGIFO IZQUIERDO, AARON', cargo: 'Ayudante' },
        { letra: 'B', nombre: 'MINAYA SILUPU, MANUEL JUNIOR', cargo: 'Ayudante' },
        { letra: 'C', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
        { letra: 'D', nombre: 'GARCIA SIMON, LUIS', cargo: 'Operario' },
        { letra: 'E', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
      ],
      conteos: {
        A: { VC: 44, ES: 57, AM: 2, VI: 3 },
        B: { VC: 40, ES: 55, AM: 2, CP: 1, CC: 8 },
        C: { ES: 22, CP: 47, AM: 3, CC: 33 },
        D: { CP: 2, CC: 2, VI: 5, AM: 9, ES: 1 },
        E: { CP: 49, ES: 20, AM: 4, CC: 20 },
      },
    },
  },
  {
    key: 'vac091225', label: 'CREDITEX · 09-dic · Vaciado de concreto (3)', tipo: 'VACIADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2025-12-09', actividad: 'VACIADO DE CONCRETO - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '14:30', horaFin: '15:30',
      conclusiones: '1. El TP es muy bajo, solo 15%: el avance real del vaciado fue mínimo, porque se realizó de manera lenta por miedo a romper el tubo y con un solo trabajador, reduciendo el ritmo. 2. El TC es el más alto (57.6%), principalmente por colocar piedras (50%) —necesario para aumentar el volumen de la calzadura y reducir el consumo de concreto—, sostener la tubería (29.4%) y preparar el chute (8.8%). 3. El TNC fue 27.4%, por tiempo de espera (81.4%) y retrabajo (18.6%), porque el vaciado avanzó muy lento por el cuidado excesivo para evitar romper la tubería. RECOMENDACIÓN: preparar con anticipación (un día antes) todos los recursos para el vaciado: chute, tuberías adecuadas, amarres, puntos de apoyo y herramientas, reduciendo esperas e improvisaciones.',
      trabajadores: [
        { letra: 'A', nombre: 'GUTIERRES MIRANDA, JORGE LUIS', cargo: 'Capataz' },
        { letra: 'B', nombre: 'AGUEDO PAREDES, JOHN ROVY', cargo: 'Operario' },
        { letra: 'C', nombre: 'PALACIOS LUNA, GIOVANNI CLEYMER', cargo: 'Operario' },
      ],
      conteos: {
        A: { VC: 53, ES: 42, COO: 8, ST: 2, PC: 9, TR: 6 },
        B: { ST: 13, CC: 53, ES: 29, AM: 14, PC: 3, TR: 6 },
        C: { CC: 49, ST: 45, PC: 6, AM: 2, ES: 8, TR: 6 },
      },
    },
  },
  {
    key: 'vac250226', label: 'CREDITEX · 25-feb · Vaciado de concreto (4)', tipo: 'VACIADO',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-02-25', actividad: 'VACIADO DE CONCRETO - CALZADURA',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '13:32', horaFin: '14:32',
      conclusiones: 'Trabajo productivo (10.6%): porcentaje muy bajo, el proceso de vaciado no fue eficiente. Trabajo contributivo (45.5%): mayor al productivo, como es de esperarse, ya que la parte principal —vibrado de concreto (64.8%)— requiere más mano de obra que el propio vaciado; le siguen coordinación (17.6%), acarreo de materiales (13.7%) y cachipa (3.9%). Trabajo no contributivo (44.4%): valor muy alto que indica ineficiencia; se debió a la demora entre las llegadas de cada mixer, dejando a los obreros sin actividad por periodos prolongados. RECOMENDACIONES: reordenar/reducir el intervalo de llegada de los mixers para bajar el tiempo de espera entre vaciados, y asignar tareas secundarias a los trabajadores mientras esperan, para aprovechar su mano de obra.',
      trabajadores: [
        { letra: 'A', nombre: 'SULCA PALOMINO, MAYCOL', cargo: 'Oficial' },
        { letra: 'B', nombre: 'QUISPE HUAMAN, ALFREDO', cargo: 'Operario' },
        { letra: 'C', nombre: 'HUANACO QUISPE, PELE', cargo: 'Operario' },
        { letra: 'D', nombre: 'PIZANGO YALTA, BRANNY', cargo: 'Operario' },
      ],
      conteos: {
        A: { VB: 49, COO: 17, VI: 7, ES: 37, D: 2, CO: 3, AM: 14 },
        B: { VB: 37, COO: 4, AM: 11, ES: 41, VC: 27, CO: 3, D: 5, CA: 2 },
        C: { VB: 18, ES: 50, COO: 11, CO: 8, D: 5, VC: 28, AM: 3, CA: 7 },
        D: { VB: 47, ES: 56, CO: 8, COO: 10, D: 3, VI: 1, AM: 5 },
      },
    },
  },
];
// Abre con la ÚLTIMA carta cargada (la más reciente) — lista para guardar.
const PRECARGA = PLANTILLAS[PLANTILLAS.length - 1].data;
const PRECARGA_TIPO = PLANTILLAS[PLANTILLAS.length - 1].tipo || 'ACERO';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const n = (v) => parseInt(v, 10) || 0;

export default function ImportarCartaBalance({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes } = useProyectoActivo();

  const [ficha, setFicha] = useState({
    obra: PRECARGA.obra, fecha: PRECARGA.fecha, actividad: PRECARGA.actividad,
    ubicacion: PRECARGA.ubicacion, horaInicio: PRECARGA.horaInicio, horaFin: PRECARGA.horaFin,
    conclusiones: PRECARGA.conclusiones || '',
  });
  const [trab, setTrab] = useState(PRECARGA.trabajadores);
  const [conteos, setConteos] = useState(PRECARGA.conteos);
  const [tipo, setTipo] = useState(PRECARGA_TIPO); // ACERO | ENCOFRADO → catálogo activo
  const [guardando, setGuardando] = useState(false);
  const [reparando, setReparando] = useState(false);
  const [subiendoTodas, setSubiendoTodas] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [confirm, setConfirm] = useState(null); // { ids, docData, obs, actNorm, fecha }

  // Catálogo activo y sus mapas (cod→categoría, cod→descripción)
  const CODIGOS = CATALOGOS[tipo] || CATALOGOS.ACERO;
  const { desc: DESC, catDe: CAT_DE } = useMemo(() => mapasDe(CODIGOS), [CODIGOS]);

  const setCount = (letra, cod, val) => {
    setConteos((prev) => ({ ...prev, [letra]: { ...(prev[letra] || {}), [cod]: val === '' ? '' : n(val) } }));
  };
  const setTrabajador = (i, campo, val) => {
    setTrab((prev) => prev.map((t, idx) => idx === i ? { ...t, [campo]: val } : t));
  };
  const addTrab = () => {
    const usadas = trab.map((t) => t.letra);
    const libre = LETRAS.find((l) => !usadas.includes(l));
    if (!libre) return;
    setTrab((p) => [...p, { letra: libre, nombre: '', cargo: 'Operario' }]);
  };
  const removeTrab = (letra) => {
    setTrab((p) => p.filter((t) => t.letra !== letra));
    setConteos((p) => { const c = { ...p }; delete c[letra]; return c; });
  };
  const cargarPlantilla = (key) => {
    const p = PLANTILLAS.find((x) => x.key === key);
    if (!p) return;
    const d = p.data;
    setTipo(p.tipo || 'ACERO');
    setFicha({ obra: d.obra, fecha: d.fecha, actividad: d.actividad, ubicacion: d.ubicacion, horaInicio: d.horaInicio, horaFin: d.horaFin, conclusiones: d.conclusiones || '' });
    setTrab(d.trabajadores);
    setConteos(d.conteos);
  };
  const vaciar = () => {
    setFicha({ obra: 'CREDITEX PTARI', fecha: '', actividad: '', ubicacion: '', horaInicio: '', horaFin: '', conclusiones: '' });
    setTrab([{ letra: 'A', nombre: '', cargo: 'Operario' }]);
    setConteos({});
  };

  // ── KPIs en vivo ──
  const kpis = useMemo(() => {
    let tp = 0, tc = 0, tnc = 0;
    trab.forEach((t) => {
      const c = conteos[t.letra] || {};
      Object.entries(c).forEach(([cod, v]) => {
        const cat = CAT_DE[cod]; const val = n(v);
        if (cat === 'TP') tp += val; else if (cat === 'TC') tc += val; else if (cat === 'TNC') tnc += val;
      });
    });
    const total = tp + tc + tnc;
    const pTP = total ? (tp / total) * 100 : 0;
    const pTC = total ? (tc / total) * 100 : 0;
    const pTNC = total ? (tnc / total) * 100 : 0;
    return { tp, tc, tnc, total, pTP, pTC, pTNC };
  }, [conteos, trab, CAT_DE]);

  // Resumen agregado por código (suma de todos los trabajadores) para el cuadro de solo lectura
  const resumenCodigos = useMemo(() => {
    const agg = {};
    trab.forEach((t) => Object.entries(conteos[t.letra] || {}).forEach(([cod, v]) => { agg[cod] = (agg[cod] || 0) + n(v); }));
    const totCat = { TP: kpis.tp, TC: kpis.tc, TNC: kpis.tnc };
    return ['TP', 'TC', 'TNC'].map((cat) => ({
      cat,
      total: totCat[cat],
      items: CODIGOS[cat].map((c) => ({ ...c, n: agg[c.cod] || 0 })).filter((c) => c.n > 0).sort((a, b) => b.n - a.n),
    }));
  }, [conteos, trab, CODIGOS, kpis]);

  const guardar = useCallback(async () => {
    if (!user?.uid) { showToast?.('Debes iniciar sesión para guardar', 'warning'); return; }
    if (!ficha.fecha || !ficha.actividad.trim()) { showToast?.('Completa fecha y actividad', 'warning'); return; }
    if (kpis.total === 0) { showToast?.('Ingresa al menos un conteo', 'warning'); return; }
    setGuardando(true);
    try {
      const personas = trab.map((t) => ({ id: t.letra, nombre: t.nombre.trim() || `Trabajador ${t.letra}`, cargo: CARGOS_CORTO[t.cargo] || 'OP' }));
      const observaciones = [];
      trab.forEach((t) => {
        const c = conteos[t.letra] || {};
        Object.entries(c).forEach(([cod, v]) => {
          const cat = CAT_DE[cod]; const cnt = n(v);
          if (!cat || cnt <= 0) return;
          for (let k = 0; k < cnt; k++) {
            observaciones.push({
              personaId: t.letra, categoria: cat,
              subcategoria: cat === 'TP' ? null : cod,
              codigo: cod, descripcion: DESC[cod] || cod,
            });
          }
        });
      });
      const actNorm = ficha.actividad.trim().toUpperCase();
      const docData = {
        obra: ficha.obra, fecha: ficha.fecha, actividad: actNorm,
        ubicacion: ficha.ubicacion, horaInicio: ficha.horaInicio, horaFin: ficha.horaFin,
        conclusiones: (ficha.conclusiones || '').trim(),
        tipoActividad: tipo,
        trabajadores: trab.map((t) => ({ nombre: t.nombre.trim(), cargo: CARGOS_CORTO[t.cargo] || 'OP' })),
        personas, observaciones, formatoVersion: 2,
        proyectoId: proyectoActivoId || null,
        frenteId: modoTodosFrentes ? null : (frenteActivoId || null),
        fuente: 'importador-conteos',
        timestamp: new Date(),
        uidAutor: user.uid,
      };

      // ── Anti-duplicado: misma fecha + actividad + proyecto ──
      // Query por fecha (un solo campo → sin índice) y filtro fino en cliente.
      const snap = await getDocs(query(collection(db, 'Cartas_Balance'), where('fecha', '==', ficha.fecha)));
      const dups = snap.docs.filter((d) => {
        const x = d.data() || {};
        return (x.actividad || '').toUpperCase() === actNorm && (x.proyectoId || null) === (proyectoActivoId || null);
      });

      if (dups.length > 0) {
        // Abre el modal premium y espera la decisión del usuario.
        setConfirm({ ids: dups.map((d) => d.id), docData, obs: observaciones.length, actNorm, fecha: ficha.fecha });
        return;
      }
      await addDoc(collection(db, 'Cartas_Balance'), docData);
      setOkMsg(`Carta Balance guardada ✓ (${observaciones.length} observaciones)`);
      showToast?.('Carta Balance importada a la base de datos ✓', 'success');
      setTimeout(() => setOkMsg(''), 6000);
    } catch (e) {
      console.error('[ImportarCB]', e);
      showToast?.('Error al guardar: ' + (e?.message || e), 'error');
    } finally { setGuardando(false); }
  }, [user, ficha, trab, conteos, kpis, tipo, CAT_DE, DESC, proyectoActivoId, frenteActivoId, modoTodosFrentes, showToast]);

  // Backfill: rellena conclusiones faltantes en cartas YA guardadas, tomándolas
  // de las plantillas (emparejando por fecha + actividad). No retoca conteos.
  const repararConclusiones = useCallback(async () => {
    if (!user?.uid) { showToast?.('Debes iniciar sesión', 'warning'); return; }
    setReparando(true);
    try {
      const fuente = {};
      PLANTILLAS.forEach((p) => { if ((p.data.conclusiones || '').trim()) fuente[`${p.data.fecha}|${(p.data.actividad || '').toUpperCase()}`] = p.data.conclusiones.trim(); });
      let actualizadas = 0, sinFuente = 0;
      const snap = await getDocs(collection(db, 'Cartas_Balance'));
      for (const d of snap.docs) {
        const x = d.data() || {};
        if ((x.conclusiones || '').trim()) continue; // ya tiene
        const texto = fuente[`${x.fecha}|${(x.actividad || '').toUpperCase()}`];
        if (!texto) { sinFuente++; continue; }
        try { await updateDoc(doc(db, 'Cartas_Balance', d.id), { conclusiones: texto }); actualizadas++; } catch (e) { console.warn('[reparar]', e); }
      }
      const msg = actualizadas > 0
        ? `Conclusiones reparadas ✓ · ${actualizadas} carta(s) actualizada(s)${sinFuente ? ` · ${sinFuente} sin plantilla de referencia` : ''}`
        : 'Todas las cartas ya tenían conclusiones (o no hay plantilla de referencia para las vacías)';
      setOkMsg(msg);
      showToast?.(actualizadas > 0 ? 'Conclusiones reparadas ✓' : 'Nada que reparar', actualizadas > 0 ? 'success' : 'info');
      setTimeout(() => setOkMsg(''), 8000);
    } catch (e) {
      console.error('[ImportarCB reparar]', e);
      showToast?.('Error al reparar: ' + (e?.message || e), 'error');
    } finally { setReparando(false); }
  }, [user, showToast]);

  // Sube TODAS las plantillas a la base de una vez (cada una con su catálogo de
  // códigos según su tipo). Si una ya existe (misma fecha+actividad+proyecto), la
  // reemplaza. Corre en la sesión del usuario (las reglas exigen su uid).
  const subirTodas = useCallback(async () => {
    if (!user?.uid) { showToast?.('Debes iniciar sesión', 'warning'); return; }
    setSubiendoTodas(true);
    try {
      let creadas = 0, reemplazadas = 0, errores = 0;
      for (const pl of PLANTILLAS) {
        try {
          const d = pl.data;
          const { desc, catDe } = mapasDe(CATALOGOS[pl.tipo || 'ACERO'] || CATALOGOS.ACERO);
          const personas = d.trabajadores.map((t) => ({ id: t.letra, nombre: (t.nombre || '').trim() || `Trabajador ${t.letra}`, cargo: CARGOS_CORTO[t.cargo] || 'OP' }));
          const observaciones = [];
          d.trabajadores.forEach((t) => {
            Object.entries(d.conteos[t.letra] || {}).forEach(([cod, v]) => {
              const k = catDe[cod]; const cnt = n(v);
              if (!k || cnt <= 0) return;
              for (let i = 0; i < cnt; i++) observaciones.push({ personaId: t.letra, categoria: k, subcategoria: k === 'TP' ? null : cod, codigo: cod, descripcion: desc[cod] || cod });
            });
          });
          const actNorm = (d.actividad || '').trim().toUpperCase();
          const docData = {
            obra: d.obra, fecha: d.fecha, actividad: actNorm, ubicacion: d.ubicacion, horaInicio: d.horaInicio, horaFin: d.horaFin,
            conclusiones: (d.conclusiones || '').trim(), tipoActividad: pl.tipo || 'ACERO',
            trabajadores: d.trabajadores.map((t) => ({ nombre: (t.nombre || '').trim(), cargo: CARGOS_CORTO[t.cargo] || 'OP' })),
            personas, observaciones, formatoVersion: 2,
            proyectoId: proyectoActivoId || null, frenteId: modoTodosFrentes ? null : (frenteActivoId || null),
            fuente: 'importador-masivo', timestamp: new Date(), uidAutor: user.uid,
          };
          const snap = await getDocs(query(collection(db, 'Cartas_Balance'), where('fecha', '==', d.fecha)));
          const dups = snap.docs.filter((x) => { const y = x.data() || {}; return (y.actividad || '').toUpperCase() === actNorm && (y.proyectoId || null) === (proyectoActivoId || null); });
          if (dups.length) { await setDoc(doc(db, 'Cartas_Balance', dups[0].id), docData); for (let i = 1; i < dups.length; i++) { try { await deleteDoc(doc(db, 'Cartas_Balance', dups[i].id)); } catch { /* admin */ } } reemplazadas++; }
          else { await addDoc(collection(db, 'Cartas_Balance'), docData); creadas++; }
        } catch (e) { console.warn('[bulk]', pl.key, e); errores++; }
      }
      setOkMsg(`Subida masiva ✓ · ${creadas} nuevas, ${reemplazadas} reemplazadas${errores ? `, ${errores} con error` : ''}`);
      showToast?.('Todas las cartas subidas a la base ✓', 'success');
      setTimeout(() => setOkMsg(''), 9000);
    } catch (e) { console.error('[ImportarCB masivo]', e); showToast?.('Error en subida masiva: ' + (e?.message || e), 'error'); }
    finally { setSubiendoTodas(false); }
  }, [user, proyectoActivoId, frenteActivoId, modoTodosFrentes, showToast]);

  // Reemplazo confirmado desde el modal: sobreescribe 1 y elimina las copias extra.
  const ejecutarReemplazo = useCallback(async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'Cartas_Balance', c.ids[0]), c.docData);
      let borradas = 0;
      for (let i = 1; i < c.ids.length; i++) {
        try { await deleteDoc(doc(db, 'Cartas_Balance', c.ids[i])); borradas++; } catch { /* requiere admin */ }
      }
      setOkMsg(`Carta Balance reemplazada ✓${borradas ? ` · ${borradas} copia(s) duplicada(s) eliminada(s)` : ''}`);
      showToast?.('Carta Balance reemplazada ✓', 'success');
      setTimeout(() => setOkMsg(''), 6000);
    } catch (e) {
      console.error('[ImportarCB reemplazo]', e);
      showToast?.('Error al reemplazar: ' + (e?.message || e), 'error');
    } finally { setGuardando(false); }
  }, [confirm, showToast]);

  const inpMini = { width: '52px', padding: '5px 4px', textAlign: 'center', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: BASE.navy };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <ConfirmModal
        abierto={!!confirm}
        icono="🗂️"
        titulo="Esta Carta Balance ya existe"
        mensaje={confirm
          ? `Ya guardaste ${confirm.ids.length === 1 ? 'una Carta Balance' : `${confirm.ids.length} Cartas Balance`} de “${confirm.actNorm}” del ${confirm.fecha}. ¿Reemplazar con estos datos?`
          : ''}
        detalle={confirm && confirm.ids.length > 1
          ? `Se conservará 1 y se eliminarán las ${confirm.ids.length - 1} copias duplicadas.`
          : undefined}
        textoConfirmar="Reemplazar"
        textoCancelar="Cancelar"
        onConfirmar={ejecutarReemplazo}
        onCancelar={() => setConfirm(null)}
      />

      <VistaHeader icono="registro" eyebrow="Carta Balance"
        titulo="Importar por conteos"
        subtitulo="Ingresa los conteos del bloque 'ORDEN DE DATOS' del formato. Genera la carta y la guarda en la base."
        derecha={(
          <button onClick={guardar} disabled={guardando} style={{
            background: guardando ? 'rgba(255,255,255,0.25)' : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
            color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px',
            fontSize: '13px', fontWeight: 900, cursor: guardando ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          }}>{guardando ? 'Guardando…' : '💾 Guardar en base'}</button>
        )} />

      {okMsg && (
        <div style={{ background: BASE.greenLight, color: BASE.greenDark, border: `1px solid ${BASE.green}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 800 }}>
          ✅ {okMsg}
        </div>
      )}

      {/* Tipo de carta → define el catálogo de códigos (TP/TC/TNC) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: BASE.navy }}>Tipo de carta:</span>
        <div style={{ display: 'inline-flex', background: BASE.bg, border: `1px solid ${BASE.border}`, borderRadius: '9px', padding: '3px', gap: '3px' }}>
          {TIPOS.map((t) => {
            const on = tipo === t.id;
            return (
              <button key={t.id} onClick={() => setTipo(t.id)} style={{
                padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800,
                background: on ? `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})` : 'transparent', color: on ? '#fff' : BASE.muted,
              }}>{t.label}</button>
            );
          })}
        </div>
        <span style={{ fontSize: '11px', color: BASE.muted }}>Define los códigos disponibles abajo.</span>
      </div>

      {/* Selector de plantillas */}
      <div style={{ background: BASE.navySoft, border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: BASE.navy }}>📋 Cargar plantilla:</span>
        <select onChange={(e) => { cargarPlantilla(e.target.value); e.target.value = ''; }} defaultValue=""
          style={{ ...inp({ width: 'auto', minWidth: '260px', padding: '8px 10px' }) }}>
          <option value="" disabled>Elegir una carta ya digitada…</option>
          {PLANTILLAS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button onClick={vaciar} style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '7px', padding: '7px 12px', cursor: 'pointer' }}>🗑️ Vaciar</button>
        <div style={{ flex: 1 }} />
        <button onClick={subirTodas} disabled={subiendoTodas} title={`Sube las ${PLANTILLAS.length} cartas precargadas a la base (reemplaza las que ya existan)`}
          style={{ fontSize: '11px', fontWeight: 900, color: '#fff', background: subiendoTodas ? 'rgba(180,130,20,0.5)' : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, border: 'none', borderRadius: '7px', padding: '7px 12px', cursor: subiendoTodas ? 'wait' : 'pointer' }}>
          {subiendoTodas ? 'Subiendo…' : `⬆️ Subir TODAS a la base (${PLANTILLAS.length})`}
        </button>
        <button onClick={repararConclusiones} disabled={reparando} title="Rellena las conclusiones faltantes en las cartas ya guardadas, tomándolas de las plantillas"
          style={{ fontSize: '11px', fontWeight: 800, color: '#fff', background: reparando ? 'rgba(8,26,46,0.5)' : `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, border: 'none', borderRadius: '7px', padding: '7px 12px', cursor: reparando ? 'wait' : 'pointer' }}>
          {reparando ? 'Reparando…' : '🔧 Reparar conclusiones'}
        </button>
      </div>

      {/* Cabecera de la carta cargada (solo lectura) */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 16px', boxShadow: BASE.shadowSm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 900, color: BASE.navy }}>{ficha.actividad || '— Elige una plantilla o usa «Subir TODAS» —'}</p>
            <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '2px' }}>
              {ficha.obra}{ficha.fecha ? ` · ${ficha.fecha}` : ''}{ficha.horaInicio ? ` · ${ficha.horaInicio}–${ficha.horaFin}` : ''}{ficha.ubicacion ? ` · ${ficha.ubicacion}` : ''}
            </p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, background: BASE.goldSoft, border: `1px solid ${BASE.gold}66`, borderRadius: '999px', padding: '4px 11px', whiteSpace: 'nowrap' }}>
            {TIPOS.find((t) => t.id === tipo)?.label || tipo} · {trab.length} trab · {kpis.total} obs
          </span>
        </div>
        {ficha.conclusiones && (
          <p style={{ marginTop: '10px', fontSize: '12px', color: BASE.text, lineHeight: 1.5, background: BASE.bgSoft, borderLeft: `4px solid ${BASE.gold}`, borderRadius: '8px', padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{ficha.conclusiones}</p>
        )}
      </div>

      {/* KPIs en vivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <Kpi l="TP · Productivo" v={`${Math.round(kpis.pTP)}%`} c={CB_COL.TP} sub={`${kpis.tp} obs`} />
        <Kpi l="TC · Contributorio" v={`${Math.round(kpis.pTC)}%`} c={CB_COL.TC} sub={`${kpis.tc} obs`} />
        <Kpi l="TNC · No contrib." v={`${Math.round(kpis.pTNC)}%`} c={CB_COL.TNC} sub={`${kpis.tnc} obs`} />
      </div>

      {/* Resumen por código (solo lectura) — qué se subirá, sin matriz editable */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', boxShadow: BASE.shadowSm, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BASE.border}`, background: BASE.bgSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy }}>RESUMEN DE LA CARTA <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted }}>· solo lectura</span></span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: BASE.muted }}>🔒 La información se sube tal cual; para digitar a mano usa «⚖️ Capturar»</span>
        </div>
        {kpis.total === 0 ? (
          <p style={{ padding: '22px 16px', textAlign: 'center', fontSize: '12.5px', color: BASE.muted, fontStyle: 'italic' }}>
            Elige una plantilla en «📋 Cargar plantilla» o usa «⬆️ Subir TODAS a la base».
          </p>
        ) : (
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {resumenCodigos.map(({ cat, total, items }) => (
              <div key={cat} style={{ border: `1px solid ${BASE.border}`, borderTop: `3px solid ${CB_COL[cat]}`, borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 900, color: CB_COL[cat], letterSpacing: '0.4px' }}>{cat === 'TP' ? 'PRODUCTIVO' : cat === 'TC' ? 'CONTRIBUTORIO' : 'NO CONTRIBUTORIO'}</span>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy }}>{total} obs</span>
                </div>
                {items.length === 0 ? <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>—</p> : items.map((it) => (
                  <div key={it.cod} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, minWidth: '30px' }}>{it.cod}</span>
                    <span style={{ flex: 1, fontSize: '11px', color: BASE.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.desc}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: CB_COL[cat] }}>{it.n}</span>
                    <span style={{ fontSize: '10px', color: BASE.muted, minWidth: '30px', textAlign: 'right' }}>{total ? Math.round(it.n / total * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Importar solo sube cartas ya digitadas (elige una plantilla o usa «Subir TODAS»). Al guardar, cada carta aparece en Análisis y se cruza con el CPI por su actividad/partida ISO.
      </p>
    </div>
  );
}

function Campo({ l, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>{l}</label>
      {children}
    </div>
  );
}
function Kpi({ l, v, c, sub }) {
  return (
    <div style={{ background: c + '0F', border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`, borderRadius: '10px', padding: '10px 13px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 900, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</p>
      <p style={{ fontSize: '22px', fontWeight: 900, color: c, fontFamily: 'monospace', lineHeight: 1.1, marginTop: '2px' }}>{v}</p>
      {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>}
    </div>
  );
}
