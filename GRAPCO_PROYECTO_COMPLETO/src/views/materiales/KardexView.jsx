// src/views/materiales/KardexView.jsx — Movimientos historicos con filtros (B19)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { TIPOS_MOVIMIENTO, fmtCantidad, fmtSoles, kardexPorMaterial } from '../../utils/materialesAnalytics';
import EmptyState from '../../components/EmptyState';

export default function KardexView() {
  const [movs, setMovs] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'Kardex_Movimientos'), orderBy('fecha', 'desc')),
        (snap) => { setMovs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'Materiales'),
        (snap) => setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'Almacenes'),
        (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const matMap = useMemo(() => new Map(materiales.map(m => [m.id, m])), [materiales]);
  const almMap = useMemo(() => new Map(almacenes.map(a => [a.id, a])), [almacenes]);

  const filtrados = useMemo(() => {
    return movs.filter(m => {
      if (m.estado === 'anulado') return false;
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (filtroAlmacen && m.almacenId !== filtroAlmacen && m.almacenDestinoId !== filtroAlmacen) return false;
      if (filtroMaterial && m.materialId !== filtroMaterial) return false;
      if (filtroDesde) {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        if (f < new Date(filtroDesde)) return false;
      }
      if (filtroHasta) {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        const hasta = new Date(filtroHasta);
        hasta.setHours(23, 59, 59);
        if (f > hasta) return false;
      }
      return true;
    });
  }, [movs, filtroTipo, filtroAlmacen, filtroMaterial, filtroDesde, filtroHasta]);

  const stats = useMemo(() => {
    let entradas = 0, salidas = 0, valEntradas = 0, valSalidas = 0;
    filtrados.forEach(m => {
      const valor = m.costoTotal || (m.cantidad * (m.costoUnitario || 0));
      if (m.tipo === 'ENTRADA') { entradas++; valEntradas += valor; }
      if (m.tipo === 'SALIDA') { salidas++; valSalidas += valor; }
    });
    return { entradas, salidas, valEntradas, valSalidas };
  }, [filtrados]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando movimientos...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Filtros */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '10px' }}>
          FILTROS
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selS}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_MOVIMIENTO).map(([k, v]) => (
              <option key={k} value={k}>{v.icono} {v.label}</option>
            ))}
          </select>
          <select value={filtroAlmacen} onChange={e => setFiltroAlmacen(e.target.value)} style={selS}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nombre}</option>)}
          </select>
          <select value={filtroMaterial} onChange={e => setFiltroMaterial(e.target.value)} style={selS}>
            <option value="">Todos los materiales</option>
            {materiales.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>)}
          </select>
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={inpS} placeholder="Desde" />
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={inpS} placeholder="Hasta" />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <Stat label="MOVIMIENTOS" valor={filtrados.length} color={BASE.navy} icono="📊" />
        <Stat label="ENTRADAS" valor={stats.entradas} color={BASE.green} icono="⬇️" />
        <Stat label="SALIDAS" valor={stats.salidas} color={BASE.red} icono="⬆️" />
        <Stat label="VALOR ENTRADAS" valor={fmtSoles(stats.valEntradas)} color={BASE.green} icono="💰" />
        <Stat label="VALOR SALIDAS" valor={fmtSoles(stats.valSalidas)} color={BASE.red} icono="💸" />
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <EmptyState icono="📈" titulo="Sin movimientos" descripcion="No hay movimientos que coincidan con el filtro." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Fecha</th>
                  <th style={th()}>Tipo</th>
                  <th style={th()}>Material</th>
                  <th style={th()}>Almacen</th>
                  <th style={th({ textAlign: 'right' })}>Cantidad</th>
                  <th style={th({ textAlign: 'right' })}>Costo unit.</th>
                  <th style={th({ textAlign: 'right' })}>Costo total</th>
                  <th style={th()}>Doc/Vale</th>
                  <th style={th()}>Por</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 200).map((m, i) => {
                  const tipo = TIPOS_MOVIMIENTO[m.tipo];
                  const mat = matMap.get(m.materialId);
                  const alm = almMap.get(m.almacenId);
                  const almDest = m.almacenDestinoId ? almMap.get(m.almacenDestinoId) : null;
                  const fecha = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
                  const fechaStr = fecha.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
                  return (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '10.5px' }}>{fechaStr}</td>
                      <td style={td()}>
                        <span style={{
                          background: (tipo?.color || '#999') + '22', color: tipo?.color || '#999',
                          padding: '3px 9px', borderRadius: '10px',
                          fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                        }}>{tipo?.icono} {m.tipo}</span>
                      </td>
                      <td style={td()}>
                        <p style={{ fontWeight: '700', fontSize: '12px' }}>{mat?.nombre || m.materialId}</p>
                        <p style={{ fontSize: '10px', color: BASE.muted, fontFamily: 'monospace' }}>{mat?.codigo}</p>
                      </td>
                      <td style={{ ...td(), fontSize: '11px' }}>
                        {alm?.codigo || m.almacenId}
                        {almDest && ` → ${almDest.codigo}`}
                      </td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '800', fontFamily: 'monospace' }}>
                        {fmtCantidad(m.cantidad, m.unidad)}
                      </td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontSize: '11px' }}>
                        {m.costoUnitario ? `S/. ${m.costoUnitario}` : '—'}
                      </td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: tipo?.color || BASE.navy }}>
                        {m.costoTotal ? fmtSoles(m.costoTotal) : '—'}
                      </td>
                      <td style={{ ...td(), fontSize: '11px', color: BASE.muted, fontFamily: 'monospace' }}>
                        {m.numVale || m.numGuiaRemision || m.numOC || m.numFactura || '—'}
                      </td>
                      <td style={{ ...td(), fontSize: '10.5px', color: BASE.muted }}>
                        {(m.registradoPor || m.creadoPor || '').split('@')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtrados.length > 200 && (
            <p style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>
              Mostrando los primeros 200 movimientos. Aplica filtros para ver mas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, valor, color, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '12px 16px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{label}</p>
        <span style={{ fontSize: '14px', opacity: 0.5 }}>{icono}</span>
      </div>
      <p style={{ fontSize: '18px', fontWeight: '900', color, marginTop: '3px' }}>{valor}</p>
    </div>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff', width: '100%' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top', ...extra });
