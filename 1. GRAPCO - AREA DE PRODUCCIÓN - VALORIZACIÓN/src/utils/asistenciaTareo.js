// src/utils/asistenciaTareo.js
// Trae del marcador biométrico las marcas que el tareo F13 necesita para estampar
// la hora de ingreso/salida real y la firma del obrero.
//
// Devuelve { 'YYYY-MM-DD': { personalId: { entrada, salida, entradaReal, salidaReal } } }
// — indexado por fecha porque un mismo PDF puede abarcar varios días.

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Firestore tope el operador 'in' a 30 valores, así que las fechas van en tandas.
// El tareo del capataz trae 1 día; el de gestión puede pedir un mes entero.
const LOTE = 30;

export async function cargarAsistenciaPorFecha(fechas, proyectoId = null) {
  const unicas = [...new Set((fechas || []).filter(Boolean))];
  if (!unicas.length) return {};

  const out = {};
  try {
    for (let i = 0; i < unicas.length; i += LOTE) {
      const tanda = unicas.slice(i, i + LOTE);
      const filtros = [where('fecha', 'in', tanda)];
      if (proyectoId) filtros.push(where('proyectoId', '==', proyectoId));
      const snap = await getDocs(query(collection(db, 'Asistencia_Diaria'), ...filtros));
      snap.forEach(d => {
        const x = d.data();
        if (!x.personalId || !x.fecha) return;
        if (!out[x.fecha]) out[x.fecha] = {};
        out[x.fecha][x.personalId] = {
          entrada: x.entrada || '',
          salida: x.salida || '',
          entradaReal: x.entradaReal || '',
          salidaReal: x.salidaReal || '',
        };
      });
    }
  } catch (e) {
    // Degradación deliberada: si la consulta falla (índice compuesto ausente, permisos,
    // sin conexión) devolvemos lo que se haya podido leer. El PDF cae entonces al
    // horario estándar impreso del F13 en vez de reventar — el capataz necesita su
    // tareo aunque la biometría no responda.
    console.warn('[asistenciaTareo] no se pudo leer Asistencia_Diaria:', e?.message || e);
  }
  return out;
}
