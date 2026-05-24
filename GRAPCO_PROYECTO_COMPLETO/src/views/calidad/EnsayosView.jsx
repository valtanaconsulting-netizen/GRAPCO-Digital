// src/views/calidad/EnsayosView.jsx — Resultados de ensayos de laboratorio (B20)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { TIPOS_ENSAYO, ELEMENTOS_TIPO, fmtNumero } from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FotoUploader from '../../components/FotoUploader';

const FORM_INICIAL = {
  tipo: 'compresion', laboratorio: '', elementoTipo: 'columna', elementoId: '', partidaWBS: '',
  fechaToma: new Date().toISOString().split('T')[0],
  fechaResultado: '', edadDias: 28,
  valorEspecificado: 210, valorObtenido: 0, unidad: 'kg/cm2',
  observaciones: '',
  fotos: [],
};

export default function EnsayosView({ showToast }) {
  const { user } = useAuth();
  const [ensayos, setEnsayos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCumple, setFiltroCumple] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'Ensayos'), orderBy('fechaToma', 'desc')),
      (snap) => { setEnsayos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  const filtrados = useMemo(() => ensayos.filter(e => {
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    if (filtroCumple === 'si' && e.cumple !== true) return false;
    if (filtroCumple === 'no' && e.cumple !== false) return false;
    return true;
  }), [ensayos, filtroTipo, filtroCumple]);

  const handleArchivo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      showToast?.('PDF maximo 10MB', 'error');
      return;
    }
    setArchivo(f);
  };

  const guardar = async () => {
    if (!form.laboratorio) {
      showToast?.('Indica el laboratorio', 'error');
      return;
    }
    if (parseFloat(form.valorObtenido) <= 0) {
      showToast?.('Ingresa el valor obtenido', 'error');
      return;
    }
    setGuardando(true);
    try {
      let archivoUrl = null;
      if (archivo) {
        try {
          const path = `ensayos/${Date.now()}_${archivo.name}`;
          const r = ref(storage, path);
          await uploadBytes(r, archivo);
          archivoUrl = await getDownloadURL(r);
        } catch (e) {
          console.warn('[Storage]', e);
        }
      }

      const valorEsp = parseFloat(form.valorEspecificado);
      const valorObt = parseFloat(form.valorObtenido);
      const cumple = valorObt >= valorEsp;
      const codigo = `ENS-${new Date().getFullYear()}-${String(ensayos.length + 1).padStart(3, '0')}`;

      const data = {
        tipo: form.tipo,
        laboratorio: form.laboratorio.trim(),
        elementoTipo: form.elementoTipo,
        elementoId: form.elementoId?.trim() || null,
        partidaWBS: form.partidaWBS?.trim() || null,
        fechaToma: new Date(form.fechaToma),
        fechaResultado: form.fechaResultado ? new Date(form.fechaResultado) : null,
        edadDias: parseInt(form.edadDias) || null,
        valorEspecificado: valorEsp,
        valorObtenido: valorObt,
        unidad: form.unidad,
        cumple,
        archivoPDF: archivoUrl || form.archivoPDF || null,
        observaciones: form.observaciones?.trim() || null,
        fotos: Array.isArray(form.fotos) ? form.fotos : [],
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.codigo = codigo;
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, 'Ensayos'), data);
        showToast?.(`✅ Ensayo ${codigo} ${cumple ? 'CUMPLE' : 'NO CUMPLE'}`, cumple ? 'success' : 'error');
      } else {
        await updateDoc(doc(db, 'Ensayos', editando), data);
        showToast?.('✅ Ensayo actualizado', 'success');
      }
      setEditando(null); setArchivo(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando ensayos...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>🧪 Ensayos de Laboratorio</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {ensayos.length} total · {ensayos.filter(e => e.cumple === true).length} cumplen · {ensayos.filter(e => e.cumple === false).length} no cumplen
            </p>
          </div>
          <button onClick={() => { setForm(FORM_INICIAL); setArchivo(null); setEditando('NUEVO'); }} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: `0 4px 12px ${BASE.gold}55`,
          }}>➕ NUEVO ENSAYO</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' }}>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selS}>
            <option value="">Todos los tipos</option>
            {TIPOS_ENSAYO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={filtroCumple} onChange={e => setFiltroCumple(e.target.value)} style={selS}>
            <option value="">Todos</option>
            <option value="si">✅ Solo cumplen</option>
            <option value="no">❌ Solo no cumplen</option>
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icono="🧪" titulo="Sin ensayos registrados"
          descripcion="Registra los resultados que vienen del laboratorio externo (Cementos Lima, ECS, etc.)" />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Tipo</th>
                  <th style={th()}>Elemento</th>
                  <th style={th()}>Laboratorio</th>
                  <th style={th()}>Toma</th>
                  <th style={th()}>Edad</th>
                  <th style={{ ...th(), textAlign: 'right' }}>Especificado</th>
                  <th style={{ ...th(), textAlign: 'right' }}>Obtenido</th>
                  <th style={{ ...th(), textAlign: 'center' }}>Cumple</th>
                  <th style={{ ...th(), textAlign: 'center' }}>PDF</th>
                  <th style={{ ...th(), textAlign: 'center' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e, i) => {
                  const tipoLabel = TIPOS_ENSAYO.find(t => t.id === e.tipo)?.label || e.tipo;
                  const elem = ELEMENTOS_TIPO.find(el => el.id === e.elementoTipo);
                  const fechaToma = e.fechaToma?.toDate ? e.fechaToma.toDate().toLocaleDateString('es-PE') : '—';
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', fontWeight: '900', color: BASE.navy }}>{e.codigo}</td>
                      <td style={td()}>{tipoLabel}</td>
                      <td style={td()}>{elem?.icono} {e.elementoId || '—'}</td>
                      <td style={{ ...td(), fontSize: '11px' }}>{e.laboratorio}</td>
                      <td style={{ ...td(), fontSize: '11px', fontFamily: 'monospace' }}>{fechaToma}</td>
                      <td style={{ ...td(), textAlign: 'center', fontFamily: 'monospace' }}>{e.edadDias ? `${e.edadDias}d` : '—'}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtNumero(e.valorEspecificado)} {e.unidad}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: '900',
                        color: e.cumple ? BASE.green : BASE.red }}>
                        {fmtNumero(e.valorObtenido)} {e.unidad}
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <span style={{
                          background: e.cumple ? '#dcfce7' : '#fee2e2',
                          color: e.cumple ? '#15803d' : '#991b1b',
                          padding: '3px 9px', borderRadius: '10px',
                          fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                        }}>
                          {e.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                        </span>
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {e.archivoPDF ? (
                          <a href={e.archivoPDF} target="_blank" rel="noopener noreferrer" style={{
                            color: BASE.navy, fontWeight: '900', fontSize: '12px', textDecoration: 'none',
                          }}>📄 PDF</a>
                        ) : '—'}
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <button onClick={() => {
                          setForm({
                            ...FORM_INICIAL, ...e,
                            fechaToma: e.fechaToma?.toDate ? e.fechaToma.toDate().toISOString().split('T')[0] : '',
                            fechaResultado: e.fechaResultado?.toDate ? e.fechaResultado.toDate().toISOString().split('T')[0] : '',
                          });
                          setArchivo(null);
                          setEditando(e.id);
                        }} style={{
                          padding: '5px 11px', borderRadius: '6px', background: BASE.navy, color: '#fff',
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

      {editando && (
        <Modal onClose={() => setEditando(null)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            {editando === 'NUEVO' ? '➕ Nuevo Ensayo' : '✏️ Editar Ensayo'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Tipo de ensayo">
              <select value={form.tipo} onChange={e => {
                const t = TIPOS_ENSAYO.find(x => x.id === e.target.value);
                setForm({...form, tipo: e.target.value, unidad: t?.unidad || form.unidad });
              }} style={selS}>
                {TIPOS_ENSAYO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Laboratorio *">
              <input type="text" value={form.laboratorio} onChange={e => setForm({...form, laboratorio: e.target.value})}
                placeholder="Cementos Lima | ECS | Otro" style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Tipo elemento">
              <select value={form.elementoTipo} onChange={e => setForm({...form, elementoTipo: e.target.value})} style={selS}>
                {ELEMENTOS_TIPO.map(e => <option key={e.id} value={e.id}>{e.icono} {e.label}</option>)}
              </select>
            </Field>
            <Field label="Elemento">
              <input type="text" value={form.elementoId} onChange={e => setForm({...form, elementoId: e.target.value})}
                placeholder="EJE3-N1" style={inpS} />
            </Field>
            <Field label="Partida WBS">
              <input type="text" value={form.partidaWBS} onChange={e => setForm({...form, partidaWBS: e.target.value})}
                placeholder="ENC-COL" style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Fecha toma">
              <input type="date" value={form.fechaToma} onChange={e => setForm({...form, fechaToma: e.target.value})} style={inpS} />
            </Field>
            <Field label="Fecha resultado">
              <input type="date" value={form.fechaResultado} onChange={e => setForm({...form, fechaResultado: e.target.value})} style={inpS} />
            </Field>
            <Field label="Edad (dias)">
              <input type="number" value={form.edadDias} onChange={e => setForm({...form, edadDias: e.target.value})} style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Valor especificado">
              <input type="number" step="0.01" value={form.valorEspecificado}
                onChange={e => setForm({...form, valorEspecificado: e.target.value})} style={inpS} />
            </Field>
            <Field label="Valor obtenido *">
              <input type="number" step="0.01" value={form.valorObtenido}
                onChange={e => setForm({...form, valorObtenido: e.target.value})} style={inpS} />
            </Field>
            <Field label="Unidad">
              <input type="text" value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})}
                placeholder="kg/cm2" style={inpS} />
            </Field>
          </div>

          {/* Indicador de cumplimiento en vivo */}
          {form.valorObtenido > 0 && form.valorEspecificado > 0 && (
            <div style={{
              background: parseFloat(form.valorObtenido) >= parseFloat(form.valorEspecificado) ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${parseFloat(form.valorObtenido) >= parseFloat(form.valorEspecificado) ? BASE.green : BASE.red}55`,
              borderLeft: `4px solid ${parseFloat(form.valorObtenido) >= parseFloat(form.valorEspecificado) ? BASE.green : BASE.red}`,
              borderRadius: '10px', padding: '12px 16px', marginBottom: '12px',
            }}>
              <p style={{ fontSize: '12.5px', fontWeight: '900',
                color: parseFloat(form.valorObtenido) >= parseFloat(form.valorEspecificado) ? '#15803d' : '#991b1b' }}>
                {parseFloat(form.valorObtenido) >= parseFloat(form.valorEspecificado)
                  ? `✅ CUMPLE — Diferencia: +${(parseFloat(form.valorObtenido) - parseFloat(form.valorEspecificado)).toFixed(2)} ${form.unidad}`
                  : `❌ NO CUMPLE — Faltan ${(parseFloat(form.valorEspecificado) - parseFloat(form.valorObtenido)).toFixed(2)} ${form.unidad}`}
              </p>
            </div>
          )}

          <Field label="Archivo PDF del laboratorio">
            <input type="file" accept="application/pdf" onChange={handleArchivo} style={{ ...inpS, padding: '6px', cursor: 'pointer' }} />
            {archivo && <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '4px' }}>📎 {archivo.name}</p>}
          </Field>

          <Field label="Observaciones">
            <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} rows={2}
              placeholder="Notas adicionales..." style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          <Field label={`Fotos del ensayo / probetas (${form.fotos?.length || 0})`}>
            <FotoUploader
              fotos={form.fotos || []}
              onChange={(fotos) => setForm({ ...form, fotos })}
              ruta={`Ensayos/${form.elementoId || 'sin-elemento'}/${Date.now()}`}
              max={10}
              showToast={showToast}
            />
          </Field>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={btnSave}>
              {guardando ? '⏳ Guardando...' : '💾 GUARDAR ENSAYO'}
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

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: `0 4px 12px ${BASE.gold}55` };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top', ...extra });
