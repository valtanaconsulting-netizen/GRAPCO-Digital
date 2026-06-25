// src/views/modulos/planMaestro/ActividadEditor.jsx — Editor actividad WBS (B21)

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../contexts/NotificationContext';
import { ESTADOS_ACTIVIDAD, fmtSoles } from '../../../utils/planMaestroAnalytics';

const FORM_INICIAL = {
  codigo: '', descripcion: '', unidad: 'm3',
  metradoContractual: 0, precioUnitario: 0,
  hhTotalPresupuestado: 0, rendimientoTeorico: 0,
  cuadrillaTeorica: '',
  fechaInicioProgramada: '', fechaFinProgramada: '',
  predecesoras: '', estado: 'no_iniciada',
  apuId: '', petId: '', protocoloRequerido: '',
};

export default function ActividadEditor({ actividad, onClose, showToast }) {
  const { user } = useAuth();
  const confirmar = useConfirm();
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [apus, setApus] = useState([]);
  const esNuevo = actividad === 'NUEVO';

  useEffect(() => {
    if (!esNuevo && actividad) {
      const ini = actividad.fechaInicioProgramada?.toDate
        ? actividad.fechaInicioProgramada.toDate().toISOString().split('T')[0]
        : (actividad.fechaInicioProgramada || '');
      const fin = actividad.fechaFinProgramada?.toDate
        ? actividad.fechaFinProgramada.toDate().toISOString().split('T')[0]
        : (actividad.fechaFinProgramada || '');
      setForm({
        ...FORM_INICIAL,
        ...actividad,
        fechaInicioProgramada: ini,
        fechaFinProgramada: fin,
        predecesoras: Array.isArray(actividad.predecesoras) ? actividad.predecesoras.join(', ') : '',
      });
    }
  }, [actividad, esNuevo]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'APUs'),
      (snap) => setApus(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (e) => console.warn(e));
    return () => unsub();
  }, []);

  const subtotal = (parseFloat(form.metradoContractual) || 0) * (parseFloat(form.precioUnitario) || 0);

  const guardar = async () => {
    if (!form.codigo) {
      showToast?.('Código WBS obligatorio (ej: 02.01.003)', 'error');
      return;
    }
    if (!form.descripcion) {
      showToast?.('Descripción obligatoria', 'error');
      return;
    }

    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad,
        metradoContractual: parseFloat(form.metradoContractual) || 0,
        precioUnitario: parseFloat(form.precioUnitario) || 0,
        hhTotalPresupuestado: parseFloat(form.hhTotalPresupuestado) || 0,
        rendimientoTeorico: parseFloat(form.rendimientoTeorico) || 0,
        cuadrillaTeorica: form.cuadrillaTeorica?.trim() || null,
        fechaInicioProgramada: form.fechaInicioProgramada ? new Date(form.fechaInicioProgramada) : null,
        fechaFinProgramada: form.fechaFinProgramada ? new Date(form.fechaFinProgramada) : null,
        predecesoras: form.predecesoras
          ? form.predecesoras.split(',').map(p => p.trim()).filter(Boolean)
          : [],
        estado: form.estado,
        apuId: form.apuId?.trim() || null,
        petId: form.petId?.trim() || null,
        protocoloRequerido: form.protocoloRequerido?.trim() || null,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };

      if (esNuevo) {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        data.avanceMetradoAcum = 0;
        data.hhAcumReal = 0;
        data.costoRealAcum = 0;
        await addDoc(collection(db, 'PlanMaestro'), data);
        showToast?.(`✅ Actividad ${form.codigo} creada`, 'success');
      } else {
        await updateDoc(doc(db, 'PlanMaestro', actividad.id), data);
        showToast?.('✅ Actividad actualizada', 'success');
      }
      onClose?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (esNuevo) return;
    const ok = await confirmar({
      tono: 'peligro',
      icono: '🗑️',
      titulo: `¿Eliminar actividad ${actividad.codigo}?`,
      detalle: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, eliminar',
    });
    if (!ok) return;
    setGuardando(true);
    try {
      await deleteDoc(doc(db, 'PlanMaestro', actividad.id));
      showToast?.('🗑️ Actividad eliminada', 'success');
      onClose?.();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '22px 26px',
      borderLeft: `5px solid ${BASE.navy}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '1px' }}>
            PLAN MAESTRO · ACTIVIDAD WBS
          </p>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
            {esNuevo ? 'Nueva Actividad' : form.codigo}
          </h3>
        </div>
        <button onClick={onClose} style={btnGhost}>← Volver</button>
      </div>

      {/* SECCIÓN 1: Identificación */}
      <Seccion titulo="IDENTIFICACIÓN" color={BASE.navy}>
        <Grid cols="1fr 3fr 1fr">
          <Field label="Código WBS *" hint="Ej: 02.01.003">
            <input type="text" value={form.codigo}
              onChange={e => setForm({...form, codigo: e.target.value})}
              placeholder="02.01.003" style={inpS} />
          </Field>
          <Field label="Descripción *">
            <input type="text" value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              placeholder="Vaciado de columnas Eje 3" style={inpS} />
          </Field>
          <Field label="Unidad">
            <select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} style={selS}>
              {['m3','m2','ml','kg','tn','und','glb','dia','mes','par','jgo','pza'].map(u =>
                <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </Grid>
      </Seccion>

      {/* SECCIÓN 2: Presupuesto */}
      <Seccion titulo="PRESUPUESTO" color={CHART_PALETTE[3]}>
        <Grid cols="1fr 1fr 1fr">
          <Field label="Metrado contractual">
            <input type="number" step="0.01" value={form.metradoContractual}
              onChange={e => setForm({...form, metradoContractual: e.target.value})} style={inpS} />
          </Field>
          <Field label="Precio unitario (S/.)">
            <input type="number" step="0.01" value={form.precioUnitario}
              onChange={e => setForm({...form, precioUnitario: e.target.value})} style={inpS} />
          </Field>
          <Field label="Subtotal" hint="Calculado">
            <input type="text" readOnly value={fmtSoles(subtotal)}
              style={{...inpS, background: '#dcfce7', color: '#15803d', fontWeight: '900'}} />
          </Field>
        </Grid>
      </Seccion>

      {/* SECCIÓN 3: Productividad */}
      <Seccion titulo="PRODUCTIVIDAD" color={CHART_PALETTE[2]}>
        <Grid cols="1fr 1fr 2fr">
          <Field label="HH presupuestadas">
            <input type="number" step="0.01" value={form.hhTotalPresupuestado}
              onChange={e => setForm({...form, hhTotalPresupuestado: e.target.value})} style={inpS} />
          </Field>
          <Field label="Rendimiento teórico (HH/und)">
            <input type="number" step="0.01" value={form.rendimientoTeorico}
              onChange={e => setForm({...form, rendimientoTeorico: e.target.value})} style={inpS} />
          </Field>
          <Field label="Cuadrilla teórica">
            <input type="text" value={form.cuadrillaTeorica}
              onChange={e => setForm({...form, cuadrillaTeorica: e.target.value})}
              placeholder="3 OP + 5 OF + 8 AY" style={inpS} />
          </Field>
        </Grid>
      </Seccion>

      {/* SECCIÓN 4: Programación (Master Schedule LCI) */}
      <Seccion titulo="PROGRAMACIÓN (MASTER SCHEDULE)" color={BASE.gold}>
        <Grid cols="1fr 1fr 1fr 1fr">
          <Field label="Inicio programada">
            <input type="date" value={form.fechaInicioProgramada}
              onChange={e => setForm({...form, fechaInicioProgramada: e.target.value})} style={inpS} />
          </Field>
          <Field label="Fin programada">
            <input type="date" value={form.fechaFinProgramada}
              onChange={e => setForm({...form, fechaFinProgramada: e.target.value})} style={inpS} />
          </Field>
          <Field label="Predecesoras (códigos)">
            <input type="text" value={form.predecesoras}
              onChange={e => setForm({...form, predecesoras: e.target.value})}
              placeholder="02.01.001, 02.01.002" style={inpS} />
          </Field>
          <Field label="Estado">
            <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={selS}>
              {Object.entries(ESTADOS_ACTIVIDAD).map(([k, e]) =>
                <option key={k} value={k}>{e.icono} {e.label}</option>)}
            </select>
          </Field>
        </Grid>
      </Seccion>

      {/* SECCIÓN 5: Vinculaciones */}
      <Seccion titulo="VINCULACIONES (APU + PET + PROTOCOLO)" color={CHART_PALETTE[8]}>
        <Grid cols="1fr 1fr 1fr">
          <Field label="APU vinculado" hint="Para reconciliación">
            <select value={form.apuId} onChange={e => setForm({...form, apuId: e.target.value})} style={selS}>
              <option value="">— Sin APU —</option>
              {apus.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.descripcion}</option>)}
            </select>
          </Field>
          <Field label="PET vinculado" hint="Procedimiento de trabajo">
            <input type="text" value={form.petId}
              onChange={e => setForm({...form, petId: e.target.value})}
              placeholder="PET-005" style={inpS} />
          </Field>
          <Field label="Protocolo requerido" hint="Tipo de QC">
            <select value={form.protocoloRequerido}
              onChange={e => setForm({...form, protocoloRequerido: e.target.value})} style={selS}>
              <option value="">— Sin protocolo —</option>
              {['acero','encofrado','concreto','albanileria','acabados','iiee','iis'].map(t =>
                <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </Field>
        </Grid>
      </Seccion>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
        {!esNuevo && (
          <button onClick={borrar} disabled={guardando} style={btnDelete}>
            🗑️ Eliminar
          </button>
        )}
        <button onClick={onClose} style={btnCancel}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={btnSave}>
          {guardando ? '⏳ Guardando...' : '💾 GUARDAR'}
        </button>
      </div>
    </div>
  );
}

function Seccion({ titulo, color, children }) {
  return (
    <div style={{
      background: BASE.bgSoft, padding: '14px 16px',
      borderRadius: '10px', marginBottom: '12px',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '10px' }}>
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Grid({ cols, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px' }}>{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
      {hint && <p style={{ fontSize: '9.5px', color: BASE.muted, marginTop: '3px', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnGhost = { padding: '8px 14px', borderRadius: '8px', background: 'transparent', color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: '900', cursor: 'pointer' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: `0 4px 12px ${BASE.navy}55` };
const btnDelete = { padding: '11px 18px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca', fontSize: '11.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px' };
