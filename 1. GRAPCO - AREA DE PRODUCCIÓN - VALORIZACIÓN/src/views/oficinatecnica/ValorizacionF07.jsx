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
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE, LOGO } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import useAvanceF07Vivo from '../../hooks/useAvanceF07Vivo';
import { generarPDFValorizacionF07 } from '../../utils/valorizacionF07Pdf';
import EmptyState from '../../components/EmptyState';
import { sugerirPrefijo, familiaDe, colorPrefijo } from '../../utils/prefijos';

const soles = (n) => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cant = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const pct = (n) => (Number.isFinite(n) ? Math.round(n * 100) : 0) + '%';

export default function ValorizacionF07({ showToast }) {
  const { proyectoActivo, proyectoActivoId } = useProyectoActivo();
  const proyId = proyectoActivoId || proyectoActivo?.id;
  const [presu, setPresu] = useState([]);
  const [avancesOficial, setAvancesOficial] = useState([]); // F07 histórico sembrado
  const [f07Map, setF07Map] = useState({});                 // Prefijos_Catalogo: mkey → prefijo (familia)
  const [verFamilias, setVerFamilias] = useState(true);     // resumen por familia plegable
  const [loading, setLoading] = useState(true);
  const [valSel, setValSel] = useState(null);
  const [fuente, setFuente] = useState('oficial'); // 'oficial' (F07) | 'vivo' (producción)
  const [genPdf, setGenPdf] = useState(false);
  // Avance + Costo Real EN VIVO desde la producción (capataz/sustentos). Siempre activo:
  // el avance se usa en modo "vivo"; el CR (HH×S/25.5) por familia se muestra en ambos modos.
  const { avancesVivo, cobertura } = useAvanceF07Vivo({ proyId, presu });
  const avances = fuente === 'vivo' ? avancesVivo : avancesOficial;

  useEffect(() => {
    if (!proyId) { setPresu([]); setAvancesOficial([]); setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) => {
      const rows = snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyId).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setPresu(rows); setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'ValorizacionF07_Avance'), (snap) => {
      setAvancesOficial(snap.docs.map(d => d.data()).filter(a => a.proyectoId === proyId).sort((a, b) => (a.valN || 0) - (b.valN || 0)));
    });
    // Prefijos designados en OT → Prefijos/Códigos (la LLAVE familia). Si no hay doc, queda {}.
    const u3 = onSnapshot(doc(db, 'Prefijos_Catalogo', proyId), (d) => setF07Map(d.data()?.f07Map || {}));
    return () => { u1(); u2(); u3(); };
  }, [proyId]);

  // Prefijo (familia) de una partida F07: el designado en OT, o el auto-sugerido por código/descripción.
  const prefDeItem = (p) => f07Map[p.mkey] || sugerirPrefijo({ codigo: p.item, descripcion: p.descripcion }).prefijo || '';

  // Valorizaciones disponibles (V-01..V-09 + LIQUIDACIÓN).
  const periodos = useMemo(() => avances.map(a => ({ valN: a.valN, label: a.label || ('V-' + String(a.valN).padStart(2, '0')) })), [avances]);
  const valN = valSel != null ? valSel : (periodos.length ? periodos[periodos.length - 1].valN : 1);
  const periodoActual = periodos.find(p => p.valN === valN) || { valN, label: (fuente === 'vivo' ? 'Q-' : 'V-') + String(valN).padStart(2, '0') };
  const esLiquidacion = /LIQUID/i.test(periodoActual.label);
  const nn = String(valN).padStart(2, '0');
  const tituloPeriodo = fuente === 'vivo' ? `PRODUCCIÓN · QUINCENA N°${nn}` : (esLiquidacion ? 'LIQUIDACIÓN' : `VALORIZACIÓN N°${nn}`);
  const codPeriodo = fuente === 'vivo' ? `Q-${nn}` : (esLiquidacion ? 'LIQ' : nn);

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

  // RESUMEN POR FAMILIA (PREFIJO) — agrupa la valorización REAL por familia: cada
  // partida suma su parcial y su acumulado (S/) a su prefijo. Sin sobre-atribución:
  // cada ítem cuenta UNA vez contra su propio presupuesto (el % es real, ≤ 100%).
  const resumenFamilia = useMemo(() => {
    const fam = {};
    presu.forEach(p => {
      if (!p.esPartida || p.pu == null) return;
      const pref = prefDeItem(p) || '(sin)';
      const e = ejecPorItem[p.mkey] || {};
      const f = (fam[pref] = fam[pref] || { pref, parcial: 0, acum: 0, act: 0, items: 0 });
      f.parcial += (p.cant || 0) * p.pu;
      f.acum += (e.acum || 0) * p.pu;
      f.act += (e.act || 0) * p.pu;
      f.items += 1;
    });
    // CR (Costo Real MO = HH × S/25.5) por familia, desde los tareos (mismo motor de prefijos).
    const cr = cobertura?.crPorPrefijo || {};
    // Incluye familias que solo tienen CR (HH) aunque no tengan partida valorizable (p.ej. indirectos).
    Object.keys(cr).forEach(pref => { if (!fam[pref]) fam[pref] = { pref, parcial: 0, acum: 0, act: 0, items: 0 }; });
    const filas = Object.values(fam)
      .map(f => {
        const crVal = cr[f.pref]?.cr || 0;
        return { ...f, pct: f.parcial > 0 ? f.acum / f.parcial : 0, hh: cr[f.pref]?.hh || 0, cr: crVal, margen: f.acum > 0 ? (f.acum - crVal) / f.acum : 0 };
      })
      .sort((a, b) => b.parcial - a.parcial);
    const sinPrefijo = !Object.keys(f07Map).length;
    return { filas, sinPrefijo };
  }, [presu, ejecPorItem, f07Map, cobertura]);

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
            <p style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, letterSpacing: 0.5 }}>{tituloPeriodo}</p>
          </div>
          <div style={{ borderLeft: `1px solid ${BASE.border}`, fontSize: 10 }}>
            {[['CÓDIGO', 'GP-GCE-FOR-F07'], ['VERSIÓN', '0.00'], [fuente === 'vivo' ? 'QUINCENA N°' : 'VALORIZACIÓN N°', codPeriodo]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', borderBottom: `1px solid ${BASE.border}` }}>
                <span style={{ flex: 1, padding: '5px 8px', fontWeight: 800, color: BASE.muted }}>{k}</span>
                <span style={{ flex: 1, padding: '5px 8px', fontWeight: 800, color: BASE.navy, borderLeft: `1px solid ${BASE.border}` }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0', borderTop: `1px solid ${BASE.border}` }}>
          {[['OBRA', obra], ['CLIENTE', cliente], ['CONTRATISTA', 'GRAPCO SAC'], ['SUPERVISIÓN', proyectoActivo?.supervision || 'Diseños Racionales SAC'], ['DENOMINACIÓN', `PPTO ${obra}`], ['PRESUPUESTO', 'Contractual (PTARI)'], ['UBICACIÓN', ubic], [fuente === 'vivo' ? 'QUINCENA N°' : 'VALORIZACIÓN N°', codPeriodo]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', fontSize: 10.5, borderRight: `1px solid ${BASE.border}`, borderBottom: `1px solid ${BASE.border}` }}>
              <span style={{ padding: '6px 8px', fontWeight: 800, color: BASE.muted, minWidth: 86, background: BASE.bgSoft }}>{k}</span>
              <span style={{ padding: '6px 8px', fontWeight: 700, color: BASE.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 14px', background: BASE.bgSoft }}>
          <p style={{ fontSize: 11, color: BASE.muted }}>
            {presu.filter(p => p.esPartida).length} partidas · valoriza por <b>metrado</b> (Cant × P.U.) · quincenal · {periodos.length || 0} {fuente === 'vivo' ? 'quincenas' : 'valorizaciones'}.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Fuente del metrado: F07 oficial (histórico) o EN VIVO desde producción */}
            <div style={{ display: 'inline-flex', border: `1.5px solid ${BASE.border}`, borderRadius: 9, overflow: 'hidden' }}>
              {[['oficial', '📑 Oficial · F07'], ['vivo', '🟢 En vivo · producción']].map(([f, lbl]) => (
                <button key={f} onClick={() => { setFuente(f); setValSel(null); }}
                  style={{ padding: '7px 12px', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', background: fuente === f ? (f === 'vivo' ? BASE.green : BASE.navy) : BASE.white, color: fuente === f ? '#fff' : BASE.muted }}>{lbl}</button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Ver
              <select value={valN} onChange={e => setValSel(parseInt(e.target.value, 10))} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 13, fontWeight: 800 }}>
                {(periodos.length ? periodos : [{ valN: 1, label: fuente === 'vivo' ? 'Q-01' : 'V-01' }]).map(p => <option key={p.valN} value={p.valN}>{/LIQUID/i.test(p.label) ? 'LIQUIDACIÓN' : `${fuente === 'vivo' ? 'Quincena' : 'Valorización'} N° ${String(p.valN).padStart(2, '0')}`}</option>)}
              </select>
            </label>
            <button
              onClick={async () => {
                setGenPdf(true);
                const r = await generarPDFValorizacionF07({
                  presu, ejecPorItem, tot,
                  meta: { tituloPeriodo, obra, cliente, contratista: 'GRAPCO SAC', supervision: proyectoActivo?.supervision || 'Diseños Racionales SAC', ubicacion: ubic, fuente, fecha: new Date().toLocaleDateString('es-PE') },
                });
                setGenPdf(false);
                if (showToast) showToast(r.ok ? `PDF generado: ${r.nombre}` : 'No se pudo generar el PDF', r.ok ? 'success' : 'error');
              }}
              disabled={genPdf || !presu.length}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: genPdf ? BASE.muted : BASE.gold, color: '#fff', fontSize: 13, fontWeight: 800, cursor: genPdf ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
              {genPdf ? '⏳ Generando…' : '📄 PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs por bloque (S/.) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8 }}>
        <Kpi label="Presupuesto (parcial)" v={soles(tot.parcial)} c={BASE.navy} />
        <Kpi label="Acum. anterior" v={soles(tot.ant)} c={BASE.muted} />
        <Kpi label={`Actual · ${codPeriodo}`} v={soles(tot.act)} c={BASE.gold} />
        <Kpi label="Acumulado" v={soles(tot.acum)} c={BASE.green} />
        <Kpi label="Saldo referencial" v={soles(tot.saldo)} c="#0ea5e9" />
      </div>

      {/* RESUMEN POR FAMILIA (PREFIJO) — la valorización leída por familia (S/ reales) */}
      <ResumenFamilia data={resumenFamilia} abierto={verFamilias} onToggle={() => setVerFamilias(v => !v)} />

      {/* Grilla F07 — panel congelado (estilo Excel): contenedor con scroll propio;
          encabezado fijo arriba (top) + columnas ITEM y DESCRIPCIÓN fijas a la
          izquierda (left). La barra horizontal abajo desliza el resto de columnas. */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'auto', maxHeight: '72vh' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: 1180, width: '100%' }}>
          <thead>
            {/* Fila 1: sticky top:0. ITEM/DESC además sticky left (esquina, z mayor). */}
            <tr style={{ color: '#fff' }}>
              <th rowSpan={2} style={th({ ...COL_ITEM, textAlign: 'left', position: 'sticky', top: 0, left: 0, zIndex: 9, background: BASE.navy, borderRight: FRZ_HEAD })}>ITEM</th>
              <th rowSpan={2} style={th({ ...COL_DESC, textAlign: 'left', position: 'sticky', top: 0, left: W_ITEM, zIndex: 9, background: BASE.navy, borderRight: FRZ_HEAD })}>DESCRIPCIÓN</th>
              <th colSpan={4} style={th({ borderLeft: bd, ...stk(0, 6), height: HR1, boxSizing: 'border-box', background: BASE.navy })}>PRESUPUESTO</th>
              <th colSpan={3} style={th({ borderLeft: bd, ...stk(0, 6), height: HR1, boxSizing: 'border-box', background: '#334155' })}>ACUM. ANTERIOR</th>
              <th colSpan={3} style={th({ borderLeft: bd, ...stk(0, 6), height: HR1, boxSizing: 'border-box', background: BASE.goldDark })}>ACTUAL</th>
              <th colSpan={3} style={th({ borderLeft: bd, ...stk(0, 6), height: HR1, boxSizing: 'border-box', background: '#15803d' })}>ACUMULADO</th>
              <th colSpan={3} style={th({ borderLeft: bd, ...stk(0, 6), height: HR1, boxSizing: 'border-box', background: '#0369a1' })}>SALDO REF.</th>
            </tr>
            <tr style={{ color: '#fff' }}>
              {['UND', 'CANT', 'P.U.', 'PARCIAL'].map((h, i) => <th key={h} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: i === 0 ? 'center' : 'right', ...stk(HR1, 5), background: BASE.navyDark })}>{h}</th>)}
              {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'a' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right', ...stk(HR1, 5), background: BASE.navyDark })}>{h}</th>)}
              {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'b' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right', ...stk(HR1, 5), background: BASE.navyDark })}>{h}</th>)}
              {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'c' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right', ...stk(HR1, 5), background: BASE.navyDark })}>{h}</th>)}
              {['CANT', '%', 'TOTAL'].map((h, i) => <th key={'d' + h + i} style={th({ borderLeft: i === 0 ? bd : 'none', textAlign: 'right', ...stk(HR1, 5), background: BASE.navyDark })}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {presu.map((p, idx) => {
              if (!p.esPartida) {
                // Título / subtítulo → fila de grupo (ámbar). Texto fijo a la izquierda.
                const titulo = p.nivel <= 1;
                const bg = titulo ? BASE.gold : BASE.goldLight, col = titulo ? '#fff' : BASE.navy;
                return (
                  <tr key={idx}>
                    <td style={{ ...COL_ITEM, padding: '6px 8px', fontWeight: 900, color: col, position: 'sticky', left: 0, zIndex: 4, background: bg }}>{p.item}</td>
                    <td colSpan={17} style={{ padding: '6px 8px', fontWeight: 900, color: col, letterSpacing: titulo ? '0.4px' : 0, position: 'sticky', left: W_ITEM, zIndex: 4, background: bg, borderRight: FRZ }}>{p.descripcion}</td>
                  </tr>
                );
              }
              const pu = p.pu || 0; const cantP = p.cant || 0; const parcial = cantP * pu;
              const e = ejecPorItem[p.mkey] || { ant: 0, act: 0, acum: 0 };
              const saldoCant = cantP - e.acum;
              const cerrada = p.cerrada || (cantP > 0 && e.acum >= cantP - 0.001);
              const rb = idx % 2 ? BASE.bgSoft : BASE.white;
              const pref = prefDeItem(p);
              return (
                <tr key={idx} style={{ background: rb }}>
                  <td style={td({ ...COL_ITEM, fontFamily: 'monospace', color: BASE.navy, fontWeight: 700, position: 'sticky', left: 0, zIndex: 3, background: rb })}>{p.item}</td>
                  <td style={td({ ...COL_DESC, textAlign: 'left', whiteSpace: 'normal', position: 'sticky', left: W_ITEM, zIndex: 3, background: rb, borderRight: FRZ })}>{p.descripcion}
                    {pref && <span title={`Familia ${familiaDe(pref)}`} style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 800, fontFamily: 'monospace', color: '#fff', background: colorPrefijo(pref), padding: '1px 5px', borderRadius: 4, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{pref}</span>}
                    {cerrada && <span style={{ marginLeft: 6, fontSize: 9, color: BASE.green, fontWeight: 800 }}>● cerrada</span>}</td>
                  {/* Presupuesto */}
                  <td style={td({ textAlign: 'center', borderLeft: bdL })}>{p.und}</td>
                  <td style={td({ textAlign: 'right' })}>{cant(cantP)}</td>
                  <td style={td({ textAlign: 'right' })}>{soles(pu)}</td>
                  <td style={td({ textAlign: 'right', fontWeight: 700 })}>{soles(parcial)}</td>
                  {bloque(e.ant, cantP, pu, bdL, BASE.muted)}
                  {bloque(e.act, cantP, pu, bdL, BASE.goldDark, e.act > 0)}
                  {bloque(e.acum, cantP, pu, bdL, BASE.green, e.acum > 0)}
                  {bloque(saldoCant, cantP, pu, bdL, '#0369a1')}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* TOTALES — fijo abajo (bottom) y la etiqueta fija a la izquierda. */}
            <tr style={{ color: '#fff' }}>
              <td colSpan={5} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, position: 'sticky', bottom: 0, left: 0, zIndex: 8, background: BASE.navy }}>TOTALES (S/.)</td>
              <td style={{ ...foot, borderLeft: bd }}>{soles(tot.parcial)}</td>
              <td colSpan={2} style={{ ...foot, borderLeft: bd }} />
              <td style={foot}>{soles(tot.ant)}</td>
              <td colSpan={2} style={{ ...foot, borderLeft: bd }} />
              <td style={{ ...foot, color: '#fde68a' }}>{soles(tot.act)}</td>
              <td colSpan={2} style={{ ...foot, borderLeft: bd }} />
              <td style={{ ...foot, color: '#86efac' }}>{soles(tot.acum)}</td>
              <td colSpan={2} style={{ ...foot, borderLeft: bd }} />
              <td style={{ ...foot, color: '#7dd3fc' }}>{soles(tot.saldo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {fuente === 'oficial' && (
        <p style={{ fontSize: 10.5, color: BASE.muted }}>
          ◆ <b>Oficial (F07):</b> el <b>metrado de avance</b> proviene del <b>ISP</b> (cantidad ejecutada por partida), agrupado por quincena → cada valorización. <b>Actual</b> = acumulado de la val − acumulado de la anterior · <b>Saldo</b> = Cant − Acumulado. {!avances.length && <span style={{ color: BASE.gold, fontWeight: 800 }}>· Aún no se han cargado los avances de este proyecto.</span>}
        </p>
      )}
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

// Resumen de la valorización agrupado por FAMILIA (prefijo). Números REALES del F07:
// cada familia muestra su acumulado (S/) y el % ejecutado de su propio presupuesto (≤100%).
// Reemplaza la antigua tira de "cobertura" (que sobre-atribuía el metrado en vivo).
function ResumenFamilia({ data, abierto, onToggle }) {
  const { filas, sinPrefijo } = data;
  const conData = filas.filter(f => f.parcial > 0 || f.cr > 0);
  if (!conData.length) return null;
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: abierto ? 8 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onToggle} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 900, color: BASE.navy, letterSpacing: 0.4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {abierto ? '▾' : '▸'} 🔑 RESUMEN POR FAMILIA (PREFIJO)
        </button>
        <span style={{ fontSize: 10.5, color: BASE.muted }}>· {conData.length} familia(s) · Vendido vs Costo Real (MO) por familia</span>
        {sinPrefijo && <span style={{ marginLeft: 'auto', fontSize: 10, color: BASE.gold, fontWeight: 700 }}>⚠ Prefijos auto-sugeridos — afínalos en OT → Prefijos / Códigos.</span>}
      </div>
      {abierto && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {conData.map(f => {
            const c = f.pref === '(sin)' ? BASE.muted : colorPrefijo(f.pref);
            return (
              <div key={f.pref} title={`${f.pref === '(sin)' ? 'Sin familia' : familiaDe(f.pref)} · ${f.items} ítem(s) · ${soles(f.acum)} de ${soles(f.parcial)}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130, padding: '7px 10px', borderRadius: 9, border: `1px solid ${BASE.border}`, borderLeft: `4px solid ${c}`, background: BASE.bgSoft }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b style={{ fontSize: 11, fontFamily: 'monospace', color: c }}>{f.pref}</b>
                  <span style={{ marginLeft: 'auto', fontSize: 9.5, color: BASE.muted, fontWeight: 800 }}>{Math.round(f.pct * 100)}%</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: BASE.green, fontFamily: 'monospace' }}>{soles(f.acum)}</span>
                <div style={{ height: 4, borderRadius: 3, background: BASE.border, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round(f.pct * 100))}%`, height: '100%', background: c }} />
                </div>
                {/* Costo Real (MO) = HH × S/25.5 de los tareos + margen MO sobre lo valorizado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4, marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: BASE.muted }}>CR MO <b style={{ color: BASE.navy, fontFamily: 'monospace' }}>{soles(f.cr)}</b></span>
                  {f.acum > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: f.margen >= 0 ? BASE.green : BASE.red }}>Mg {Math.round(f.margen * 100)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const bd = '2px solid rgba(255,255,255,0.35)';
const bdL = `2px solid ${BASE.border}`;
const HR1 = 26; // alto de la 1ª fila del encabezado (px) = top de la 2ª fila sticky
const W_ITEM = 64;                 // ancho fijo columna ITEM (congelada)
const COL_ITEM = { width: W_ITEM, minWidth: W_ITEM, maxWidth: W_ITEM, boxSizing: 'border-box' };
const COL_DESC = { width: 248, minWidth: 248, maxWidth: 248, boxSizing: 'border-box' }; // DESCRIPCIÓN (congelada)
const FRZ = `2px solid ${BASE.border}`;            // divisor del panel congelado (cuerpo)
const FRZ_HEAD = '2px solid rgba(255,255,255,0.25)'; // divisor en el encabezado oscuro
const foot = { padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, position: 'sticky', bottom: 0, zIndex: 7, background: BASE.navy };
const stk = (top, zIndex = 5) => ({ position: 'sticky', top, zIndex });
const th = (extra = {}) => ({ padding: '6px 8px', fontSize: 9, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap', textAlign: 'center', ...extra });
const td = (extra = {}) => ({ padding: '5px 8px', fontSize: 10.5, color: BASE.text, whiteSpace: 'nowrap', borderBottom: `1px solid ${BASE.border}`, ...extra });
