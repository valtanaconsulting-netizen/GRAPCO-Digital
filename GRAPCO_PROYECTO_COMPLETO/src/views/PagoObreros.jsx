// src/views/PagoObreros.jsx
// Tabla de costo a pagar por trabajador en un rango de fechas.
// Aplica la fórmula HN + HE60(×1.60) + HE100(×2.00) usando tarifa por trabajador/cargo.

import React, { useState, useMemo } from 'react';
import { BASE, CHART_PALETTE } from '../utils/styles';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
import {
  fmt1, fmtMoney, hoy, obtenerSemana,
  calcularCostosHEPorTrabajador,
} from '../utils/helpers';
// exportarCostosHE se carga LAZY (await import) al exportar → no arrastra xlsx (416KB) al chunk.
import { crearResolverNombre } from '../utils/nombresCanonicos';
import VistaHeader from '../components/VistaHeader';

const card = {
  background: BASE.white,
  borderRadius: '12px',
  border: `1px solid ${BASE.border}`,
  boxShadow: BASE.shadowMd,
};

export default function PagoObreros({ historial = [], cuadrillasActivas = {}, configuracion = {}, personalDB = [], showToast }) {
  // Resolver de nombres compartido — el MISMO obrero / capataz escrito distinto
  // se agrupa como UNA persona en el pago (no se duplica al cobrar HH).
  const resolverNombre = useMemo(
    () => crearResolverNombre(historial || [], personalDB || []),
    [historial, personalDB],
  );
  const [desde,   setDesde]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [hasta,   setHasta]   = useState(hoy());
  const [capataz, setCapataz] = useState('');
  const [semana,  setSemana]  = useState(''); // '' = todas; o número de semana
  const [busqueda, setBusqueda] = useState('');
  const [expandirCapataces, setExpandirCapataces] = useState(true);

  const costosCustomMap = configuracion?.tarifas || {};

  // ── Semanas disponibles en la data ───────────────────────────
  const semanasDisponibles = useMemo(() => {
    const set = new Set();
    (historial || []).forEach(r => {
      if (!r || !r.fecha) return;
      const s = r.semana || obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO);
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [historial]);

  // ── Registros filtrados ──────────────────────────────────────
  // El filtro de capataz compara CANONIZADO en ambos lados, para que cualquier
  // variante del nombre (con/sin espacio, con tipo) caiga en la misma cuadrilla.
  const registrosFiltrados = useMemo(() => {
    const semNum = semana ? parseInt(semana) : null;
    const capCanon = capataz ? resolverNombre(capataz) : '';
    return (historial || []).filter(r => {
      if (!r || !r.fecha) return false;
      if (semNum != null) {
        const rs = r.semana || obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO);
        if (rs !== semNum) return false;
      } else {
        if (r.fecha < desde || r.fecha > hasta) return false;
      }
      if (capCanon && resolverNombre(r.capataz) !== capCanon) return false;
      return true;
    });
  }, [historial, desde, hasta, capataz, semana, resolverNombre]);

  // ── Registros con nombres canonizados (capataz + cada t.nombre).
  // Se pasa a `calcularCostosHEPorTrabajador`, que agrupa por nombre → así el
  // MISMO obrero no se cobra dos veces aunque haya sido escrito distinto.
  const registrosCanon = useMemo(() => {
    return (registrosFiltrados || []).map(r => ({
      ...r,
      capataz: resolverNombre(r.capataz),
      detalleTareo: (r.detalleTareo || []).map(t => ({
        ...t,
        nombre: resolverNombre(t?.nombre),
      })),
    }));
  }, [registrosFiltrados, resolverNombre]);

  // ── Agrupado por capataz → trabajadores con costos ──────────
  const porCapataz = useMemo(() => {
    const grupos = {};
    registrosCanon.forEach(r => {
      const cap = r.capataz || 'SIN CAPATAZ';
      if (!grupos[cap]) grupos[cap] = [];
      grupos[cap].push(r);
    });
    return Object.entries(grupos)
      .map(([cap, regs]) => {
        const trabajadores = calcularCostosHEPorTrabajador(regs, costosCustomMap);
        const filtrados = busqueda.trim()
          ? trabajadores.filter(t => resolverNombre(t.nombre).toLowerCase().includes(busqueda.toLowerCase()))
          : trabajadores;
        const subtotal = filtrados.reduce((s, t) => ({
          hn:       s.hn       + t.hn,
          he60:     s.he60     + t.he60,
          he100:    s.he100    + t.he100,
          totalHH:  s.totalHH  + t.totalHH,
          costoHN:  s.costoHN  + t.costoHN,
          costoHE60: s.costoHE60 + t.costoHE60,
          costoHE100: s.costoHE100 + t.costoHE100,
          costoTotal: s.costoTotal + t.costoTotal,
        }), { hn: 0, he60: 0, he100: 0, totalHH: 0, costoHN: 0, costoHE60: 0, costoHE100: 0, costoTotal: 0 });
        return { capataz: cap, trabajadores: filtrados, subtotal };
      })
      .filter(g => g.trabajadores.length > 0)
      .sort((a, b) => b.subtotal.costoTotal - a.subtotal.costoTotal);
  }, [registrosFiltrados, costosCustomMap, busqueda]);

  const granTotal = useMemo(() => {
    return porCapataz.reduce((s, g) => ({
      personas: s.personas + g.trabajadores.length,
      hn:    s.hn    + g.subtotal.hn,
      he60:  s.he60  + g.subtotal.he60,
      he100: s.he100 + g.subtotal.he100,
      totalHH: s.totalHH + g.subtotal.totalHH,
      costoHN:    s.costoHN    + g.subtotal.costoHN,
      costoHE60:  s.costoHE60  + g.subtotal.costoHE60,
      costoHE100: s.costoHE100 + g.subtotal.costoHE100,
      costoTotal: s.costoTotal + g.subtotal.costoTotal,
    }), { personas: 0, hn: 0, he60: 0, he100: 0, totalHH: 0, costoHN: 0, costoHE60: 0, costoHE100: 0, costoTotal: 0 });
  }, [porCapataz]);

  const handleExport = async () => {
    if (porCapataz.length === 0) return showToast?.('Sin datos para exportar', 'warning');
    try {
      const { exportarCostosHE } = await import('../utils/excelExport');
      const todos = porCapataz.flatMap(g => g.trabajadores);
      const fname = exportarCostosHE(todos, { fechaIni: desde, fechaFin: hasta }, costosCustomMap);
      showToast?.(`📥 ${fname}`, 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al exportar', 'error');
    }
  };

  const setRangoRapido = (tipo) => {
    const h = new Date();
    if (tipo === 'hoy')      { setDesde(hoy()); setHasta(hoy()); return; }
    if (tipo === '7d')       { const d = new Date(h); d.setDate(d.getDate() - 6);  setDesde(d.toISOString().slice(0,10)); setHasta(hoy()); return; }
    if (tipo === 'quincena') { const d = new Date(h); d.setDate(d.getDate() - 14); setDesde(d.toISOString().slice(0,10)); setHasta(hoy()); return; }
    if (tipo === 'mes')      { const d = new Date(h); d.setDate(1);                setDesde(d.toISOString().slice(0,10)); setHasta(hoy()); return; }
    if (tipo === 'semana-actual') {
      const s = obtenerSemana(hoy(), FECHA_INICIO_PROYECTO);
      setSemana(String(s));
    }
  };

  // Lista de capataces para el dropdown: claves de cuadrillasActivas, pero
  // CANONIZADAS para que dos variantes del mismo capataz aparezcan como UNA.
  const capatacesDisponibles = useMemo(() => {
    const set = new Set();
    Object.keys(cuadrillasActivas || {}).forEach(c => {
      const canon = resolverNombre(c);
      if (canon) set.add(canon);
    });
    return Array.from(set).sort();
  }, [cuadrillasActivas, resolverNombre]);
  const semanaActiva = !!semana;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      <VistaHeader icono="coins" eyebrow="Gestión"
        titulo="Pago a Obreros"
        subtitulo="Costo a pagar por trabajador: HN + HE 60% + HE 100% según tarifa" />

      {/* FILTROS */}
      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>PAGO A OBREROS · Período</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              ['hoy', 'Hoy'], ['7d', 'Últimos 7 días'],
              ['quincena', 'Quincena'], ['mes', 'Este mes'],
              ['semana-actual', 'Semana actual'],
            ].map(([k, l]) => (
              <button key={k} onClick={() => { setSemana(''); setRangoRapido(k); }}
                style={{
                  padding: '5px 10px', fontSize: '10.5px', fontWeight: '700',
                  background: BASE.bgSoft, color: BASE.navy,
                  border: `1px solid ${BASE.border}`, borderRadius: '6px', cursor: 'pointer',
                }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              SEMANA {semanaActiva && <span style={{ color: BASE.gold, marginLeft: '4px' }}>● activa</span>}
            </label>
            <select value={semana} onChange={e => setSemana(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: '8px',
                border: `1px solid ${semanaActiva ? BASE.gold : BASE.border}`,
                fontSize: '12px',
                background: semanaActiva ? `${BASE.gold}10` : BASE.bgSoft,
                fontWeight: semanaActiva ? '700' : '400',
                boxSizing: 'border-box',
              }}>
              <option value="">Todas (usar fechas)</option>
              {semanasDisponibles.map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0, opacity: semanaActiva ? 0.5 : 1 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>DESDE</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} disabled={semanaActiva}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: BASE.bgSoft, boxSizing: 'border-box' }} />
          </div>
          <div style={{ minWidth: 0, opacity: semanaActiva ? 0.5 : 1 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>HASTA</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} disabled={semanaActiva}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: BASE.bgSoft, boxSizing: 'border-box' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>CAPATAZ</label>
            <select value={capataz} onChange={e => setCapataz(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: BASE.bgSoft, boxSizing: 'border-box' }}>
              <option value="">Todos</option>
              {capatacesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>BUSCAR TRABAJADOR</label>
            <input type="text" placeholder="Nombre…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BASE.border}`, fontSize: '12px', background: BASE.bgSoft, boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '10.5px', color: BASE.muted, lineHeight: 1.4 }}>
            Fórmula: <strong>Costo = HN × tarifa + HE primeras 2h × 1.60 + HE resto × 2.00</strong>. Tarifa por trabajador/cargo (Configuración → Tarifas).
          </p>
          <button onClick={handleExport}
            style={{
              padding: '8px 14px', background: BASE.green, color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>📥 Exportar Excel</button>
        </div>
      </div>

      {/* GRAN TOTAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
        {[
          { l: 'COSTO TOTAL',  v: fmtMoney(granTotal.costoTotal), c: BASE.navy,    sub: 'A pagar' },
          { l: 'TRABAJADORES', v: granTotal.personas,             c: CHART_PALETTE[3] },
          { l: 'HH TOTAL',     v: fmt1(granTotal.totalHH),        c: CHART_PALETTE[11],    sub: `${fmt1(granTotal.hn)} HN + ${fmt1(granTotal.he60 + granTotal.he100)} HE` },
          { l: 'COSTO HE',     v: fmtMoney(granTotal.costoHE60 + granTotal.costoHE100), c: '#d97706', sub: `60%: ${fmtMoney(granTotal.costoHE60)} · 100%: ${fmtMoney(granTotal.costoHE100)}` },
        ].map(k => (
          <div key={k.l} style={{ ...card, padding: '10px 14px' }}>
            <p style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.6px' }}>{k.l}</p>
            <p style={{ fontSize: '18px', fontWeight: '900', color: k.c, marginTop: '2px', lineHeight: 1.2 }}>{k.v}</p>
            {k.sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* TABLAS POR CAPATAZ */}
      {porCapataz.length === 0 ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
          <p style={{ fontSize: '13px', color: BASE.muted, fontWeight: '600' }}>Sin trabajadores en el período seleccionado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button onClick={() => setExpandirCapataces(!expandirCapataces)}
              style={{ padding: '5px 10px', fontSize: '10.5px', fontWeight: '700', background: BASE.bgSoft, color: BASE.navy, border: `1px solid ${BASE.border}`, borderRadius: '6px', cursor: 'pointer' }}>
              {expandirCapataces ? '▼ Colapsar todo' : '▶ Expandir todo'}
            </button>
          </div>
          {porCapataz.map(g => (
            <CuadrillaCard key={g.capataz} grupo={g} expandidoInicial={expandirCapataces} />
          ))}
        </div>
      )}
    </div>
  );
}

function CuadrillaCard({ grupo, expandidoInicial }) {
  const [abierto, setAbierto] = useState(true);
  React.useEffect(() => setAbierto(expandidoInicial), [expandidoInicial]);

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      {/* Header del capataz */}
      <button onClick={() => setAbierto(!abierto)} style={{
        width: '100%', padding: '12px 16px', background: BASE.navy, color: '#fff',
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: '13px' }}>{abierto ? '▼' : '▶'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.3px' }}>👷‍♂️ {grupo.capataz}</p>
          <p style={{ fontSize: '10.5px', opacity: 0.8, marginTop: '2px' }}>
            {grupo.trabajadores.length} trabajador{grupo.trabajadores.length === 1 ? '' : 'es'} ·{' '}
            {fmt1(grupo.subtotal.totalHH)} HH ({fmt1(grupo.subtotal.hn)} HN + {fmt1(grupo.subtotal.he60 + grupo.subtotal.he100)} HE)
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '10px', opacity: 0.8 }}>Subtotal</p>
          <p style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'var(--grapco-font-mono, monospace)' }}>
            {fmtMoney(grupo.subtotal.costoTotal)}
          </p>
        </div>
      </button>

      {abierto && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '880px' }}>
            <thead>
              <tr style={{ background: BASE.bgSoft, color: BASE.navy }}>
                {['#', 'Trabajador', 'Cargo', 'Días', 'HN', 'HE 60%', 'HE 100%', 'Tarifa/h', 'Costo HN', 'Costo HE', 'COSTO TOTAL'].map((h, i) => (
                  <th key={i} style={{
                    padding: '9px 10px', fontSize: '10.5px', fontWeight: '800',
                    textAlign: i <= 2 ? 'left' : 'right',
                    borderBottom: `1px solid ${BASE.border}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupo.trabajadores.map((t, idx) => (
                <tr key={t.nombre + idx} style={{ borderBottom: `1px solid ${BASE.borderSoft}` }}>
                  <td style={{ padding: '8px 10px', color: BASE.muted, fontFamily: 'monospace' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 10px', fontWeight: '700', color: BASE.text }}>{t.nombre}</td>
                  <td style={{ padding: '8px 10px', color: BASE.muted, fontSize: '11px' }}>{t.cargo}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{t.diasTrabajados}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt1(t.hn)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: t.he60 > 0 ? '#d97706' : BASE.muted }}>{fmt1(t.he60)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: t.he100 > 0 ? BASE.red : BASE.muted }}>{fmt1(t.he100)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{fmtMoney(t.costoHora)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtMoney(t.costoHN)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#d97706' }}>{fmtMoney(t.costoHE60 + t.costoHE100)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.navy }}>{fmtMoney(t.costoTotal)}</td>
                </tr>
              ))}
              <tr style={{ background: `${BASE.gold}15`, borderTop: `2px solid ${BASE.gold}` }}>
                <td colSpan={3} style={{ padding: '10px', fontWeight: '900', color: BASE.navy, fontSize: '11px' }}>SUBTOTAL · {grupo.capataz}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace' }}>{grupo.trabajadores.reduce((s, t) => s + t.diasTrabajados, 0)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace' }}>{fmt1(grupo.subtotal.hn)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace', color: '#d97706' }}>{fmt1(grupo.subtotal.he60)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace', color: BASE.red }}>{fmt1(grupo.subtotal.he100)}</td>
                <td style={{ padding: '10px' }} />
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace' }}>{fmtMoney(grupo.subtotal.costoHN)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace', color: '#d97706' }}>{fmtMoney(grupo.subtotal.costoHE60 + grupo.subtotal.costoHE100)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', fontFamily: 'monospace', fontSize: '13px', color: BASE.navy }}>{fmtMoney(grupo.subtotal.costoTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
