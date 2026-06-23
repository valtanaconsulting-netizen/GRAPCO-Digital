// src/views/PersonalBaseDatos.jsx
// Buscador "Base de datos GRAPCO": TODA la gente que ha trabajado en la empresa
// (roster global), con su perfil/historial, para traerla a este proyecto sin re-tipear.
//   · Dedup por DNI (una ficha por persona aunque haya estado en varias obras)
//   · Búsqueda por nombre/DNI/cuadrilla/proyecto · orden alfabético (apellido nombre)
//   · Asistencia/puntualidad agregada desde Asistencia_Diaria (días, % puntual, tardanzas)
//   · Tiempo (ingreso→salida) y proyectos donde trabajó
//   · "➕ Traer a este proyecto" → crea su ficha en el proyecto activo

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE, CARGOS_CORTO } from '../utils/styles';

const META_ENTRADA_MIN = 7 * 60 + 30; // 07:30 (igual que AsistenciaDiaria)
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const diasEntre = (ini, fin) => {
  const a = ini ? new Date(ini) : null, b = fin ? new Date(fin) : new Date();
  if (!a || isNaN(a)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
};
const fmtTiempo = (d) => {
  if (d == null) return '—';
  if (d < 31) return `${d} d`;
  const m = Math.floor(d / 30); return m < 12 ? `${m} mes${m !== 1 ? 'es' : ''}` : `${(d / 365).toFixed(1)} año(s)`;
};

export default function PersonalBaseDatos({ personalTodos = [], cuadrillasDB = {}, proyectos = [], proyectoActivoId, onClose, showToast }) {
  const [asisDocs, setAsisDocs] = useState(null); // null = cargando
  const [busq, setBusq] = useState('');
  const [filtroFuncion, setFiltroFuncion] = useState(''); // '' = todas las funciones/especialidades
  const [trayendo, setTrayendo] = useState('');

  // Asistencia de TODA la empresa (una sola lectura) → agregada por personalId.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'Asistencia_Diaria'));
        if (!cancel) setAsisDocs(snap.docs.map(d => d.data()));
      } catch (e) { console.warn('[BaseDatos][asistencia]', e); if (!cancel) setAsisDocs([]); }
    })();
    return () => { cancel = true; };
  }, []);

  const asisPorId = useMemo(() => {
    const m = {};
    (asisDocs || []).forEach(r => {
      const id = r.personalId; if (!id) return;
      if (!m[id]) m[id] = { dias: 0, puntual: 0, tarde: 0 };
      m[id].dias += 1;
      const er = r.entradaReal;
      if (er && /^\d{2}:\d{2}$/.test(er)) {
        (toMin(er) - META_ENTRADA_MIN <= 0) ? m[id].puntual += 1 : m[id].tarde += 1;
      }
    });
    return m;
  }, [asisDocs]);

  const nombreProy = (id) => proyectos.find(p => p.id === id)?.nombre || id || '—';
  const cuadrillaDe = (nombre) => Object.values(cuadrillasDB || {}).find(c => (c.miembros || []).some(mm => mm.nombre === nombre))?.especialidad
    || (Object.values(cuadrillasDB || {}).find(c => c.capataz === nombre) ? 'Capataz' : '');

  // Dedup por DNI (o nombre) → una persona aunque tenga fichas en varias obras.
  const personas = useMemo(() => {
    const map = {};
    (personalTodos || []).forEach(p => {
      const key = (p.dni || p.nombre || p.id || '').toString().trim().toUpperCase();
      if (!key) return;
      if (!map[key]) map[key] = { nombre: p.nombre || '—', dni: p.dni || '', telefono: p.telefono || '', cargo: p.cargo || 'Operario', fechaNac: p.fechaNac || '', proyIds: new Set(), docIds: [], ingreso: p.fechaIngreso || '', salida: p.fechaSalida || '' };
      const r = map[key];
      r.docIds.push(p.id);
      if (!r.telefono && p.telefono) r.telefono = p.telefono;
      if (p.proyectoId) r.proyIds.add(p.proyectoId);
      if (p.fechaIngreso && (!r.ingreso || p.fechaIngreso < r.ingreso)) r.ingreso = p.fechaIngreso;
      if (p.fechaSalida && p.fechaSalida > r.salida) r.salida = p.fechaSalida;
      if (!r.nombre || r.nombre === '—') r.nombre = p.nombre;
    });
    return Object.values(map).map(r => {
      const a = r.docIds.reduce((acc, id) => {
        const x = asisPorId[id]; if (x) { acc.dias += x.dias; acc.puntual += x.puntual; acc.tarde += x.tarde; } return acc;
      }, { dias: 0, puntual: 0, tarde: 0 });
      const pctPuntual = (a.puntual + a.tarde) > 0 ? Math.round((a.puntual / (a.puntual + a.tarde)) * 100) : null;
      return {
        ...r, ...a, pctPuntual,
        tiempo: diasEntre(r.ingreso, r.salida),
        enEsteProyecto: r.proyIds.has(proyectoActivoId),
        especialidad: cuadrillaDe(r.nombre),
      };
    }).sort((x, y) => (x.nombre || '').localeCompare(y.nombre || '', 'es'));
  }, [personalTodos, asisPorId, proyectoActivoId, cuadrillasDB]);

  // Funciones/especialidades presentes en la base (para el filtro desplegable).
  const funcionesDisponibles = useMemo(() => {
    const set = new Set();
    personas.forEach(p => { if (p.especialidad) set.add(p.especialidad); });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [personas]);

  const filtradas = useMemo(() => {
    const b = busq.trim().toLowerCase();
    const f = filtroFuncion.trim().toLowerCase();
    return personas.filter(p => {
      if (f && (p.especialidad || '').toLowerCase() !== f) return false;
      if (!b) return true;
      return (
        (p.nombre || '').toLowerCase().includes(b) ||
        (p.dni || '').toLowerCase().includes(b) ||
        (p.telefono || '').toLowerCase().includes(b) ||
        (p.cargo || '').toLowerCase().includes(b) ||
        (p.especialidad || '').toLowerCase().includes(b) ||
        [...p.proyIds].some(id => nombreProy(id).toLowerCase().includes(b))
      );
    });
  }, [personas, busq, filtroFuncion]);

  const traer = async (p) => {
    if (p.enEsteProyecto) { showToast?.('Ya está en este proyecto', 'info'); return; }
    if (!proyectoActivoId) { showToast?.('Selecciona un proyecto activo', 'warning'); return; }
    setTrayendo(p.dni || p.nombre);
    try {
      const id = `pers_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'Personal', id), {
        nombre: p.nombre, dni: p.dni || '', telefono: p.telefono || '', cargo: p.cargo || 'Operario', fechaNac: p.fechaNac || '',
        cuadrillaId: '', fechaIngreso: new Date().toISOString().slice(0, 10), fechaSalida: '',
        proyectoId: proyectoActivoId, activo: true,
        creadoEn: serverTimestamp(), origen: 'base-datos-grapco',
      });
      showToast?.(`✅ ${p.nombre} agregado a este proyecto`, 'success');
      p.enEsteProyecto = true; setTrayendo('');
    } catch (e) { console.error('[traer]', e); showToast?.('Error: ' + e.message, 'error'); setTrayendo(''); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: BASE.white, borderRadius: '16px', width: 'min(920px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', padding: '16px 22px', borderBottom: `3px solid ${BASE.gold}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '9.5px', fontWeight: 900, letterSpacing: 1.4, color: BASE.gold }}>🔎 BASE DE DATOS GRAPCO</p>
            <h2 style={{ fontSize: '19px', fontWeight: 900, marginTop: '2px' }}>Toda la gente que ha trabajado en la empresa</h2>
            <p style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px' }}>{personas.length} personas · tráelas a este proyecto sin re-registrar</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', fontWeight: 900, flexShrink: 0 }}>✕</button>
        </div>

        {/* Búsqueda + filtro por función */}
        <div style={{ padding: '12px 22px', borderBottom: `1px solid ${BASE.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍 Buscar por nombre, DNI, teléfono o proyecto…" aria-label="Buscar persona"
            style={{ flex: '1 1 280px', minWidth: 0, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: 600, boxSizing: 'border-box' }} />
          <select value={filtroFuncion} onChange={e => setFiltroFuncion(e.target.value)}
            title="Filtrar por tipo de función (especialidad de cuadrilla)"
            style={{ flex: '0 0 auto', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${filtroFuncion ? BASE.gold : BASE.border}`, fontSize: '13px', fontWeight: 700, color: BASE.navy, background: '#fff', cursor: 'pointer' }}>
            <option value="">🔧 Todas las funciones</option>
            {funcionesDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {asisDocs === null && <p style={{ textAlign: 'center', color: BASE.muted, padding: '20px', fontSize: '12px' }}>⏳ Cargando historial de asistencia…</p>}
          {asisDocs !== null && filtradas.length === 0 && <p style={{ textAlign: 'center', color: BASE.muted, padding: '20px', fontSize: '12px' }}>Sin resultados para «{busq}».</p>}
          {filtradas.map((p, i) => (
            <div key={(p.dni || p.nombre) + i} style={{ border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: p.enEsteProyecto ? '#f0fdf4' : BASE.white }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <p style={{ fontSize: '13.5px', fontWeight: 900, color: BASE.navy }}>{p.nombre}</p>
                <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                  {p.dni ? `DNI ${p.dni} · ` : ''}{CARGOS_CORTO?.[p.cargo] || p.cargo}{p.especialidad ? ` · ${p.especialidad}` : ''}
                </p>
                <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                  {p.telefono
                    ? <>📱 <a href={`tel:${p.telefono}`} onClick={e => e.stopPropagation()} style={{ color: BASE.navy, fontWeight: 700, textDecoration: 'none' }}>{p.telefono}</a> · </>
                    : ''}
                  Proyectos: {[...p.proyIds].map(nombreProy).join(', ') || '—'}
                </p>
              </div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
                <Stat l="Tiempo" v={fmtTiempo(p.tiempo)} />
                <Stat l="Asistió" v={p.dias ? `${p.dias} d` : '—'} />
                <Stat l="Puntual" v={p.pctPuntual != null ? `${p.pctPuntual}%` : '—'} c={p.pctPuntual == null ? BASE.muted : p.pctPuntual >= 90 ? '#16a34a' : p.pctPuntual >= 70 ? '#d97706' : '#dc2626'} />
                <Stat l="Tardanzas" v={p.tarde || 0} c={p.tarde > 0 ? '#dc2626' : BASE.muted} />
              </div>
              {/* Acción */}
              {p.enEsteProyecto ? (
                <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '6px 12px', borderRadius: '8px' }}>✓ En este proyecto</span>
              ) : (
                <button onClick={() => traer(p)} disabled={trayendo === (p.dni || p.nombre)} style={{ flexShrink: 0, fontSize: '11.5px', fontWeight: 800, color: '#fff', background: BASE.navy, border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', opacity: trayendo === (p.dni || p.nombre) ? 0.5 : 1 }}>
                  {trayendo === (p.dni || p.nombre) ? '…' : '➕ Traer a este proyecto'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '8px 22px', borderTop: `1px solid ${BASE.border}`, fontSize: '10px', color: BASE.muted }}>
          Asistencia y puntualidad salen del marcador (Asistencia_Diaria, meta 07:30). Observaciones de seguridad/salud y accidentes se sumarán al perfil en una próxima versión.
        </div>
      </div>
    </div>
  );
}

function Stat({ l, v, c }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '54px' }}>
      <p style={{ fontSize: '8.5px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.4px' }}>{l.toUpperCase()}</p>
      <p style={{ fontSize: '13px', fontWeight: 900, color: c || BASE.navy, marginTop: '1px', fontFamily: 'monospace' }}>{v}</p>
    </div>
  );
}
