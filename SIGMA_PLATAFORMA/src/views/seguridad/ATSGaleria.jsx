// src/views/seguridad/ATSGaleria.jsx
// Análisis de Trabajo Seguro (ATS): registro diario por cuadrilla con
// fecha, frente, peligros, controles, lista de firmantes y foto del ATS firmado.

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE, CHART_PALETTE } from '../../utils/styles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FotoUploader from '../../components/FotoUploader';
import DatePickerPremium from '../../components/DatePickerPremium';

const FORM_INICIAL = {
  fecha: new Date().toISOString().slice(0, 10),
  hora: new Date().toTimeString().slice(0, 5),
  frente: '',
  actividad: '',
  cuadrilla: '',
  capataz: '',
  peligros: [],
  controles: [],
  firmantes: [],
  fotos: [],
  observaciones: '',
};

export default function ATSGaleria({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, filtrarPorContexto } = useProyectoActivo();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'ATS'), orderBy('fecha', 'desc'), limit(120)),
      // Solo ATS del proyecto activo (no mezclar seguridad entre obras).
      (snap) => { setItems(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })); setLoading(false); },
      () => setLoading(false));
    return () => unsub();
  }, [filtrarPorContexto]);

  const filtrados = useMemo(() => {
    if (!filtroFecha) return items;
    return items.filter(it => it.fecha === filtroFecha);
  }, [items, filtroFecha]);

  const abrirNuevo = () => { setForm(FORM_INICIAL); setModal('NUEVO'); };
  const abrirEdicion = (it) => {
    setForm({ ...FORM_INICIAL, ...it,
      peligros: it.peligros || [],
      controles: it.controles || [],
      firmantes: it.firmantes || [],
      fotos: it.fotos || [],
    });
    setModal(it.id);
  };

  const guardar = async () => {
    if (!form.frente || !form.actividad) {
      showToast?.('Completa frente y actividad', 'error'); return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (modal === 'NUEVO') {
        await addDoc(collection(db, 'ATS'), {
          ...payload, proyectoId: proyectoActivoId || null,
          creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
        });
        showToast?.('ATS guardado', 'success');
      } else {
        await updateDoc(doc(db, 'ATS', modal), payload);
        showToast?.('ATS actualizado', 'success');
      }
      setModal(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (it) => {
    if (!confirm(`¿Eliminar ATS de ${it.fecha}?`)) return;
    try {
      await deleteDoc(doc(db, 'ATS', it.id));
      showToast?.('Eliminado', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  if (loading) return <p style={{ padding: 30, color: BASE.muted }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.5px' }}>
            ANÁLISIS DE TRABAJO SEGURO (ATS)
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Registro diario antes de cada actividad: peligros, controles y firmas de la cuadrilla.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <DatePickerPremium value={filtroFecha || ''} onChange={iso => setFiltroFecha(iso)} />
          {filtroFecha && <button onClick={() => setFiltroFecha('')} style={btn(BASE.muted)}>Limpiar</button>}
          <button onClick={abrirNuevo} style={btn(CHART_PALETTE[2])}>+ Nuevo ATS</button>
        </div>
      </div>

      {!filtrados.length ? (
        <EmptyState icono="📋" titulo="Sin ATS registrados"
          descripcion="Cada día antes de empezar una actividad, registra el ATS con peligros, controles y firmas." />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px',
        }}>
          {filtrados.map(it => (
            <div key={it.id} style={{
              background: BASE.white, border: `1px solid ${BASE.border}`,
              borderLeft: `5px solid ${CHART_PALETTE[2]}`,
              borderRadius: '14px', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {it.fotos?.[0]?.url && (
                <img src={it.fotos[0].url} alt="" style={{
                  width: '100%', aspectRatio: '16/9', objectFit: 'cover',
                  cursor: 'pointer',
                }} onClick={() => abrirEdicion(it)} />
              )}
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>
                  {it.fecha} · {it.hora || ''} · {it.frente || 'Sin frente'}
                </p>
                <p style={{ fontSize: '13.5px', fontWeight: 900, color: BASE.navy, lineHeight: 1.3 }}>
                  {it.actividad}
                </p>
                <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                  Cuadrilla: <b>{it.cuadrilla || '—'}</b> · Capataz: <b>{it.capataz || '—'}</b>
                </p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <Pill icono="⚠️" valor={it.peligros?.length || 0} label="peligros" />
                  <Pill icono="🛡️" valor={it.controles?.length || 0} label="controles" />
                  <Pill icono="✍️" valor={it.firmantes?.length || 0} label="firmas" />
                  {it.fotos?.length > 0 && <Pill icono="📸" valor={it.fotos.length} label="fotos" />}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button onClick={() => abrirEdicion(it)} style={btnSm(BASE.navyLight)}>Ver / editar</button>
                  <button onClick={() => eliminar(it)} style={btnSm(BASE.red)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal onClose={() => setModal(null)} title={modal === 'NUEVO' ? 'Nuevo ATS' : 'Editar ATS'} maxW="720px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px' }}>
            <Campo label="Fecha"><DatePickerPremium value={form.fecha || ''} onChange={iso => setForm({...form, fecha: iso})} /></Campo>
            <Campo label="Hora"><input type="time" value={form.hora} onChange={(e) => setForm({...form, hora: e.target.value})} style={inp()} /></Campo>
            <Campo label="Frente *"><input value={form.frente} onChange={(e) => setForm({...form, frente: e.target.value})} style={inp()} placeholder="F1+F2 - PTARI" /></Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <Campo label="Actividad *"><input value={form.actividad} onChange={(e) => setForm({...form, actividad: e.target.value})} style={inp()} placeholder="Vaciado de zapatas Z-1 a Z-12" /></Campo>
            <Campo label="Cuadrilla"><input value={form.cuadrilla} onChange={(e) => setForm({...form, cuadrilla: e.target.value})} style={inp()} placeholder="C-01" /></Campo>
            <Campo label="Capataz"><input value={form.capataz} onChange={(e) => setForm({...form, capataz: e.target.value})} style={inp()} placeholder="J. Pérez" /></Campo>
          </div>

          <Lista label="Peligros identificados" items={form.peligros}
            onChange={(v) => setForm({...form, peligros: v})}
            placeholder="Ej: caída a desnivel, golpe con concreto" />
          <Lista label="Medidas de control" items={form.controles}
            onChange={(v) => setForm({...form, controles: v})}
            placeholder="Ej: arnés con doble línea, vibrador con guarda" />
          <Lista label="Firmantes (cuadrilla)" items={form.firmantes}
            onChange={(v) => setForm({...form, firmantes: v})}
            placeholder="Nombre y DNI del operario" />

          <Campo label="Observaciones">
            <textarea rows={2} value={form.observaciones} onChange={(e) => setForm({...form, observaciones: e.target.value})}
              style={{...inp(), resize: 'vertical' }} />
          </Campo>

          <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginTop: '12px', marginBottom: '6px', letterSpacing: '0.4px' }}>
            FOTO DEL ATS FIRMADO ({form.fotos.length})
          </p>
          <FotoUploader fotos={form.fotos} onChange={(f) => setForm({ ...form, fotos: f })}
            ruta={`ATS/${form.fecha}/${(form.frente || 'sin-frente').replace(/[^\w]/g, '_')}`}
            max={10} showToast={showToast} permitirBimGuid={false} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button onClick={() => setModal(null)} disabled={guardando} style={btn(BASE.muted)}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btn(CHART_PALETTE[2])}>
              {guardando ? 'Guardando…' : '💾 Guardar ATS'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Lista({ label, items, onChange, placeholder }) {
  return (
    <div style={{ marginTop: '10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: BASE.muted, padding: '8px 0', minWidth: '20px' }}>•</span>
          <input value={it} onChange={(e) => {
            const next = [...items]; next[i] = e.target.value; onChange(next);
          }} style={inp()} placeholder={placeholder} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: BASE.red, color: '#fff', border: 'none', padding: '0 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} style={{
        background: BASE.gold, color: BASE.navy, border: 'none',
        padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
      }}>+ Añadir</button>
    </div>
  );
}

function Pill({ icono, valor, label }) {
  return (
    <span style={{
      background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
      padding: '3px 8px', borderRadius: '999px',
      fontSize: '10px', fontWeight: 700, color: BASE.muted,
    }}>{icono} {valor} {label}</span>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
const btnSm = (c) => ({ background: c, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' });
