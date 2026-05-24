// src/views/materiales/ReporteValorizadoS10.jsx
// Reporte de Almacen Fisico Valorizado a fecha de corte (formato S10)
// Reusa el CPP que ya calcula calcularStockActual.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import {
  reporteValorizadoS10,
  fmtSoles,
  fmtCantidad,
  CATEGORIAS_MATERIAL,
} from '../../utils/materialesAnalytics';
import { exportarValorizadoS10 } from '../../utils/excelExport';
import EmptyState from '../../components/EmptyState';

const HOY = new Date().toISOString().split('T')[0];

export default function ReporteValorizadoS10({ showToast }) {
  const { proyectoActivoId, proyectoActivo } = useProyectoActivo();

  const [movs, setMovs] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fechaCorte, setFechaCorte] = useState(HOY);
  const [fechaDesde, setFechaDesde] = useState('');
  const [almacenId, setAlmacenId] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let pending = 3;
    const dec = () => { pending -= 1; if (pending <= 0) setLoading(false); };
    const u1 = onSnapshot(query(collection(db, 'Kardex_Movimientos'), orderBy('fecha', 'desc')),
      (snap) => { setMovs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dec(); },
      (e) => { console.warn('[Kardex]', e); dec(); });
    const u2 = onSnapshot(query(collection(db, 'Materiales'), orderBy('codigo')),
      (snap) => { setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dec(); },
      (e) => { console.warn('[Materiales]', e); dec(); });
    const u3 = onSnapshot(query(collection(db, 'Almacenes'), orderBy('codigo')),
      (snap) => { setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dec(); },
      (e) => { console.warn('[Almacenes]', e); dec(); });
    return () => { u1(); u2(); u3(); };
  }, []);

  const reporte = useMemo(() => {
    return reporteValorizadoS10({
      movimientos: movs,
      materiales,
      almacenes,
      fechaCorte,
      fechaDesde: fechaDesde || null,
      proyectoId: proyectoActivoId,
      almacenId: almacenId || null,
    });
  }, [movs, materiales, almacenes, fechaCorte, fechaDesde, proyectoActivoId, almacenId]);

  const filasFiltradas = useMemo(() => {
    let f = reporte.filas;
    if (categoriaFiltro) f = f.filter(x => x.categoria === categoriaFiltro);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      f = f.filter(x =>
        (x.codigoS10 || '').toLowerCase().includes(q) ||
        (x.codigoInterno || '').toLowerCase().includes(q) ||
        (x.nombre || '').toLowerCase().includes(q)
      );
    }
    return f;
  }, [reporte.filas, categoriaFiltro, busqueda]);

  const totalFiltrado = useMemo(
    () => filasFiltradas.reduce((s, x) => s + (x.subtotal || 0), 0),
    [filasFiltradas]
  );

  const exportar = () => {
    if (!filasFiltradas.length) {
      showToast?.('Sin datos para exportar', 'error');
      return;
    }
    try {
      const almSel = almacenes.find(a => a.id === almacenId);
      const fname = exportarValorizadoS10({
        filas: filasFiltradas,
        fechaCorte,
        fechaDesde: fechaDesde || null,
        totalGeneral: totalFiltrado,
        proyectoNombre: proyectoActivo?.nombre || '—',
        almacenNombre: almSel ? `${almSel.codigo} · ${almSel.nombre}` : 'Todos',
      });
      showToast?.(`✅ Excel generado: ${fname}`, 'success');
    } catch (e) {
      showToast?.('Error al exportar: ' + e.message, 'error');
    }
  };

  if (loading) {
    return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando movimientos del kardex...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER + FILTROS */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px 22px',
        borderLeft: `5px solid #7c3aed`,
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: '#7c3aed', letterSpacing: '0.6px' }}>
          📑 REPORTE S10 · ALMACEN FISICO VALORIZADO
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
          Saldos al {fechaCorte} {fechaDesde && <span style={{ fontSize: '13px', color: BASE.muted }}>(desde {fechaDesde})</span>}
        </h3>
        <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '4px' }}>
          Reconstruye el inventario al CPP usando todos los movimientos hasta la fecha de corte. Equivale al "Saldos Fisicos Valorizados" del S10.
        </p>

        <div style={{
          display: 'grid', gap: '10px', marginTop: '14px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}>
          <Field label="Fecha de corte *">
            <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)} style={inpS} />
          </Field>
          <Field label="Fecha desde (opcional)">
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inpS} />
          </Field>
          <Field label="Almacen">
            <select value={almacenId} onChange={e => setAlmacenId(e.target.value)} style={selS}>
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.nombre}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} style={selS}>
              <option value="">Todas</option>
              {CATEGORIAS_MATERIAL.map(c => <option key={c.id} value={c.id}>{c.icono} {c.label}</option>)}
            </select>
          </Field>
          <Field label="Buscar (S10/codigo/nombre)">
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍" style={inpS} />
          </Field>
          <Field label="&nbsp;">
            <button onClick={exportar} style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
              cursor: 'pointer', letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
            }}>📥 EXPORTAR EXCEL</button>
          </Field>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <Stat label="ITEMS CON STOCK" valor={filasFiltradas.length} color={BASE.navy} icono="📦" />
        <Stat label="VALOR TOTAL" valor={fmtSoles(totalFiltrado)} color="#16a34a" icono="💰" />
        <Stat label="ITEMS SIN COD. S10" valor={reporte.materialesSinS10} color={reporte.materialesSinS10 > 0 ? '#dc2626' : '#16a34a'} icono={reporte.materialesSinS10 > 0 ? '⚠️' : '✅'} />
      </div>

      {/* WARNING S10 incompleto */}
      {reporte.materialesSinS10 > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderLeft: '4px solid #dc2626',
          borderRadius: '10px', padding: '12px 16px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b' }}>
            ⚠️ {reporte.materialesSinS10} material(es) sin codigo S10 asignado.
          </p>
          <p style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
            El reporte se genera, pero esos items NO podran exportarse a S10/.s2k. Ve a Catalogo y asignales codigo S10.
          </p>
        </div>
      )}

      {/* TABLA */}
      {filasFiltradas.length === 0 ? (
        <EmptyState icono="📑" titulo="Sin items con stock"
          descripcion="No hay materiales con saldo positivo en la fecha de corte y filtros seleccionados." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '1000px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>#</th>
                  <th style={th()}>Cod. S10</th>
                  <th style={th()}>Cod. Interno</th>
                  <th style={th()}>Material</th>
                  <th style={th()}>Und</th>
                  <th style={th()}>Almacen</th>
                  <th style={th({ textAlign: 'right' })}>Cantidad</th>
                  <th style={th({ textAlign: 'right' })}>P. Unit. (CPP)</th>
                  <th style={th({ textAlign: 'right' })}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((f, i) => (
                  <tr key={`${f.materialId}_${f.almacenId}`} style={{
                    background: i % 2 === 0 ? BASE.white : BASE.bgSoft,
                    borderBottom: `1px solid ${BASE.border}`,
                  }}>
                    <td style={{ ...td(), color: BASE.muted, fontFamily: 'monospace', fontSize: '10.5px' }}>{i + 1}</td>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: '800', color: f.codigoS10.includes('FALTA') ? '#dc2626' : '#7c3aed' }}>
                      {f.codigoS10}
                    </td>
                    <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', color: BASE.muted }}>{f.codigoInterno}</td>
                    <td style={{ ...td(), fontWeight: '700' }}>{f.nombre}</td>
                    <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px' }}>{f.unidad}</td>
                    <td style={{ ...td(), fontSize: '11px', color: BASE.muted }}>{f.almacen}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: '800' }}>
                      {fmtCantidad(f.cantidad)}
                    </td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px' }}>
                      {fmtSoles(f.precioUnitario)}
                    </td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: '#16a34a' }}>
                      {fmtSoles(f.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <td colSpan={8} style={{ ...td(), textAlign: 'right', fontWeight: '900', letterSpacing: '0.6px' }}>
                    TOTAL VALORIZADO
                  </td>
                  <td style={{ ...td(), textAlign: 'right', fontWeight: '900', fontSize: '14px', color: BASE.gold }}>
                    {fmtSoles(totalFiltrado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      {children}
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

const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top', ...extra });
