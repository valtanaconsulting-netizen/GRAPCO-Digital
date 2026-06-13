// src/views/modulos/apus/APUEditor.jsx — Editor de APU con MO+MAT+EQ+SC (B21)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import {
  CATEGORIAS_MO, FACTOR_APORTES_PE, calcularCostoAPU,
  fmtSoles, fmtPct,
} from '../../../utils/planMaestroAnalytics';

const FORM_INICIAL = {
  codigo: '', descripcion: '', unidad: 'm3', rendimientoBase: 0,
  manoDeObra: [], materiales: [], equipos: [], subcontratos: [],
};

export default function APUEditor({ apu, onClose, showToast }) {
  const { user } = useAuth();
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const esNuevo = apu === 'NUEVO';

  useEffect(() => {
    if (!esNuevo && apu) {
      setForm({
        ...FORM_INICIAL,
        ...apu,
        manoDeObra: apu.manoDeObra || [],
        materiales: apu.materiales || [],
        equipos: apu.equipos || [],
        subcontratos: apu.subcontratos || [],
      });
    }
  }, [apu, esNuevo]);

  const costo = useMemo(() => calcularCostoAPU(form), [form]);

  // Helpers para listas
  const addItem = (lista, item) => setForm({ ...form, [lista]: [...form[lista], item] });
  const updItem = (lista, idx, campo, valor) => {
    const nueva = [...form[lista]];
    nueva[idx] = { ...nueva[idx], [campo]: valor };
    setForm({ ...form, [lista]: nueva });
  };
  const delItem = (lista, idx) => {
    const nueva = form[lista].filter((_, i) => i !== idx);
    setForm({ ...form, [lista]: nueva });
  };

  const guardar = async () => {
    if (!form.codigo || !form.descripcion) {
      showToast?.('Código y descripción obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad,
        rendimientoBase: parseFloat(form.rendimientoBase) || 0,
        manoDeObra: form.manoDeObra.map(m => ({
          categoria: m.categoria,
          cantidad: parseFloat(m.cantidad) || 0,
          salarioHH: parseFloat(m.salarioHH) || 0,
          aportes: parseFloat(m.aportes) || FACTOR_APORTES_PE,
        })),
        materiales: form.materiales.map(m => ({
          materialId: m.materialId || '',
          descripcion: m.descripcion || '',
          cantidad: parseFloat(m.cantidad) || 0,
          unidad: m.unidad || '',
          precio: parseFloat(m.precio) || 0,
        })),
        equipos: form.equipos.map(e => ({
          descripcion: e.descripcion || '',
          hm: parseFloat(e.hm) || 0,
          tarifa: parseFloat(e.tarifa) || 0,
        })),
        subcontratos: form.subcontratos.map(s => ({
          descripcion: s.descripcion || '',
          subtotal: parseFloat(s.subtotal) || 0,
        })),
        // Cachear el costo total para queries
        costoUnitarioTotal: costo.costoUnitarioTotal,
        subtotalMO: costo.subtotalMO,
        subtotalMat: costo.subtotalMat,
        subtotalEq: costo.subtotalEq,
        subtotalSC: costo.subtotalSC,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (esNuevo) {
        data.creadoEn = serverTimestamp();
        await addDoc(collection(db, 'APUs'), data);
        showToast?.(`✅ APU ${form.codigo} creado · ${fmtSoles(costo.costoUnitarioTotal)}/${form.unidad}`, 'success');
      } else {
        await updateDoc(doc(db, 'APUs', apu.id), data);
        showToast?.('✅ APU actualizado', 'success');
      }
      onClose?.();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const borrar = async () => {
    if (esNuevo) return;
    if (!confirm(`¿Eliminar APU ${apu.codigo}?`)) return;
    try {
      await deleteDoc(doc(db, 'APUs', apu.id));
      showToast?.('🗑️ APU eliminado', 'success');
      onClose?.();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '14px', padding: '22px 26px', borderLeft: `5px solid ${BASE.navy}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '1px' }}>ANÁLISIS DE PRECIOS UNITARIOS</p>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
            {esNuevo ? '➕ Nuevo APU' : `✏️ ${form.codigo}`}
          </h3>
        </div>
        <button onClick={onClose} style={btnGhost}>← Volver</button>
      </div>

      {/* Identificación */}
      <Sec titulo="IDENTIFICACIÓN" color={BASE.navy}>
        <Grid cols="1fr 3fr 80px 100px">
          <Field label="Código *" hint="Ej: APU-02.01.003">
            <input type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})}
              placeholder="APU-02.01.003" style={inpS} />
          </Field>
          <Field label="Descripción *">
            <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
              placeholder="Vaciado columnas concreto fc=210" style={inpS} />
          </Field>
          <Field label="Unidad">
            <select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} style={selS}>
              {['m3','m2','ml','kg','tn','und','glb','par','jgo','pza'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Rendim. (und/día)" hint="Cuadrilla">
            <input type="number" step="0.01" value={form.rendimientoBase}
              onChange={e => setForm({...form, rendimientoBase: e.target.value})} style={inpS} />
          </Field>
        </Grid>
      </Sec>

      {/* MO */}
      <Sec titulo="MANO DE OBRA" color={CHART_PALETTE[3]}>
        {form.manoDeObra.length === 0 && <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Sin mano de obra. Agrega categorías abajo.</p>}
        {form.manoDeObra.map((m, idx) => (
          <Grid key={idx} cols="1fr 80px 90px 80px 100px 40px">
            <select value={m.categoria || ''} onChange={e => updItem('manoDeObra', idx, 'categoria', e.target.value)} style={selS}>
              <option value="">— categoría —</option>
              {CATEGORIAS_MO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="number" step="0.01" value={m.cantidad || ''} placeholder="cant"
              onChange={e => updItem('manoDeObra', idx, 'cantidad', e.target.value)} style={inpS} />
            <input type="number" step="0.01" value={m.salarioHH || ''} placeholder="S/HH"
              onChange={e => updItem('manoDeObra', idx, 'salarioHH', e.target.value)} style={inpS} />
            <input type="number" step="0.01" value={m.aportes || FACTOR_APORTES_PE} placeholder="aportes"
              onChange={e => updItem('manoDeObra', idx, 'aportes', e.target.value)} style={inpS} />
            <span style={subtotalS}>{fmtSoles((m.cantidad || 0) * (m.salarioHH || 0) * (m.aportes || FACTOR_APORTES_PE))}</span>
            <button onClick={() => delItem('manoDeObra', idx)} style={btnDel}>×</button>
          </Grid>
        ))}
        <button onClick={() => addItem('manoDeObra', { categoria: '', cantidad: 1, salarioHH: 15, aportes: FACTOR_APORTES_PE })} style={btnAdd(CHART_PALETTE[3])}>
          ➕ Agregar MO
        </button>
        <p style={subtotalRow}>SUBTOTAL MO: <strong style={{ color: CHART_PALETTE[3] }}>{fmtSoles(costo.subtotalMO)}</strong> ({fmtPct(costo.incidenciaMO, 1)})</p>
      </Sec>

      {/* Materiales */}
      <Sec titulo="MATERIALES" color={BASE.gold}>
        {form.materiales.length === 0 && <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Sin materiales.</p>}
        {form.materiales.map((m, idx) => (
          <Grid key={idx} cols="2fr 80px 60px 90px 100px 40px">
            <input type="text" value={m.descripcion || ''} placeholder="Cemento Portland Tipo I"
              onChange={e => updItem('materiales', idx, 'descripcion', e.target.value)} style={inpS} />
            <input type="number" step="0.01" value={m.cantidad || ''} placeholder="cant"
              onChange={e => updItem('materiales', idx, 'cantidad', e.target.value)} style={inpS} />
            <input type="text" value={m.unidad || ''} placeholder="bol"
              onChange={e => updItem('materiales', idx, 'unidad', e.target.value)} style={inpS} />
            <input type="number" step="0.01" value={m.precio || ''} placeholder="S/"
              onChange={e => updItem('materiales', idx, 'precio', e.target.value)} style={inpS} />
            <span style={subtotalS}>{fmtSoles((m.cantidad || 0) * (m.precio || 0))}</span>
            <button onClick={() => delItem('materiales', idx)} style={btnDel}>×</button>
          </Grid>
        ))}
        <button onClick={() => addItem('materiales', { descripcion: '', cantidad: 1, unidad: 'und', precio: 0 })} style={btnAdd(BASE.gold)}>
          ➕ Agregar Material
        </button>
        <p style={subtotalRow}>SUBTOTAL MAT: <strong style={{ color: BASE.gold }}>{fmtSoles(costo.subtotalMat)}</strong> ({fmtPct(costo.incidenciaMat, 1)})</p>
      </Sec>

      {/* Equipos */}
      <Sec titulo="EQUIPOS" color={CHART_PALETTE[2]}>
        {form.equipos.length === 0 && <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Sin equipos.</p>}
        {form.equipos.map((e, idx) => (
          <Grid key={idx} cols="2fr 80px 100px 100px 40px">
            <input type="text" value={e.descripcion || ''} placeholder="Mezcladora 11p3"
              onChange={ev => updItem('equipos', idx, 'descripcion', ev.target.value)} style={inpS} />
            <input type="number" step="0.01" value={e.hm || ''} placeholder="hm"
              onChange={ev => updItem('equipos', idx, 'hm', ev.target.value)} style={inpS} />
            <input type="number" step="0.01" value={e.tarifa || ''} placeholder="tarifa S/"
              onChange={ev => updItem('equipos', idx, 'tarifa', ev.target.value)} style={inpS} />
            <span style={subtotalS}>{fmtSoles((e.hm || 0) * (e.tarifa || 0))}</span>
            <button onClick={() => delItem('equipos', idx)} style={btnDel}>×</button>
          </Grid>
        ))}
        <button onClick={() => addItem('equipos', { descripcion: '', hm: 1, tarifa: 0 })} style={btnAdd(CHART_PALETTE[2])}>
          ➕ Agregar Equipo
        </button>
        <p style={subtotalRow}>SUBTOTAL EQ: <strong style={{ color: CHART_PALETTE[2] }}>{fmtSoles(costo.subtotalEq)}</strong> ({fmtPct(costo.incidenciaEq, 1)})</p>
      </Sec>

      {/* Subcontratos */}
      <Sec titulo="SUBCONTRATOS" color={BASE.red}>
        {form.subcontratos.length === 0 && <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>Sin subcontratos.</p>}
        {form.subcontratos.map((s, idx) => (
          <Grid key={idx} cols="3fr 100px 40px">
            <input type="text" value={s.descripcion || ''} placeholder="Bombeo concreto"
              onChange={e => updItem('subcontratos', idx, 'descripcion', e.target.value)} style={inpS} />
            <input type="number" step="0.01" value={s.subtotal || ''} placeholder="S/"
              onChange={e => updItem('subcontratos', idx, 'subtotal', e.target.value)} style={inpS} />
            <button onClick={() => delItem('subcontratos', idx)} style={btnDel}>×</button>
          </Grid>
        ))}
        <button onClick={() => addItem('subcontratos', { descripcion: '', subtotal: 0 })} style={btnAdd(BASE.red)}>
          ➕ Agregar SC
        </button>
        <p style={subtotalRow}>SUBTOTAL SC: <strong style={{ color: BASE.red }}>{fmtSoles(costo.subtotalSC)}</strong> ({fmtPct(costo.incidenciaSC, 1)})</p>
      </Sec>

      {/* Total */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        color: '#fff', borderRadius: '14px',
        padding: '20px 24px', marginTop: '14px',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          COSTO UNITARIO TOTAL APU
        </p>
        <p style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px', letterSpacing: '-0.5px' }}>
          {fmtSoles(costo.costoUnitarioTotal)} <span style={{ fontSize: '18px', opacity: 0.7 }}>/ {form.unidad}</span>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
        {!esNuevo && <button onClick={borrar} disabled={guardando} style={btnDelete}>🗑️ Eliminar</button>}
        <button onClick={onClose} style={btnCancel}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={btnSave}>
          {guardando ? '⏳' : '💾 GUARDAR APU'}
        </button>
      </div>
    </div>
  );
}

function Sec({ titulo, color, children }) {
  return (
    <div style={{ background: BASE.bgSoft, padding: '14px 16px', borderRadius: '10px', marginBottom: '12px', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '10px' }}>{titulo}</p>
      {children}
    </div>
  );
}
function Grid({ cols, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '6px', alignItems: 'center' }}>{children}</div>;
}
function Field({ label, hint, children }) {
  return (
    <div>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
      {hint && <p style={{ fontSize: '9px', color: BASE.muted, marginTop: '2px', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}

const lblS = { fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '3px' };
const inpS = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const subtotalS = { fontSize: '11.5px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace', textAlign: 'right' };
const subtotalRow = { fontSize: '11px', color: BASE.muted, marginTop: '8px', textAlign: 'right', letterSpacing: '0.4px' };
const btnAdd = (c) => ({ padding: '6px 14px', borderRadius: '6px', background: c + '22', color: c, border: `1.5px dashed ${c}`, fontSize: '11px', fontWeight: '900', cursor: 'pointer', marginTop: '4px', letterSpacing: '0.4px' });
const btnDel = { width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: 'none', fontSize: '16px', fontWeight: '900', cursor: 'pointer' };
const btnGhost = { padding: '8px 14px', borderRadius: '8px', background: 'transparent', color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: '900', cursor: 'pointer' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: BASE.shadowMd };
const btnDelete = { padding: '11px 18px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca', fontSize: '11.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px' };
