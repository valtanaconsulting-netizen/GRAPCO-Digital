// src/views/modulos/resultadoOperativo/PartidasExtras.jsx
// Vista compartida Adicionales / Deductivos — réplica del ESTATUS GP-GCE-FOR-F05:
//   COD (AD-NN) · FRENTE · DESCRIPCIÓN · CD · GG · U · SUBTOTAL · REVISIÓN SUP.
//   · ESTADO EJECUCIÓN · ESTADO ADICIONAL · FACTURADO · ABONO · TIPO · COMENTARIO
//
// Conversa con el RO: al guardar deriva los campos que el motor ya lee
// (planMaestroAnalytics.sumarPQ): presupuestoPQ01/valorizadoPQ01 (en CD, mismas
// unidades que el BAC) y `estado` (anulado se excluye). Solo los APROBADOS entran al
// BAC contractual del RO; los EJECUTADOS+APROBADOS entran al EV. Aislado por proyecto.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { LEGACY_CREDITEX_IDS } from '../../../hooks/useCatalogoWBS';
import { BASE } from '../../../utils/styles';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';

const fmt = (n) => `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const EJEC = ['NO EJECUTADO', 'EN PROCESO', 'EN EJECUCIÓN', 'EJECUTADO'];
const ADIC = ['PENDIENTE', 'EN PROCESO', 'APROBADO', 'ANULADO'];
const ABONO = ['PENDIENTE', 'ABONADO', 'ANULADO'];
const FRENTES = ['F1', 'F2', 'F3', 'F5', 'F9', 'F10', 'F1Y2'];

const FORM_INICIAL = {
  nro: '', frente: 'F1', descripcion: '',
  cd: 0, ggPct: 26.47, uPct: 9, revisionSup: 0,
  estadoEjecucion: 'NO EJECUTADO', estadoAdicional: 'PENDIENTE',
  facturado: 0, abono: 'PENDIENTE', tipoSolicitud: 'Cliente', comentario: '',
};

// Colores de badge por estado.
const colEjec = (s) => s === 'EJECUTADO' ? '#16a34a' : (s === 'EN PROCESO' || s === 'EN EJECUCIÓN') ? '#d97706' : BASE.muted;
const colAdic = (s) => s === 'APROBADO' ? '#2563eb' : s === 'EN PROCESO' ? '#d97706' : s === 'ANULADO' ? BASE.red : BASE.muted;
const colAbono = (s) => s === 'ABONADO' ? '#16a34a' : s === 'ANULADO' ? BASE.red : '#d97706';

export default function PartidasExtras({ tipo, coleccion, titulo, subtitulo, color, icono, showToast }) {
  const { user } = useAuth();
  const { proyectoActivo } = useProyectoActivo();
  const proyId = proyectoActivo?.id;
  const isLegacy = LEGACY_CREDITEX_IDS.includes(proyId);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!proyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(collection(db, coleccion),
      (snap) => {
        const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const mias = todas.filter((x) => x.proyectoId === proyId || (!x.proyectoId && isLegacy));
        mias.sort((a, b) => String(a.nro || a.partida || '').localeCompare(String(b.nro || b.partida || ''), 'es', { numeric: true }));
        setItems(mias); setLoading(false);
      },
      (err) => { console.warn(`[${coleccion}]`, err.message); setLoading(false); });
    return () => unsub();
  }, [coleccion, proyId, isLegacy]);

  const calc = (f) => {
    const cd = round2(f.cd); const gg = round2(cd * (Number(f.ggPct) || 0) / 100);
    const u = round2(cd * (Number(f.uPct) || 0) / 100); return { cd, gg, u, subtotal: round2(cd + gg + u) };
  };

  const totales = useMemo(() => items.reduce((a, it) => {
    const c = calc(it);
    const aprob = it.estadoAdicional === 'APROBADO' && it.estadoAdicional !== 'ANULADO';
    return {
      n: a.n + 1,
      subtotal: a.subtotal + c.subtotal,
      cdRO: a.cdRO + (aprob ? c.cd : 0),
      facturado: a.facturado + (Number(it.facturado) || 0),
      pendienteAbono: a.pendienteAbono + (it.abono !== 'ABONADO' && it.estadoAdicional !== 'ANULADO' ? c.subtotal : 0),
    };
  }, { n: 0, subtotal: 0, cdRO: 0, facturado: 0, pendienteAbono: 0 }), [items]);

  const abrirNuevo = () => {
    const prox = `AD-${String(items.length + 1).padStart(2, '0')}`;
    setEditando(null); setForm({ ...FORM_INICIAL, nro: tipo === 'deductivos' ? `DD-${String(items.length + 1).padStart(2, '0')}` : prox });
    setModalAbierto(true);
  };
  const abrirEdicion = (it) => {
    setEditando(it);
    setForm({ ...FORM_INICIAL, ...it, ggPct: it.ggPct ?? 26.47, uPct: it.uPct ?? 9 });
    setModalAbierto(true);
  };
  const cerrar = () => { setModalAbierto(false); setEditando(null); setForm(FORM_INICIAL); };

  const guardar = async () => {
    if (!form.descripcion) { showToast?.('Completa la descripción', 'error'); return; }
    if (!proyId) { showToast?.('Selecciona un proyecto activo', 'error'); return; }
    setGuardando(true);
    try {
      const c = calc(form);
      const aprobado = form.estadoAdicional === 'APROBADO';
      const ejecutado = form.estadoEjecucion === 'EJECUTADO';
      const payload = {
        proyectoId: proyId,
        nro: (form.nro || '').trim(),
        frente: form.frente || '',
        descripcion: form.descripcion.trim(),
        cd: c.cd, ggPct: Number(form.ggPct) || 0, uPct: Number(form.uPct) || 0,
        gg: c.gg, u: c.u, subtotal: c.subtotal,
        revisionSup: round2(form.revisionSup),
        estadoEjecucion: form.estadoEjecucion, estadoAdicional: form.estadoAdicional,
        facturado: round2(form.facturado), abono: form.abono,
        tipoSolicitud: form.tipoSolicitud, comentario: (form.comentario || '').trim(),
        // ── Campos que YA lee el motor del RO (sumarPQ) — derivados del F05 ──
        // Solo aprobados entran al BAC; aprobados+ejecutados entran al EV (en CD).
        estado: form.estadoAdicional === 'ANULADO' ? 'anulado' : 'vigente',
        partida: (form.nro || '').trim(),
        presupuestoPQ01: aprobado ? c.cd : 0, presupuestoPQ02: 0,
        programadoPQ01: aprobado ? c.cd : 0, programadoPQ02: 0,
        valorizadoPQ01: (aprobado && ejecutado) ? c.cd : 0, valorizadoPQ02: 0,
        actualizadoEn: serverTimestamp(), actualizadoPor: user?.email || 'desconocido',
      };
      if (editando) {
        await updateDoc(doc(db, coleccion, editando.id), payload);
        showToast?.('Actualizado', 'success');
      } else {
        await addDoc(collection(db, coleccion), { ...payload, creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido' });
        showToast?.('Creado', 'success');
      }
      cerrar();
    } catch (e) { showToast?.('Error al guardar: ' + e.message, 'error'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (it) => {
    if (!confirm(`¿Eliminar ${it.nro || it.descripcion}?`)) return;
    try { await deleteDoc(doc(db, coleccion, it.id)); showToast?.('Eliminado', 'success'); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  if (!proyId) return <p style={{ color: BASE.muted, fontSize: 12, padding: 20 }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ color: BASE.muted, fontSize: 12, padding: 20 }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, boxShadow: BASE.shadowSm }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color, letterSpacing: 0.5 }}>{icono} {titulo} · ESTATUS F05</p>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>{subtitulo}</p>
        </div>
        <button onClick={abrirNuevo} style={{ background: color, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: `0 4px 14px ${color}55` }}>+ Agregar</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8 }}>
        <Kpi label={titulo} valor={totales.n} color={color} />
        <Kpi label="Subtotal (cara venta)" valor={fmt(totales.subtotal)} color={BASE.navy} />
        <Kpi label="CD al RO (aprobados)" valor={fmt(totales.cdRO)} color="#2563eb" />
        <Kpi label="Facturado a la fecha" valor={fmt(totales.facturado)} color={BASE.green} />
        <Kpi label="Pendiente de abono" valor={fmt(totales.pendienteAbono)} color={BASE.gold} />
      </div>

      {!items.length ? (
        <EmptyState icono={icono} titulo={`Sin ${tipo}`} descripcion={`Pulsa "Agregar" para registrar ${tipo} con su CD, GG, U, estados y abono (formato F05). Los aprobados ajustan el RO.`} />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, overflow: 'auto', boxShadow: BASE.shadowSm }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1200 }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th()}>COD</th><th style={th()}>Frente</th>
                <th style={{ ...th(), textAlign: 'left', minWidth: 220 }}>Descripción</th>
                <th style={th({ textAlign: 'right' })}>CD</th>
                <th style={th({ textAlign: 'right' })}>GG</th>
                <th style={th({ textAlign: 'right' })}>U</th>
                <th style={th({ textAlign: 'right' })}>Subtotal</th>
                <th style={th()}>Ejecución</th><th style={th()}>Adicional</th>
                <th style={th({ textAlign: 'right' })}>Facturado</th>
                <th style={th()}>Abono</th><th style={th()}>Tipo</th>
                <th style={th()}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const c = calc(it);
                return (
                  <tr key={it.id} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontWeight: 800, color: BASE.navy, fontFamily: 'monospace' }}>{it.nro || '—'}</td>
                    <td style={{ ...td(), textAlign: 'center' }}>{it.frente || '—'}</td>
                    <td style={td('left')}>{it.descripcion}</td>
                    <td style={td('right')}>{fmt(c.cd)}</td>
                    <td style={{ ...td('right'), color: BASE.muted }}>{fmt(c.gg)}</td>
                    <td style={{ ...td('right'), color: BASE.muted }}>{fmt(c.u)}</td>
                    <td style={{ ...td('right'), fontWeight: 800, color: BASE.navy }}>{fmt(c.subtotal)}</td>
                    <td style={{ ...td(), textAlign: 'center' }}><Badge t={it.estadoEjecucion} c={colEjec(it.estadoEjecucion)} /></td>
                    <td style={{ ...td(), textAlign: 'center' }}><Badge t={it.estadoAdicional} c={colAdic(it.estadoAdicional)} /></td>
                    <td style={td('right')}>{fmt(it.facturado)}</td>
                    <td style={{ ...td(), textAlign: 'center' }}><Badge t={it.abono} c={colAbono(it.abono)} /></td>
                    <td style={{ ...td(), textAlign: 'center', fontSize: 10 }}>{(it.tipoSolicitud || '').replace('Solicitud del ', '')}</td>
                    <td style={{ ...td(), textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEdicion(it)} style={btn('#0ea5e9')}>✎</button>
                      <button onClick={() => eliminar(it)} style={btn(BASE.red)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: BASE.navySoft, fontWeight: 900, color: BASE.navy }}>
                <td colSpan={6} style={{ padding: '10px 8px', textAlign: 'right' }}>TOTAL</td>
                <td style={td('right')}>{fmt(totales.subtotal)}</td>
                <td colSpan={2}></td>
                <td style={td('right')}>{fmt(totales.facturado)}</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <Modal onClose={cerrar} title={editando ? `Editar ${tipo.slice(0, -1)}` : `Nuevo ${tipo.slice(0, -1)} (F05)`} maxW="760px">
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.7fr 2fr', gap: 12 }}>
            <Campo label="N° (COD)"><input value={form.nro} onChange={(e) => setForm({ ...form, nro: e.target.value.toUpperCase() })} style={inp()} placeholder="AD-01" /></Campo>
            <Campo label="Frente">
              <select value={form.frente} onChange={(e) => setForm({ ...form, frente: e.target.value })} style={inp()}>{FRENTES.map((f) => <option key={f}>{f}</option>)}</select>
            </Campo>
            <Campo label="Descripción *"><input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={inp()} placeholder="Cerco interior campamento" /></Campo>
          </div>

          <Bloque titulo="COSTO (S/IGV)" color="#3b82f6">
            <Campo label="Costo Directo (CD)"><input type="number" step="0.01" value={form.cd} onChange={(e) => setForm({ ...form, cd: e.target.value })} style={inp()} /></Campo>
            <Campo label="GG %"><input type="number" step="0.01" value={form.ggPct} onChange={(e) => setForm({ ...form, ggPct: e.target.value })} style={inp()} /></Campo>
            <Campo label="Utilidad %"><input type="number" step="0.01" value={form.uPct} onChange={(e) => setForm({ ...form, uPct: e.target.value })} style={inp()} /></Campo>
          </Bloque>
          {(() => { const c = calc(form); return (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: BASE.muted, marginTop: 6 }}>
              <span>GG: <b style={{ color: BASE.navy }}>{fmt(c.gg)}</b></span>
              <span>U: <b style={{ color: BASE.navy }}>{fmt(c.u)}</b></span>
              <span>Subtotal: <b style={{ color: BASE.gold }}>{fmt(c.subtotal)}</b></span>
            </div>
          ); })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
            <Campo label="Estado de ejecución"><select value={form.estadoEjecucion} onChange={(e) => setForm({ ...form, estadoEjecucion: e.target.value })} style={inp()}>{EJEC.map((x) => <option key={x}>{x}</option>)}</select></Campo>
            <Campo label="Estado del adicional"><select value={form.estadoAdicional} onChange={(e) => setForm({ ...form, estadoAdicional: e.target.value })} style={inp()}>{ADIC.map((x) => <option key={x}>{x}</option>)}</select></Campo>
            <Campo label="Abono"><select value={form.abono} onChange={(e) => setForm({ ...form, abono: e.target.value })} style={inp()}>{ABONO.map((x) => <option key={x}>{x}</option>)}</select></Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <Campo label="Revisión Sup. (S/)"><input type="number" step="0.01" value={form.revisionSup} onChange={(e) => setForm({ ...form, revisionSup: e.target.value })} style={inp()} /></Campo>
            <Campo label="Facturado a la fecha (S/)"><input type="number" step="0.01" value={form.facturado} onChange={(e) => setForm({ ...form, facturado: e.target.value })} style={inp()} /></Campo>
            <Campo label="Tipo de solicitud"><select value={form.tipoSolicitud} onChange={(e) => setForm({ ...form, tipoSolicitud: e.target.value })} style={inp()}><option>Cliente</option><option>Contratista</option></select></Campo>
          </div>
          <Campo label="Comentario"><input value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} style={{ ...inp(), marginTop: 4 }} /></Campo>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: 10.5, color: '#1e40af' }}>
            Solo los <b>APROBADOS</b> ajustan el presupuesto del RO (BAC) en nivel CD; los <b>APROBADOS + EJECUTADOS</b> entran al valorizado (EV). Los ANULADOS se excluyen.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button onClick={cerrar} disabled={guardando} style={btnLg('#94a3b8')}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnLg(color)}>{guardando ? 'Guardando…' : (editando ? 'Actualizar' : 'Crear')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Badge({ t, c }) {
  if (!t || t === '-') return <span style={{ color: BASE.muted }}>—</span>;
  return <span style={{ background: c, color: '#fff', padding: '2px 8px', borderRadius: 9, fontSize: 9, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{t}</span>;
}
function Kpi({ label, valor, color }) {
  return (
    <div style={{ background: color + '12', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{String(label).toUpperCase()}</p>
      <p style={{ fontSize: 15, fontWeight: 900, color, marginTop: 2, fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}
function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: BASE.muted, marginBottom: 4, letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}
function Bloque({ titulo, color, children }) {
  return (
    <div style={{ marginTop: 14, border: `1.5px solid ${color}33`, borderRadius: 10, padding: '10px 12px', background: `${color}08` }}>
      <p style={{ fontSize: 10.5, fontWeight: 900, color, letterSpacing: 0.6, marginBottom: 8 }}>{titulo}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>{children}</div>
    </div>
  );
}

const th = (extra = {}) => ({ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: 10, letterSpacing: 0.3, borderBottom: `2px solid ${BASE.gold}`, whiteSpace: 'nowrap', ...extra });
const td = (align = 'left') => ({ padding: '8px', textAlign: align, verticalAlign: 'middle' });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '4px 8px', margin: '0 2px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 });
const btnLg = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' });
const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: 8, fontSize: 12, fontFamily: BASE.font, boxSizing: 'border-box' });
