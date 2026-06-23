// src/views/compras/CotizacionesView.jsx — Precios de mercado (Opción A)
//
// Base curada en Firestore (colección PreciosMercado), org-wide (no por proyecto:
// el precio de un material es referencia de mercado, sirve para toda la empresa).
// Al buscar un material: precios por proveedor, fecha, antigüedad (semáforo de
// frescura), precio sugerido (más barato vigente) y dispersión. Sin scraping.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const FORM_INICIAL = {
  material: '', unidad: 'UND', proveedor: '', precio: '',
  moneda: 'PEN', fecha: hoyISO(), categoria: '', notas: '',
};

const UNIDADES = ['UND', 'M', 'M2', 'M3', 'KG', 'BLS', 'GLB', 'PZA', 'JGO', 'ML', 'PLN', 'RLL', 'LT', 'GAL'];

// Antigüedad → estado semáforo
function frescura(fechaISO) {
  if (!fechaISO) return { dias: null, label: 'Sin fecha', color: BASE.muted, bg: '#f1f5f9' };
  const d = Math.floor((Date.now() - new Date(fechaISO + 'T00:00:00').getTime()) / 86400000);
  if (d <= 30)  return { dias: d, label: `Reciente · ${d}d`,      color: '#15803d', bg: '#dcfce7' };
  if (d <= 90)  return { dias: d, label: `Vigente · ${d}d`,       color: '#b45309', bg: '#fef3c7' };
  return            { dias: d, label: `Desactualizado · ${d}d`, color: '#b91c1c', bg: '#fee2e2' };
}

const fmt = (n, moneda) => {
  const s = (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === 'USD' ? `US$ ${s}` : `S/ ${s}`;
};

export default function CotizacionesView({ showToast }) {
  const { user } = useAuth();
  const [precios, setPrecios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null); // 'NUEVO' | docId | null
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'PreciosMercado'), orderBy('material')),
      (snap) => { setPrecios(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.warn('[PreciosMercado]', e); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Agrupar por material (normalizado)
  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const map = {};
    precios.forEach(p => {
      const key = (p.material || '').trim().toLowerCase();
      if (!key) return;
      if (q && !key.includes(q) && !(p.proveedor || '').toLowerCase().includes(q)) return;
      if (!map[key]) map[key] = { material: p.material, unidad: p.unidad, items: [] };
      map[key].items.push(p);
    });
    return Object.values(map)
      .map(g => {
        const items = [...g.items].sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
        const vigentes = items.filter(i => {
          const f = frescura(i.fecha);
          return f.dias != null && f.dias <= 90;
        });
        const base = vigentes.length ? vigentes : items;
        const sugerido = base[0] || null;            // más barato vigente
        const min = items[0], max = items[items.length - 1];
        const spreadPct = (min && max && Number(min.precio) > 0)
          ? ((Number(max.precio) - Number(min.precio)) / Number(min.precio)) * 100
          : 0;
        return { ...g, items, sugerido, min, max, spreadPct, hayVigente: vigentes.length > 0 };
      })
      .sort((a, b) => a.material.localeCompare(b.material));
  }, [precios, busqueda]);

  const guardar = async () => {
    if (!form.material.trim() || !form.proveedor.trim() || !(parseFloat(form.precio) > 0)) {
      showToast?.('Material, proveedor y precio (>0) son obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        material: form.material.trim(),
        unidad: form.unidad || 'UND',
        proveedor: form.proveedor.trim(),
        precio: parseFloat(form.precio) || 0,
        moneda: form.moneda === 'USD' ? 'USD' : 'PEN',
        fecha: form.fecha || hoyISO(),
        categoria: form.categoria.trim() || null,
        notas: form.notas.trim() || null,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'PreciosMercado'), data);
        showToast?.('✅ Precio registrado', 'success');
      } else {
        await updateDoc(doc(db, 'PreciosMercado', editando), data);
        showToast?.('✅ Precio actualizado', 'success');
      }
      setEditando(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro de precio?')) return;
    try {
      await deleteDoc(doc(db, 'PreciosMercado', id));
      showToast?.('Registro eliminado', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const abrirNuevo = () => { setForm({ ...FORM_INICIAL, fecha: hoyISO() }); setEditando('NUEVO'); };
  const abrirEditar = (p) => {
    setForm({
      material: p.material || '', unidad: p.unidad || 'UND', proveedor: p.proveedor || '',
      precio: String(p.precio ?? ''), moneda: p.moneda || 'PEN',
      fecha: p.fecha || hoyISO(), categoria: p.categoria || '', notas: p.notas || '',
    });
    setEditando(p.id);
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando precios de mercado...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Aviso de naturaleza referencial */}
      <div style={{
        background: BASE.navySoft, border: `1px solid ${BASE.border}`, borderLeft: `4px solid ${BASE.navy}`,
        borderRadius: '10px', padding: '12px 16px', fontSize: '11.5px', color: BASE.navy, lineHeight: 1.55,
      }}>
        💡 <strong>Precios de referencia de mercado.</strong> Base curada por tu equipo (almacén/logística).
        Registra el precio real de tus proveedores con su fecha; el sistema te marca cuáles están vigentes
        y te sugiere el más conveniente. Es info de toda la empresa (no por proyecto).
      </div>

      {/* Toolbar */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Cotizaciones · Precios de Mercado</p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {grupos.length} material(es) · {precios.length} registros de precio
          </p>
        </div>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar material o proveedor..." aria-label="Buscar material o proveedor"
          style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', minWidth: '220px', flex: '1 1 220px' }} />
        <button onClick={abrirNuevo} style={{
          padding: '10px 20px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
        }}>➕ REGISTRAR PRECIO</button>
      </div>

      {grupos.length === 0 ? (
        <EmptyState icono="🔎"
          titulo={busqueda ? 'Sin resultados' : 'Aún no hay precios cargados'}
          descripcion={busqueda ? 'Prueba con otro término de búsqueda.' : 'Registra el primer precio de mercado de un material.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {grupos.map((g, gi) => (
            <div key={gi} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              {/* Cabecera del material */}
              <div style={{
                padding: '12px 16px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}`,
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <div style={{ flex: '1 1 220px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>
                    {g.material} <span style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: '700' }}>/ {g.unidad}</span>
                  </p>
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                    {g.items.length} proveedor(es) · dispersión {Math.round(g.spreadPct)}%
                  </p>
                </div>
                {g.sugerido && (
                  <div style={{
                    background: g.hayVigente ? '#dcfce7' : '#fef3c7',
                    border: `1px solid ${g.hayVigente ? '#86efac' : '#fcd34d'}`,
                    borderRadius: '8px', padding: '6px 12px', textAlign: 'right',
                  }}>
                    <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>
                      {g.hayVigente ? '✅ SUGERIDO (más barato vigente)' : '⚠️ MÁS BARATO (sin precios vigentes)'}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '900', color: g.hayVigente ? '#15803d' : '#b45309' }}>
                      {fmt(g.sugerido.precio, g.sugerido.moneda)} <span style={{ fontSize: '10px', fontWeight: '700' }}>· {g.sugerido.proveedor}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Tabla de proveedores */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ background: BASE.navy, color: '#fff' }}>
                      <th style={th}>Proveedor</th>
                      <th style={{ ...th, textAlign: 'right' }}>Precio</th>
                      <th style={{ ...th, textAlign: 'center' }}>Fecha</th>
                      <th style={{ ...th, textAlign: 'center' }}>Antigüedad</th>
                      <th style={{ ...th, textAlign: 'left' }}>Notas</th>
                      <th style={{ ...th, textAlign: 'center', width: '90px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((p, i) => {
                      const f = frescura(p.fecha);
                      const esMin = p.id === g.min?.id;
                      return (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                          <td style={{ ...td, fontWeight: '700', color: BASE.navy }}>{p.proveedor}</td>
                          <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: esMin ? '#15803d' : BASE.text }}>
                            {esMin && '▼ '}{fmt(p.precio, p.moneda)}
                          </td>
                          <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace', color: BASE.muted }}>{p.fecha || '—'}</td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
                              background: f.bg, color: f.color, fontSize: '10px', fontWeight: '800',
                            }}>{f.label}</span>
                          </td>
                          <td style={{ ...td, color: BASE.muted, maxWidth: '220px' }}>{p.notas || '—'}</td>
                          <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button onClick={() => abrirEditar(p)} title="Editar"
                              style={accionBtn}>✏️</button>
                            <button onClick={() => eliminar(p.id)} title="Eliminar"
                              style={{ ...accionBtn, color: '#b91c1c' }}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal alta/edición */}
      {editando && (
        <Modal title={editando === 'NUEVO' ? 'Registrar precio de mercado' : 'Editar precio'}
          onClose={() => setEditando(null)} maxW="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Campo label="Material *">
              <input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}
                placeholder="Ej. Cemento Sol Tipo I 42.5 kg" style={inp} />
            </Campo>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Campo label="Unidad" flex="1 1 120px">
                <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} style={inp}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Campo>
              <Campo label="Categoría" flex="2 1 200px">
                <input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ej. Cemento / Acero / Eléctrico" style={inp} />
              </Campo>
            </div>
            <Campo label="Proveedor / Tienda *">
              <input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}
                placeholder="Ej. Sodimac, Promart, Distribuidora X" style={inp} />
            </Campo>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Campo label="Precio *" flex="1 1 120px">
                <input type="number" min="0" step="0.01" value={form.precio}
                  onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="0.00" style={inp} />
              </Campo>
              <Campo label="Moneda" flex="1 1 100px">
                <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })} style={inp}>
                  <option value="PEN">S/ (Soles)</option>
                  <option value="USD">US$ (Dólares)</option>
                </select>
              </Campo>
              <Campo label="Fecha del precio *" flex="1 1 150px">
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inp} />
              </Campo>
            </div>
            <Campo label="Notas (opcional)">
              <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                placeholder="Ej. incluye IGV, mínimo 10 bls, delivery a obra" style={inp} />
            </Campo>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button onClick={() => setEditando(null)} style={btnSec}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btnPrim, opacity: guardando ? 0.6 : 1 }}>
                {guardando ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Campo({ label, children, flex }) {
  return (
    <div style={{ flex: flex || 'auto' }}>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const th = { padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', fontSize: '11.5px', color: BASE.text };
const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', background: '#fff' };
const accionBtn = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' };
const btnPrim = { padding: '10px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer' };
const btnSec = { padding: '10px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '900', cursor: 'pointer' };
