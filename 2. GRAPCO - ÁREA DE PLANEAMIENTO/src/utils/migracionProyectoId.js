// src/utils/migracionProyectoId.js — Retro-llenado de proyectoId (Fase 1)
//
// Asigna proyectoId a documentos antiguos en:
//   - Almacenes
//   - Kardex_Movimientos
//   - Registros_Campo  (huérfanos guardados antes del fix de Capataz.jsx)
//
// Idempotente: solo toca documentos que NO tengan proyectoId.

import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PROYECTO_DEFAULT_ID, FRENTE_DEFAULT_ID } from '../contexts/ProyectoActivoContext';

const BATCH_SIZE = 400; // limite Firestore: 500 ops/batch

/**
 * Cuenta cuantos docs faltan migrar (sin escribir).
 */
export async function diagnosticarMigracionProyectoId() {
  const result = {
    almacenes: { total: 0, sinProyecto: 0 },
    kardex: { total: 0, sinProyecto: 0 },
    registrosCampo: { total: 0, sinProyecto: 0 },
  };

  const almSnap = await getDocs(collection(db, 'Almacenes'));
  result.almacenes.total = almSnap.size;
  result.almacenes.sinProyecto = almSnap.docs.filter(d => !d.data().proyectoId).length;

  const kxSnap = await getDocs(collection(db, 'Kardex_Movimientos'));
  result.kardex.total = kxSnap.size;
  result.kardex.sinProyecto = kxSnap.docs.filter(d => !d.data().proyectoId).length;

  const rcSnap = await getDocs(collection(db, 'Registros_Campo'));
  result.registrosCampo.total = rcSnap.size;
  result.registrosCampo.sinProyecto = rcSnap.docs.filter(d => !d.data().proyectoId).length;

  return result;
}

/**
 * Ejecuta la migracion. Asigna proyectoId al PROYECTO_DEFAULT_ID a todos los docs sin proyectoId.
 *
 * @param {string} [proyectoIdDestino] - Por default usa PROYECTO_DEFAULT_ID
 * @param {Function} [onProgress] - Callback con {coleccion, procesados, totalAMigrar}
 * @param {string} [frenteIdDestino] - Frente para Registros_Campo (opcional). Default: FRENTE_DEFAULT_ID
 */
export async function migrarProyectoId(proyectoIdDestino = PROYECTO_DEFAULT_ID, onProgress, frenteIdDestino = FRENTE_DEFAULT_ID) {
  const proyectoId = proyectoIdDestino || PROYECTO_DEFAULT_ID;
  const frenteId = frenteIdDestino || FRENTE_DEFAULT_ID;
  const summary = { almacenes: 0, kardex: 0, registrosCampo: 0, errores: [] };

  // 1. Almacenes
  try {
    const snap = await getDocs(collection(db, 'Almacenes'));
    const aMigrar = snap.docs.filter(d => !d.data().proyectoId);
    for (let i = 0; i < aMigrar.length; i += BATCH_SIZE) {
      const lote = aMigrar.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      lote.forEach(d => {
        batch.update(doc(db, 'Almacenes', d.id), {
          proyectoId,
          tipoInventario: d.data().tipoInventario || 'MATERIALES',
          migradoEn: new Date().toISOString(),
        });
      });
      await batch.commit();
      summary.almacenes += lote.length;
      onProgress?.({ coleccion: 'Almacenes', procesados: summary.almacenes, totalAMigrar: aMigrar.length });
    }
  } catch (e) {
    summary.errores.push(`Almacenes: ${e.message}`);
  }

  // 2. Kardex_Movimientos
  try {
    const snap = await getDocs(collection(db, 'Kardex_Movimientos'));
    const aMigrar = snap.docs.filter(d => !d.data().proyectoId);
    for (let i = 0; i < aMigrar.length; i += BATCH_SIZE) {
      const lote = aMigrar.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      lote.forEach(d => {
        const data = d.data();
        const update = {
          proyectoId,
          migradoEn: new Date().toISOString(),
        };
        // Si no tiene moneda, asumir PEN (multimoneda fase 2)
        if (!data.moneda) {
          update.moneda = 'PEN';
          update.tipoCambio = 1;
          update.costoUnitarioPEN = data.costoUnitario || 0;
          update.costoTotalPEN = data.costoTotal || 0;
        }
        batch.update(doc(db, 'Kardex_Movimientos', d.id), update);
      });
      await batch.commit();
      summary.kardex += lote.length;
      onProgress?.({ coleccion: 'Kardex_Movimientos', procesados: summary.kardex, totalAMigrar: aMigrar.length });
    }
  } catch (e) {
    summary.errores.push(`Kardex: ${e.message}`);
  }

  // 3. Registros_Campo (huérfanos guardados antes del fix de Capataz.jsx)
  // Para cada huérfano se intenta auto-asignar:
  //   1. proyectoId: nombre del capataz → /Usuarios.proyectoIdAsignado
  //   2. frenteId: nombre del capataz → /Usuarios.frenteIdAsignado, o primer frente del proyecto
  //      (si el proyecto tiene un solo frente real, o el frente "principal" marcado)
  // Si no hay match, cae a los defaults pasados por parámetro.
  try {
    // Mapa nombre→{proyectoIdAsignado, frenteIdAsignado} desde /Usuarios
    const userMap = new Map();
    try {
      const usnap = await getDocs(collection(db, 'Usuarios'));
      usnap.docs.forEach(u => {
        const d = u.data();
        if (d.nombre && d.proyectoIdAsignado) {
          userMap.set(d.nombre.trim().toUpperCase(), {
            proyectoId: d.proyectoIdAsignado,
            frenteId: d.frenteIdAsignado || null,
          });
        }
      });
    } catch (e) {
      console.warn('[migrarRegistrosCampo] no pude leer Usuarios:', e.message);
    }

    // Mapa proyectoId → primer frente (para fallback cuando el usuario no tiene frenteIdAsignado)
    const frentesPorProyecto = new Map();
    try {
      const fsnap = await getDocs(collection(db, 'Frentes'));
      fsnap.docs.forEach(f => {
        const d = f.data();
        if (!d.proyectoId) return;
        // Excluir el frente "general" default para preferir frentes reales
        if (f.id === 'frente-general') return;
        if (!frentesPorProyecto.has(d.proyectoId)) {
          frentesPorProyecto.set(d.proyectoId, f.id);
        }
      });
    } catch (e) {
      console.warn('[migrarRegistrosCampo] no pude leer Frentes:', e.message);
    }

    const snap = await getDocs(collection(db, 'Registros_Campo'));
    const aMigrar = snap.docs.filter(d => !d.data().proyectoId);
    for (let i = 0; i < aMigrar.length; i += BATCH_SIZE) {
      const lote = aMigrar.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      lote.forEach(d => {
        const data = d.data();
        const capatazKey = (data.capataz || '').trim().toUpperCase();
        const userInfo = userMap.get(capatazKey);
        const proyectoIdAuto = userInfo?.proyectoId || proyectoId;
        const frenteIdAuto = data.frenteId
          || userInfo?.frenteId
          || frentesPorProyecto.get(proyectoIdAuto)
          || frenteId;
        batch.update(doc(db, 'Registros_Campo', d.id), {
          proyectoId: proyectoIdAuto,
          frenteId: frenteIdAuto,
          migradoEn: new Date().toISOString(),
        });
      });
      await batch.commit();
      summary.registrosCampo += lote.length;
      onProgress?.({ coleccion: 'Registros_Campo', procesados: summary.registrosCampo, totalAMigrar: aMigrar.length });
    }
  } catch (e) {
    summary.errores.push(`Registros_Campo: ${e.message}`);
  }

  return summary;
}
