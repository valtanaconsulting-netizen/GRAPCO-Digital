// src/views/calidad/ProtocolosPreVaciadoView.jsx
// Lista de protocolos Pre-Vaciado (CAL-FOR-006).
// Filtros: frente, semana ISO, estado, búsqueda libre.
// Botón "Nuevo protocolo" → abre el editor en modo creación.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { ESTADOS_PROTOCOLO } from '../../utils/calidadOTAnalytics';
import EmptyState from '../../components/EmptyState';

const TIPO = 'prevaciado';

export default function ProtocolosPreVaciadoView({ onEdit, onNuevo }) {
  const { frentesDelProyecto, filtrarPorContexto } = useProyectoActivo();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroFrente, setFiltroFrente] = useState('');
  const [filtroSemana, setFiltroSemana] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'Protocolos'),
      where('tipo', '==', TIPO),
      orderBy('fechaCreacion', 'desc'),
    );
    const unsub = onSnapshot(q,
      (snap) => {
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(filtrarPorContexto(todos));
        setLoading(false);
      },
      (e) => {
        console.warn('[PreVaciado list]', e.message);
        setLoading(false);
      });
    return () => unsub();
  }, [filtrarPorContexto]);

  const semanas = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.semanaISO) set.add(i.semanaISO); });
    return Array.from(set).sort().reverse();
  }, [items]);

  const filtrados = useMemo(() => {
    return items.filter(p => {
      if (filtroFrente && p.frenteId !== filtroFrente) return false;
      if (filtroSemana && p.semanaISO !== filtroSemana) return false;
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (busqueda) {
        const b = busqueda.toLowerCase();
        return (p.numeroRegistro || '').toLowerCase().includes(b)
            || (p.estructuraElemento || '').toLowerCase().includes(b)
            || (p.ejes || '').toLowerCase().includes(b)
            || (p.nivel || '').toLowerCase().includes(b);
      }
      return true;
    });
  }, [items, filtroFrente, filtroSemana, filtroEstado, busqueda]);

  // KPIs compactos
  const kpis = useMemo(() => {
    const total = items.length;
    const liberados = items.filter(i => i.estado === 'liberado').length;
    const pendientes = items.filter(i => ['pendiente', 'llenado', 'firmado_residente'].includes(i.estado)).length;
    const observados = items.filter(i => ['observado', 'rechazado'].includes(i.estado)).length;
    return { total, liberados, pendientes, observados };
  }, [items]);

  if (loading) {
    return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando protocolos Pre-Vaciado...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Toolbar + KPIs compactos ── */}
      <div style={toolbarStyle}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: BASE.gold, letterSpacing: 1.4 }}>
            CAL-FOR-006 · PRE-VACIADO DE CONCRETO
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, marginTop: 2 }}>
            Protocolos de Liberación
          </h2>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <Kpi label="Total"      valor={kpis.total}      color={BASE.navy} />
            <Kpi label="Liberados"  valor={kpis.liberados}  color={BASE.green} />
            <Kpi label="Pendientes" valor={kpis.pendientes} color="#f59e0b" />
            <Kpi label="Observados" valor={kpis.observados} color={BASE.red} />
          </div>
        </div>
        <button onClick={onNuevo} style={btnGold}>
          ➕ NUEVO PROTOCOLO
        </button>
      </div>

      {/* ── Filtros ── */}
      <div style={filtrosStyle}>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por N° Registro, elemento, ejes..." style={inpStyle} />
        <select value={filtroFrente} onChange={e => setFiltroFrente(e.target.value)} style={selStyle}>
          <option value="">Todos los frentes</option>
          {frentesDelProyecto.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
        <select value={filtroSemana} onChange={e => setFiltroSemana(e.target.value)} style={selStyle}>
          <option value="">Todas las semanas</option>
          {semanas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selStyle}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_PROTOCOLO).map(([k, e]) => (
            <option key={k} value={k}>{e.icono} {e.label}</option>
          ))}
        </select>
      </div>

      {/* ── Lista ── */}
      {filtrados.length === 0 ? (
        <EmptyState
          icono="🧱"
          titulo="Sin protocolos Pre-Vaciado"
          descripcion="Crea el primer protocolo CAL-FOR-006. La plataforma genera el N° Registro y el checklist de 10 ítems automáticamente."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 10 }}>
          {filtrados.map(p => {
            const estado = ESTADOS_PROTOCOLO[p.estado] || ESTADOS_PROTOCOLO.pendiente;
            const itemsLlenos = p.checklist?.filter(c => c.valor !== 'NO_LLENADO').length || 0;
            const totalItems = p.checklist?.length || 10;
            const pct = totalItems > 0 ? Math.round((itemsLlenos / totalItems) * 100) : 0;
            return (
              <div key={p.id} style={{ ...cardStyle, borderLeft: `5px solid ${estado.color}` }}
                onClick={() => onEdit?.(p.id)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 900, color: BASE.navy, fontFamily: 'monospace' }}>
                      {p.numeroRegistro || p.codigo || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
                      {p.estructuraElemento || 'Sin elemento'} · {p.ejes || '—'}
                    </p>
                  </div>
                  <span style={{
                    background: estado.color, color: '#fff',
                    padding: '3px 8px', borderRadius: 10,
                    fontSize: 9, fontWeight: 900, letterSpacing: 0.4,
                  }}>{estado.icono} {estado.label}</span>
                </div>
                <div style={chipsRow}>
                  <Chip label={`📍 ${p.frenteCodigo || '—'}`} />
                  <Chip label={`📅 ${p.semanaISO || '—'}`} />
                  {p.fc && <Chip label={`f'c ${p.fc}`} />}
                  {p.volumen && <Chip label={`Vol ${p.volumen}`} />}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: BASE.muted }}>
                      CHECKLIST {itemsLlenos}/{totalItems}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: BASE.navy }}>{pct}%</span>
                  </div>
                  <div style={{ background: BASE.bgSoft, height: 5, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ background: estado.color, height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── auxiliares ──
function Kpi({ label, valor, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 18, fontWeight: 900, color }}>{valor}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: BASE.muted, letterSpacing: 0.4 }}>{label.toUpperCase()}</span>
    </div>
  );
}
function Chip({ label }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      background: BASE.bgSoft, color: BASE.muted,
      fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
      border: `1px solid ${BASE.border}`,
    }}>{label}</span>
  );
}

const toolbarStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 14, padding: '14px 18px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const filtrosStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8,
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 12, padding: 10,
};
const cardStyle = {
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 12, padding: '14px 16px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
  cursor: 'pointer', transition: 'transform 0.15s',
};
const chipsRow = { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 };
const inpStyle = {
  padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`,
  fontSize: 12, fontWeight: 600, background: '#fff', outline: 'none',
};
const selStyle = { ...inpStyle, cursor: 'pointer', fontWeight: 700 };
const btnGold = {
  padding: '10px 18px', borderRadius: 8,
  background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
  color: '#fff', border: 'none', fontSize: 12, fontWeight: 900,
  cursor: 'pointer', letterSpacing: 0.4,
  boxShadow: '0 4px 12px rgba(229,168,47,0.35)',
  whiteSpace: 'nowrap',
};
