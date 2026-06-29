// src/views/materiales/SalidaMaterial.jsx — Vale digital de salida (B19)
// Reemplazo del vale en papel: numVale, retiradoPor, actividad LPS destino, foto, firma digital

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { calcularStockActual, fmtCantidad, fmtSoles, generarNumero } from '../../utils/materialesAnalytics';
import DatePickerPremium from '../../components/DatePickerPremium';

export default function SalidaMaterial({ showToast, onSaved }) {
  const { user } = useAuth();
  const { proyectoActivoId, filtrarPorContexto } = useProyectoActivo();
  const [almacenes, setAlmacenes] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [personalDB, setPersonalDB] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [partidaIdSeleccionada, setPartidaIdSeleccionada] = useState('');
  const errorAvisado = useRef(false);

  // Form
  const [almacenId, setAlmacenId] = useState('');
  const [numVale, setNumVale] = useState('');
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0]);
  const [retiradoPor, setRetiradoPor] = useState('');
  const [actividadDestino, setActividadDestino] = useState('');
  const [partidaDestino, setPartidaDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([{ materialId: '', cantidad: 0 }]);

  // Firma digital (canvas)
  const canvasRef = useRef(null);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    // Aviso UNA vez si falla una lectura: el operario NO debe emitir un vale de salida
    // sobre stock incompleto (sin señal / cache frío). Mejor saberlo que fallar en silencio.
    const avisar = (tag) => (e) => {
      console.error(`[${tag}]`, e);
      if (!errorAvisado.current) {
        errorAvisado.current = true;
        showToast?.('No se pudo cargar el stock — revisa tu conexión antes de emitir la salida', 'error');
      }
    };
    const u1 = onSnapshot(query(collection(db, 'Almacenes'), where('activo', '==', true)),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), avisar('Almacenes'));
    const u2 = onSnapshot(query(collection(db, 'Materiales'), orderBy('codigo')),
      (snap) => setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.activo !== false && !m.esEquipo)), avisar('Materiales'));
    const u3 = onSnapshot(query(collection(db, 'Kardex_Movimientos'), orderBy('fecha', 'desc')),
      (snap) => setMovimientos(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })), avisar('Kardex'));
    const u4 = onSnapshot(collection(db, 'Personal'),
      (snap) => setPersonalDB(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })), avisar('Personal'));
    const u5 = onSnapshot(query(collection(db, 'Historial'), orderBy('fecha', 'desc')),
      (snap) => setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))), avisar('Historial'));
    const u6 = onSnapshot(collection(db, 'Partidas'),
      (snap) => setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setPartidas([]));
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [filtrarPorContexto]);

  // Stock actual del almacen seleccionado
  const stockAlmacen = useMemo(() => {
    if (!almacenId) return new Map();
    const stock = calcularStockActual(movimientos);
    const filtered = new Map();
    for (const [k, v] of stock.entries()) {
      if (v.almacenId === almacenId) filtered.set(v.materialId, v);
    }
    return filtered;
  }, [movimientos, almacenId]);

  // Actividades unicas del historial (para vincular al LPS)
  const actividadesLPS = useMemo(() => {
    const set = new Set();
    historial.forEach(h => h.actividad && set.add(h.actividad));
    return Array.from(set).sort();
  }, [historial]);

  const partidasUnicas = useMemo(() => {
    const set = new Set();
    historial.forEach(h => h.partida && set.add(h.partida));
    return Array.from(set).sort();
  }, [historial]);

  const agregarItem = () => setItems([...items, { materialId: '', cantidad: 0 }]);
  const quitarItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const actualizarItem = (i, campo, valor) => {
    const nuevos = [...items];
    nuevos[i] = { ...nuevos[i], [campo]: valor };
    setItems(nuevos);
  };

  // Manejo del canvas de firma
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = BASE.navy;
    }
  }, []);

  const startDraw = (e) => {
    setFirmando(true);
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!firmando) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setFirmando(false);

  const limpiarFirma = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const guardar = async () => {
    if (!almacenId) return showToast?.('Selecciona el almacen', 'error');
    if (!numVale) return showToast?.('N° vale obligatorio', 'error');
    if (!retiradoPor) return showToast?.('Indica quien retira el material', 'error');

    const itemsValidos = items.filter(it => it.materialId && parseFloat(it.cantidad) > 0);
    if (itemsValidos.length === 0) return showToast?.('Completa al menos un item', 'error');

    // Validar stock
    for (const it of itemsValidos) {
      const slot = stockAlmacen.get(it.materialId);
      const disponible = slot?.cantidad || 0;
      if (parseFloat(it.cantidad) > disponible) {
        const mat = materiales.find(m => m.id === it.materialId);
        return showToast?.(`Stock insuficiente: ${mat?.nombre} (disponible: ${disponible})`, 'error');
      }
    }

    setGuardando(true);
    try {
      // Capturar firma
      const firmaDataUrl = canvasRef.current?.toDataURL('image/png');

      // Subir firma a storage
      let firmaUrl = null;
      if (firmaDataUrl && firmaDataUrl.length > 1000) {
        try {
          const blob = await (await fetch(firmaDataUrl)).blob();
          const r = ref(storage, `kardex/firmas/${Date.now()}_vale.png`);
          await uploadBytes(r, blob);
          firmaUrl = await getDownloadURL(r);
        } catch (e) {
          console.warn('[Firma]', e);
        }
      }

      // Crear un movimiento por cada item
      const fechaTs = new Date(fechaSalida);
      const promesas = itemsValidos.map((it) => {
        const mat = materiales.find(m => m.id === it.materialId);
        const slot = stockAlmacen.get(it.materialId);
        const cantidad = parseFloat(it.cantidad);
        const costoUnit = slot?.costoPromedio || mat?.precioReferencia || 0;
        return addDoc(collection(db, 'Kardex_Movimientos'), {
          fecha: fechaTs,
          tipo: 'SALIDA',
          proyectoId: proyectoActivoId,
          almacenId,
          almacenDestinoId: null,
          materialId: it.materialId,
          cantidad,
          unidad: mat?.unidad || 'UND',
          moneda: 'PEN',
          costoUnitario: costoUnit,
          costoUnitarioPEN: costoUnit,
          costoTotal: cantidad * costoUnit,
          costoTotalPEN: cantidad * costoUnit,
          numVale: numVale.trim(),
          retiradoPor: retiradoPor.trim(),
          entregadoPor: user?.email || 'desconocido',
          actividadDestino: actividadDestino?.trim() || null,
          partidaDestino: partidaDestino?.trim() || null,
          partidaId: partidaIdSeleccionada || null,
          esDescargaDirecta: false,
          firmaDigital: firmaUrl,
          observaciones: observaciones?.trim() || null,
          registradoPor: user?.email || 'desconocido',
          registradoEn: serverTimestamp(),
          estado: 'registrado',
        });
      });

      await Promise.all(promesas);
      showToast?.(`✅ Salida registrada: vale ${numVale}`, 'success');
      onSaved?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '20px 24px',
      borderLeft: `5px solid ${BASE.red}`,
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, marginBottom: '4px' }}>
        REGISTRAR SALIDA DE MATERIAL (VALE DIGITAL)
      </h3>
      <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '20px' }}>
        Reemplazo digital del vale en papel. Vincula la salida con la actividad del LPS para reconciliacion APU.
      </p>

      {/* Datos del vale */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <p style={lblSec}>DATOS DEL VALE</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px' }}>
          <Field label="Almacen origen *">
            <select value={almacenId} onChange={e => setAlmacenId(e.target.value)} style={selS}>
              <option value="">— Selecciona —</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.nombre}</option>)}
            </select>
          </Field>
          <Field label="N° Vale *">
            <input type="text" value={numVale} onChange={e => setNumVale(e.target.value)} placeholder="V-2026-001" style={inpS} />
          </Field>
          <Field label="Fecha *">
            <DatePickerPremium value={fechaSalida || ''} onChange={iso => setFechaSalida(iso)} />
          </Field>
          <Field label="Retirado por (capataz/personal) *">
            <input type="text" list="personal-list" value={retiradoPor} onChange={e => setRetiradoPor(e.target.value)} placeholder="Nombre completo" style={inpS} />
            <datalist id="personal-list">
              {personalDB.map(p => <option key={p.id} value={p.nombre || p.id} />)}
            </datalist>
          </Field>
          <Field label="Actividad LPS destino (opcional)">
            <input type="text" list="actividades-list" value={actividadDestino} onChange={e => setActividadDestino(e.target.value)} placeholder="ENC-COL-EJE3" style={inpS} />
            <datalist id="actividades-list">
              {actividadesLPS.map(a => <option key={a} value={a} />)}
            </datalist>
          </Field>
          <Field label="Partida (para reconciliacion APU)">
            <input type="text" list="partidas-list" value={partidaDestino} onChange={e => setPartidaDestino(e.target.value)} placeholder="CONCRETO" style={inpS} />
            <datalist id="partidas-list">
              {partidasUnicas.map(p => <option key={p} value={p} />)}
            </datalist>
          </Field>
          <Field label="Partida presupuestal (FK)">
            <select value={partidaIdSeleccionada} onChange={e => setPartidaIdSeleccionada(e.target.value)} style={selS}>
              <option value="">— Sin partida —</option>
              {partidas.filter(p => !p.proyectoId || p.proyectoId === proyectoActivoId).map(p => (
                <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Items con stock disponible */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={lblSec}>ITEMS A RETIRAR</p>
          <button onClick={agregarItem} style={{
            padding: '6px 14px', borderRadius: '6px', background: BASE.red, color: '#fff',
            border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
          }}>+ AGREGAR ITEM</button>
        </div>

        {!almacenId && (
          <p style={{ fontSize: '12px', color: BASE.muted, fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            ⚠️ Selecciona primero un almacen para ver el stock disponible
          </p>
        )}

        {almacenId && items.map((it, i) => {
          const mat = materiales.find(m => m.id === it.materialId);
          const slot = stockAlmacen.get(it.materialId);
          const disponible = slot?.cantidad || 0;
          const cantInsuficiente = parseFloat(it.cantidad) > disponible;
          return (
            <div key={i} style={{
              background: BASE.white, padding: '12px', borderRadius: '10px',
              border: `1px solid ${cantInsuficiente ? BASE.red : BASE.border}`,
              marginBottom: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <Field label="Material">
                  <select value={it.materialId} onChange={e => actualizarItem(i, 'materialId', e.target.value)} style={selS}>
                    <option value="">— Selecciona —</option>
                    {materiales.map(m => {
                      const s = stockAlmacen.get(m.id);
                      const disp = s?.cantidad || 0;
                      return (
                        <option key={m.id} value={m.id} disabled={disp <= 0}>
                          {m.codigo} · {m.nombre} ({fmtCantidad(disp, m.unidad)} disp)
                        </option>
                      );
                    })}
                  </select>
                </Field>
                <Field label="Disponible">
                  <input type="text" readOnly value={fmtCantidad(disponible, mat?.unidad || '')}
                    style={{ ...inpS, background: BASE.bgSoft, fontFamily: 'monospace', color: disponible <= 0 ? BASE.red : BASE.green, fontWeight: '900' }} />
                </Field>
                <Field label="A retirar">
                  <input type="number" step="0.01" min="0" max={disponible} value={it.cantidad}
                    onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                    style={{ ...inpS, borderColor: cantInsuficiente ? BASE.red : BASE.border }} />
                </Field>
                <Field label="Costo aprox">
                  <input type="text" readOnly
                    value={fmtSoles(parseFloat(it.cantidad || 0) * (slot?.costoPromedio || 0))}
                    style={{ ...inpS, background: BASE.bgSoft, fontWeight: '900', color: BASE.red }} />
                </Field>
                {items.length > 1 && (
                  <button onClick={() => quitarItem(i)} style={{
                    padding: '8px 12px', borderRadius: '6px', background: BASE.red, color: '#fff',
                    border: 'none', fontSize: '14px', cursor: 'pointer', height: '36px',
                  }}>✕</button>
                )}
              </div>
              {cantInsuficiente && (
                <p style={{ fontSize: '10.5px', color: BASE.red, marginTop: '6px', fontWeight: '700' }}>
                  ⚠️ Cantidad supera el stock disponible
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Firma digital */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={lblSec}>FIRMA DIGITAL DE QUIEN RETIRA</p>
          <button onClick={limpiarFirma} style={{
            padding: '4px 12px', borderRadius: '6px', background: BASE.bgSoft, color: BASE.muted,
            border: `1px solid ${BASE.border}`, fontSize: '10.5px', fontWeight: '800', cursor: 'pointer',
          }}>🗑️ Limpiar</button>
        </div>
        <canvas ref={canvasRef} width={500} height={120}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          style={{
            background: BASE.white, border: `2px dashed ${BASE.border}`, borderRadius: '8px',
            cursor: 'crosshair', maxWidth: '100%', display: 'block', touchAction: 'none',
          }} />
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
          Firme con el dedo (mobile) o el mouse (desktop). La firma queda en el registro de auditoria.
        </p>
      </div>

      <Field label="Observaciones">
        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
          placeholder="Material para vaciado de columnas eje 3-A..."
          style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical', marginBottom: '20px' }} />
      </Field>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={guardar} disabled={guardando} style={{
          padding: '13px 26px', borderRadius: '10px',
          background: `linear-gradient(135deg, ${BASE.red}, ${BASE.redDark})`,
          color: '#fff', border: 'none', fontSize: '13px', fontWeight: '900',
          cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.5 : 1,
          letterSpacing: '0.5px', boxShadow: `0 6px 18px ${BASE.red}55`,
        }}>
          {guardando ? '⏳ Guardando...' : '⬆️ REGISTRAR SALIDA'}
        </button>
      </div>
    </div>
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
