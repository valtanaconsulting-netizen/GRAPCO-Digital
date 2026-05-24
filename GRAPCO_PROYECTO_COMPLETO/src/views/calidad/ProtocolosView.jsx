// src/views/calidad/ProtocolosView.jsx — Lista de Protocolos por elemento (B20)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import {
  TIPOS_PROTOCOLO, ELEMENTOS_TIPO, ESTADOS_PROTOCOLO,
  generarChecklistDefault, generarCodigoProtocolo,
  calcularEstadoProtocolo,
} from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';

const FORM_INICIAL = {
  tipo: 'concreto',
  elementoTipo: 'columna',
  elementoCodigo: '',
  partidaWBS: '',
  ubicacion: '',
  observaciones: '',
};

export default function ProtocolosView({ showToast, onEdit }) {
  const { user } = useAuth();
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroElemento, setFiltroElemento] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const { filtrarPorContexto } = useProyectoActivo();
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Protocolos'), orderBy('fechaCreacion', 'desc')),
      (snap) => {
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProtocolos(filtrarPorContexto(todos));
        setLoading(false);
      },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, [filtrarPorContexto]);

  const filtrados = useMemo(() => {
    return protocolos.filter(p => {
      if (filtroTipo && p.tipo !== filtroTipo) return false;
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (filtroElemento && p.elementoTipo !== filtroElemento) return false;
      if (busqueda) {
        const b = busqueda.toLowerCase();
        return (p.codigo || '').toLowerCase().includes(b) ||
               (p.elementoCodigo || '').toLowerCase().includes(b) ||
               (p.partidaWBS || '').toLowerCase().includes(b);
      }
      return true;
    });
  }, [protocolos, filtroTipo, filtroEstado, filtroElemento, busqueda]);

  const crear = async () => {
    if (!form.elementoCodigo) {
      showToast?.('Codigo del elemento obligatorio', 'error');
      return;
    }
    setGuardando(true);
    try {
      const codigo = generarCodigoProtocolo(form.tipo, form.elementoTipo, form.elementoCodigo);
      const checklist = generarChecklistDefault(form.tipo);
      const data = {
        codigo,
        tipo: form.tipo,
        elementoTipo: form.elementoTipo,
        elementoCodigo: form.elementoCodigo.toUpperCase().trim(),
        elementoId: `${form.elementoTipo.toUpperCase()}-${form.elementoCodigo.toUpperCase()}`,
        partidaWBS: form.partidaWBS?.trim() || null,
        ubicacion: form.ubicacion?.trim() || null,
        observaciones: form.observaciones?.trim() || null,
        elementoBIM_dbId: null, // se vincula despues
        checklist,
        fotos: [],
        firmaResidente: null,
        firmaSupervisor: null,
        estado: 'pendiente',
        fechaCreacion: serverTimestamp(),
        creadoPor: user?.email || 'desconocido',
      };
      await addDoc(collection(db, 'Protocolos'), data);
      showToast?.(`✅ Protocolo ${codigo} creado`, 'success');
      setCreando(false);
      setForm(FORM_INICIAL);
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando protocolos...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Filtros */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>📋 Protocolos</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {protocolos.length} total · {filtrados.length} mostrados
            </p>
          </div>
          <button onClick={() => setCreando(true)} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
          }}>
            ➕ NUEVO PROTOCOLO
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' }}>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar codigo, elemento..." style={inpS} />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selS}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_PROTOCOLO).map(([k, t]) => (
              <option key={k} value={k}>{t.icono} {t.label}</option>
            ))}
          </select>
          <select value={filtroElemento} onChange={e => setFiltroElemento(e.target.value)} style={selS}>
            <option value="">Todos los elementos</option>
            {ELEMENTOS_TIPO.map(e => <option key={e.id} value={e.id}>{e.icono} {e.label}</option>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selS}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_PROTOCOLO).map(([k, e]) => (
              <option key={k} value={k}>{e.icono} {e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <EmptyState icono="📋" titulo="Sin protocolos"
          descripcion="Crea el primer protocolo de calidad. La plataforma genera el checklist segun el tipo." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
          {filtrados.map(p => {
            const estado = ESTADOS_PROTOCOLO[p.estado] || ESTADOS_PROTOCOLO.pendiente;
            const tipo = TIPOS_PROTOCOLO[p.tipo] || TIPOS_PROTOCOLO.concreto;
            const elem = ELEMENTOS_TIPO.find(e => e.id === p.elementoTipo);
            const itemsLlenos = p.checklist?.filter(c => c.valor !== 'NO_LLENADO').length || 0;
            const totalItems = p.checklist?.length || 0;
            const pctLleno = totalItems > 0 ? Math.round((itemsLlenos / totalItems) * 100) : 0;

            return (
              <div key={p.id} style={{
                background: BASE.white, border: `1px solid ${BASE.border}`,
                borderLeft: `5px solid ${estado.color}`,
                borderRadius: '14px', padding: '18px 20px',
                boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
                transition: 'transform 0.15s',
                cursor: 'pointer',
              }}
              onClick={() => onEdit?.(p.id)}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                      {p.codigo}
                    </p>
                    <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '3px' }}>
                      {tipo.icono} {tipo.label}
                    </p>
                  </div>
                  <span style={{
                    background: estado.color, color: '#fff',
                    padding: '4px 10px', borderRadius: '12px',
                    fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.5px',
                  }}>{estado.icono} {estado.label}</span>
                </div>

                <div style={{
                  background: BASE.bgSoft, padding: '10px 12px', borderRadius: '8px', marginTop: '10px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{ fontSize: '20px' }}>{elem?.icono}</span>
                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: BASE.text }}>
                      {elem?.label} {p.elementoCodigo}
                    </p>
                    {p.partidaWBS && (
                      <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px', fontFamily: 'monospace' }}>
                        {p.partidaWBS}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progreso checklist */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px' }}>
                      CHECKLIST {itemsLlenos}/{totalItems}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: '900', color: BASE.navy }}>
                      {pctLleno}%
                    </span>
                  </div>
                  <div style={{ background: BASE.bgSoft, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      background: estado.color, height: '100%', width: `${pctLleno}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>

                {/* Firmas */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Pill label="Residente" ok={!!p.firmaResidente?.uid} />
                  <Pill label="Cliente" ok={!!p.firmaSupervisor?.uid} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de creacion */}
      {creando && (
        <Modal onClose={() => setCreando(false)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            ➕ Nuevo Protocolo de Calidad
          </h3>
          <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '16px' }}>
            La plataforma genera automaticamente el checklist segun el tipo seleccionado.
          </p>

          <Field label="Tipo de protocolo">
            <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={selS}>
              {Object.entries(TIPOS_PROTOCOLO).map(([k, t]) => (
                <option key={k} value={k}>{t.icono} {t.label}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Tipo de elemento">
              <select value={form.elementoTipo} onChange={e => setForm({...form, elementoTipo: e.target.value})} style={selS}>
                {ELEMENTOS_TIPO.map(e => <option key={e.id} value={e.id}>{e.icono} {e.label}</option>)}
              </select>
            </Field>
            <Field label="Codigo del elemento *">
              <input type="text" value={form.elementoCodigo}
                onChange={e => setForm({...form, elementoCodigo: e.target.value.toUpperCase()})}
                placeholder="Ej: EJE3-N1" style={inpS} />
            </Field>
          </div>

          <Field label="Partida WBS (opcional)">
            <input type="text" value={form.partidaWBS}
              onChange={e => setForm({...form, partidaWBS: e.target.value})}
              placeholder="Ej: ENC-COL-EJE3" style={inpS} />
          </Field>

          <Field label="Ubicacion">
            <input type="text" value={form.ubicacion}
              onChange={e => setForm({...form, ubicacion: e.target.value})}
              placeholder="Edif. C, Nivel 1, Eje 3" style={inpS} />
          </Field>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setCreando(false)} style={btnCancel}>Cancelar</button>
            <button onClick={crear} disabled={guardando} style={btnSave}>
              {guardando ? '⏳ Creando...' : '➕ CREAR PROTOCOLO'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

function Pill({ label, ok }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: ok ? '#dcfce7' : BASE.bgSoft,
      color: ok ? '#15803d' : BASE.muted,
      border: `1px solid ${ok ? '#16a34a55' : BASE.border}`,
      padding: '3px 9px', borderRadius: '10px',
      fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
    }}>
      {ok ? '✓' : '○'} {label.toUpperCase()}
    </span>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' };
