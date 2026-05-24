// src/hooks/useFirebaseData.js — Hooks para suscripciones a Firebase

import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection, onSnapshot, query, orderBy, doc, where, limit,
} from 'firebase/firestore';

// Hook: registros de campo (con cálculo de HH acumuladas para una fecha específica)
//
// IMPORTANTE: la query NO usa orderBy('timestamp') porque eso EXCLUYE silenciosamente
// los documentos que no tengan ese campo (registros legacy). Trae todo y ordena en
// cliente. Esto evita que el dashboard muestre 0 registros si algunos no migraron
// el campo timestamp.
export function useHistorial(fechaActual) {
  const [historial, setHistorial] = useState([]);
  const [hhAcumuladasDia, setHhAcumuladasDia] = useState({});

  useEffect(() => {
    try {
      // Ordenamos y limitamos en SERVIDOR → menos bytes en el wire y
      // sin necesidad de ordenar 5k registros en el cliente cada vez.
      // 5000 cubre ~3 años de obra; suficiente para todos los análisis.
      const q = query(
        collection(db, 'Registros_Campo'),
        orderBy('fecha', 'desc'),
        limit(5000),
      );
      return onSnapshot(q, snap => {
        try {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setHistorial(docs);
          const acum = {};
          docs.filter(r => r && r.fecha === fechaActual).forEach(reg =>
            (reg.detalleTareo || []).forEach(t => {
              if (!t || !t.nombre) return;
              acum[t.nombre] = (acum[t.nombre] || 0) + (parseFloat(t.hn) || 0);
            })
          );
          setHhAcumuladasDia(acum);
        } catch (err) { console.error('[useHistorial snap]', err); }
      }, err => console.error('[useHistorial onSnapshot] permission/red error:', err.code || err.message, err));
    } catch (err) { console.error('[useHistorial setup]', err); }
  }, [fechaActual]);

  return { historial, hhAcumuladasDia };
}

// Hook: cuadrillas
export function useCuadrillas() {
  const [cuadrillasDB, setCuadrillasDB] = useState({});

  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'Cuadrillas'), snap => {
        try {
          const data = {};
          snap.docs.forEach(d => {
            if (d?.exists()) data[d.id] = d.data() || {};
          });
          setCuadrillasDB(data);
        } catch (err) { console.warn('[snap cuadrillas]', err); }
      }, err => console.warn('[onSnapshot cuadrillas]', err));
    } catch (err) { console.warn('[useEffect cuadrillas]', err); }
  }, []);

  return cuadrillasDB;
}

// Hook: personal
export function usePersonal() {
  const [personalDB, setPersonalDB] = useState([]);

  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'Personal'), snap => {
        try {
          setPersonalDB(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p && p.nombre));
        } catch (err) { console.warn('[snap personal]', err); }
      }, err => console.warn('[onSnapshot personal]', err));
    } catch (err) { console.warn('[useEffect personal]', err); }
  }, []);

  return personalDB;
}

// Hook: planes diarios
export function usePlanesDiarios() {
  const [planesDiarios, setPlanesDiarios] = useState([]);

  useEffect(() => {
    try {
      const q = query(collection(db, 'Planes_Diarios'), orderBy('fecha', 'desc'));
      return onSnapshot(q, snap => {
        try {
          setPlanesDiarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) { console.warn('[snap PD]', err); }
      }, err => console.warn('[onSnapshot PD]', err));
    } catch (err) { console.warn('[useEffect PD]', err); }
  }, []);

  return planesDiarios;
}

// Hook: configuración global de la app (tarifas, parámetros)
// Documento único: Configuracion/global → { tarifas: {Capataz: 25, Operario: 18, ...} }
export function useConfiguracion() {
  const [config, setConfig] = useState({ tarifas: {}, cargado: false });

  useEffect(() => {
    try {
      return onSnapshot(doc(db, 'Configuracion', 'global'), snap => {
        try {
          if (snap.exists()) {
            const data = snap.data() || {};
            setConfig({
              tarifas: data.tarifas || {},
              cargado: true,
            });
          } else {
            setConfig({ tarifas: {}, cargado: true });
          }
        } catch (err) { console.warn('[snap config]', err); }
      }, err => console.warn('[onSnapshot config]', err));
    } catch (err) { console.warn('[useEffect config]', err); }
  }, []);

  return config;
}

// Hook: lee toda la asistencia diaria del proyecto activo.
// Retorna { porFecha: { 'YYYY-MM-DD': {hn, he, total, obreros} }, porSemana: {1:{...}, 2:{...}} }
export function useAsistenciaDiaria(proyectoId) {
  const [data, setData] = useState({ porFecha: {}, porSemana: {}, raw: [] });

  useEffect(() => {
    if (!proyectoId) return;
    try {
      const q = query(collection(db, 'Asistencia_Diaria'), where('proyectoId', '==', proyectoId));
      return onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const porFecha = {};
        const porSemana = {};
        docs.forEach(r => {
          if (!r.fecha) return;
          if (!porFecha[r.fecha]) porFecha[r.fecha] = { hn: 0, he: 0, total: 0, obreros: 0 };
          porFecha[r.fecha].hn    += parseFloat(r.hn) || 0;
          porFecha[r.fecha].he    += parseFloat(r.he) || 0;
          porFecha[r.fecha].total += parseFloat(r.totalHH) || 0;
          if ((parseFloat(r.totalHH) || 0) > 0) porFecha[r.fecha].obreros += 1;

          // Agregar por semana ISO (lunes inicio)
          const [yy, mm, dd] = r.fecha.split('-').map(Number);
          const d = new Date(Date.UTC(yy, mm - 1, dd));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const semana = Math.ceil((((d - ys) / 86400000) + 1) / 7);
          if (!porSemana[semana]) porSemana[semana] = { hn: 0, he: 0, total: 0 };
          porSemana[semana].hn    += parseFloat(r.hn) || 0;
          porSemana[semana].he    += parseFloat(r.he) || 0;
          porSemana[semana].total += parseFloat(r.totalHH) || 0;
        });
        setData({ porFecha, porSemana, raw: docs });
      }, err => console.warn('[onSnapshot asistencia]', err));
    } catch (err) { console.warn('[useAsistenciaDiaria]', err); }
  }, [proyectoId]);

  return data;
}
