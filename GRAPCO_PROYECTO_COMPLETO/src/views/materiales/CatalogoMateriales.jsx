// src/views/materiales/CatalogoMateriales.jsx — CRUD del catalogo (B19)

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { CATEGORIAS_MATERIAL, UNIDADES_MEDIDA, MERMA_DEFAULT_PCT } from '../../utils/materialesAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const FORM_INICIAL = {
  codigo: '', codigoS10: '', nombre: '', categoria: 'OTRO', unidad: 'UND',
  partidaAPU: '', ratioConsumoTeorico: 0, unidadRatio: 'm3', mermaEstandarPct: MERMA_DEFAULT_PCT,
  stockMinimo: 0, precioReferencia: 0, monedaBase: 'PEN', leadTimeDias: 3,
  proveedoresHabituales: '', requiereLote: false, esConsignado: false, esEquipo: false, esServicio: false,
  activo: true,
};

export default function CatalogoMateriales({ showToast }) {
  const { user } = useAuth();
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Materiales'), orderBy('codigo')),
      (snap) => { setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const abrirNuevo = () => { setForm(FORM_INICIAL); setEditando('NUEVO'); };
  const abrirEditar = (m) => {
    setForm({
      ...FORM_INICIAL, ...m,
      proveedoresHabituales: Array.isArray(m.proveedoresHabituales) ? m.proveedoresHabituales.join(', ') : '',
    });
    setEditando(m.id);
  };

  const guardar = async () => {
    if (!form.codigo || !form.nombre) {
      showToast?.('Codigo y nombre son obligatorios', 'error');
      return;
    }
    if (!form.codigoS10 || !form.codigoS10.trim()) {
      showToast?.('Codigo S10 obligatorio (para export .s2k)', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.toUpperCase().trim(),
        codigoS10: form.codigoS10.toUpperCase().trim(),
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        unidad: form.unidad,
        partidaAPU: form.partidaAPU?.trim() || null,
        ratioConsumoTeorico: parseFloat(form.ratioConsumoTeorico) || 0,
        unidadRatio: form.unidadRatio,
        mermaEstandarPct: parseFloat(form.mermaEstandarPct) || MERMA_DEFAULT_PCT,
        stockMinimo: parseFloat(form.stockMinimo) || 0,
        precioReferencia: parseFloat(form.precioReferencia) || 0,
        leadTimeDias: parseInt(form.leadTimeDias) || 3,
        monedaBase: form.monedaBase || 'PEN',
        proveedoresHabituales: form.proveedoresHabituales
          ? form.proveedoresHabituales.split(',').map(p => p.trim()).filter(Boolean) : [],
        requiereLote: !!form.requiereLote,
        esConsignado: !!form.esConsignado,
        esEquipo: !!form.esEquipo,
        esServicio: !!form.esServicio,
        activo: !!form.activo,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'Materiales'), data);
        showToast?.('✅ Material creado', 'success');
      } else {
        await updateDoc(doc(db, 'Materiales', editando), data);
        showToast?.('✅ Material actualizado', 'success');
      }
      setEditando(null);
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = materiales.filter(m => {
    if (filtroCat && m.categoria !== filtroCat) return false;
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return (m.codigo || '').toLowerCase().includes(f) ||
           (m.codigoS10 || '').toLowerCase().includes(f) ||
           (m.nombre || '').toLowerCase().includes(f) ||
           (m.partidaAPU || '').toLowerCase().includes(f);
  });

  const sinS10 = materiales.filter(m => !m.codigoS10).length;

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando catalogo...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header con filtros */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>Catalogo de Materiales</p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {materiales.length} en total · {filtrados.length} mostrados
            {sinS10 > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 800, marginLeft: 8 }}>
                · ⚠ {sinS10} sin código S10
              </span>
            )}
          </p>
        </div>
        <input
          type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="🔍 Buscar..." aria-label="Buscar material"
          style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', minWidth: '180px' }}
        />
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{
          padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`,
          fontSize: '12.5px', fontWeight: '700', background: '#fff', cursor: 'pointer',
        }}>
          <option value="">Todas las categorias</option>
          {CATEGORIAS_MATERIAL.map(c => <option key={c.id} value={c.id}>{c.icono} {c.label}</option>)}
        </select>
        <button onClick={abrirNuevo} style={{
          padding: '10px 20px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
          cursor: 'pointer', letterSpacing: '0.5px',
          boxShadow: '0 4px 12px rgba(15,42,71,0.35)',
        }}>
          ➕ NUEVO MATERIAL
        </button>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <EmptyState icono="📋" titulo="Sin materiales" descripcion="Agrega el primer material del catalogo." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Cod. S10</th>
                  <th style={th()}>Nombre</th>
                  <th style={th()}>Categoria</th>
                  <th style={th()}>Unidad</th>
                  <th style={th({ textAlign: 'right' })}>Stock min.</th>
                  <th style={th({ textAlign: 'right' })}>Precio ref.</th>
                  <th style={th()}>Partida APU</th>
                  <th style={th({ textAlign: 'center' })}>Activo</th>
                  <th style={th({ textAlign: 'center' })}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, i) => {
                  const cat = CATEGORIAS_MATERIAL.find(c => c.id === m.categoria);
                  return (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', fontWeight: '800', color: BASE.navy }}>{m.codigo}</td>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: m.codigoS10 ? BASE.navy : '#dc2626' }}>
                        {m.codigoS10 || '⚠ FALTA'}
                      </td>
                      <td style={{ ...td(), fontWeight: '700' }}>{m.nombre}</td>
                      <td style={td()}>
                        <span style={{ background: BASE.bgSoft, padding: '3px 9px', borderRadius: '10px', fontSize: '10px', fontWeight: '800', color: BASE.muted }}>
                          {cat?.icono} {m.categoria}
                        </span>
                      </td>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px' }}>{m.unidad}</td>
                      <td style={{ ...td(), textAlign: 'right' }}>{m.stockMinimo || '—'}</td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '700' }}>{m.precioReferencia ? `S/. ${m.precioReferencia}` : '—'}</td>
                      <td style={{ ...td(), color: BASE.muted }}>{m.partidaAPU || '—'}</td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {m.activo !== false ? '✅' : '❌'}
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <button onClick={() => abrirEditar(m)} style={{
                          padding: '5px 12px', borderRadius: '6px', background: BASE.navy, color: '#fff',
                          border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
                        }}>EDITAR</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de edicion */}
      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? 'Nuevo Material' : 'Editar Material'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <Input label="Codigo interno *" value={form.codigo} onChange={v => setForm({...form, codigo: v.toUpperCase()})} />
            <Input label="Codigo S10 *" value={form.codigoS10} onChange={v => setForm({...form, codigoS10: v.toUpperCase()})} placeholder="020201050001" />
            <Select label="Categoria" value={form.categoria} onChange={v => setForm({...form, categoria: v})}
              options={CATEGORIAS_MATERIAL.map(c => ({ id: c.id, label: `${c.icono} ${c.label}` }))} />
          </div>
          <Input label="Nombre *" value={form.nombre} onChange={v => setForm({...form, nombre: v})} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Select label="Unidad" value={form.unidad} onChange={v => setForm({...form, unidad: v})}
              options={UNIDADES_MEDIDA.map(u => ({ id: u.id, label: `${u.id} · ${u.label}` }))} />
            <Input label="Stock minimo" type="number" value={form.stockMinimo} onChange={v => setForm({...form, stockMinimo: v})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <Input label="Precio ref. (S/.)" type="number" step="0.01" value={form.precioReferencia} onChange={v => setForm({...form, precioReferencia: v})} />
            <Input label="Lead time (dias)" type="number" value={form.leadTimeDias} onChange={v => setForm({...form, leadTimeDias: v})} />
            <Input label="Merma std (%)" type="number" step="0.1" value={form.mermaEstandarPct} onChange={v => setForm({...form, mermaEstandarPct: v})} />
          </div>

          <div style={{ background: BASE.bgSoft, padding: '12px 14px', borderRadius: '10px', marginTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '800', color: BASE.navy, marginBottom: '8px', letterSpacing: '0.4px' }}>
              VINCULO CON APU (PARA RECONCILIACION)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
              <Input label="Partida APU" value={form.partidaAPU} onChange={v => setForm({...form, partidaAPU: v})} placeholder="Ej: CONCRETO" />
              <Input label="Ratio teorico" type="number" step="0.01" value={form.ratioConsumoTeorico} onChange={v => setForm({...form, ratioConsumoTeorico: v})} placeholder="7.5" />
              <Select label="Por unidad" value={form.unidadRatio} onChange={v => setForm({...form, unidadRatio: v})}
                options={[{id:'m3', label:'m3'}, {id:'m2', label:'m2'}, {id:'ml', label:'ml'}, {id:'kg', label:'kg'}, {id:'und', label:'und'}]} />
            </div>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '6px', fontStyle: 'italic' }}>
              Ej: cemento → ratio 7.5 BOL por m3 de concreto
            </p>
          </div>

          <Input label="Proveedores habituales (separados por coma)" value={form.proveedoresHabituales}
            onChange={v => setForm({...form, proveedoresHabituales: v})} placeholder="UNACEM, Cemento Sol" />

          <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
            <Toggle label="Requiere lote" checked={form.requiereLote} onChange={v => setForm({...form, requiereLote: v})} />
            <Toggle label="Es consignado (cliente)" checked={form.esConsignado} onChange={v => setForm({...form, esConsignado: v})} />
            <Toggle label="Es equipo (no consume)" checked={form.esEquipo} onChange={v => setForm({...form, esEquipo: v})} />
            <Toggle label="Es servicio (no material fisico)" checked={form.esServicio} onChange={v => setForm({...form, esServicio: v})} />
            <Toggle label="Activo" checked={form.activo} onChange={v => setForm({...form, activo: v})} />
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              MONEDA BASE
            </label>
            <select value={form.monedaBase} onChange={e => setForm({...form, monedaBase: e.target.value})} style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: '700', background: '#fff', cursor: 'pointer',
            }}>
              <option value="PEN">S/. Soles</option>
              <option value="USD">$ Dolares</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setEditando(null)} style={{
              padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted,
              border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{
              padding: '11px 22px', borderRadius: '8px',
              background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
              color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
              cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.5 : 1,
              letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(15,42,71,0.35)',
            }}>
              {guardando ? '⏳ Guardando...' : '💾 GUARDAR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', step, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      <input type={type} step={step} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '9px 12px', borderRadius: '8px',
        border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: '600', background: '#fff',
      }} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '9px 12px', borderRadius: '8px',
        border: `1.5px solid ${BASE.border}`, fontSize: '13px', fontWeight: '700', background: '#fff', cursor: 'pointer',
      }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: BASE.text }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: '17px', height: '17px', accentColor: BASE.navy, cursor: 'pointer' }} />
      {label}
    </label>
  );
}

const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, ...extra });
