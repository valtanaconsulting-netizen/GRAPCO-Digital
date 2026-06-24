// src/views/compras/OrdenEditor.jsx — Editor compartido OC / OS (Fase 3)
//
// Recibe `tipoOrden` = 'OC' | 'OS' y la coleccion destino se selecciona en consecuencia.

import React, { useEffect, useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { obtenerTCDelDia, MONEDAS, fmtMoneda, convertirAPEN } from '../../utils/tipoCambioClient';

const ESTADO_INICIAL = 'emitida';
const FORM_INICIAL = {
  numero: '',
  proveedor: '', rucProveedor: '',
  almacenDestinoId: '',
  moneda: 'PEN',
  tipoCambio: 0,
  fechaEmision: new Date().toISOString().split('T')[0],
  fechaEntregaEstimada: '',
  observaciones: '',
  estado: ESTADO_INICIAL,
  items: [],
};

const COLECCION = (tipo) => tipo === 'OS' ? 'OrdenesServicio' : 'OrdenesCompra';
const PREFIJO = (tipo) => tipo === 'OS' ? 'OS' : 'OC';

export default function OrdenEditor({ tipoOrden = 'OC', ordenExistente = null, showToast, onSaved, onCancel }) {
  const { user } = useAuth();
  const { proyectoActivoId, proyectoActivo, proyectos } = useProyectoActivo();
  const [almacenes, setAlmacenes] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [tcAuto, setTCAuto] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'Almacenes'), where('activo', '==', true)),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, 'Materiales'), orderBy('codigo')),
      (snap) => setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.activo !== false)));
    const u3 = onSnapshot(query(collection(db, 'Partidas'), orderBy('codigo')),
      (snap) => setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setPartidas([]));
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => {
    if (ordenExistente) {
      setForm({
        ...FORM_INICIAL,
        ...ordenExistente,
        items: Array.isArray(ordenExistente.items) ? ordenExistente.items : [],
        fechaEmision: ordenExistente.fechaEmision?.split?.('T')[0] || ordenExistente.fechaEmision || FORM_INICIAL.fechaEmision,
        fechaEntregaEstimada: ordenExistente.fechaEntregaEstimada?.split?.('T')[0] || ordenExistente.fechaEntregaEstimada || '',
      });
    } else {
      generarNumero();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenExistente?.id]);

  // Auto-fetch TC cuando se selecciona USD
  useEffect(() => {
    if (form.moneda === 'USD' && (!form.tipoCambio || form.tipoCambio === 0)) {
      obtenerTCDelDia(form.fechaEmision).then(tc => {
        if (tc) {
          setTCAuto(tc);
          setForm(f => ({ ...f, tipoCambio: tc.compra }));
        }
      });
    }
  }, [form.moneda, form.fechaEmision]);

  const generarNumero = async () => {
    try {
      const q = query(collection(db, COLECCION(tipoOrden)), where('proyectoId', '==', proyectoActivoId), orderBy('numero', 'desc'));
      const snap = await getDocs(q);
      let secuencial = 1;
      const year = new Date().getFullYear();
      const prefijoBuscar = `${PREFIJO(tipoOrden)}-${year}-`;
      for (const doc of snap.docs) {
        const num = doc.data().numero || '';
        if (num.startsWith(prefijoBuscar)) {
          const n = parseInt(num.split('-').pop(), 10);
          if (!isNaN(n) && n >= secuencial) secuencial = n + 1;
        }
      }
      const nuevo = `${PREFIJO(tipoOrden)}-${year}-${String(secuencial).padStart(4, '0')}`;
      setForm(f => ({ ...f, numero: nuevo }));
    } catch (e) {
      console.warn('[Numero]', e);
      const fallback = `${PREFIJO(tipoOrden)}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      setForm(f => ({ ...f, numero: fallback }));
    }
  };

  const agregarItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, {
        materialId: '', descripcion: '', cantidad: 0, precioUnit: 0,
        partidaId: '', esDescargaDirecta: false, recibido: 0,
      }],
    }));
  };

  const quitarItem = (i) => {
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const actualizarItem = (i, campo, valor) => {
    setForm(f => {
      const nuevos = [...f.items];
      nuevos[i] = { ...nuevos[i], [campo]: valor };
      // si cambia material, autollenar descripcion y precio referencia
      if (campo === 'materialId') {
        const mat = materiales.find(m => m.id === valor);
        if (mat) {
          nuevos[i].descripcion = mat.nombre;
          if (!nuevos[i].precioUnit || nuevos[i].precioUnit === 0) {
            nuevos[i].precioUnit = mat.precioReferencia || 0;
          }
        }
      }
      return { ...f, items: nuevos };
    });
  };

  // Filtrar materiales por tipoOrden (OC: no servicios; OS: solo servicios)
  const materialesFiltrados = useMemo(() => {
    return materiales.filter(m => {
      const esServ = !!m.esServicio;
      return tipoOrden === 'OS' ? esServ : !esServ;
    });
  }, [materiales, tipoOrden]);

  const totalMoneda = useMemo(() =>
    form.items.reduce((s, it) => s + (parseFloat(it.cantidad || 0) * parseFloat(it.precioUnit || 0)), 0),
    [form.items]
  );
  const totalPEN = useMemo(() => {
    if (form.moneda === 'PEN') return totalMoneda;
    return convertirAPEN(totalMoneda, form.moneda, { compra: form.tipoCambio });
  }, [totalMoneda, form.moneda, form.tipoCambio]);

  const guardar = async () => {
    if (!form.numero) return showToast?.('Numero obligatorio', 'error');
    if (!form.proveedor) return showToast?.('Proveedor obligatorio', 'error');
    if (!form.almacenDestinoId) return showToast?.('Almacen destino obligatorio', 'error');
    const itemsValidos = form.items.filter(it => (it.materialId || it.descripcion) && parseFloat(it.cantidad) > 0);
    if (itemsValidos.length === 0) return showToast?.('Agrega al menos un item con cantidad', 'error');
    if (form.moneda === 'USD' && (!form.tipoCambio || form.tipoCambio === 0)) {
      return showToast?.('Tipo de cambio obligatorio para USD', 'error');
    }

    setGuardando(true);
    try {
      const data = {
        numero: form.numero.trim(),
        tipo: tipoOrden,
        proyectoId: proyectoActivoId,
        proveedor: form.proveedor.trim(),
        rucProveedor: form.rucProveedor?.trim() || null,
        almacenDestinoId: form.almacenDestinoId,
        moneda: form.moneda,
        tipoCambio: form.moneda === 'USD' ? parseFloat(form.tipoCambio || 0) : 1,
        fechaEmision: form.fechaEmision,
        fechaEntregaEstimada: form.fechaEntregaEstimada || null,
        observaciones: form.observaciones?.trim() || null,
        estado: form.estado || ESTADO_INICIAL,
        items: itemsValidos.map(it => ({
          materialId: it.materialId || null,
          descripcion: it.descripcion?.trim() || '',
          cantidad: parseFloat(it.cantidad) || 0,
          precioUnit: parseFloat(it.precioUnit) || 0,
          partidaId: it.partidaId || null,
          esDescargaDirecta: !!it.esDescargaDirecta,
          recibido: parseFloat(it.recibido) || 0,
        })),
        totalMoneda: parseFloat(totalMoneda.toFixed(2)),
        totalPEN: parseFloat(totalPEN.toFixed(2)),
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };

      if (ordenExistente?.id) {
        await updateDoc(doc(db, COLECCION(tipoOrden), ordenExistente.id), data);
        showToast?.(`✅ ${tipoOrden} ${form.numero} actualizada`, 'success');
      } else {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        await addDoc(collection(db, COLECCION(tipoOrden)), data);
        showToast?.(`✅ ${tipoOrden} ${form.numero} creada`, 'success');
      }
      onSaved?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = tipoOrden === 'OS' ? 'Orden de Servicio' : 'Orden de Compra';
  const colorAcento = tipoOrden === 'OS' ? BASE.gold : BASE.navy;

  // Filtrar almacenes por tipoInventario
  const almacenesFiltrados = almacenes.filter(a => {
    if (a.proyectoId && a.proyectoId !== proyectoActivoId) return false;
    const tipoInv = a.tipoInventario || 'MATERIALES';
    return tipoOrden === 'OS' ? tipoInv === 'SERVICIOS' : tipoInv === 'MATERIALES';
  });

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '20px 24px',
      borderLeft: `5px solid ${colorAcento}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '10.5px', fontWeight: '900', color: colorAcento, letterSpacing: '0.6px' }}>
            {tipoOrden === 'OS' ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA'}
          </p>
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
            {ordenExistente?.id ? `Editar ${titulo}` : `Nueva ${titulo}`}
          </h3>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Proyecto: <strong>{proyectoActivo?.nombre || proyectoActivoId}</strong>
          </p>
        </div>
        {form.estado && (
          <EstadoChip estado={form.estado} />
        )}
      </div>

      {/* Datos cabecera */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <p style={lblSec}>DATOS GENERALES</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
          <Field label="Numero *">
            <input type="text" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} style={inpS} />
          </Field>
          <Field label="Fecha emision *">
            <input type="date" value={form.fechaEmision} onChange={e => setForm({...form, fechaEmision: e.target.value})} style={inpS} />
          </Field>
          <Field label="Entrega estimada">
            <input type="date" value={form.fechaEntregaEstimada} onChange={e => setForm({...form, fechaEntregaEstimada: e.target.value})} style={inpS} />
          </Field>
          <Field label="Proveedor *">
            <input type="text" value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} placeholder="UNACEM SAA" style={inpS} />
          </Field>
          <Field label="RUC">
            <input type="text" value={form.rucProveedor} maxLength={11} onChange={e => setForm({...form, rucProveedor: e.target.value})} style={inpS} />
          </Field>
          <Field label="Almacen destino *">
            <select value={form.almacenDestinoId} onChange={e => setForm({...form, almacenDestinoId: e.target.value})} style={selS}>
              <option value="">— Selecciona —</option>
              {almacenesFiltrados.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.nombre}</option>)}
            </select>
          </Field>
          <Field label="Moneda *">
            <select value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})} style={selS}>
              {MONEDAS.map(m => <option key={m.id} value={m.id}>{m.simbolo} {m.label}</option>)}
            </select>
          </Field>
          {form.moneda === 'USD' && (
            <Field label={`Tipo cambio ${tcAuto ? '(SUNAT auto)' : '*'}`}>
              <input type="number" step="0.001" value={form.tipoCambio} onChange={e => setForm({...form, tipoCambio: parseFloat(e.target.value) || 0})}
                style={{ ...inpS, fontWeight: '800', color: BASE.navy }} />
            </Field>
          )}
          <Field label="Estado">
            <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={selS}>
              <option value="emitida">📤 Emitida</option>
              <option value="parcial">📦 Parcial</option>
              <option value="recibida">✅ Recibida</option>
              <option value="anulada">❌ Anulada</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={lblSec}>{tipoOrden === 'OS' ? 'SERVICIOS' : 'ITEMS / MATERIALES'}</p>
          <button onClick={agregarItem} style={{
            padding: '6px 14px', borderRadius: '6px', background: colorAcento, color: '#fff',
            border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
          }}>+ AGREGAR</button>
        </div>

        {form.items.map((it, i) => {
          const mat = materiales.find(m => m.id === it.materialId);
          const subtotal = parseFloat(it.cantidad || 0) * parseFloat(it.precioUnit || 0);
          return (
            <div key={i} style={{
              background: BASE.white, padding: '12px', borderRadius: '10px',
              border: it.esDescargaDirecta ? `2px solid ${BASE.gold}` : `1px solid ${BASE.border}`,
              marginBottom: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <Field label={tipoOrden === 'OS' ? 'Servicio' : 'Material'}>
                  {tipoOrden === 'OS' && !it.materialId ? (
                    <input type="text" value={it.descripcion} onChange={e => actualizarItem(i, 'descripcion', e.target.value)} placeholder="Alquiler grua / asesoria geotecnica" style={inpS} />
                  ) : (
                    <select value={it.materialId} onChange={e => actualizarItem(i, 'materialId', e.target.value)} style={selS}>
                      <option value="">— Selecciona —</option>
                      {materialesFiltrados.map(m => (
                        <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label={`Cantidad ${mat ? `(${mat.unidad})` : ''}`}>
                  <input type="number" step="0.01" min="0" value={it.cantidad} onChange={e => actualizarItem(i, 'cantidad', e.target.value)} style={inpS} />
                </Field>
                <Field label={`Precio unit. (${form.moneda})`}>
                  <input type="number" step="0.01" min="0" value={it.precioUnit} onChange={e => actualizarItem(i, 'precioUnit', e.target.value)} style={inpS} />
                </Field>
                <Field label="Partida (opc.)">
                  <select value={it.partidaId || ''} onChange={e => actualizarItem(i, 'partidaId', e.target.value)} style={selS}>
                    <option value="">—</option>
                    {partidas.filter(p => !p.proyectoId || p.proyectoId === proyectoActivoId).map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Subtotal">
                  <input type="text" readOnly value={fmtMoneda(subtotal, form.moneda)}
                    style={{ ...inpS, background: BASE.bgSoft, fontWeight: '900', color: colorAcento }} />
                </Field>
                <button onClick={() => quitarItem(i)} style={{
                  padding: '8px 12px', borderRadius: '6px', background: BASE.red, color: '#fff',
                  border: 'none', fontSize: '14px', cursor: 'pointer', height: '36px',
                }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!it.esDescargaDirecta} onChange={e => actualizarItem(i, 'esDescargaDirecta', e.target.checked)}
                    style={{ width: '14px', height: '14px', accentColor: BASE.gold }} />
                  ⚡ Descarga directa a partida
                  <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>(no pasa por stock)</span>
                </label>
                {it.esDescargaDirecta && !it.partidaId && (
                  <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: '800' }}>
                    ⚠️ Asigna una partida para descarga directa
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {form.items.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: BASE.muted, padding: '20px', fontStyle: 'italic' }}>
            Sin items. Click "AGREGAR" para empezar.
          </p>
        )}

        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px',
          marginTop: '12px', padding: '12px 16px', background: colorAcento + '15',
          borderRadius: '10px', border: `1px solid ${colorAcento}55`,
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>TOTAL ({form.moneda})</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: colorAcento }}>{fmtMoneda(totalMoneda, form.moneda)}</p>
          </div>
          {form.moneda === 'USD' && (
            <div style={{ textAlign: 'right', borderLeft: `1px solid ${colorAcento}55`, paddingLeft: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>EQUIV. EN PEN</p>
              <p style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy }}>{fmtMoneda(totalPEN, 'PEN')}</p>
            </div>
          )}
        </div>
      </div>

      <Field label="Observaciones">
        <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
          rows={2} style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
      </Field>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onCancel} style={{
          padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted,
          border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
        }}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{
          padding: '11px 26px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${colorAcento}, ${colorAcento}dd)`,
          color: '#fff', border: 'none', fontSize: '13px', fontWeight: '900',
          cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.5 : 1,
          boxShadow: `0 4px 14px ${colorAcento}55`,
        }}>
          {guardando ? '⏳ Guardando...' : `💾 GUARDAR ${tipoOrden}`}
        </button>
      </div>
    </div>
  );
}

function EstadoChip({ estado }) {
  const map = {
    emitida: { bg: '#dbeafe', color: '#1e40af', label: '📤 EMITIDA' },
    parcial: { bg: '#fef3c7', color: '#92400e', label: '📦 PARCIAL' },
    recibida: { bg: '#d1fae5', color: '#065f46', label: '✅ RECIBIDA' },
    anulada: { bg: '#fee2e2', color: '#991b1b', label: '❌ ANULADA' },
  };
  const s = map[estado] || map.emitida;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '5px 14px', borderRadius: '14px',
      fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px',
    }}>{s.label}</span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const lblSec = { fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.6px', marginBottom: '10px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
