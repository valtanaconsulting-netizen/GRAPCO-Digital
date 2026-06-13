// src/views/seguridad/HistorialSeguridad.jsx
// Lista combinada de mis reportes (NCs) + mis inspecciones, ordenado por fecha.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { BASE } from '../../utils/styles';
import EmptyState from '../../components/EmptyState';

export default function HistorialSeguridad() {
  const { user } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [filtro, setFiltro] = useState('todos'); // todos | reportes | inspecciones

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'NoConformidades'), orderBy('detectadoEn', 'desc'), limit(50)),
        (snap) => setReportes(snap.docs.map(d => ({ id: d.id, ...d.data(), _coll: 'NoConformidades' })))),
      onSnapshot(query(collection(db, 'InspeccionesSeguridad'), orderBy('creadoEn', 'desc'), limit(50)),
        (snap) => setInspecciones(snap.docs.map(d => ({ id: d.id, ...d.data(), _coll: 'InspeccionesSeguridad' })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const items = useMemo(() => {
    const mios = (a) => a.filter(x => x.reportadoPor === user?.email || x.creadoPor === user?.email);
    let arr = [];
    if (filtro === 'todos' || filtro === 'reportes')      arr = arr.concat(mios(reportes));
    if (filtro === 'todos' || filtro === 'inspecciones')  arr = arr.concat(mios(inspecciones));
    return arr.sort((a, b) => {
      const ta = a.detectadoEn?.seconds ?? a.creadoEn?.seconds ?? 0;
      const tb = b.detectadoEn?.seconds ?? b.creadoEn?.seconds ?? 0;
      return tb - ta;
    });
  }, [reportes, inspecciones, filtro, user]);

  const fmtFecha = (t) => {
    if (!t) return '—';
    const ms = (t.seconds ?? 0) * 1000;
    if (!ms) return '—';
    const d = new Date(ms);
    return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { id: 'todos',        l: 'Todos',         color: BASE.navy },
          { id: 'reportes',     l: 'Reportes/NC',   color: BASE.red },
          { id: 'inspecciones', l: 'Inspecciones',  color: BASE.navyLight },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '8px 14px', borderRadius: '10px',
            border: `1.5px solid ${filtro === f.id ? f.color : BASE.border}`,
            background: filtro === f.id ? f.color : '#fff',
            color: filtro === f.id ? '#fff' : BASE.muted,
            fontSize: '11px', fontWeight: 800, cursor: 'pointer',
          }}>{f.l}</button>
        ))}
      </div>

      {!items.length ? (
        <EmptyState
          icono="📋"
          titulo="Sin actividad aún"
          descripcion="Tus reportes e inspecciones aparecerán aquí."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(it => {
            const esReporte = it._coll === 'NoConformidades';
            const fecha = fmtFecha(it.detectadoEn || it.creadoEn);
            const color = esReporte
              ? (it.severidad === 'critica' || it.severidad === 'alta' ? BASE.red : BASE.gold)
              : (it.resumen?.crit > 0 ? BASE.red : it.resumen?.obs > 0 ? BASE.gold : BASE.green);
            return (
              <div key={it.id} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: '12px', padding: '12px 14px',
                display: 'flex', gap: '10px',
              }}>
                {(it.fotos?.[0]?.url) && (
                  <img src={it.fotos[0].url} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: esReporte ? BASE.red : BASE.navyLight, color: '#fff',
                      padding: '2px 8px', borderRadius: '999px',
                      fontSize: '10px', fontWeight: 800, letterSpacing: '0.4px',
                    }}>{esReporte ? 'REPORTE' : 'INSPECCIÓN'}</span>
                    <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: 700 }}>{fecha}</span>
                    {esReporte && (
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 800,
                        color: it.estado === 'cerrada' ? BASE.green : it.estado === 'tratamiento' ? BASE.gold : BASE.red,
                      }}>{(it.estado || 'abierta').toUpperCase()}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12.5px', color: BASE.navy, fontWeight: 700, marginBottom: '2px' }}>
                    {it.ubicacion || it.frente || 'Sin ubicación'}
                  </p>
                  {esReporte ? (
                    <p style={{ fontSize: '11px', color: BASE.muted, lineHeight: 1.4 }}>{it.descripcion || it.titulo}</p>
                  ) : (
                    <p style={{ fontSize: '11px', color: BASE.muted, lineHeight: 1.4 }}>
                      OK: {it.resumen?.ok ?? 0} · Obs: {it.resumen?.obs ?? 0} · Crítico: {it.resumen?.crit ?? 0}
                      {it.observacionesGenerales ? ` · "${it.observacionesGenerales.slice(0, 80)}…"` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
