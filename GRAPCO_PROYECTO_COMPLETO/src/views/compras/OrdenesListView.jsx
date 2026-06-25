// src/views/compras/OrdenesListView.jsx — Lista de OC u OS (Fase 3)

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/NotificationContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { fmtMoneda } from '../../utils/tipoCambioClient';
import OrdenEditor from './OrdenEditor';
import EmptyState from '../../components/EmptyState';

const COLECCION = (tipo) => tipo === 'OS' ? 'OrdenesServicio' : 'OrdenesCompra';

export default function OrdenesListView({ tipoOrden = 'OC', showToast }) {
  const { user } = useAuth();
  const confirmar = useConfirm();
  const { proyectoActivoId, proyectoActivo } = useProyectoActivo();
  const [ordenes, setOrdenes] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsubO = onSnapshot(query(collection(db, COLECCION(tipoOrden)), orderBy('fechaEmision', 'desc')),
      (snap) => { setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.warn('[Ordenes]', e); setLoading(false); });
    const unsubA = onSnapshot(collection(db, 'Almacenes'),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubO(); unsubA(); };
  }, [tipoOrden]);

  const almMap = useMemo(() => new Map(almacenes.map(a => [a.id, a])), [almacenes]);

  const filtradas = useMemo(() => {
    return ordenes.filter(o => {
      if (o.proyectoId && o.proyectoId !== proyectoActivoId) return false;
      if (filtroEstado && o.estado !== filtroEstado) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (o.numero || '').toLowerCase().includes(q) ||
               (o.proveedor || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [ordenes, filtroEstado, busqueda, proyectoActivoId]);

  const stats = useMemo(() => {
    const r = { emitida: 0, parcial: 0, recibida: 0, anulada: 0, totalPEN: 0 };
    filtradas.forEach(o => {
      if (o.estado) r[o.estado] = (r[o.estado] || 0) + 1;
      if (o.estado !== 'anulada') r.totalPEN += (o.totalPEN || 0);
    });
    return r;
  }, [filtradas]);

  const anular = async (orden) => {
    const ok = await confirmar({
      tono: 'navy',
      icono: '⚠️',
      titulo: `¿Anular ${tipoOrden} ${orden.numero}?`,
      detalle: 'Esta acción es reversible cambiando el estado.',
      textoConfirmar: 'Sí, anular',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, COLECCION(tipoOrden), orden.id), {
        estado: 'anulada',
        anuladaEn: serverTimestamp(),
        anuladaPor: user?.email || 'desconocido',
      });
      showToast?.('✅ Orden anulada', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando ordenes...</p>;

  if (editando) {
    return (
      <OrdenEditor
        tipoOrden={tipoOrden}
        ordenExistente={editando === 'NUEVA' ? null : editando}
        showToast={showToast}
        onSaved={() => setEditando(null)}
        onCancel={() => setEditando(null)}
      />
    );
  }

  const colorAcento = tipoOrden === 'OS' ? BASE.gold : BASE.navy;
  const titulo = tipoOrden === 'OS' ? 'Ordenes de Servicio' : 'Ordenes de Compra';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>
            {titulo}
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {filtradas.length} de {ordenes.length} · Proyecto: {proyectoActivo?.nombre || '—'}
          </p>
        </div>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Numero o proveedor..."
          style={{ padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', minWidth: '200px' }} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{
          padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`,
          fontSize: '12.5px', fontWeight: '700', background: '#fff', cursor: 'pointer',
        }}>
          <option value="">Todos los estados</option>
          <option value="emitida">📤 Emitidas</option>
          <option value="parcial">📦 Parciales</option>
          <option value="recibida">✅ Recibidas</option>
          <option value="anulada">❌ Anuladas</option>
        </select>
        <button onClick={() => setEditando('NUEVA')} style={{
          padding: '10px 20px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${colorAcento}, ${colorAcento}dd)`,
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          boxShadow: `0 4px 12px ${colorAcento}55`,
        }}>➕ NUEVA {tipoOrden}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
        <Stat label="EMITIDAS" valor={stats.emitida} color={BASE.navy} icono="📤" />
        <Stat label="PARCIALES" valor={stats.parcial} color="#92400e" icono="📦" />
        <Stat label="RECIBIDAS" valor={stats.recibida} color="#065f46" icono="✅" />
        <Stat label="ANULADAS" valor={stats.anulada} color="#991b1b" icono="❌" />
        <Stat label="MONTO ACTIVO" valor={fmtMoneda(stats.totalPEN, 'PEN')} color={colorAcento} icono="💰" />
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icono={tipoOrden === 'OS' ? '🔧' : '🛒'} titulo={`Sin ${titulo.toLowerCase()}`} descripcion={`Crea la primera ${tipoOrden} para empezar.`} />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Numero</th>
                  <th style={th()}>Fecha</th>
                  <th style={th()}>Proveedor</th>
                  <th style={th()}>Almacen</th>
                  <th style={th({ textAlign: 'center' })}>Items</th>
                  <th style={th({ textAlign: 'right' })}>Total</th>
                  <th style={th()}>Estado</th>
                  <th style={th({ textAlign: 'center' })}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((o, i) => {
                  const alm = almMap.get(o.almacenDestinoId);
                  const recibidos = (o.items || []).filter(it => (it.recibido || 0) >= it.cantidad).length;
                  return (
                    <tr key={o.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontFamily: 'monospace', fontWeight: '900', color: colorAcento }}>{o.numero}</td>
                      <td style={{ ...td(), fontSize: '11px', color: BASE.muted, fontFamily: 'monospace' }}>{o.fechaEmision}</td>
                      <td style={td()}>
                        <p style={{ fontWeight: '700' }}>{o.proveedor}</p>
                        {o.rucProveedor && <p style={{ fontSize: '10px', color: BASE.muted, fontFamily: 'monospace' }}>{o.rucProveedor}</p>}
                      </td>
                      <td style={{ ...td(), fontSize: '11px' }}>{alm ? `${alm.codigo}` : '—'}</td>
                      <td style={{ ...td(), textAlign: 'center', fontWeight: '700' }}>
                        {recibidos}/{(o.items || []).length}
                      </td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: BASE.navy }}>
                        {fmtMoneda(o.totalMoneda || 0, o.moneda || 'PEN')}
                        {o.moneda === 'USD' && (
                          <p style={{ fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>
                            ≈ {fmtMoneda(o.totalPEN || 0, 'PEN')}
                          </p>
                        )}
                      </td>
                      <td style={td()}>
                        <EstadoChip estado={o.estado} />
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <button onClick={() => setEditando(o)} style={{
                          padding: '5px 12px', borderRadius: '6px', background: BASE.navy, color: '#fff',
                          border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', marginRight: '4px',
                        }}>EDITAR</button>
                        {o.estado !== 'anulada' && (
                          <button onClick={() => anular(o)} style={{
                            padding: '5px 12px', borderRadius: '6px', background: BASE.red, color: '#fff',
                            border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                          }}>ANULAR</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoChip({ estado }) {
  const map = {
    emitida: { bg: '#dbeafe', color: '#1e40af', label: 'EMITIDA' },
    parcial: { bg: '#fef3c7', color: '#92400e', label: 'PARCIAL' },
    recibida: { bg: '#d1fae5', color: '#065f46', label: 'RECIBIDA' },
    anulada: { bg: '#fee2e2', color: '#991b1b', label: 'ANULADA' },
  };
  const s = map[estado] || map.emitida;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '12px',
      fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px',
    }}>{s.label}</span>
  );
}

function Stat({ label, valor, color, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '10px 14px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px' }}>{label}</p>
        <span style={{ fontSize: '13px', opacity: 0.5 }}>{icono}</span>
      </div>
      <p style={{ fontSize: '16px', fontWeight: '900', color, marginTop: '2px' }}>{valor}</p>
    </div>
  );
}

const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, ...extra });
