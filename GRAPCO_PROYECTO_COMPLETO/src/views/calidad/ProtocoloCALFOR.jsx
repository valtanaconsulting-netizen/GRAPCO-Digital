// src/views/calidad/ProtocoloCALFOR.jsx
// Plantilla de protocolo CAL-FOR-XXX (formato GRAPCO).
// Replica la última página del PETs SGC-CAL-PETS-001 (Trazo y Replanteo):
//   cabecera Proyecto/Cliente/Supervisión, equipos de medición,
//   tabla de mediciones plano vs campo, observaciones y 5 firmas.

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { BASE } from '../../utils/styles';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FotoUploader from '../../components/FotoUploader';

const FIRMANTES = ['Calidad - Sector', 'Producción - Sector', 'Seguridad - Sector', 'Residente', 'Supervisión'];

const FORM_INICIAL = {
  codigoProtocolo: '',           // ej. CAL-FOR-001
  versionProtocolo: '1',
  proyecto: '',
  cliente: '',
  supervision: '',
  estructuraElemento: '',
  ejes: '',
  nivel: '',
  sectorSubSector: '',
  numeroRegistro: '',
  descripcionTrabajo: '',
  equipos: [],                   // [{ marca, modelo, serie, vigenteDesde, vigenteHasta }]
  bm01: '',
  bm02: '',
  cotaTerreno: '',
  cotaFinal: '',
  mediciones: [],                // [{ planoCota, campoCota, diferencia, planoX, planoY, campoX, campoY, difX, difY }]
  observaciones: '',
  firmas: FIRMANTES.map(f => ({ rol: f, nombre: '', fecha: '' })),
  fotos: [],
  estado: 'borrador',            // borrador | revision | liberado
};

export default function ProtocoloCALFOR({ showToast }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'ProtocolosCALFOR'), orderBy('codigoProtocolo')),
      (snap) => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.warn('[CAL-FOR]', err.message); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const totalSumMediciones = useMemo(() => {
    return (form.mediciones || []).reduce((a, m) => a + (Number(m.diferencia) || 0), 0);
  }, [form.mediciones]);

  const abrir = (it = null) => {
    if (it) setForm({ ...FORM_INICIAL, ...it, equipos: it.equipos || [], mediciones: it.mediciones || [], firmas: it.firmas || FORM_INICIAL.firmas, fotos: it.fotos || [] });
    else setForm(FORM_INICIAL);
    setEditando(it ? it.id : 'NUEVO');
  };
  const cerrar = () => { setEditando(null); setForm(FORM_INICIAL); };

  const guardar = async () => {
    if (!form.codigoProtocolo || !form.proyecto) {
      showToast?.('Código y proyecto son obligatorios', 'error'); return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        await addDoc(collection(db, 'ProtocolosCALFOR'), {
          ...payload, creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
        });
        showToast?.('Protocolo creado', 'success');
      } else {
        await updateDoc(doc(db, 'ProtocolosCALFOR', editando), payload);
        showToast?.('Protocolo actualizado', 'success');
      }
      cerrar();
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (it) => {
    if (!confirm(`¿Eliminar protocolo ${it.codigoProtocolo}?`)) return;
    try {
      await deleteDoc(doc(db, 'ProtocolosCALFOR', it.id));
      showToast?.('Eliminado', 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const imprimir = () => window.print();

  const setEq = (i, k, v) => {
    const next = [...form.equipos]; next[i] = { ...next[i], [k]: v };
    setForm({ ...form, equipos: next });
  };
  const setMd = (i, k, v) => {
    const next = [...form.mediciones]; next[i] = { ...next[i], [k]: v };
    setForm({ ...form, mediciones: next });
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            PROTOCOLOS CAL-FOR (formato GRAPCO)
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Replica el formato oficial: cabecera, equipos, mediciones plano vs campo, observaciones y 5 firmas.
          </p>
        </div>
        <button onClick={() => abrir()} style={btn(BASE.navy)}>+ Nuevo CAL-FOR</button>
      </div>

      {!items.length ? (
        <EmptyState icono="📋" titulo="Sin protocolos CAL-FOR"
          descripcion="Crea el primer protocolo siguiendo el formato GRAPCO." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
          {items.map(it => (
            <div key={it.id} style={{
              background: BASE.white, border: `1px solid ${BASE.border}`,
              borderLeft: `5px solid ${BASE.navy}`,
              borderRadius: '14px', padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                    {it.codigoProtocolo} · v{it.versionProtocolo || 1}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, marginTop: '4px', lineHeight: 1.3 }}>
                    {it.proyecto || '—'}
                  </p>
                </div>
                <span style={{
                  background: it.estado === 'liberado' ? '#dcfce7' : it.estado === 'revision' ? '#fef3c7' : '#fee2e2',
                  color: it.estado === 'liberado' ? '#15803d' : it.estado === 'revision' ? '#854d0e' : '#991b1b',
                  padding: '3px 9px', borderRadius: '999px',
                  fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                  alignSelf: 'flex-start',
                }}>{(it.estado || 'borrador').toUpperCase()}</span>
              </div>
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '6px' }}>
                {it.cliente} · {it.estructuraElemento || '—'} · {(it.mediciones?.length || 0)} medición(es)
              </p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button onClick={() => abrir(it)} style={btnSm(BASE.navy)}>Editar</button>
                <button onClick={() => eliminar(it)} style={btnSm(BASE.red)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Modal onClose={cerrar} title={editando === 'NUEVO' ? 'Nuevo protocolo CAL-FOR' : 'Editar CAL-FOR'} maxW="960px">
          {/* Cabecera */}
          <Bloque titulo="CABECERA">
            <div style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr 1fr', gap: '8px' }}>
              <Campo label="Código *"><input value={form.codigoProtocolo} onChange={e => setForm({...form, codigoProtocolo: e.target.value.toUpperCase()})} style={inp()} placeholder="CAL-FOR-001" /></Campo>
              <Campo label="Versión"><input value={form.versionProtocolo} onChange={e => setForm({...form, versionProtocolo: e.target.value})} style={inp()} /></Campo>
              <Campo label="Proyecto / Obra *"><input value={form.proyecto} onChange={e => setForm({...form, proyecto: e.target.value})} style={inp()} placeholder="PTARI PRECOTEX - LAS MORERAS" /></Campo>
              <Campo label="Cliente / Propietario"><input value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} style={inp()} placeholder="PRECOTEX" /></Campo>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <Campo label="Supervisión"><input value={form.supervision} onChange={e => setForm({...form, supervision: e.target.value})} style={inp()} placeholder="HIGASHI - DYMCON" /></Campo>
              <Campo label="Estructura / Elemento"><input value={form.estructuraElemento} onChange={e => setForm({...form, estructuraElemento: e.target.value})} style={inp()} /></Campo>
              <Campo label="Ejes"><input value={form.ejes} onChange={e => setForm({...form, ejes: e.target.value})} style={inp()} /></Campo>
              <Campo label="Nivel"><input value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})} style={inp()} /></Campo>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <Campo label="Sector / Sub-sector"><input value={form.sectorSubSector} onChange={e => setForm({...form, sectorSubSector: e.target.value})} style={inp()} /></Campo>
              <Campo label="N° Registro"><input value={form.numeroRegistro} onChange={e => setForm({...form, numeroRegistro: e.target.value})} style={inp()} /></Campo>
              <Campo label="Estado">
                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={inp()}>
                  <option value="borrador">Borrador</option>
                  <option value="revision">En revisión</option>
                  <option value="liberado">Liberado</option>
                </select>
              </Campo>
            </div>
            <Campo label="Descripción del trabajo">
              <textarea rows={2} value={form.descripcionTrabajo} onChange={e => setForm({...form, descripcionTrabajo: e.target.value})} style={{...inp(), resize: 'vertical' }} />
            </Campo>
          </Bloque>

          {/* Equipos */}
          <Bloque titulo="EQUIPOS DE MEDICIÓN">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 130px 130px auto', gap: '6px', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px' }}>
              <span>N°</span><span>MARCA</span><span>MODELO</span><span>SERIE</span><span>VIGENTE DESDE</span><span>HASTA</span><span></span>
            </div>
            {(form.equipos || []).map((eq, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 130px 130px auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: BASE.muted, padding: '8px' }}>{i + 1}</span>
                <input value={eq.marca || ''}        onChange={e => setEq(i, 'marca', e.target.value)} style={inp()} />
                <input value={eq.modelo || ''}       onChange={e => setEq(i, 'modelo', e.target.value)} style={inp()} />
                <input value={eq.serie || ''}        onChange={e => setEq(i, 'serie', e.target.value)} style={inp()} />
                <input type="date" value={eq.vigenteDesde || ''} onChange={e => setEq(i, 'vigenteDesde', e.target.value)} style={inp()} />
                <input type="date" value={eq.vigenteHasta || ''} onChange={e => setEq(i, 'vigenteHasta', e.target.value)} style={inp()} />
                <button onClick={() => setForm({ ...form, equipos: form.equipos.filter((_, j) => j !== i) })} style={btnIcon(BASE.red)}>✕</button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, equipos: [...(form.equipos || []), { marca: '', modelo: '', serie: '', vigenteDesde: '', vigenteHasta: '' }] })} style={btnAdd()}>+ Equipo</button>
          </Bloque>

          {/* Referencias topográficas */}
          <Bloque titulo="REFERENCIAS TOPOGRÁFICAS">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <Campo label="B.M. 01 (X,Y,Z)"><input value={form.bm01} onChange={e => setForm({ ...form, bm01: e.target.value })} style={inp()} /></Campo>
              <Campo label="B.M. 02 (X,Y,Z)"><input value={form.bm02} onChange={e => setForm({ ...form, bm02: e.target.value })} style={inp()} /></Campo>
              <Campo label="Cota de terreno"><input value={form.cotaTerreno} onChange={e => setForm({ ...form, cotaTerreno: e.target.value })} style={inp()} /></Campo>
              <Campo label="Cota final (según plano)"><input value={form.cotaFinal} onChange={e => setForm({ ...form, cotaFinal: e.target.value })} style={inp()} /></Campo>
            </div>
          </Bloque>

          {/* Mediciones plano vs campo */}
          <Bloque titulo={`MEDICIONES (${form.mediciones?.length || 0}) — PLANO VS CAMPO`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: BASE.navy, color: '#fff' }}>
                    <th rowSpan={2} style={th()}>N°</th>
                    <th colSpan={2} style={th()}>COTA / LONG. (m)</th>
                    <th rowSpan={2} style={th()}>DIF.</th>
                    <th colSpan={2} style={th()}>PLANO</th>
                    <th colSpan={2} style={th()}>CAMPO</th>
                    <th colSpan={2} style={th()}>DIFERENCIA</th>
                    <th rowSpan={2} style={th()}></th>
                  </tr>
                  <tr style={{ background: BASE.navyDark, color: '#fff' }}>
                    <th style={thS()}>Plano</th><th style={thS()}>Campo</th>
                    <th style={thS()}>X (este)</th><th style={thS()}>Y (norte)</th>
                    <th style={thS()}>X</th><th style={thS()}>Y</th>
                    <th style={thS()}>X</th><th style={thS()}>Y</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.mediciones || []).map((m, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '2px' }}><input value={m.planoCota || ''} onChange={e => setMd(i, 'planoCota', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.campoCota || ''} onChange={e => setMd(i, 'campoCota', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.diferencia || ''} onChange={e => setMd(i, 'diferencia', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.planoX || ''} onChange={e => setMd(i, 'planoX', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.planoY || ''} onChange={e => setMd(i, 'planoY', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.campoX || ''} onChange={e => setMd(i, 'campoX', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.campoY || ''} onChange={e => setMd(i, 'campoY', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.difX || ''} onChange={e => setMd(i, 'difX', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><input value={m.difY || ''} onChange={e => setMd(i, 'difY', e.target.value)} style={inpC()} /></td>
                      <td style={{ padding: '2px' }}><button onClick={() => setForm({ ...form, mediciones: form.mediciones.filter((_, j) => j !== i) })} style={btnIcon(BASE.red)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setForm({ ...form, mediciones: [...(form.mediciones || []), {}] })} style={{ ...btnAdd(), marginTop: '6px' }}>+ Medición</button>
          </Bloque>

          {/* Observaciones + Fotos */}
          <Bloque titulo="OBSERVACIONES Y FOTOS">
            <Campo label="Observaciones">
              <textarea rows={3} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ ...inp(), resize: 'vertical' }} />
            </Campo>
            <p style={{ ...lbl(), marginTop: '8px' }}>FOTOS DEL PROTOCOLO</p>
            <FotoUploader fotos={form.fotos} onChange={(f) => setForm({ ...form, fotos: f })}
              ruta={`ProtocolosCALFOR/${form.codigoProtocolo || 'temp'}/${Date.now()}`}
              max={20} showToast={showToast} />
          </Bloque>

          {/* Firmas */}
          <Bloque titulo="REVISADO Y APROBADO POR">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
              {(form.firmas || []).map((f, i) => (
                <div key={i} style={{ border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '8px' }}>
                  <p style={{ fontSize: '9.5px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.4px', marginBottom: '4px' }}>
                    {f.rol.toUpperCase()}
                  </p>
                  <input value={f.nombre} onChange={(e) => {
                    const next = [...form.firmas]; next[i] = { ...f, nombre: e.target.value };
                    setForm({ ...form, firmas: next });
                  }} placeholder="Nombre" style={{ ...inp(), fontSize: '11px', padding: '6px 8px' }} />
                  <input type="date" value={f.fecha} onChange={(e) => {
                    const next = [...form.firmas]; next[i] = { ...f, fecha: e.target.value };
                    setForm({ ...form, firmas: next });
                  }} style={{ ...inp(), fontSize: '11px', padding: '6px 8px', marginTop: '4px' }} />
                </div>
              ))}
            </div>
          </Bloque>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '14px', borderTop: `1px solid ${BASE.border}`, paddingTop: '12px' }}>
            <button onClick={imprimir} style={btn(BASE.navy)}>🖨️ Imprimir / PDF</button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={cerrar} disabled={guardando} style={btn(BASE.muted)}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={btn(BASE.navy)}>
                {guardando ? 'Guardando…' : '💾 Guardar protocolo'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div style={{ marginTop: '14px', border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '12px', background: '#fdfdff' }}>
      <p style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.6px', marginBottom: '10px' }}>
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p style={lbl()}>{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

const lbl = () => ({ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' });
const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const inpC = () => ({ width: '100%', padding: '4px 6px', border: `1px solid ${BASE.border}`, borderRadius: '4px', fontSize: '11px', fontFamily: BASE.font });
const th = () => ({ padding: '8px 6px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.3px' });
const thS = () => ({ padding: '6px 4px', fontSize: '9.5px', fontWeight: 700 });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
const btnSm = (c) => ({ background: c, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' });
const btnIcon = (c) => ({ background: c, color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' });
const btnAdd = () => ({ background: BASE.gold, color: BASE.navy, border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' });
