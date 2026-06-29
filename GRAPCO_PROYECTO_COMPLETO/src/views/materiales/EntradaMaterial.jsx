// src/views/materiales/EntradaMaterial.jsx — Entrada B19 + Fases 1/2/4/6
//
// Modos de operacion:
//   1. MANUAL: como antes (escribir items uno por uno)
//   2. DESDE OC: jala una OC pendiente y autopobla; permite recepcion parcial
//   3. DESDE OS: jala una OS pendiente (servicios)
//
// Para cada item con esDescargaDirecta=true: genera ENTRADA + SALIDA atomicas (writeBatch)
// vinculadas al partidaId, sin pasar por stock fisico prolongado.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, serverTimestamp, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { fmtSoles } from '../../utils/materialesAnalytics';
import { obtenerTCDelDia, MONEDAS, fmtMoneda, convertirAPEN } from '../../utils/tipoCambioClient';
import DatePickerPremium from '../../components/DatePickerPremium';

const MODOS = [
  { id: 'MANUAL', label: '✏️ Manual', desc: 'Escribir items uno por uno', color: BASE.navy },
  { id: 'OC',     label: '🛒 Desde OC', desc: 'Jalar Orden de Compra', color: BASE.navyLight },
  { id: 'OS',     label: '🔧 Desde OS', desc: 'Jalar Orden de Servicio', color: BASE.gold },
];

export default function EntradaMaterial({ showToast, onSaved }) {
  const { user } = useAuth();
  const { proyectoActivoId, proyectoActivo } = useProyectoActivo();

  const [almacenes, setAlmacenes] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [ordenesServicio, setOrdenesServicio] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Modo de operacion
  const [modo, setModo] = useState('MANUAL');
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState('');

  // Form data
  const [almacenId, setAlmacenId] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [rucProveedor, setRucProveedor] = useState('');
  const [numGuiaRemision, setNumGuiaRemision] = useState('');
  const [numFactura, setNumFactura] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [tipoCambio, setTipoCambio] = useState(1);
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [fotoGuia, setFotoGuia] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const [items, setItems] = useState([
    { materialId: '', descripcion: '', cantidad: 0, costoUnitario: 0, lote: '', partidaId: '', esDescargaDirecta: false },
  ]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'Almacenes'), where('activo', '==', true)),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (e) => console.error('[Almacenes]', e));
    const u2 = onSnapshot(query(collection(db, 'Materiales'), orderBy('codigo')),
      (snap) => setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.activo !== false)),
      (e) => console.error('[Materiales]', e));
    const u3 = onSnapshot(query(collection(db, 'Partidas'), orderBy('codigo')),
      (snap) => setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setPartidas([]));
    const u4 = onSnapshot(collection(db, 'OrdenesCompra'),
      (snap) => setOrdenesCompra(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setOrdenesCompra([]));
    const u5 = onSnapshot(collection(db, 'OrdenesServicio'),
      (snap) => setOrdenesServicio(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setOrdenesServicio([]));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  // OCs disponibles para jalar (pendientes del proyecto activo)
  const ordenesDisponibles = useMemo(() => {
    const fuente = modo === 'OS' ? ordenesServicio : ordenesCompra;
    return fuente.filter(o =>
      (o.proyectoId === proyectoActivoId || !o.proyectoId) &&
      (o.estado === 'emitida' || o.estado === 'parcial')
    );
  }, [modo, ordenesCompra, ordenesServicio, proyectoActivoId]);

  const ordenSeleccionada = useMemo(() => {
    if (!ordenSeleccionadaId) return null;
    const fuente = modo === 'OS' ? ordenesServicio : ordenesCompra;
    return fuente.find(o => o.id === ordenSeleccionadaId);
  }, [ordenSeleccionadaId, modo, ordenesCompra, ordenesServicio]);

  // Cuando se selecciona una orden, autopoblar el formulario
  useEffect(() => {
    if (!ordenSeleccionada) return;
    setProveedor(ordenSeleccionada.proveedor || '');
    setRucProveedor(ordenSeleccionada.rucProveedor || '');
    setAlmacenId(ordenSeleccionada.almacenDestinoId || '');
    setMoneda(ordenSeleccionada.moneda || 'PEN');
    setTipoCambio(ordenSeleccionada.tipoCambio || 1);
    const itemsOrden = (ordenSeleccionada.items || []).map(it => {
      const recibido = parseFloat(it.recibido || 0);
      const cantidadOriginal = parseFloat(it.cantidad || 0);
      const pendiente = Math.max(0, cantidadOriginal - recibido);
      return {
        materialId: it.materialId || '',
        descripcion: it.descripcion || '',
        cantidad: pendiente, // pendiente por recibir
        cantidadOC: cantidadOriginal,
        recibidoOC: recibido,
        costoUnitario: it.precioUnit || 0,
        lote: '',
        partidaId: it.partidaId || '',
        esDescargaDirecta: !!it.esDescargaDirecta,
      };
    }).filter(it => it.cantidad > 0); // solo items con saldo pendiente
    setItems(itemsOrden.length > 0 ? itemsOrden : [{ materialId: '', descripcion: '', cantidad: 0, costoUnitario: 0, lote: '', partidaId: '', esDescargaDirecta: false }]);
  }, [ordenSeleccionada]);

  // Auto-fetch TC cuando se selecciona USD manual
  useEffect(() => {
    if (modo === 'MANUAL' && moneda === 'USD' && tipoCambio <= 1) {
      obtenerTCDelDia(fechaEntrada).then(tc => {
        if (tc) setTipoCambio(tc.compra);
      });
    }
  }, [modo, moneda, fechaEntrada]);

  const agregarItem = () => setItems([...items, { materialId: '', descripcion: '', cantidad: 0, costoUnitario: 0, lote: '', partidaId: '', esDescargaDirecta: false }]);
  const quitarItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const actualizarItem = (i, campo, valor) => {
    const nuevos = [...items];
    nuevos[i] = { ...nuevos[i], [campo]: valor };
    setItems(nuevos);
  };

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('La foto no puede pesar mas de 5MB', 'error');
      return;
    }
    setFotoGuia(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const totalEntrada = items.reduce((s, it) => s + (parseFloat(it.cantidad || 0) * parseFloat(it.costoUnitario || 0)), 0);
  const totalEntradaPEN = moneda === 'PEN' ? totalEntrada : convertirAPEN(totalEntrada, moneda, { compra: tipoCambio });

  const guardar = async () => {
    if (!proyectoActivoId) return showToast?.('Selecciona un proyecto activo', 'error');
    if (!almacenId) return showToast?.('Selecciona un almacen', 'error');
    if (!proveedor) return showToast?.('Indica el proveedor', 'error');
    if (!numGuiaRemision) return showToast?.('Numero de guia obligatorio', 'error');
    if (moneda === 'USD' && (!tipoCambio || tipoCambio <= 0)) return showToast?.('Tipo de cambio obligatorio', 'error');

    const itemsValidos = items.filter(it =>
      (it.materialId || it.descripcion) && parseFloat(it.cantidad) > 0
    );
    if (itemsValidos.length === 0) return showToast?.('Completa al menos un item con cantidad', 'error');

    // Validacion descarga directa: requiere partidaId
    const ddSinPartida = itemsValidos.filter(it => it.esDescargaDirecta && !it.partidaId);
    if (ddSinPartida.length > 0) {
      return showToast?.('Items con descarga directa requieren partidaId', 'error');
    }

    setGuardando(true);
    try {
      // Subir foto si existe
      let fotoUrl = null;
      if (fotoGuia) {
        try {
          const path = `kardex/entradas/${Date.now()}_${fotoGuia.name}`;
          const r = ref(storage, path);
          await uploadBytes(r, fotoGuia);
          fotoUrl = await getDownloadURL(r);
        } catch (e) {
          console.warn('[Storage]', e);
        }
      }

      const fechaTs = new Date(fechaEntrada);
      const ordenColeccion = modo === 'OS' ? 'OrdenesServicio' : 'OrdenesCompra';
      const ordenIdField = modo === 'OS' ? 'ordenServicioId' : 'ordenCompraId';
      const ordenNumField = modo === 'OS' ? 'numOS' : 'numOC';

      // Usar writeBatch para atomicidad: ENTRADAs + SALIDAs (descarga directa) + actualizar OC
      const batch = writeBatch(db);

      const movsRefs = []; // para guardar id si lo necesitamos

      itemsValidos.forEach((it) => {
        const mat = it.materialId ? materiales.find(m => m.id === it.materialId) : null;
        const cantidad = parseFloat(it.cantidad);
        const costoUnit = parseFloat(it.costoUnitario || 0);
        const costoUnitPEN = moneda === 'PEN' ? costoUnit : convertirAPEN(costoUnit, moneda, { compra: tipoCambio });
        const costoTotal = cantidad * costoUnit;
        const costoTotalPEN = cantidad * costoUnitPEN;

        const movRef = doc(collection(db, 'Kardex_Movimientos'));
        movsRefs.push(movRef);
        const movEntrada = {
          fecha: fechaTs,
          tipo: 'ENTRADA',
          proyectoId: proyectoActivoId,
          almacenId,
          almacenDestinoId: null,
          materialId: it.materialId || null,
          descripcion: it.descripcion || mat?.nombre || '',
          cantidad,
          unidad: mat?.unidad || 'UND',
          moneda,
          tipoCambio: moneda === 'USD' ? tipoCambio : 1,
          costoUnitario: costoUnit,
          costoUnitarioPEN: costoUnitPEN,
          costoTotal,
          costoTotalPEN,
          lote: it.lote || null,
          proveedor: proveedor.trim(),
          rucProveedor: rucProveedor?.trim() || null,
          numGuiaRemision: numGuiaRemision.trim(),
          numFactura: numFactura?.trim() || null,
          [ordenIdField]: ordenSeleccionada?.id || null,
          [ordenNumField]: ordenSeleccionada?.numero || null,
          partidaId: it.partidaId || null,
          esDescargaDirecta: !!it.esDescargaDirecta,
          fotoGuia: fotoUrl,
          observaciones: observaciones?.trim() || null,
          registradoPor: user?.email || 'desconocido',
          registradoEn: serverTimestamp(),
          estado: 'registrado',
        };
        batch.set(movRef, movEntrada);

        // Si es descarga directa: agregar SALIDA atomica
        if (it.esDescargaDirecta) {
          const salidaRef = doc(collection(db, 'Kardex_Movimientos'));
          batch.set(salidaRef, {
            ...movEntrada,
            tipo: 'SALIDA',
            descripcion: `[Descarga directa] ${movEntrada.descripcion}`,
            partidaDestino: it.partidaId,
            partidaId: it.partidaId,
            actividadDestino: 'DESCARGA_DIRECTA',
            esDescargaDirecta: true,
            descargaDirectaDeMovId: null, // se podria enlazar pero el batch no devuelve ids antes del commit
            observaciones: `Descarga directa desde ${ordenSeleccionada?.numero || numGuiaRemision}. ${observaciones || ''}`.trim(),
          });
        }
      });

      // Actualizar OC/OS con cantidades recibidas
      if (ordenSeleccionada?.id) {
        const itemsActualizados = (ordenSeleccionada.items || []).map(itOrigen => {
          const matchEntrada = itemsValidos.find(it =>
            (it.materialId && it.materialId === itOrigen.materialId) ||
            (it.descripcion && it.descripcion === itOrigen.descripcion)
          );
          if (matchEntrada) {
            const recibidoActual = parseFloat(itOrigen.recibido || 0);
            const recibidoNuevo = recibidoActual + parseFloat(matchEntrada.cantidad || 0);
            return { ...itOrigen, recibido: recibidoNuevo };
          }
          return itOrigen;
        });

        // Calcular nuevo estado
        const todosRecibidos = itemsActualizados.every(it => (it.recibido || 0) >= it.cantidad);
        const algunoRecibido = itemsActualizados.some(it => (it.recibido || 0) > 0);
        const nuevoEstado = todosRecibidos ? 'recibida' : (algunoRecibido ? 'parcial' : ordenSeleccionada.estado);

        batch.update(doc(db, ordenColeccion, ordenSeleccionada.id), {
          items: itemsActualizados,
          estado: nuevoEstado,
          actualizadoEn: serverTimestamp(),
          actualizadoPor: user?.email || 'desconocido',
        });
      }

      await batch.commit();

      const cuantasDD = itemsValidos.filter(it => it.esDescargaDirecta).length;
      let msg = `✅ Entrada registrada: ${itemsValidos.length} items`;
      if (cuantasDD > 0) msg += ` · ${cuantasDD} con descarga directa`;
      if (ordenSeleccionada) msg += ` · ${ordenSeleccionada.numero} actualizada`;
      showToast?.(msg, 'success');
      onSaved?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar almacenes por proyecto activo y tipo MATERIALES (servicios usa otro modo)
  const almacenesFiltrados = useMemo(() => {
    return almacenes.filter(a => {
      if (a.proyectoId && a.proyectoId !== proyectoActivoId) return false;
      const tipoInv = a.tipoInventario || 'MATERIALES';
      if (modo === 'OS') return tipoInv === 'SERVICIOS';
      return tipoInv === 'MATERIALES';
    });
  }, [almacenes, proyectoActivoId, modo]);

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '20px 24px',
      borderLeft: `5px solid ${BASE.green}`,
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, marginBottom: '4px' }}>
        REGISTRAR ENTRADA · {proyectoActivo?.nombre || proyectoActivoId}
      </h3>
      <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '14px' }}>
        Recepcion de proveedor. Multimoneda PEN/USD. Soporta jalar OC/OS y descarga directa a partida.
      </p>

      {/* Selector de modo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {MODOS.map(m => {
          const activo = modo === m.id;
          return (
            <button key={m.id} onClick={() => { setModo(m.id); setOrdenSeleccionadaId(''); }} style={{
              padding: '10px 16px', flex: '1 1 180px', borderRadius: '10px',
              background: activo ? `linear-gradient(135deg, ${m.color}, ${m.color}dd)` : BASE.bgSoft,
              color: activo ? '#fff' : BASE.muted,
              border: `2px solid ${activo ? m.color : 'transparent'}`,
              fontSize: '12px', fontWeight: '900', cursor: 'pointer', textAlign: 'left',
            }}>
              <p>{m.label}</p>
              <p style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8, marginTop: '2px' }}>{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Selector de orden si modo != MANUAL */}
      {modo !== 'MANUAL' && (
        <div style={{ background: BASE.navySoft, padding: '14px', borderRadius: '10px', marginBottom: '14px', border: `1px solid ${BASE.navyLight}` }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '8px' }}>
            SELECCIONA {modo === 'OS' ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA'}
          </p>
          <select value={ordenSeleccionadaId} onChange={e => setOrdenSeleccionadaId(e.target.value)} style={selS}>
            <option value="">— {ordenesDisponibles.length} pendientes en este proyecto —</option>
            {ordenesDisponibles.map(o => {
              const recibidos = (o.items || []).filter(it => (it.recibido || 0) >= it.cantidad).length;
              return (
                <option key={o.id} value={o.id}>
                  {o.numero} · {o.proveedor} · {fmtMoneda(o.totalMoneda || 0, o.moneda)} · {recibidos}/{(o.items || []).length} items recibidos
                </option>
              );
            })}
          </select>
          {ordenSeleccionada && (
            <p style={{ fontSize: '11px', color: BASE.navy, marginTop: '8px' }}>
              ✓ Cargados {items.length} items pendientes de la {modo}. Puedes ajustar cantidades para recepcion parcial.
            </p>
          )}
        </div>
      )}

      {/* Datos generales */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <p style={lblSec}>DATOS GENERALES</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
          <Field label="Almacen destino *">
            <select value={almacenId} onChange={e => setAlmacenId(e.target.value)} style={selS}>
              <option value="">— Selecciona —</option>
              {almacenesFiltrados.map(a => <option key={a.id} value={a.id}>{a.codigo} · {a.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha *">
            <DatePickerPremium value={fechaEntrada || ''} onChange={iso => setFechaEntrada(iso)} />
          </Field>
          <Field label="Proveedor *">
            <input type="text" value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="UNACEM SAA" style={inpS} />
          </Field>
          <Field label="RUC proveedor">
            <input type="text" value={rucProveedor} onChange={e => setRucProveedor(e.target.value)} maxLength={11} style={inpS} />
          </Field>
          <Field label="N° Guia remision *">
            <input type="text" value={numGuiaRemision} onChange={e => setNumGuiaRemision(e.target.value)} placeholder="001-12345" style={inpS} />
          </Field>
          <Field label="N° Factura">
            <input type="text" value={numFactura} onChange={e => setNumFactura(e.target.value)} placeholder="F001-1234" style={inpS} />
          </Field>
          <Field label="Moneda">
            <select value={moneda} onChange={e => setMoneda(e.target.value)} style={selS} disabled={!!ordenSeleccionada}>
              {MONEDAS.map(m => <option key={m.id} value={m.id}>{m.simbolo} {m.label}</option>)}
            </select>
          </Field>
          {moneda === 'USD' && (
            <Field label="Tipo cambio">
              <input type="number" step="0.001" value={tipoCambio} onChange={e => setTipoCambio(parseFloat(e.target.value) || 0)}
                style={{ ...inpS, fontWeight: '800', color: BASE.navy }} disabled={!!ordenSeleccionada} />
            </Field>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={lblSec}>ITEMS DE LA ENTRADA</p>
          {modo === 'MANUAL' && (
            <button onClick={agregarItem} style={{
              padding: '6px 14px', borderRadius: '6px', background: BASE.green, color: '#fff',
              border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
            }}>+ AGREGAR ITEM</button>
          )}
        </div>

        {items.map((it, i) => {
          const mat = it.materialId ? materiales.find(m => m.id === it.materialId) : null;
          const subtotal = parseFloat(it.cantidad || 0) * parseFloat(it.costoUnitario || 0);
          return (
            <div key={i} style={{
              background: BASE.white, padding: '12px', borderRadius: '10px',
              border: it.esDescargaDirecta ? `2px solid #f59e0b` : `1px solid ${BASE.border}`,
              marginBottom: '8px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.9fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <Field label="Material">
                  {modo === 'MANUAL' ? (
                    <select value={it.materialId} onChange={e => actualizarItem(i, 'materialId', e.target.value)} style={selS}>
                      <option value="">— Selecciona —</option>
                      {materiales.filter(m => modo === 'OS' ? m.esServicio : !m.esServicio).map(m => (
                        <option key={m.id} value={m.id}>{m.codigo} · {m.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" readOnly value={it.descripcion || (mat ? `${mat.codigo} · ${mat.nombre}` : '—')}
                      style={{ ...inpS, background: BASE.bgSoft, fontWeight: '700' }} />
                  )}
                </Field>
                <Field label="Unidad">
                  <input type="text" readOnly value={mat?.unidad || '—'} style={{ ...inpS, background: BASE.bgSoft, fontFamily: 'monospace' }} />
                </Field>
                <Field label={`Cantidad ${it.cantidadOC ? `(de ${it.cantidadOC})` : ''}`}>
                  <input type="number" step="0.01" min="0" max={it.cantidadOC || undefined} value={it.cantidad}
                    onChange={e => actualizarItem(i, 'cantidad', e.target.value)} style={inpS} />
                </Field>
                <Field label={`Costo unit. (${moneda})`}>
                  <input type="number" step="0.01" min="0" value={it.costoUnitario}
                    onChange={e => actualizarItem(i, 'costoUnitario', e.target.value)}
                    style={inpS} disabled={modo !== 'MANUAL'} />
                </Field>
                <Field label="Subtotal">
                  <input type="text" readOnly value={fmtMoneda(subtotal, moneda)}
                    style={{ ...inpS, background: BASE.bgSoft, fontWeight: '900', color: BASE.green }} />
                </Field>
                {modo === 'MANUAL' && items.length > 1 && (
                  <button onClick={() => quitarItem(i)} style={{
                    padding: '8px 12px', borderRadius: '6px', background: BASE.red, color: '#fff',
                    border: 'none', fontSize: '14px', cursor: 'pointer', height: '36px',
                  }}>✕</button>
                )}
              </div>

              {/* Lote / Partida / Descarga directa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginTop: '8px' }}>
                {mat?.requiereLote && (
                  <Field label="Lote (obligatorio)">
                    <input type="text" value={it.lote} onChange={e => actualizarItem(i, 'lote', e.target.value)} placeholder="LT-2026-04-A" style={inpS} />
                  </Field>
                )}
                <Field label={`Partida ${it.esDescargaDirecta ? '(obligatoria por descarga directa)' : '(opcional)'}`}>
                  <select value={it.partidaId || ''} onChange={e => actualizarItem(i, 'partidaId', e.target.value)} style={selS}>
                    <option value="">—</option>
                    {partidas.filter(p => !p.proyectoId || p.proyectoId === proyectoActivoId).map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!it.esDescargaDirecta}
                  onChange={e => actualizarItem(i, 'esDescargaDirecta', e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#f59e0b' }} />
                ⚡ Descarga directa a partida (genera ENTRADA + SALIDA atomicas, no pasa por stock)
              </label>
            </div>
          );
        })}

        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px',
          marginTop: '10px', padding: '10px 14px', background: BASE.green + '15',
          borderRadius: '10px', border: `1px solid ${BASE.green}55`,
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.greenDark, letterSpacing: '0.5px' }}>TOTAL ({moneda}):</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.greenDark }}>{fmtMoneda(totalEntrada, moneda)}</p>
          </div>
          {moneda === 'USD' && (
            <div style={{ textAlign: 'right', borderLeft: `1px solid ${BASE.green}55`, paddingLeft: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>EQUIV. PEN:</p>
              <p style={{ fontSize: '16px', fontWeight: '900', color: BASE.navy }}>{fmtSoles(totalEntradaPEN)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Foto y observaciones */}
      <div style={{ background: BASE.bgSoft, padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <p style={lblSec}>EVIDENCIA Y OBSERVACIONES</p>
        <Field label="Foto de la guia de remision">
          <input type="file" accept="image/*" onChange={handleFoto} style={{ ...inpS, padding: '6px', cursor: 'pointer' }} />
          {fotoPreview && (
            <img src={fotoPreview} alt="Preview" style={{
              maxWidth: '180px', marginTop: '8px', borderRadius: '8px', border: `1px solid ${BASE.border}`,
            }} />
          )}
        </Field>
        <Field label="Observaciones">
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
            placeholder="Llego con 5 bolsas dañadas por lluvia..."
            style={{ ...inpS, fontFamily: 'inherit', resize: 'vertical' }} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={guardar} disabled={guardando} style={{
          padding: '13px 26px', borderRadius: '10px',
          background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
          color: '#fff', border: 'none', fontSize: '13px', fontWeight: '900',
          cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.5 : 1,
          letterSpacing: '0.5px', boxShadow: `0 6px 18px ${BASE.green}55`,
        }}>
          {guardando ? '⏳ Guardando...' : '⬇️ REGISTRAR ENTRADA'}
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
