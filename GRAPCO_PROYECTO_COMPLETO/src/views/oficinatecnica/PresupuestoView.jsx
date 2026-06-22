// src/views/oficinatecnica/PresupuestoView.jsx
// PRESUPUESTO de Oficina Técnica — réplica del PPTTO oficial (GP-GCE-FOR-F01).
// Fuente: colección PartidasContractuales (aislada por proyecto) + Presupuesto_Config.
// Taxonomía de partidas 1001-10xx = la MISMA que consume el RO (F06) → conversa con el RO.
//
// 3 lentes:  Resumen (pie comercial CD→GG→Utilidad→IGV)  ·  Por Frente (F1 PTARI / F2 NAVE)
//            ·  Detalle (tabla editable).
// Importador in-app del PPTTO (subir → previsualizar → confirmar). Idempotente por código.
//
// Reglas: paleta BASE, % con Math.round, costo de obra (CD+GG) = meta de control del RO.

import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { fmtSoles, fmtNumero } from '../../utils/calidadOTAnalytics';
import { parsePresupuestoExcel, PCT_DEFAULT, aNumero } from '../../utils/presupuestoParser';
import usePresupuestoContractual from '../../hooks/usePresupuestoContractual';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const FORM_INICIAL = { codigo: '', descripcion: '', unidad: 'GLB', montoF1: 0, montoF2: 0, orden: 0 };
const pct = (n) => `${Math.round(Number(n) || 0)}%`;

// Monto por frente con compatibilidad hacia el modelo antiguo (metrado × P.U. = F1).
const mF1 = (p) => Number(p.montoF1) || (Number(p.metradoContractual || 0) * Number(p.precioUnitario || 0)) || 0;
const mF2 = (p) => Number(p.montoF2) || 0;

export default function PresupuestoView({ showToast }) {
  const { user } = useAuth();
  // Fuente única del presupuesto (compartida con el RO): base contractual + overrides.
  const {
    loading, proyId,
    partidas: partidasEff,   // base + overrides de Firestore (para mostrar)
    partidasReales,          // solo docs de Firestore (para importar / detectar edición)
    usandoBase,
    totales: t,
  } = usePresupuestoContractual();

  const [lente, setLente] = useState('resumen');
  const [importOpen, setImportOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  const hayDatos = partidasEff.length > 0;

  // ── CRUD manual ───────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.codigo || !form.descripcion) { showToast?.('Código y descripción obligatorios', 'error'); return; }
    if (!proyId) { showToast?.('Selecciona un proyecto activo', 'error'); return; }
    setGuardando(true);
    try {
      const f1 = aNumero(form.montoF1), f2 = aNumero(form.montoF2);
      const data = {
        proyectoId: proyId,
        codigo: String(form.codigo).toUpperCase().trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad || 'GLB',
        montoF1: f1, montoF2: f2,
        subtotal: +(f1 + f2).toFixed(2),
        metradoContractual: 1, precioUnitario: +(f1 + f2).toFixed(2),
        orden: parseInt(form.orden) || 0,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      const id = editando === 'NUEVO' ? `${proyId}__${data.codigo}` : editando;
      await setDoc(doc(db, 'PartidasContractuales', id), data, { merge: true });
      showToast?.(editando === 'NUEVO' ? '✅ Partida creada' : '✅ Partida actualizada', 'success');
      setEditando(null);
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
    finally { setGuardando(false); }
  };

  const borrar = async (p) => {
    if (!window.confirm(`¿Eliminar la partida ${p.codigo}?`)) return;
    try { await deleteDoc(doc(db, 'PartidasContractuales', p.id)); showToast?.('Partida eliminada', 'success'); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  if (!proyId) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando presupuesto…</p>;

  const LENTES = [
    { id: 'resumen', l: 'Resumen', desc: 'CD → GG → Utilidad → IGV' },
    { id: 'frente',  l: 'Por Frente', desc: 'F1 (PTARI) · F2 (NAVE)' },
    { id: 'detalle', l: 'Detalle', desc: 'Partidas editables' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera + acciones */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: BASE.navy }}>Presupuesto contractual</p>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            {partidasEff.length} partidas · Costo Directo <strong>{fmtSoles(t.cd)}</strong> · Costo de Obra (CD+GG) <strong style={{ color: BASE.navy }}>{fmtSoles(t.costoObra)}</strong>
          </p>
          {usandoBase && (
            <p style={{ fontSize: 10, color: BASE.goldDark, fontWeight: 700, marginTop: 2 }}>
              ◆ Base contractual CREDITEX (PTARI F1 + NAVE F2). Importa o edita para versionar en Firestore.
            </p>
          )}
        </div>
        <button onClick={() => setImportOpen(true)} style={btn(BASE.gold, BASE.goldDark)}>📥 IMPORTAR PPTO</button>
        <button onClick={() => { setForm(FORM_INICIAL); setEditando('NUEVO'); }} style={btn(BASE.navy, BASE.navyDark)}>➕ NUEVA PARTIDA</button>
      </div>

      {/* KPIs compactos del pie comercial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <Kpi label="Costo Directo" valor={fmtSoles(t.cd)} color={BASE.navy} />
        <Kpi label={`Gastos Grales · ${pct(t.ggPct)}`} valor={fmtSoles(t.gg)} color="#7c3aed" />
        <Kpi label={`Utilidad · ${pct(t.utilidadPct)}`} valor={fmtSoles(t.utilidad)} color={BASE.green} />
        <Kpi label="Subtotal" valor={fmtSoles(t.subtotal)} color={BASE.muted} />
        <Kpi label={`IGV · ${pct(t.igvPct)}`} valor={fmtSoles(t.igv)} color="#0ea5e9" />
        <Kpi label="Costo Total (venta)" valor={fmtSoles(t.total)} color={BASE.gold} />
      </div>

      {!hayDatos ? (
        <EmptyState icono="📋" titulo="Sin presupuesto cargado"
          descripcion="Importa el PPTTO oficial (.xlsx) con «IMPORTAR PPTO» o crea partidas a mano. Es la base del RO y de las valorizaciones." />
      ) : (
        <>
          {/* Lentes */}
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {LENTES.map((x) => {
              const activo = lente === x.id;
              return (
                <button key={x.id} onClick={() => setLente(x.id)} style={{
                  flex: '1 1 auto', minWidth: 150, padding: '10px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  textAlign: 'left', background: activo ? BASE.navy : 'transparent', color: activo ? '#fff' : BASE.muted,
                  fontWeight: 800, fontSize: 12, transition: 'all .15s',
                }}>
                  <span>{x.l}</span>
                  <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, opacity: activo ? 0.9 : 0.7 }}>{x.desc}</span>
                </button>
              );
            })}
          </div>

          {lente === 'resumen' && <ResumenLente partidas={partidasEff} t={t} />}
          {lente === 'frente' && <FrenteLente partidas={partidasEff} t={t} />}
          {lente === 'detalle' && (
            <TablaDetalle partidas={partidasEff}
              onEdit={(p) => { setForm({ ...FORM_INICIAL, ...p, montoF1: mF1(p), montoF2: mF2(p) }); setEditando(String(p.id).startsWith('base-') ? 'NUEVO' : p.id); }}
              onDelete={borrar} t={t} />
          )}
        </>
      )}

      {/* Modal manual */}
      {editando && (
        <Modal onClose={() => setEditando(null)} maxW="660px">
          <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy, marginBottom: 14 }}>
            {editando === 'NUEVO' ? 'Nueva partida' : `Editar ${form.codigo}`}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <Campo label="Código *"><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="1001" style={inpS} /></Campo>
            <Campo label="Descripción *"><input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="TRABAJOS PRELIMINARES" style={inpS} /></Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <Campo label="Unidad">
              <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} style={{ ...inpS, cursor: 'pointer' }}>
                {['GLB', 'M3', 'M2', 'ML', 'KG', 'TN', 'UND'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Campo>
            <Campo label="Ppto F1 (PTARI)"><input type="number" step="0.01" value={form.montoF1} onChange={(e) => setForm({ ...form, montoF1: e.target.value })} style={inpS} /></Campo>
            <Campo label="Ppto F2 (NAVE)"><input type="number" step="0.01" value={form.montoF2} onChange={(e) => setForm({ ...form, montoF2: e.target.value })} style={inpS} /></Campo>
            <Campo label="Orden"><input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} style={inpS} /></Campo>
          </div>
          <div style={{ background: BASE.navySoft, borderLeft: `4px solid ${BASE.navy}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 10.5, fontWeight: 900, color: BASE.navyLight }}>SUBTOTAL DE LA PARTIDA</p>
            <p style={{ fontSize: 19, fontWeight: 900, color: BASE.navy, marginTop: 2 }}>{fmtSoles(aNumero(form.montoF1) + aNumero(form.montoF2))}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditando(null)} style={btnSec}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn(BASE.navy, BASE.navyDark), opacity: guardando ? 0.5 : 1 }}>{guardando ? '⏳…' : '💾 GUARDAR'}</button>
          </div>
        </Modal>
      )}

      {/* Modal importador */}
      {importOpen && (
        <Modal onClose={() => setImportOpen(false)} maxW="960px">
          <ImportadorPPTO proyId={proyId} partidasActuales={partidasReales} user={user}
            onClose={() => setImportOpen(false)} showToast={showToast} />
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Lente RESUMEN — pie comercial + desglose por partida
// ════════════════════════════════════════════════════════════════════
function ResumenLente({ partidas, t }) {
  const filas = [
    ['COSTO DIRECTO', t.cd, true],
    [`GASTOS GENERALES (${Math.round(t.ggPct)}%)`, t.gg, false],
    ['COSTO DE OBRA (CD + GG) · meta del RO', t.costoObra, 'meta'],
    ...(t.descuento ? [['(−) DESCUENTO COMERCIAL', -t.descuento, false]] : []),
    [`UTILIDAD (${Math.round(t.utilidadPct)}%)`, t.utilidad, false],
    ['SUBTOTAL', t.subtotal, true],
    [`IGV (${Math.round(t.igvPct)}%)`, t.igv, false],
    ['COSTO TOTAL (VENTA)', t.total, 'total'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(260px, 0.9fr)', gap: 12 }}>
      <Card titulo="Partidas (Costo Directo)">
        <div style={{ overflowX: 'auto' }}>
          <table style={tabla}>
            <thead><tr style={trHead}><th style={th()}>Código</th><th style={th()}>Descripción</th><th style={th({ textAlign: 'right' })}>Parcial</th><th style={th({ textAlign: 'right' })}>%</th></tr></thead>
            <tbody>
              {partidas.map((p, i) => {
                const m = mF1(p) + mF2(p);
                return (
                  <tr key={p.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{p.codigo}</td>
                    <td style={{ ...td(), fontWeight: 700 }}>{p.descripcion}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(m)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{t.cd > 0 ? Math.round((m / t.cd) * 100) : 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card titulo="Resumen comercial">
        <table style={tabla}>
          <tbody>
            {filas.map(([etq, val, tipo]) => (
              <tr key={etq} style={{
                borderBottom: `1px solid ${BASE.border}`,
                background: tipo === 'meta' ? BASE.navySoft : tipo === 'total' ? BASE.goldSoft : 'transparent',
              }}>
                <td style={{ ...td(), fontWeight: tipo ? 900 : 700, color: tipo === 'total' ? BASE.goldDark : tipo === 'meta' ? BASE.navy : BASE.text }}>{etq}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: tipo === 'total' || tipo === 'meta' ? 14 : 12.5, color: tipo === 'total' ? BASE.goldDark : tipo === 'meta' ? BASE.navy : BASE.text }}>{fmtSoles(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Lente POR FRENTE — F1 PTARI / F2 NAVE
// ════════════════════════════════════════════════════════════════════
function FrenteLente({ partidas, t }) {
  return (
    <Card titulo="Presupuesto por frente">
      <div style={{ overflowX: 'auto' }}>
        <table style={tabla}>
          <thead><tr style={trHead}>
            <th style={th()}>Código</th><th style={th()}>Descripción</th>
            <th style={th({ textAlign: 'right' })}>Ppto F1 · PTARI</th>
            <th style={th({ textAlign: 'right' })}>Ppto F2 · NAVE</th>
            <th style={th({ textAlign: 'right' })}>Total</th>
          </tr></thead>
          <tbody>
            {partidas.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{p.codigo}</td>
                <td style={{ ...td(), fontWeight: 700 }}>{p.descripcion}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(mF1(p))}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(mF2(p))}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{fmtSoles(mF1(p) + mF2(p))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: BASE.navy, color: '#fff' }}>
            <td colSpan={2} style={{ padding: '11px 14px', fontWeight: 900, textAlign: 'right' }}>COSTO DIRECTO</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>{fmtSoles(t.totF1)}</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>{fmtSoles(t.totF2)}</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.gold }}>{fmtSoles(t.cd)}</td>
          </tr></tfoot>
        </table>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// Lente DETALLE — tabla editable
// ════════════════════════════════════════════════════════════════════
function TablaDetalle({ partidas, onEdit, onDelete, t }) {
  return (
    <Card titulo="Detalle de partidas">
      <div style={{ overflowX: 'auto' }}>
        <table style={tabla}>
          <thead><tr style={trHead}>
            <th style={th()}>Código</th><th style={th()}>Descripción</th><th style={th({ textAlign: 'center' })}>Und</th>
            <th style={th({ textAlign: 'right' })}>F1</th><th style={th({ textAlign: 'right' })}>F2</th>
            <th style={th({ textAlign: 'right' })}>Subtotal</th><th style={th({ textAlign: 'center' })}>Acción</th>
          </tr></thead>
          <tbody>
            {partidas.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{p.codigo}</td>
                <td style={{ ...td(), fontWeight: 700 }}>{p.descripcion}</td>
                <td style={{ ...td(), textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>{p.unidad || 'GLB'}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtNumero(mF1(p), 0)}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtNumero(mF2(p), 0)}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{fmtSoles(mF1(p) + mF2(p))}</td>
                <td style={{ ...td(), textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button onClick={() => onEdit(p)} style={miniBtn(BASE.navy)}>EDITAR</button>
                  {!String(p.id).startsWith('base-') && (
                    <button onClick={() => onDelete(p)} style={{ ...miniBtn(BASE.red), marginLeft: 6 }}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{ background: BASE.navy, color: '#fff' }}>
            <td colSpan={5} style={{ padding: '11px 14px', fontWeight: 900, textAlign: 'right' }}>COSTO DIRECTO TOTAL</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.gold }}>{fmtSoles(t.cd)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// IMPORTADOR del PPTTO (subir → previsualizar → confirmar)
// ════════════════════════════════════════════════════════════════════
function ImportadorPPTO({ proyId, partidasActuales, user, onClose, showToast }) {
  const [archivo, setArchivo] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [frente, setFrente] = useState('F1');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const leer = async (file) => {
    if (!file) return;
    setArchivo(file); setCargando(true);
    try {
      const res = await parsePresupuestoExcel(file);
      if (!res.partidas.length) showToast?.('No se detectaron partidas 1001-10xx en el Excel', 'error');
      setParsed(res);
    } catch (e) { showToast?.('Error leyendo Excel: ' + e.message, 'error'); }
    finally { setCargando(false); }
  };

  const confirmar = async () => {
    if (!parsed?.partidas?.length || !proyId) return;
    setGuardando(true);
    try {
      const campo = frente === 'F2' ? 'montoF2' : 'montoF1';
      const otro = frente === 'F2' ? 'montoF1' : 'montoF2';
      const prevByCod = new Map(partidasActuales.map((p) => [String(p.codigo), p]));
      // Chunking a 400 ops/batch: un S10 real puede tener >500 partidas y un solo
      // writeBatch falla al pasar 500 operaciones. Mismo patrón que los demás importadores.
      const BATCH_OPS = 400;
      let batch = writeBatch(db);
      let ops = 0;
      for (let idx = 0; idx < parsed.partidas.length; idx++) {
        const p = parsed.partidas[idx];
        const id = `${proyId}__${p.codigo}`;
        const prev = prevByCod.get(String(p.codigo)) || {};
        const valNuevo = aNumero(p.montoF1 || p.montoF2);
        const valOtro = Number(prev[otro]) || 0;
        const f1 = frente === 'F2' ? valOtro : valNuevo;
        const f2 = frente === 'F2' ? valNuevo : valOtro;
        batch.set(doc(db, 'PartidasContractuales', id), {
          proyectoId: proyId,
          codigo: p.codigo,
          descripcion: prev.descripcion || p.descripcion,
          unidad: prev.unidad || 'GLB',
          montoF1: f1, montoF2: f2,
          subtotal: +(f1 + f2).toFixed(2),
          metradoContractual: 1, precioUnitario: +(f1 + f2).toFixed(2),
          orden: prev.orden ?? idx,
          actualizadoEn: serverTimestamp(),
          actualizadoPor: user?.email || 'import',
          origenImport: archivo?.name || 'PPTO',
        }, { merge: true });
        ops++;
        if (ops >= BATCH_OPS) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      }
      if (ops > 0) await batch.commit();

      const r = parsed.resumen;
      await setDoc(doc(db, 'Presupuesto_Config', proyId), {
        proyectoId: proyId,
        ggPct: r.ggPct || PCT_DEFAULT.ggPct,
        utilidadPct: r.utilidadPct || PCT_DEFAULT.utilidadPct,
        igvPct: r.igvPct || PCT_DEFAULT.igvPct,
        cd: r.cd || null, gg: r.gg || null, utilidad: r.utilidad || null,
        subtotal: r.subtotal || null, igv: r.igv || null, total: r.total || null, costoObra: r.costoObra || null,
        actualizadoEn: serverTimestamp(),
      }, { merge: true });

      showToast?.(`✅ ${parsed.partidas.length} partidas importadas (${frente})`, 'success');
      onClose?.();
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
    finally { setGuardando(false); }
  };

  const r = parsed?.resumen;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy }}>Importar PPTTO oficial</h3>
        <p style={{ fontSize: 11.5, color: BASE.muted, marginTop: 2 }}>
          Sube el Excel del presupuesto (GP-GCE-FOR-F01). Se leen las partidas 1001-10xx (hoja RO) y el pie comercial (hoja PPTO). Idempotente: re-importar actualiza, no duplica.
        </p>
      </div>

      {/* Frente */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: BASE.muted }}>FRENTE DEL ARCHIVO:</span>
        {[['F1', 'F1 · PTARI'], ['F2', 'F2 · NAVE']].map(([id, l]) => (
          <button key={id} onClick={() => setFrente(id)} style={{
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 900,
            border: `1.5px solid ${frente === id ? BASE.navy : BASE.border}`,
            background: frente === id ? BASE.navy : BASE.white, color: frente === id ? '#fff' : BASE.muted,
          }}>{l}</button>
        ))}
      </div>

      {/* Dropzone */}
      <div style={{ background: BASE.white, border: `2.5px dashed ${BASE.border}`, borderRadius: 12, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 32 }}>📤</p>
        <p style={{ fontSize: 13, fontWeight: 900, color: BASE.navy }}>{archivo ? `📄 ${archivo.name}` : 'Selecciona el PPTTO (.xlsx)'}</p>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => leer(e.target.files[0])} style={{ display: 'none' }} id="imp-ppto" />
        <label htmlFor="imp-ppto" style={{ display: 'inline-block', marginTop: 10, padding: '9px 18px', borderRadius: 8, background: BASE.navy, color: '#fff', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' }}>📁 SELECCIONAR ARCHIVO</label>
        {cargando && <p style={{ fontSize: 11, color: BASE.muted, marginTop: 8 }}>⏳ Leyendo…</p>}
      </div>

      {parsed && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            <Kpi label="Partidas" valor={parsed.partidas.length} color={BASE.navy} chico />
            <Kpi label="Costo Directo" valor={fmtSoles(r.cd)} color={BASE.green} chico />
            <Kpi label={`GG ${Math.round(r.ggPct || PCT_DEFAULT.ggPct)}%`} valor={fmtSoles(r.gg)} color="#7c3aed" chico />
            <Kpi label="Costo Total" valor={fmtSoles(r.total)} color={BASE.gold} chico />
          </div>
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy }}>VISTA PREVIA · {parsed.partidas.length} partidas (hoja {parsed.hojaPartidas})</p>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '34vh', overflowY: 'auto' }}>
              <table style={tabla}>
                <thead style={{ position: 'sticky', top: 0 }}><tr style={trHead}><th style={th()}>Código</th><th style={th()}>Descripción</th><th style={th({ textAlign: 'right' })}>Monto ({frente})</th></tr></thead>
                <tbody>
                  {parsed.partidas.map((p, i) => (
                    <tr key={p.codigo} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{p.codigo}</td>
                      <td style={{ ...td() }}>{p.descripcion}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{fmtSoles(p.montoF1 || p.montoF2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnSec}>Cancelar</button>
            <button onClick={confirmar} disabled={guardando || !parsed.partidas.length} style={{ ...btn(BASE.gold, BASE.goldDark), opacity: guardando ? 0.5 : 1 }}>
              {guardando ? '⏳ Importando…' : `🚀 IMPORTAR ${parsed.partidas.length} (${frente})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────
function Kpi({ label, valor, color, chico }) {
  return (
    <div style={{ background: color + '12', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? 14 : 16, fontWeight: 900, color, marginTop: 2, fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}
function Card({ titulo, children }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy, letterSpacing: 0.3 }}>{titulo}</p>
      </div>
      <div style={{ padding: '4px 6px' }}>{children}</div>
    </div>
  );
}
function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 9.5, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

const tabla = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 };
const trHead = { background: BASE.navy, color: '#fff' };
const th = (extra = {}) => ({ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '8px 12px', fontSize: 12, color: BASE.text, verticalAlign: 'top', ...extra });
const inpS = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 12.5, fontWeight: 600, background: '#fff', boxSizing: 'border-box' };
const btn = (c1, c2) => ({ padding: '10px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${c1}, ${c2})`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.4, boxShadow: `0 4px 12px ${c1}44` });
const btnSec = { padding: '10px 20px', borderRadius: 8, background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const miniBtn = (c) => ({ padding: '5px 10px', borderRadius: 6, background: c, color: '#fff', border: 'none', fontSize: 10, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.3 });
