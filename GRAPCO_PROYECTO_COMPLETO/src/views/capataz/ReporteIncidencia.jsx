// src/views/capataz/ReporteIncidencia.jsx
// Formulario rápido para que el capataz reporte incidencias / NCs desde campo,
// con fotos y ubicación. Crea documento en colección NoConformidades.

import React, { useEffect, useState } from 'react';
import {
  collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import FotoUploader from '../../components/FotoUploader';
import EmptyState from '../../components/EmptyState';

const TIPOS = [
  { id: 'calidad',   l: 'Calidad',    color: '#ec4899', icono: '🦺' },
  { id: 'seguridad', l: 'Seguridad',  color: '#dc2626', icono: '⚠️' },
  { id: 'logistica', l: 'Logística',  color: '#7c3aed', icono: '📦' },
  { id: 'tecnico',   l: 'Técnico',    color: '#6366f1', icono: '📐' },
];

const SEVERIDADES = [
  { id: 'baja',     l: 'Baja',     color: '#16a34a' },
  { id: 'media',    l: 'Media',    color: '#f59e0b' },
  { id: 'alta',     l: 'Alta',     color: '#dc2626' },
  { id: 'critica',  l: 'Crítica',  color: '#7f1d1d' },
];

const formInicial = (tipoDefault = 'calidad') => ({
  tipo: tipoDefault,
  severidad: 'media',
  ubicacion: '',
  partida: '',
  descripcion: '',
  accionInmediata: '',
  fotos: [],
});

export default function ReporteIncidencia({ showToast, tipoDefault = 'calidad' }) {
  const { user } = useAuth();
  const { filtrarPorContexto, proyectoActivoId } = useProyectoActivo();
  const [form, setForm] = useState(() => formInicial(tipoDefault));
  const [enviando, setEnviando] = useState(false);
  const [misReportes, setMisReportes] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'NoConformidades'), orderBy('detectadoEn', 'desc'), limit(10));
    const unsub = onSnapshot(q,
      (snap) => {
        const todos = filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true });
        setMisReportes(todos.filter(r => r.reportadoPor === user?.email));
      },
      (err) => console.warn('[ReporteIncidencia]', err.message)
    );
    return () => unsub();
  }, [user, filtrarPorContexto]);

  const enviar = async () => {
    if (!form.descripcion.trim()) {
      showToast?.('Describe la incidencia', 'error');
      return;
    }
    setEnviando(true);
    try {
      await addDoc(collection(db, 'NoConformidades'), {
        codigo: `NC-${Date.now()}`,
        origen: 'capataz',
        tipo: form.tipo,
        severidad: form.severidad,
        ubicacion: form.ubicacion,
        partida: form.partida,
        descripcion: form.descripcion,
        accionInmediata: form.accionInmediata,
        fotos: form.fotos,
        estado: 'abierta',
        proyectoId: proyectoActivoId,   // aislamiento: la NC pertenece al proyecto activo
        detectadoEn: serverTimestamp(),
        reportadoPor: user?.email || 'capataz',
        creadoEn: serverTimestamp(),
      });
      showToast?.('Incidencia reportada', 'success');
      setForm(formInicial(tipoDefault));
    } catch (e) {
      showToast?.('Error al enviar: ' + e.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* FORM */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.red, letterSpacing: '0.5px', marginBottom: '4px' }}>
          🚨 NUEVA INCIDENCIA
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '14px' }}>
          Lo que reportes aquí llega de inmediato a Calidad / Seguridad / OT con tus fotos y ubicación. Sé claro y específico.
        </p>

        {/* Tipo */}
        <Label>Tipo de incidencia</Label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setForm({ ...form, tipo: t.id })} style={pill(form.tipo === t.id, t.color)}>
              <span style={{ marginRight: '4px' }}>{t.icono}</span>{t.l}
            </button>
          ))}
        </div>

        {/* Severidad */}
        <Label>Severidad</Label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {SEVERIDADES.map(s => (
            <button key={s.id} onClick={() => setForm({ ...form, severidad: s.id })} style={pill(form.severidad === s.id, s.color)}>
              {s.l}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <Campo label="Ubicación / frente">
            <input type="text" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              style={inp()} placeholder="Ej: F1+F2 - PTARI, Eje A-3" />
          </Campo>
          <Campo label="Partida (opcional)">
            <input type="text" value={form.partida} onChange={(e) => setForm({ ...form, partida: e.target.value })}
              style={inp()} placeholder="Ej: 1003 CONCRETO" />
          </Campo>
        </div>

        <Campo label="¿Qué pasa? *">
          <textarea rows={3} value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            style={{ ...inp(), resize: 'vertical' }}
            placeholder="Describe el problema con detalle: qué encontraste, dónde, qué riesgo implica…" />
        </Campo>

        <Campo label="Acción inmediata tomada">
          <textarea rows={2} value={form.accionInmediata}
            onChange={(e) => setForm({ ...form, accionInmediata: e.target.value })}
            style={{ ...inp(), resize: 'vertical' }}
            placeholder="¿Qué hiciste para contener? Ej: Detuve la actividad, señalizé el área, avisé al residente." />
        </Campo>

        <div style={{ marginTop: '8px' }}>
          <Label>Fotos (obligatorio para severidad alta/crítica)</Label>
          <FotoUploader
            fotos={form.fotos}
            onChange={(fotos) => setForm({ ...form, fotos })}
            ruta={`Incidencias/${user?.uid || 'anon'}/${Date.now()}`}
            max={10}
            showToast={showToast}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button onClick={() => setForm(formInicial(tipoDefault))} disabled={enviando} style={btn('#94a3b8')}>
            Limpiar
          </button>
          <button onClick={enviar} disabled={enviando} style={btn(BASE.red)}>
            {enviando ? 'Enviando…' : '🚨 Reportar incidencia'}
          </button>
        </div>
      </div>

      {/* MIS REPORTES RECIENTES */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '10px' }}>
          📋 MIS REPORTES RECIENTES
        </p>
        {!misReportes.length ? (
          <EmptyState
            icono="📋"
            titulo="Aún no has reportado nada"
            descripcion="Tus reportes aparecerán aquí para que veas el seguimiento."
            altura="180px"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {misReportes.map(r => {
              const tipo = TIPOS.find(t => t.id === r.tipo) || TIPOS[0];
              const sev  = SEVERIDADES.find(s => s.id === r.severidad) || SEVERIDADES[1];
              return (
                <div key={r.id} style={{
                  display: 'flex', gap: '10px',
                  padding: '10px 12px',
                  background: '#f8fafc', borderRadius: '10px',
                  borderLeft: `4px solid ${sev.color}`,
                }}>
                  {r.fotos?.[0] && (
                    <img src={r.fotos[0].url} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ background: tipo.color, color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 800 }}>
                        {tipo.icono} {tipo.l.toUpperCase()}
                      </span>
                      <span style={{ background: sev.color, color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 800 }}>
                        {sev.l.toUpperCase()}
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '10px', fontWeight: 800,
                        color: r.estado === 'cerrada' ? BASE.green : r.estado === 'enProceso' ? BASE.gold : BASE.red,
                      }}>{(r.estado || 'abierta').toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: BASE.navy, fontWeight: 700, marginBottom: '2px' }}>
                      {r.ubicacion || 'Sin ubicación'} {r.partida ? `· ${r.partida}` : ''}
                    </p>
                    <p style={{ fontSize: '11px', color: BASE.muted, lineHeight: 1.4 }}>{r.descripcion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '6px', letterSpacing: '0.4px' }}>
      {children}
    </p>
  );
}

const inp = () => ({ width: '100%', padding: '9px 12px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 12px ${c}55` });
const pill = (activo, c) => ({
  padding: '8px 14px',
  borderRadius: '10px',
  border: `1.5px solid ${activo ? c : BASE.border}`,
  background: activo ? c : '#fff',
  color: activo ? '#fff' : BASE.muted,
  fontSize: '11px', fontWeight: 800,
  cursor: 'pointer', transition: 'all 0.15s',
});
