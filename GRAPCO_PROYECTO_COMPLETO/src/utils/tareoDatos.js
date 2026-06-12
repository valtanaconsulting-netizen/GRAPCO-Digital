// src/utils/tareoDatos.js
// Prepara los datos del tareo oficial F13 (PDF y Excel comparten esta lógica):
//   · trabajadores agrupados por nombre canónico (sin duplicar personas)
//   · nombre SIEMPRE en formato "APELLIDOS NOMBRES" (la ficha de Personal manda)
//   · capataz (MAESTRO) primero, el resto en orden alfabético
//   · cargo/DNI/ocupación SIEMPRE desde la base de datos de Personal
//   · HN/HE separados para las columnas N / 0.6 / 1.0 / TOT.
import { crearResolverNombre } from './nombresCanonicos.js';

export const CAR_MAP = { Capataz: 'MA', Operario: 'OP', Oficial: 'OF', Ayudante: 'AYU' };
export const OCUP_MAP = {
  'Albañilería': 'ALBAÑIL', 'Encofrado': 'ENCOFRADO', 'Acero': 'ACERO',
  'Concreto': 'CONCRETO', 'Instalaciones': 'INSTALAC.', 'Movimiento de Tierras': 'MOV.TIERRA',
  'General': 'GENERAL',
};

// "lunes, junio 08, 2026" — formato del F13 oficial
export function fmtFechaLargaF13(fechaIso) {
  const [y, m, d] = (fechaIso || '').split('-').map(Number);
  if (!y) return fechaIso;
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('es-ES', { weekday: 'long' });
  const month = dt.toLocaleDateString('es-ES', { month: 'long' });
  return `${weekday}, ${month} ${String(d).padStart(2, '0')}, ${y}`;
}

// → [{ fecha, capataz, trabajadores, actividades, totales }] ordenado por fecha
export function prepararDatosTareo(registrosPorDia, personalDB) {
  const resolverNombre = crearResolverNombre(Object.values(registrosPorDia).flat() || [], personalDB || []);

  const fichaPorCanonico = {};
  (personalDB || []).forEach(p => {
    if (!p?.nombre) return;
    const c = resolverNombre(p.nombre);
    if (c && !fichaPorCanonico[c]) fichaPorCanonico[c] = p;
  });

  const entradas = Object.entries(registrosPorDia)
    .filter(([, regs]) => (regs || []).length)
    .sort(([a], [b]) => a.localeCompare(b));

  return entradas.map(([fechaCapKey, registros]) => {
    const [fecha, capataz] = fechaCapKey.split('__');

    const trabajadoresMap = {};
    registros.forEach(r => {
      (r.detalleTareo || []).forEach(t => {
        if (!t?.nombre) return;
        const nomKey = resolverNombre(t.nombre);
        if (!trabajadoresMap[nomKey]) {
          const ficha = fichaPorCanonico[nomKey] || {};
          const cargo = ficha.cargo || 'Operario';
          trabajadoresMap[nomKey] = {
            // El F13 no usa comas: "AVILA DOMINGUEZ, LUIS" → "AVILA DOMINGUEZ LUIS"
            nombre: nomKey.replace(/\s*,\s*/g, ' '),
            dni: ficha.dni || '',
            cargo,
            car: CAR_MAP[cargo] || cargo.slice(0, 2).toUpperCase(),
            ocupacion: cargo === 'Capataz'
              ? 'GENERAL'
              : (OCUP_MAP[ficha.especialidad] || (ficha.especialidad || cargo).toUpperCase().slice(0, 10)),
            actividades: {},
            totHN: 0,
            totHE: 0,
          };
        }
        const act = r._actividadCanonica || r.actividad;
        const hn = parseFloat(t.hn) || 0;
        const he = parseFloat(t.he) || 0;
        trabajadoresMap[nomKey].actividades[act] = (trabajadoresMap[nomKey].actividades[act] || 0) + hn + he;
        trabajadoresMap[nomKey].totHN += hn;
        trabajadoresMap[nomKey].totHE += he;
      });
    });

    // Capataz (MAESTRO) SIEMPRE primero, el resto en orden alfabético
    const trabajadores = Object.values(trabajadoresMap).sort((a, b) => {
      if (a.cargo === 'Capataz' && b.cargo !== 'Capataz') return -1;
      if (b.cargo === 'Capataz' && a.cargo !== 'Capataz') return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    const actividades = [...new Set(registros.map(r => r._actividadCanonica || r.actividad))].slice(0, 14);

    // Reparto LEGAL de las HE del día por trabajador: las 2 primeras horas
    // extra van a la columna 0.6 (+60%) y de la 3.ª en adelante a la columna
    // 1.0 (+100%). Las columnas muestran CANTIDAD de horas en cada tramo
    // (ej. 3 HE → 2.0 en "0.6" y 1.0 en "1.0"), no el monto multiplicado.
    trabajadores.forEach(t => {
      t.totHE60 = Math.min(t.totHE, 2);
      t.totHE100 = Math.max(0, t.totHE - 2);
    });

    // Totales: columnas 1-10 SIEMPRE con valor (0.0 incluido, como el F13)
    const totales = { porCol: [], hn: 0, he: 0, he60: 0, he100: 0, total: 0 };
    for (let n = 0; n < 10; n++) {
      const act = actividades[n];
      totales.porCol[n] = act
        ? trabajadores.reduce((s, t) => s + (t.actividades[act] || 0), 0)
        : 0;
    }
    trabajadores.forEach(t => {
      totales.hn += t.totHN; totales.he += t.totHE;
      totales.he60 += t.totHE60; totales.he100 += t.totHE100;
    });
    totales.total = totales.hn + totales.he;

    return { fecha, capataz, trabajadores, actividades, totales };
  });
}
