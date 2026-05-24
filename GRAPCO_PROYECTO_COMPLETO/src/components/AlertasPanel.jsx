// src/components/AlertasPanel.jsx
// Panel de alertas — versión compacta colapsable + FILTROS
// Bloque 8: agregada filtración por severidad, capataz, actividad y búsqueda libre

import React, { useState, useMemo } from 'react';
import { BASE } from '../utils/styles';

export default function AlertasPanel({ alertas = [] }) {
  const [expandido, setExpandido]   = useState(false);
  const [verTodas, setVerTodas]     = useState(false);
  const [fSev, setFSev]             = useState('');
  const [fCap, setFCap]             = useState('');
  const [fAct, setFAct]             = useState('');
  const [busq, setBusq]             = useState('');

  if (!alertas.length) return null;

  // Listas únicas para los selects
  const capataces = useMemo(() => {
    const s = new Set(alertas.map(a => a.capataz).filter(Boolean));
    return [...s].sort();
  }, [alertas]);

  const actividades = useMemo(() => {
    const s = new Set();
    alertas.forEach(a => {
      // Extraer nombre de actividad del mensaje (formato: "ACTIVIDAD — IP X.XX se desvía...")
      const match = (a.mensaje || '').match(/^([^—]+)/);
      if (match) s.add(match[1].trim());
    });
    return [...s].sort().slice(0, 50);  // máx 50 opciones para no saturar el dropdown
  }, [alertas]);

  // Aplicar filtros
  const alertasFiltradas = useMemo(() => {
    return alertas.filter(a => {
      if (fSev && a.severidad !== fSev) return false;
      if (fCap && a.capataz !== fCap) return false;
      if (fAct && !(a.mensaje || '').startsWith(fAct)) return false;
      if (busq) {
        const q = busq.toLowerCase();
        const txt = `${a.titulo || ''} ${a.mensaje || ''} ${a.capataz || ''}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [alertas, fSev, fCap, fAct, busq]);

  const altas       = alertasFiltradas.filter(a => a.severidad === 'alta');
  const medias      = alertasFiltradas.filter(a => a.severidad === 'media');
  const colorPrincipal = altas.length > 0 ? '#dc2626' : '#d97706';
  const bgPrincipal    = altas.length > 0 ? '#fef2f2' : '#fffbeb';
  const visibles       = verTodas ? alertasFiltradas : alertasFiltradas.slice(0, 5);
  const hayFiltros     = fSev || fCap || fAct || busq;
  const limpiar = () => { setFSev(''); setFCap(''); setFAct(''); setBusq(''); };

  return (
    <div style={{
      background: expandido ? bgPrincipal : BASE.white,
      border: `1px solid ${expandido ? colorPrincipal + '33' : BASE.border}`,
      borderLeft: `5px solid ${colorPrincipal}`,
      borderRadius: '14px',
      padding: expandido ? '14px 18px' : '10px 16px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
      transition: '0.2s',
    }}>
      <div onClick={() => setExpandido(!expandido)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '10px', cursor: 'pointer',
        marginBottom: expandido ? '12px' : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>{altas.length > 0 ? '🚨' : '⚠️'}</span>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '900', color: colorPrincipal, letterSpacing: '0.4px' }}>
              ALERTAS · {alertas.length} {alertas.length === 1 ? 'detectada' : 'detectadas'}
              {hayFiltros && <span style={{ color: BASE.muted, marginLeft: '6px', fontWeight: '700' }}>
                · {alertasFiltradas.length} con filtros
              </span>}
            </p>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px', fontWeight: '600' }}>
              {altas.length > 0 && (
                <span style={{ color: '#dc2626', fontWeight: '700' }}>
                  {altas.length} crítica{altas.length === 1 ? '' : 's'}
                </span>
              )}
              {altas.length > 0 && medias.length > 0 && ' · '}
              {medias.length > 0 && `${medias.length} de atención`}
              {!expandido && ' · clic para revisar y filtrar'}
            </p>
          </div>
        </div>
        <button style={{
          padding: '7px 14px', background: '#fff', color: colorPrincipal,
          border: `1.5px solid ${colorPrincipal}33`, borderRadius: '8px',
          fontSize: '11px', fontWeight: '800', cursor: 'pointer',
        }}>
          {expandido ? '▲ Ocultar' : '▼ Ver alertas'}
        </button>
      </div>

      {expandido && (
        <>
          {/* Barra de FILTROS */}
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
            border: `1px solid ${BASE.border}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px',
            alignItems: 'end',
          }}>
            <div>
              <label style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>SEVERIDAD</label>
              <select value={fSev} onChange={e => setFSev(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: '#fff' }}>
                <option value="">Todas</option>
                <option value="alta">Solo críticas</option>
                <option value="media">Solo atención</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>CAPATAZ</label>
              <select value={fCap} onChange={e => setFCap(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: '#fff' }}>
                <option value="">Todos</option>
                {capataces.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>ACTIVIDAD</label>
              <select value={fAct} onChange={e => setFAct(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: '#fff' }}>
                <option value="">Todas</option>
                {actividades.map(a => <option key={a} value={a}>{a.length > 35 ? a.slice(0, 35) + '…' : a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>BUSCAR</label>
              <input type="text" value={busq} onChange={e => setBusq(e.target.value)} placeholder="Texto libre..."
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: '#fff' }} />
            </div>
            {hayFiltros && (
              <button onClick={limpiar} style={{
                padding: '6px 10px', background: '#fee2e2', color: '#dc2626',
                border: 'none', borderRadius: '6px', fontSize: '11px',
                fontWeight: '800', cursor: 'pointer',
              }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {alertasFiltradas.length === 0 ? (
            <p style={{ fontSize: '12px', color: BASE.muted, padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
              Ningún resultado con los filtros aplicados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {visibles.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 14px', background: '#fff', borderRadius: '10px',
                  border: `1px solid ${a.color}22`,
                  borderLeft: `3px solid ${a.color}`,
                }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>{a.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: a.color, marginBottom: '3px' }}>
                      {a.titulo}
                      {a.severidad === 'alta' && (
                        <span style={{
                          marginLeft: '8px', background: a.color, color: '#fff',
                          padding: '2px 8px', borderRadius: '10px',
                          fontSize: '9px', fontWeight: '900', letterSpacing: '0.5px',
                        }}>CRÍTICA</span>
                      )}
                    </p>
                    <p style={{ fontSize: '11px', color: BASE.text, lineHeight: 1.5 }}>{a.mensaje}</p>
                    {(a.fecha || a.capataz) && (
                      <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontWeight: '600' }}>
                        {a.fecha && <span>📅 {a.fecha}</span>}
                        {a.fecha && a.capataz && <span> · </span>}
                        {a.capataz && <span>👷 {a.capataz}</span>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {alertasFiltradas.length > 5 && (
            <button onClick={(e) => { e.stopPropagation(); setVerTodas(!verTodas); }} style={{
              marginTop: '10px', padding: '8px 14px', width: '100%',
              background: '#fff', color: colorPrincipal,
              border: `1.5px dashed ${colorPrincipal}55`,
              borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
            }}>
              {verTodas ? `▲ Mostrar solo 5` : `▼ Ver las ${alertasFiltradas.length} alertas`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
