// src/utils/retroPlanDiario.js
//
// Cierra el ciclo Plan Diario ↔ Tareo. Hasta ahora la información viajaba en una
// sola dirección —el ingeniero programaba y el capataz ejecutaba— y las columnas
// HH EJEC y MET.EJEC del plan eran casillas que alguien tenía que teclear a mano
// mirando otra pantalla. Aquí el avance real vuelve solo.
//
// Al llenarse ejHH y ejMetrado, REND y % AVANCE se derivan de ellos, así que el
// plan pasa a comparar programado contra ejecutado sin intervención.
//
// El cruce va por fecha + capataz + nombre de actividad. Es una llave débil (los
// items del plan no tienen id propio), por eso:
//   · solo se tocan los grupos de ESE capataz — nadie pisa las filas de otro;
//   · solo se escriben los items cuya actividad calza exactamente tras normalizar;
//   · lo que no calza se deja intacto y se informa, en vez de adivinar.

import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Mismo criterio que el resto del sistema: sin tildes, sin comas, sin dobles
// espacios. El capataz teclea a mano y el catálogo trae otro formato.
const norm = (s) => (s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * @param {object} p
 * @param {string} p.fecha              'YYYY-MM-DD'
 * @param {string} p.capataz            nombre tal como lo usa el tareo
 * @param {string} p.proyectoId
 * @param {Array}  p.ejecutado          [{ actividad, metrado, totalHH }]
 * @returns {Promise<{planes:number, items:number, sinCruce:string[]}>}
 */
export async function retroalimentarPlanDiario({ fecha, capataz, proyectoId, ejecutado }) {
  const resumen = { planes: 0, items: 0, sinCruce: [] };
  if (!fecha || !capataz || !Array.isArray(ejecutado) || !ejecutado.length) return resumen;

  // Acumulado por actividad: el capataz puede repartir una misma actividad en
  // varias filas y el plan tiene una sola — se suman antes de escribir.
  const porAct = {};
  ejecutado.forEach(e => {
    const k = norm(e.actividad);
    if (!k) return;
    if (!porAct[k]) porAct[k] = { hh: 0, met: 0 };
    porAct[k].hh  += Number(e.totalHH) || 0;
    porAct[k].met += Number(e.metrado) || 0;
  });

  try {
    // Se filtra por fecha en el servidor y por proyecto en memoria: evita depender
    // de un índice compuesto que quizá no exista en este proyecto de Firestore.
    const snap = await getDocs(query(collection(db, 'Planes_Diarios'), where('fecha', '==', fecha)));
    const planes = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => !proyectoId || !p.proyectoId || p.proyectoId === proyectoId);
    if (!planes.length) return resumen;

    const capatazK = norm(capataz);
    const usadas = new Set();
    const batch = writeBatch(db);

    planes.forEach(plan => {
      let tocado = false;
      const grupos = (plan.grupos || []).map(g => {
        // Un grupo ajeno se devuelve tal cual: este capataz no tiene nada que decir
        // sobre lo que ejecutó otra cuadrilla.
        if (norm(g.capataz) !== capatazK) return g;
        const items = (g.items || []).map(it => {
          const k = norm(it.actividad);
          const eje = porAct[k];
          if (!eje) return it;
          usadas.add(k);
          tocado = true;
          resumen.items++;
          return {
            ...it,
            ejHH: +eje.hh.toFixed(2),
            ejMetrado: +eje.met.toFixed(2),
            // Deja rastro de quién llenó la celda: si el ingeniero ve un número que
            // no tecleó, tiene que poder saber de dónde salió.
            ejFuente: 'tareo-capataz',
            ejActualizadoEn: new Date().toISOString(),
          };
        });
        return { ...g, items };
      });
      if (tocado) {
        batch.update(doc(db, 'Planes_Diarios', plan.id), { grupos, retroalimentadoEn: new Date() });
        resumen.planes++;
      }
    });

    // Actividades que el capataz ejecutó y el plan no tenía: no se inventan filas,
    // se reportan para que el ingeniero decida si eran trabajo no programado.
    Object.keys(porAct).forEach(k => { if (!usadas.has(k)) resumen.sinCruce.push(k); });

    if (resumen.planes > 0) await batch.commit();
  } catch (e) {
    // Nunca debe tumbar el envío del tareo: el registro de campo ya está guardado y
    // es lo que el capataz necesita. Esto es un extra que se reintenta al re-subir.
    console.warn('[retroPlanDiario] no se pudo retroalimentar el plan:', e?.message || e);
  }
  return resumen;
}
