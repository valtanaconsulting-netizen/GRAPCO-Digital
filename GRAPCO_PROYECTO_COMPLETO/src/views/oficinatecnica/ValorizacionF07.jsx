// src/views/oficinatecnica/ValorizacionF07.jsx
// Réplica del formato oficial GP-GCE-FOR-F07 (hoja "4. VAL"): grilla por ÍTEM con
// Presupuesto (Und/Cant/P.U./Parcial) y los bloques Acumulado Anterior · Actual ·
// Acumulado · Saldo (Cantidad / % / Total). Se valoriza por CANTIDAD (metrado).
//
// Fuentes vivas:
//   • PresupuestoF07  → el presupuesto al detalle (item, descripción, und, cant, pu).
//   • SustentoMetrados → la cantidad ejecutada por partida (codigoPartida == item),
//     clasificada por valorización (PQ-XX). El "Actual" es el PQ seleccionado;
//     "Acumulado Anterior" es lo de PQ menores; "Acumulado" la suma hasta el PQ.
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import EmptyState from '../../components/EmptyState';

const soles = (n) => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cant = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const pct = (n) => (Number.isFinite(n) ? Math.round(n * 100) : 0) + '%';
const pqNum = (ref) => { const m = String(ref || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };

export default function ValorizacionF07({ showToast }) {
  const { proyectoActivo } = useProyectoActivo();
  const proyId = proyectoActivo?.id;
  const [presu, setPresu] = useState([]);
  const [sustentos, setSustentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pqSel, setPqSel] = useState(null);

  useEffect(() => {
    if (!proyId) { setPresu([]); setSustentos([]); setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) => {
      const rows = snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setPresu(rows); setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'SustentoMetrados'), (snap) => {
      setSustentos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.proyectoId || s.proyectoId === proyId));
    });
    return () => { u1(); u2(); };
  }, [proyId]);

  // Valorizaciones (PQ) presentes en los sustentos.
  const periodos = useMemo(() => {
    const set = new Set();
    sustentos.forEach(s => { const n = pqNum(s.valorizacionRef); if (n != null) set.add(n); });
    return [...set].sort((a, b) => a - b);
  }, [sustentos]);
  const pq = pqSel != null ? pqSel : (periodos.length ? periodos[periodos.length - 1] : 1);

  // Ejecutado por item, separado por PQ.
  const ejecPorItem = useMemo(() => {
    const m = {}; // item -> { hastaAnt, actual, hastaAcum }
    sustentos.forEach(s => {
      const it = String(s.codigoPartida || '').trim(); if (!it) return;
      const n = pqNum(s.valorizacionRef);
      const q = Number(s.metrado) || 0;
      if (!m[it]) m[it] = { ant: 0, act: 0, acum: 0 };
      if (n != null && n < pq) m[it].ant += q;
      if (n != null && n === pq) m[it].act += q;
      if (n == null || n <= pq) m[it].acum += q;
    });
    return m;
  }, [sustentos, pq]);

  // Totales (a nivel S/.) de cada bloque.
  const tot = useMemo(() => {
    let parcial = 0, ant = 0, act = 0, acum = 0;
    presu.forEach(p => {
      if (!p.esPartida || p.pu == null) return;
      const e = ejecPorItem[p.item] || {};
      parcial += (p.cant || 0) * p.pu;
      ant += (e.ant || 0) * p.pu;
      act += (e.act || 0) * p.pu;
      acum += (e.acum || 0) * p.pu;
    });
    return { parcial, ant, act, acum, saldo: parcial - acum };
  }, [presu, ejecPorItem]);

  if (!proyId) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando presupuesto…</p>;
  if (!presu.length) return <EmptyState icono="📄" titulo="Sin presupuesto F07" descripcion="No se ha cargado el presupuesto al detalle (formato F07) de este proyecto." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cabecera */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: BASE.navy }}>Valorización · Formato F07 (por cantidad)</p>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            GP-GCE-FOR-F07 · {presu.filter(p => p.esPartida).length} partidas · valoriza por metrado (Cant × P.U.). Quincenal.
          </p>
        </div>
        <label style={{ fontSize: 12, fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Valorización N°
          <select value={pq} onChange={e => setPqSel(parseInt(e.target.value, 10))} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 13, fontWeight: 800 }}>
            {(periodos.length ? periodos : [1]).map(n => <option key={n} value={n}>N° {String(n).padStart(2, '0')}</option>)}
          </select>
        </label>
      </div>

      {/* KPIs por bloque (S/.) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <Kpi label="Presupuesto (parcial)" v={soles(tot.parcial)} c={BASE.navy} />
        <Kpi label="Acum. anterior" v={soles(tot.ant)} c={BASE.muted} />
        <Kpi label={`Actual · V-${String(pq).padStart(2, '0')}`} v={soles(tot.act)} c={BASE.gold} />
        <Kpi label="Acumulado" v={soles(tot.acum)} c={BASE.green} />
        <Kpi label="Saldo referencial" v={soles(tot.saldo)} c="#0ea5e9" />
      </div>

      {/* Grilla F07 */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 1180, width: '100%' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th rowSpan={2} style={th({ minWidth: 56, textAlign: 'left' })}>ITEM</th>
                <th rowSpan={2} style={th({ minWidth: 240, textAlign: 'left' })}>DESCRIPCIÓN</th>
                <th colSpan={4} style={th({ borderLeft: bd })}>PRESUPUESTO</th>
                <th colSpan={3} style={th({ borderLeft: bd, background: '#334155' })}>ACUM. ANTERIOR</th>
                <th colSpan={3} style={th({ borderLeft: bd, background: BASE.goldDark })}>ACTUAL</th>
                <th colSpan={3} style={th({ borderLeft: bd, background: '#15803d' })}>ACUMULADO</th>
                <th colSpan={3} style={th({ borderLeft: bd, background: '#0369a1' })}>SALDO REF.</th>
              </tr>
              <tr style={{ background: BASE.navyDark, color: '#fff' }}>
                {['UND', 'CANT', 'P.U.', 'PARCIAL'].map((h, i) => <th key={h} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: i === 0 ? 'center' : 'right' })}>{h}</th>)}
                {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'a' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right' })}>{h}</th>)}
                {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'b' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right' })}>{h}</th>)}
                {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'c' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right' })}>{h}</th>)}
                {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'d' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right' })}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {presu.map((p, idx) => {
                if (!p.esPartida) {
                  // Título / subtítulo → fila de grupo (ámbar).
                  const titulo = p.nivel <= 1;
                  return (
                    <tr key={idx} style={{ background: titulo ? BASE.gold : BASE.goldLight }}>
                      <td style={{ padding: '6px 8px', fontWeight: 900, color: titulo ? '#fff' : BASE.navy }}>{p.item}</td>
                      <td colSpan={17} style={{ padding: '6px 8px', fontWeight: 900, color: titulo ? '#fff' : BASE.navy, letterSpacing: titulo ? '0.4px' : 0 }}>{p.descripcion}</td>
                    </tr>
                  );
                }
                const pu = p.pu || 0; const cantP = p.cant || 0; const parcial = cantP * pu;
                const e = ejecPorItem[p.item] || { ant: 0, act: 0, acum: 0 };
                const saldoCant = cantP - e.acum;
                const cerrada = p.cerrada || (cantP > 0 && e.acum >= cantP - 0.001);
                return (
                  <tr key={idx} style={{ background: idx % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={td({ fontFamily: 'monospace', color: BASE.navy, fontWeight: 700 })}>{p.item}</td>
                    <td style={td({ textAlign: 'left' })}>{p.descripcion}{cerrada && <span style={{ marginLeft: 6, fontSize: 9, color: BASE.green, fontWeight: 800 }}>● cerrada</span>}</td>
                    {/* Presupuesto */}
                    <td style={td({ textAlign: 'center', borderLeft: bdL })}>{p.und}</td>
                    <td style={td({ textAlign: 'right' })}>{cant(cantP)}</td>
                    <td style={td({ textAlign: 'right' })}>{soles(pu)}</td>
                    <td style={td({ textAlign: 'right', fontWeight: 700 })}>{soles(parcial)}</td>
                    {/* Acum. anterior */}
                    {bloque(e.ant, cantP, pu, bdL, BASE.muted)}
                    {/* Actual */}
                    {bloque(e.act, cantP, pu, bdL, BASE.goldDark, e.act > 0)}
                    {/* Acumulado */}
                    {bloque(e.acum, cantP, pu, bdL, BASE.green, e.acum > 0)}
                    {/* Saldo */}
                    {bloque(saldoCant, cantP, pu, bdL, '#0369a1')}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <td colSpan={5} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900 }}>TOTALES (S/.)</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, borderLeft: bd }}>{soles(tot.parcial)}</td>
                <td colSpan={2} style={{ borderLeft: bd }} />
                <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>{soles(tot.ant)}</td>
                <td colSpan={2} style={{ borderLeft: bd }} />
                <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#fde68a' }}>{soles(tot.act)}</td>
                <td colSpan={2} style={{ borderLeft: bd }} />
                <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#86efac' }}>{soles(tot.acum)}</td>
                <td colSpan={2} style={{ borderLeft: bd }} />
                <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#7dd3fc' }}>{soles(tot.saldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 10.5, color: BASE.muted }}>
        ◆ El <b>Actual/Acumulado</b> se calcula con los metrados de <b>Metrados/Sustento</b> cuyo <b>código de partida</b> coincide con el ítem. Las partidas sin sustento quedan en 0 hasta cargarlo.
      </p>
    </div>
  );
}

// Celdas Cantidad / % / Total de un bloque.
function bloque(cantBloque, cantPpto, pu, borde, color, fuerte) {
  const q = Number(cantBloque) || 0;
  const porc = cantPpto > 0 ? q / cantPpto : 0;
  const total = q * pu;
  return (
    <>
      <td style={td({ textAlign: 'right', borderLeft: borde, color: q ? color : BASE.mutedSoft, fontWeight: fuerte ? 800 : 500 })}>{q ? cant(q) : '—'}</td>
      <td style={td({ textAlign: 'right', color: BASE.muted })}>{q ? pct(porc) : '—'}</td>
      <td style={td({ textAlign: 'right', color: q ? color : BASE.mutedSoft, fontWeight: fuerte ? 700 : 500 })}>{q ? soles(total) : '—'}</td>
    </>
  );
}

function Kpi({ label, v, c }) {
  return (
    <div style={{ background: c + '12', border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`, borderRadius: 10, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 14, fontWeight: 900, color: c, marginTop: 2, fontFamily: 'monospace' }}>{v}</p>
    </div>
  );
}

const bd = '2px solid rgba(255,255,255,0.35)';
const bdL = `2px solid ${BASE.border}`;
const th = (extra = {}) => ({ padding: '6px 8px', fontSize: 9, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap', textAlign: 'center', ...extra });
const td = (extra = {}) => ({ padding: '5px 8px', fontSize: 10.5, color: BASE.text, whiteSpace: 'nowrap', ...extra });
