// src/views/BimFichaElemento.jsx — Ficha del elemento seleccionado en el visor.
//
// Muestra TODOS los parámetros del elemento agrupados como la paleta de Revit
// (Cotas, Datos de identidad, Restricciones, Materiales…), con buscador.
// Fuente: el store de parámetros completos (bimPropsStore); si no está, usa
// las propiedades que entrega el propio visor (getProperties → displayCategory).
// Patrón Dalux/Speckle: panel flotante sobre el viewport, grupos colapsables.

import React, { useState, useMemo } from 'react';
import { D } from './BimShell';

export default function BimFichaElemento({ seleccion, store, onCerrar }) {
  const [busq, setBusq] = useState('');
  const [cerrados, setCerrados] = useState({});

  const ficha = useMemo(() => {
    if (!seleccion) return null;
    // 1) Store server-side (todos los parámetros)
    const delStore = seleccion.externalId && store?.fichaDe?.(seleccion.externalId);
    if (delStore) return delStore;
    // 2) Fallback: propiedades del visor agrupadas por displayCategory
    const grupos = {};
    (seleccion.properties?.properties || seleccion.properties || []).forEach(p => {
      if (p.hidden || p.displayValue === '' || p.displayValue == null) return;
      const g = p.displayCategory || 'Propiedades';
      (grupos[g] = grupos[g] || []).push({ nombre: p.displayName, valor: String(p.displayValue) });
    });
    return { nombre: seleccion.name || seleccion.properties?.name || `#${seleccion.dbId}`, externalId: seleccion.externalId, grupos };
  }, [seleccion, store]);

  if (!ficha) return null;

  const q = busq.trim().toLowerCase();
  const gruposVisibles = Object.entries(ficha.grupos || {})
    .map(([g, props]) => [g, q ? props.filter(p => p.nombre.toLowerCase().includes(q) || p.valor.toLowerCase().includes(q)) : props])
    .filter(([, props]) => props.length);
  const totalParams = Object.values(ficha.grupos || {}).reduce((s, arr) => s + arr.length, 0);

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, bottom: 12, width: 'min(320px, 80%)', zIndex: 20,
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
      border: `1px solid ${D.border}`, borderRadius: 14, boxShadow: D.shadowHover,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${D.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: D.gold, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              Elemento · {totalParams} parámetros
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: D.text, lineHeight: 1.3, marginTop: 2 }}>{ficha.nombre}</p>
            {(ficha.categoria || ficha.tipo) && (
              <p style={{ fontSize: '11px', color: D.muted, marginTop: 2 }}>{[ficha.categoria, ficha.tipo].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <button onClick={onCerrar} style={{ border: 'none', background: D.soft, color: D.muted, borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>✕</button>
        </div>
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar parámetro o valor…"
          style={{ marginTop: 10, width: '100%', padding: '7px 11px', borderRadius: 8, border: `1px solid ${D.border}`, background: D.soft, fontSize: '12px', color: D.text, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Grupos Revit colapsables */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 12px' }}>
        {gruposVisibles.map(([grupo, props]) => {
          const cerrado = !q && cerrados[grupo];
          return (
            <div key={grupo} style={{ marginBottom: 6 }}>
              <button onClick={() => setCerrados(prev => ({ ...prev, [grupo]: !prev[grupo] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7, border: 'none',
                  background: D.soft, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{ fontSize: '10px', color: D.dim, transform: cerrado ? 'rotate(-90deg)' : 'none', transition: `transform .15s ${D.ease}` }}>▾</span>
                <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: D.text, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{grupo}</span>
                <span style={{ fontSize: '10px', color: D.dim, ...D.num }}>{props.length}</span>
              </button>
              {!cerrado && (
                <div style={{ padding: '4px 2px 2px' }}>
                  {props.map((p, i) => (
                    <div key={i} title={`${p.nombre}: ${p.valor}`}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 9px', borderRadius: 6, fontSize: '11.5px' }}>
                      <span style={{ color: D.muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                      <span style={{ color: D.text, fontWeight: 600, textAlign: 'right', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'copy' }}
                        onClick={() => { try { navigator.clipboard.writeText(p.valor); } catch { /* sin permiso */ } }}>
                        {p.valor}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!gruposVisibles.length && (
          <p style={{ fontSize: '12px', color: D.dim, textAlign: 'center', padding: 20 }}>Sin coincidencias</p>
        )}
      </div>

      {/* Pie: identificador */}
      {ficha.externalId && (
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${D.border}`, background: D.soft }}>
          <p style={{ fontSize: '9.5px', color: D.dim, fontFamily: 'monospace', wordBreak: 'break-all' }}
            title="GUID Revit (externalId) — usado para vincular con partidas GRAPCO">
            {ficha.externalId}
          </p>
        </div>
      )}
    </div>
  );
}
