// src/utils/inicializadorMultiProyecto.js - Bootstrap automatico (B23)

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PROYECTO_DEFAULT_ID, FRENTE_DEFAULT_ID } from '../contexts/ProyectoActivoContext';

export async function asegurarProyectoDefault() {
  try {
    const proyRef = doc(db, 'Proyectos', PROYECTO_DEFAULT_ID);
    const proySnap = await getDoc(proyRef);
    if (!proySnap.exists()) {
      await setDoc(proyRef, {
        codigo: 'PTARI-DEFAULT',
        nombre: 'PROYECTO PTARI (Default)',
        descripcionCorta: 'Proyecto migrado automaticamente. Editalo o crea proyectos nuevos.',
        cliente: 'GRAPCO Demo',
        tipoObra: 'hidraulica',
        ubicacion: { lat: -12.0464, lng: -77.0428, ciudad: 'Lima', region: 'Lima', direccion: 'Lima Sur, Peru' },
        presupuestoContractual: 5000000,
        moneda: 'PEN',
        fechaInicioContractual: new Date(),
        fechaFinContractual: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        plazoDias: 365,
        margenMetaPct: 15,
        estado: 'en_ejecucion',
        avancePctActual: 0,
        cpiActual: 1.0,
        spiActual: 1.0,
        color: '#1e3a5f',
        creadoEn: serverTimestamp(),
        creadoPor: 'sistema',
        esDefault: true,
      });
    }

    const frenteRef = doc(db, 'Frentes', FRENTE_DEFAULT_ID);
    const frenteSnap = await getDoc(frenteRef);
    if (!frenteSnap.exists()) {
      await setDoc(frenteRef, {
        codigo: 'F-GENERAL',
        nombre: 'Frente General',
        descripcion: 'Frente unico migrado automaticamente.',
        proyectoId: PROYECTO_DEFAULT_ID,
        responsable: 'Sin asignar',
        presupuestoFrente: 5000000,
        avancePctActual: 0,
        color: '#7c3aed',
        orden: 1,
        activo: true,
        creadoEn: serverTimestamp(),
        creadoPor: 'sistema',
        esDefault: true,
      });
    }

    return { ok: true };
  } catch (e) {
    console.error('[Bootstrap] Error:', e);
    return { ok: false, error: e.message };
  }
}

export function withProyectoFrente(proyectoId, frenteId) {
  return {
    proyectoId: proyectoId || PROYECTO_DEFAULT_ID,
    frenteId: frenteId && frenteId !== '__TODOS__' ? frenteId : FRENTE_DEFAULT_ID,
  };
}
