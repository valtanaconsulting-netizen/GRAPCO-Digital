// src/views/oficinatecnica/ValorizacionF07.jsx
// Réplica del formato oficial GP-GCE-FOR-F07 (hoja "4. VAL"): grilla por ÍTEM con
// Presupuesto (Und/Cant/P.U./Parcial) y los bloques Acumulado Anterior · Actual ·
// Acumulado · Saldo (Cantidad / % / Total). Se valoriza por CANTIDAD (metrado).
//
// Fuentes vivas:
//   • PresupuestoF07  → el presupuesto al detalle (item, descripción, und, cant, pu).
//   • ValorizacionF07_Avance → el ACUMULADO de cantidad (metrado) por ítem en cada
//     una de las valorizaciones (V-01..V-09 + LIQUIDACIÓN). El acumulado del F07 ES
//     el metrado del ISP ya cruzado al ítem y agrupado por quincena. El "Actual" es
//     (acumulado de la val − acumulado de la val anterior); "Saldo" = Cant − Acumulado.
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE, LOGO } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import EmptyState from '../../components/EmptyState';

const soles = (n) => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cant = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const pct = (n) => (Number.isFinite(n) ? Math.round(n * 100) : 0) + '%';

export default function ValorizacionF07({ showToast }) {
  const { proyectoActivo, proyectoActivoId } = useProyectoActivo();
  const proyId = proyectoActivoId || proyectoActivo?.id;
  const [presu, setPresu] = useState([]);
  const [avances, setAvances] = useState([]); // [{ valN, label, avances:[{item,acum,actual}] }]
  const [loading, setLoading] = useState(true);
  const [valSel, setValSel] = useState(null);

  useEffect(() => {
    if (!proyId) { setPresu([]); setAvances([]); setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) => {
      const rows = snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setPresu(rows); setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'ValorizacionF07_Avance'), (snap) => {
      setAvances(snap.docs.map(d => d.data()).filter(a => a.proyectoId === proyId).sort((a, b) => (a.valN || 0) - (b.valN || 0)));
    });
    return () => { u1(); u2(); };
  }, [proyId]);

  // Valorizaciones disponibles (V-01..V-09 + LIQUIDACIÓN).
  const periodos = useMemo(() => avances.map(a => ({ valN: a.valN, label: a.label || ('V-' + String(a.valN).padStart(2, '0')) })), [avances]);
  const valN = valSel != null ? valSel : (periodos.length ? periodos[periodos.length - 1].valN : 1);
  const periodoActual = periodos.find(p => p.valN === valN) || { valN, label: 'V-' + String(valN).padStart(2, '0') };
  const esLiquidacion = /LIQUID/i.test(periodoActual.label);

  // Mapas acumulados (item → cantidad) de la val seleccionada y de la anterior.
  const ejecPorItem = useMemo(() => {
    const docSel = avances.find(a => a.valN === valN);
    const previas = avances.filter(a => a.valN < valN);
    const docAnt = previas.length ? previas[previas.length - 1] : null;
    const mapAcum = (doc) => { const m = {}; (doc?.avances || []).forEach(x => { const k = x.key || x.item; m[k] = (m[k] || 0) + (Number(x.acum) || 0); }); return m; };
    const acumSel = mapAcum(docSel);
    const acumAnt = mapAcum(docAnt);
    const m = {};
    const items = new Set([...Object.keys(acumSel), ...Object.keys(acumAnt)]);
    items.forEach(it => {
      const acum = acumSel[it] || 0;
      const ant = acumAnt[it] || 0;
      m[it] = { ant, act: acum - ant, acum }; // ant + act = acum (cuadra el F07)
    });
    return m;
  }, [avances, valN]);

  // Totales (a nivel S/.) de cada bloque.
  const tot = useMemo(() => {
    let parcial = 0, ant = 0, act = 0, acum = 0;
    presu.forEach(p => {
      if (!p.esPartida || p.pu == null) return;
      const e = ejecPorItem[p.mkey] || {};
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

  const cliente = proyectoActivo?.cliente || proyectoActivo?.clienteNombre || 'CREDITEX';
  const obra = proyectoActivo?.nombre || 'PTAR PLANTA 5';
  const ubic = proyectoActivo?.ubicacion || 'Calle Los Hornos 185, Urb. Vulcano, Ate, Lima';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* CABECERA F07 (tal cual el Excel) */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 200px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${BASE.border}`, padding: 8 }}>
            <img src={LOGO} alt="GRAPCO" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, letterSpacing: 0.5 }}>{esLiquidacion ? 'LIQUIDACIÓN' : `VALORIZACIÓN N°${String(valN).padStart(2, '0')}`}</p>
          </div>
          <div style={{ borderLeft: `1px solid ${BASE.border}`, fontSize: 10 }}>
            {[['CÓDIGO', 'GP-GCE-FOR-F07'], ['VERSIÓN', '0.00'], ['VALORIZACIÓN N°', esLiquidacion ? 'LIQ' : String(valN).padStart(2, '0')]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', borderBottom: `1px solid ${BASE.border}` }}>
                <span style={{ flex: 1, padding: '5px 8px', fontWeight: 800, color: BASE.muted }}>{k}</span>
                <span style={{ flex: 1, padding: '5px 8px', fontWeight: 800, color: BASE.navy, borderLeft: `1px solid ${BASE.border}` }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0', borderTop: `1px solid ${BASE.border}` }}>
          {[['OBRA', obra], ['CLIENTE', cliente], ['CONTRATISTA', 'GRAPCO SAC'], ['SUPERVISIÓN', proyectoActivo?.supervision || 'Diseños Racionales SAC'], ['DENOMINACIÓN', `PPTO ${obra}`], ['PRESUPUESTO', 'Contractual (PTARI)'], ['UBICACIÓN', ubic], ['VALORIZACIÓN N°', esLiquidacion ? 'LIQUIDACIÓN' : String(valN).padStart(2, '0')]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', fontSize: 10.5, borderRight: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}` }}>
              <span style={{ padding: '6px 8px', fontWeight: 800, color: BASE.muted, minWidth: 86, background: BASE.bgSoft }}>{k}</span>
              <span style={{ padding: '6px 8px', fontWeight: 700, color: BASE.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 14px', background: BASE.bgSoft }}>
          <p style={{ fontSize: 11, color: BASE.muted }}>
            {presu.filter(p => p.esPartida).length} partidas · valoriza por <b>metrado</b> (Cant × P.U.) · quincenal · {periodos.length || 0} valorizaciones.
          </p>
          <label style={{ fontSize: 12, fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Ver
            <select value={valN} onChange={e => setValSel(parseInt(e.target.value, 10))} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 13, fontWeight: 800 }}>
              {(periodos.length ? periodos : [{ valN: 1, label: 'V-01' }]).map(p => <option key={p.valN} value={p.valN}>{/LIQUID/i.test(p.label) ? 'LIQUIDACIÓN' : `Valorización N° ${String(p.valN).padStart(2, '0')}`}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* KPIs por bloque (S/.) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <Kpi label="Presupuesto (parcial)" v={soles(tot.parcial)} c={BASE.navy} />
        <Kpi label="Acum. anterior" v={soles(tot.ant)} c={BASE.muted} />
        <Kpi label={`Actual · ${esLiquidacion ? 'LIQ' : 'V-' + String(valN).padStart(2, '0')}`} v={soles(tot.act)} c={BASE.gold} />
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
                const e = ejecPorItem[p.mkey] || { ant: 0, act: 0, acum: 0 };
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
        ◆ El <b>metrado de avance</b> proviene del <b>ISP</b> (cantidad ejecutada por partida), agrupado por quincena → cada valorización. <b>Actual</b> = acumulado de la val − acumulado de la anterior · <b>Saldo</b> = Cant − Acumulado. {!avances.length && <span style={{ color: BASE.gold, fontWeight: 800 }}>· Aún no se han cargado los avances de este proyecto.</span>}
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
