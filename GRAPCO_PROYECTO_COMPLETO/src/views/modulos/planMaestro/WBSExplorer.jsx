// src/views/modulos/planMaestro/WBSExplorer.jsx — Árbol WBS expandible (B21)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import {
  construirArbolWBS, ESTADOS_ACTIVIDAD,
  fmtSoles, fmtNumero, fmtPct,
} from '../../../utils/planMaestroAnalytics';
import EmptyState from '../../../components/EmptyState';

export default function WBSExplorer({ showToast, onEdit, onNuevo }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState(new Set());
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'PlanMaestro'), orderBy('codigo')),
      (snap) => { setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const arbol = useMemo(() => construirArbolWBS(actividades), [actividades]);

  const expandirTodo = () => {
    const todos = new Set();
    const recorrer = (nodos) => {
      for (const n of nodos) {
        todos.add(n.codigo);
        if (n.hijos?.length) recorrer(n.hijos);
      }
    };
    recorrer(arbol);
    setExpandidos(todos);
  };
  const colapsarTodo = () => setExpandidos(new Set());

  const toggleExpand = (codigo) => {
    const nuevo = new Set(expandidos);
    if (nuevo.has(codigo)) nuevo.delete(codigo);
    else nuevo.add(codigo);
    setExpandidos(nuevo);
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando WBS...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>🌳 Estructura WBS del Plan Maestro</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {actividades.length} actividades · Niveles: Partida → Sub-Partida → Actividad
            </p>
          </div>
          <input type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="🔍 Buscar..." style={inpS} />
          <button onClick={expandirTodo} style={btnSec}>⬇ Expandir</button>
          <button onClick={colapsarTodo} style={btnSec}>⬆ Colapsar</button>
          <button onClick={() => onNuevo?.()} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: `0 4px 12px ${BASE.navy}55`,
          }}>
            ➕ NUEVA ACTIVIDAD
          </button>
        </div>
      </div>

      {actividades.length === 0 ? (
        <EmptyState icono="🌳" titulo="Sin actividades en el Plan Maestro"
          descripcion="Crea la primera partida. Luego agrega sub-partidas y actividades. Usa códigos jerárquicos como 02.01.003" />
      ) : (
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', overflowX: 'auto',
        }}>
          <div style={{
            background: BASE.navy, color: '#fff',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: '60px 2fr 80px 100px 110px 120px 110px 100px',
            gap: '8px', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.5px',
            minWidth: '760px',
          }}>
            <span>CÓDIGO</span>
            <span>DESCRIPCIÓN</span>
            <span style={{ textAlign: 'center' }}>UND</span>
            <span style={{ textAlign: 'right' }}>METRADO</span>
            <span style={{ textAlign: 'right' }}>P.U.</span>
            <span style={{ textAlign: 'right' }}>SUBTOTAL</span>
            <span style={{ textAlign: 'right' }}>AVANCE</span>
            <span style={{ textAlign: 'center' }}>ACCIÓN</span>
          </div>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', minWidth: '760px' }}>
            {arbol.map(nodo => (
              <NodoArbol key={nodo.codigo} nodo={nodo} nivel={0}
                expandidos={expandidos} toggleExpand={toggleExpand}
                onEdit={onEdit} filtro={filtro} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodoArbol({ nodo, nivel, expandidos, toggleExpand, onEdit, filtro }) {
  const expandido = expandidos.has(nodo.codigo);
  const tieneHijos = nodo.hijos?.length > 0;

  // Filtro: si hay texto, mostrar solo nodos que matchean (o sus padres)
  const matchesFiltro = !filtro ||
    (nodo.codigo || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (nodo.descripcion || '').toLowerCase().includes(filtro.toLowerCase());

  // Si tiene hijos, agregar su data
  const presupuesto = (nodo.metradoContractual || 0) * (nodo.precioUnitario || 0);
  const pctAvance = nodo.metradoContractual > 0
    ? ((nodo.avanceMetradoAcum || 0) / nodo.metradoContractual) * 100
    : 0;

  const colorNivel = ['#1e3a5f', '#7c3aed', '#6366f1', '#0d9488'][Math.min(nivel, 3)];
  const estado = ESTADOS_ACTIVIDAD[nodo.estado || 'no_iniciada'];

  return (
    <>
      {matchesFiltro && (
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${BASE.border}`,
          display: 'grid',
          gridTemplateColumns: '60px 2fr 80px 100px 110px 120px 110px 100px',
          gap: '8px', alignItems: 'center',
          background: nivel === 0 ? '#f1f5f9' : nivel === 1 ? '#f8fafc' : BASE.white,
          fontSize: nivel <= 1 ? '12.5px' : '12px',
          fontWeight: nivel === 0 ? '900' : nivel === 1 ? '700' : '500',
        }}>
          {/* Código con indentación + chevron */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px',
            paddingLeft: `${nivel * 14}px`, fontFamily: 'monospace',
            fontSize: '11px', color: colorNivel, fontWeight: '900' }}>
            {tieneHijos ? (
              <button onClick={() => toggleExpand(nodo.codigo)} style={{
                width: '18px', height: '18px', borderRadius: '4px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: colorNivel, padding: 0,
              }}>{expandido ? '▼' : '▶'}</button>
            ) : (
              <span style={{ width: '18px', display: 'inline-block' }}></span>
            )}
            {nodo.codigo}
          </span>

          {/* Descripción */}
          <span style={{ color: nivel === 0 ? colorNivel : BASE.text, lineHeight: 1.3 }}>
            {nivel === 0 && '📁 '}
            {nivel === 1 && '📂 '}
            {nivel === 2 && '📑 '}
            {nivel >= 3 && '📋 '}
            {nodo.descripcion || '—'}
            {nodo.estado && (
              <span style={{
                marginLeft: '8px',
                fontSize: '9px', fontWeight: '900', letterSpacing: '0.4px',
                background: estado?.color + '22', color: estado?.color,
                padding: '2px 6px', borderRadius: '6px',
              }}>{estado?.icono} {estado?.label}</span>
            )}
          </span>

          {/* Unidad */}
          <span style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: BASE.muted }}>
            {nodo.esActividadHoja ? (nodo.unidad || '—') : ''}
          </span>

          {/* Metrado */}
          <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px' }}>
            {nodo.esActividadHoja ? fmtNumero(nodo.metradoContractual, 2) : ''}
          </span>

          {/* P.U. */}
          <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', color: BASE.muted }}>
            {nodo.esActividadHoja && nodo.precioUnitario ? fmtSoles(nodo.precioUnitario) : ''}
          </span>

          {/* Subtotal */}
          <span style={{ textAlign: 'right', fontWeight: '900', color: BASE.navy, fontSize: '11.5px' }}>
            {nodo.esActividadHoja && presupuesto > 0 ? fmtSoles(presupuesto) : ''}
          </span>

          {/* Avance */}
          <span style={{ textAlign: 'right', fontSize: '11px' }}>
            {nodo.esActividadHoja && nodo.metradoContractual > 0 && (
              <span>
                <span style={{
                  color: pctAvance >= 100 ? BASE.green : pctAvance >= 50 ? BASE.gold : BASE.muted,
                  fontWeight: '900',
                }}>{fmtPct(pctAvance, 0)}</span>
                <br />
                <span style={{ fontSize: '9px', color: BASE.muted, fontFamily: 'monospace' }}>
                  {fmtNumero(nodo.avanceMetradoAcum || 0, 1)}
                </span>
              </span>
            )}
          </span>

          {/* Acción */}
          <span style={{ textAlign: 'center' }}>
            <button onClick={() => onEdit?.(nodo)} style={{
              padding: '4px 10px', borderRadius: '5px',
              background: BASE.navy, color: '#fff', border: 'none',
              fontSize: '9.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
            }}>EDITAR</button>
          </span>
        </div>
      )}

      {expandido && tieneHijos && nodo.hijos.map(hijo => (
        <NodoArbol key={hijo.codigo} nodo={hijo} nivel={nivel + 1}
          expandidos={expandidos} toggleExpand={toggleExpand}
          onEdit={onEdit} filtro={filtro} />
      ))}
    </>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff', minWidth: '160px' };
const btnSec = { padding: '9px 14px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.navy, border: `1px solid ${BASE.border}`, fontSize: '11px', fontWeight: '900', cursor: 'pointer' };
