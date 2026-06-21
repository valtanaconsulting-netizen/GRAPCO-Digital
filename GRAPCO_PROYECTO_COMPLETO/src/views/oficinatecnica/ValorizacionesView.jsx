// src/views/oficinatecnica/ValorizacionesView.jsx — Valorizaciones al cliente (F07)
// Réplica del GP-GCE-FOR-F07: por partida 1001-1018 (Ppto · Período · Acumulado · Saldo · %)
// + liquidación (Valorización Bruta → Adelanto → IGV → Retención FG 5% → Detracción 4%).
//
// CONVERSA con todo: el Presupuesto (Ppto contractual, vía usePresupuestoContractual) define
// el techo por partida; cada valorización guarda partidasValorizadas[{codigo, montoBruto}] en
// ValorizacionesContractuales, que el motor del RO lee como EARNED VALUE (EV) acumulado.
// El valorizado por partida está en nivel COSTO DIRECTO (mismas unidades que el BAC del RO);
// la cara-venta (CD+GG+Utilidad+IGV) se arma solo para la liquidación al cliente.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { fmtSoles } from '../../utils/calidadOTAnalytics';
import usePresupuestoContractual from '../../hooks/usePresupuestoContractual';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pctTxt = (n) => `${Math.round(Number(n) || 0)}%`;

export default function ValorizacionesView({ showToast }) {
  const { user } = useAuth();
  const { proyId, isLegacy, partidas, totales: tP, usandoBase } = usePresupuestoContractual();

  const [vals, setVals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [verVal, setVerVal] = useState(null);

  // ── Valorizaciones del proyecto (aisladas) ────────────────────────
  useEffect(() => {
    if (!proyId) { setVals([]); setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'ValorizacionesContractuales'),
      (snap) => {
        const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const mias = todas.filter((v) => v.proyectoId === proyId || (!v.proyectoId && isLegacy));
        mias.sort((a, b) => (a.numeroValorizacion || 0) - (b.numeroValorizacion || 0));
        setVals(mias); setLoading(false);
      },
      (e) => { console.warn('[Valorizaciones]', e); setLoading(false); });
    return () => unsub();
  }, [proyId, isLegacy]);

  // CD contractual por partida (techo) — combinado F1 + F2.
  const cdPorCodigo = useMemo(() => {
    const m = new Map();
    partidas.forEach((p) => m.set(String(p.codigo), { descripcion: p.descripcion, cd: round2((p.montoF1 || 0) + (p.montoF2 || 0)) }));
    return m;
  }, [partidas]);
  const cdContractual = tP.cd;

  // Acumulado valorizado (CD) por código, sumando TODAS las valorizaciones no anuladas.
  const acumPorCodigo = useMemo(() => {
    const m = new Map();
    vals.filter((v) => v.estado !== 'anulada').forEach((v) => {
      (v.partidasValorizadas || []).forEach((it) => {
        const c = String(it.codigo);
        m.set(c, round2((m.get(c) || 0) + (Number(it.montoBruto) || 0)));
      });
    });
    return m;
  }, [vals]);

  const acumTotal = useMemo(() => [...acumPorCodigo.values()].reduce((s, x) => s + x, 0), [acumPorCodigo]);
  const pctAvanceAcum = cdContractual > 0 ? (acumTotal / cdContractual) * 100 : 0;
  const proximoNumero = useMemo(() => Math.max(0, ...vals.map((v) => v.numeroValorizacion || 0)) + 1, [vals]);

  // ── Avance FÍSICO por metrado: contractual (lo ingresa OT) vs ejecutado
  //    (suma de los sustentos de metrado por código) → % físico que sugiere la
  //    valorización. Cierra el ciclo metrado → avance → valorización. ──────────
  const [metrContr, setMetrContr] = useState({});   // codigo -> { metrado, unidad }
  const [sustentos, setSustentos] = useState([]);
  useEffect(() => {
    if (!proyId) { setMetrContr({}); setSustentos([]); return; }
    const u1 = onSnapshot(collection(db, 'MetradosContractuales'), (snap) => {
      const m = {};
      snap.docs.forEach((d) => { const x = d.data(); if (x.proyectoId === proyId) m[String(x.codigo)] = { metrado: Number(x.metrado) || 0, unidad: x.unidad || '' }; });
      setMetrContr(m);
    }, (e) => console.warn('[MetradosContractuales]', e));
    const u2 = onSnapshot(collection(db, 'SustentoMetrados'), (snap) => {
      setSustentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => !s.proyectoId || s.proyectoId === proyId));
    }, (e) => console.warn('[SustentoMetrados]', e));
    return () => { u1(); u2(); };
  }, [proyId]);

  const ejecPorCodigo = useMemo(() => {
    const m = {};
    sustentos.forEach((s) => { const c = String(s.codigoPartida || '').trim(); if (!c) return; m[c] = round2((m[c] || 0) + (Number(s.metrado) || 0)); });
    return m;
  }, [sustentos]);

  const pctFisicoPorCodigo = useMemo(() => {
    const m = {};
    Object.entries(metrContr).forEach(([c, v]) => { if (v.metrado > 0) m[c] = Math.min(100, ((ejecPorCodigo[c] || 0) / v.metrado) * 100); });
    return m;
  }, [metrContr, ejecPorCodigo]);

  const guardarMetrContr = async (codigo, descripcion, campo, valor) => {
    if (!proyId) return;
    const prev = metrContr[codigo] || {};
    try {
      await setDoc(doc(db, 'MetradosContractuales', `${proyId}__${codigo}`), {
        proyectoId: proyId, codigo: String(codigo), descripcion: descripcion || '',
        metrado: campo === 'metrado' ? (Number(valor) || 0) : (prev.metrado || 0),
        unidad: campo === 'unidad' ? valor : (prev.unidad || ''),
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
    } catch (e) { showToast?.('Error guardando metrado contractual: ' + e.message, 'error'); }
  };

  // Filas de la vista general (F07 hoja 5.RO): por partida con presupuesto.
  const filas = useMemo(() => {
    const arr = [];
    cdPorCodigo.forEach((info, codigo) => {
      if (info.cd <= 0.005) return;
      const acum = acumPorCodigo.get(codigo) || 0;
      arr.push({ codigo, descripcion: info.descripcion, cd: info.cd, acum, saldo: round2(info.cd - acum), pct: info.cd > 0 ? (acum / info.cd) * 100 : 0 });
    });
    return arr.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
  }, [cdPorCodigo, acumPorCodigo]);

  const cambiarEstado = async (v, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'ValorizacionesContractuales', v.id), {
        estado: nuevoEstado, actualizadoEn: serverTimestamp(), actualizadoPor: user?.email || 'desconocido',
      });
      showToast?.(`✅ V-${v.numeroValorizacion} → ${nuevoEstado}`, 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  if (!proyId) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando valorizaciones…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: BASE.navy }}>Valorizaciones al cliente · F07</p>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            {vals.length} valorizaciones · Acumulado <strong>{fmtSoles(acumTotal)}</strong> de <strong>{fmtSoles(cdContractual)}</strong> (CD) · avance <strong style={{ color: BASE.navy }}>{pctTxt(pctAvanceAcum)}</strong>
          </p>
        </div>
        <button onClick={() => setCreando(true)} disabled={!filas.length} style={{ ...btn(BASE.gold, BASE.goldDark), opacity: filas.length ? 1 : 0.5 }}>➕ NUEVA VALORIZACIÓN</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <Kpi label="Presupuesto (CD)" valor={fmtSoles(cdContractual)} color={BASE.navy} />
        <Kpi label="Valorizado acumulado" valor={fmtSoles(acumTotal)} color={BASE.green} />
        <Kpi label="Por valorizar (saldo)" valor={fmtSoles(round2(cdContractual - acumTotal))} color={BASE.gold} />
        <Kpi label="Avance acumulado" valor={pctTxt(pctAvanceAcum)} color="#0ea5e9" />
      </div>

      {usandoBase && (
        <p style={{ fontSize: 10, color: BASE.goldDark, fontWeight: 700 }}>
          ◆ Techo por partida desde el Presupuesto contractual CREDITEX. Cada valorización descuenta del saldo y alimenta el EV del RO.
        </p>
      )}

      {/* Lista de valorizaciones */}
      {vals.length > 0 && (
        <Card titulo="Valorizaciones emitidas">
          <div style={{ overflowX: 'auto' }}>
            <table style={tabla}>
              <thead><tr style={trHead}>
                <th style={th()}>N°</th><th style={th()}>Período</th>
                <th style={th({ textAlign: 'right' })}>Valorizado (CD)</th>
                <th style={th({ textAlign: 'right' })}>A facturar</th>
                <th style={th({ textAlign: 'right' })}>A pagar</th>
                <th style={th({ textAlign: 'center' })}>Estado</th>
                <th style={th({ textAlign: 'center' })}>Acción</th>
              </tr></thead>
              <tbody>
                {vals.map((v, i) => {
                  const col = v.estado === 'pagada' ? BASE.green : v.estado === 'aprobada' ? '#2563eb' : v.estado === 'enviada' ? '#7c3aed' : v.estado === 'anulada' ? BASE.muted : BASE.gold;
                  return (
                    <tr key={v.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontWeight: 900, color: BASE.navy, fontFamily: 'monospace' }}>V-{v.numeroValorizacion}</td>
                      <td style={{ ...td(), fontSize: 11 }}>{v.periodoTexto || '—'}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmtSoles(v.cdPeriodo)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(v.totalAFacturar)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{fmtSoles(v.totalAPagar)}</td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <span style={{ background: col, color: '#fff', padding: '3px 9px', borderRadius: 10, fontSize: 9.5, fontWeight: 900 }}>{(v.estado || 'borrador').toUpperCase()}</span>
                      </td>
                      <td style={{ ...td(), textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setVerVal(v)} style={miniBtn(BASE.navy)}>VER</button>
                        {v.estado === 'borrador' && <button onClick={() => cambiarEstado(v, 'enviada')} style={{ ...miniBtn('#7c3aed'), marginLeft: 5 }}>ENVIAR</button>}
                        {v.estado === 'enviada' && <button onClick={() => cambiarEstado(v, 'aprobada')} style={{ ...miniBtn('#2563eb'), marginLeft: 5 }}>APROBAR</button>}
                        {v.estado === 'aprobada' && <button onClick={() => cambiarEstado(v, 'pagada')} style={{ ...miniBtn(BASE.green), marginLeft: 5 }}>PAGAR</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vista general por partida (F07 hoja 5.RO) */}
      {filas.length === 0 ? (
        <EmptyState icono="💰" titulo="Sin presupuesto para valorizar"
          descripcion="Carga el presupuesto contractual (módulo Presupuesto) y luego emite valorizaciones por partida." />
      ) : (
        <Card titulo="Avance valorizado por partida (vs presupuesto) + metrado físico">
          <div style={{ padding: '0 8px 8px' }}>
            <p style={{ fontSize: 10, color: BASE.muted }}>
              📐 <b>Metrado contractual</b> = cantidad meta por partida (la ingresas una vez). <b>Ejecutado</b> = suma de los sustentos de metrado. <b>% físico</b> alimenta la valorización.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tabla}>
              <thead><tr style={trHead}>
                <th style={th()}>Código</th><th style={th()}>Descripción</th>
                <th style={th({ textAlign: 'right' })}>Ppto (CD)</th>
                <th style={th({ textAlign: 'right' })}>Valorizado acum.</th>
                <th style={th({ textAlign: 'right' })}>% val.</th>
                <th style={th({ textAlign: 'center' })}>Metrado contr.</th>
                <th style={th({ textAlign: 'right' })}>Ejecutado</th>
                <th style={th({ textAlign: 'right' })}>% físico</th>
              </tr></thead>
              <tbody>
                {filas.map((f, i) => {
                  const mc = metrContr[f.codigo] || {};
                  const ejec = ejecPorCodigo[f.codigo] || 0;
                  const pctFis = pctFisicoPorCodigo[f.codigo];
                  return (
                  <tr key={f.codigo} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{f.codigo}</td>
                    <td style={{ ...td(), fontWeight: 700 }}>{f.descripcion}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(f.cd)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.green, fontWeight: 700 }}>{fmtSoles(f.acum)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: f.pct >= 99.5 ? BASE.green : BASE.muted }}>{pctTxt(f.pct)}</td>
                    <td style={{ ...td(), textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <MetradoContrInput codigo={f.codigo} descripcion={f.descripcion}
                        valor={mc.metrado} unidad={mc.unidad} onGuardar={guardarMetrContr} />
                    </td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: ejec > 0 ? BASE.navy : BASE.muted }}>
                      {ejec > 0 ? `${ejec.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${mc.unidad || ''}` : '—'}
                    </td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: pctFis == null ? BASE.muted : pctFis >= 99.5 ? BASE.green : BASE.gold }}>
                      {pctFis == null ? '—' : pctTxt(pctFis)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot><tr style={{ background: BASE.navy, color: '#fff' }}>
                <td colSpan={2} style={{ padding: '11px 14px', fontWeight: 900, textAlign: 'right' }}>TOTAL COSTO DIRECTO</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>{fmtSoles(cdContractual)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#4ade80' }}>{fmtSoles(acumTotal)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.gold }}>{pctTxt(pctAvanceAcum)}</td>
                <td colSpan={3} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontSize: 10, opacity: 0.85 }}>Saldo CD: {fmtSoles(round2(cdContractual - acumTotal))}</td>
              </tr></tfoot>
            </table>
          </div>
        </Card>
      )}

      {creando && (
        <Modal onClose={() => setCreando(false)} maxW="980px">
          <NuevaValorizacion
            proyId={proyId} user={user} numero={proximoNumero}
            filas={filas} acumPorCodigo={acumPorCodigo}
            pctFisicoPorCodigo={pctFisicoPorCodigo}
            ggPct={tP.ggPct} utilidadPct={tP.utilidadPct} igvPct={tP.igvPct}
            onClose={() => setCreando(false)} showToast={showToast}
          />
        </Modal>
      )}

      {verVal && (
        <Modal onClose={() => setVerVal(null)} maxW="900px">
          <DetalleValorizacion v={verVal} />
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// NUEVA VALORIZACIÓN — % avance acumulado por partida → período + liquidación
// ════════════════════════════════════════════════════════════════════
function NuevaValorizacion({ proyId, user, numero, filas, acumPorCodigo, pctFisicoPorCodigo = {}, ggPct, utilidadPct, igvPct, onClose, showToast }) {
  const [periodoTexto, setPeriodoTexto] = useState(`Valorización N°${numero}`);
  const [adelanto, setAdelanto] = useState(0);
  const [fgPct, setFgPct] = useState(5);
  const [detraccionPct, setDetraccionPct] = useState(4);
  const [guardando, setGuardando] = useState(false);
  // pct acumulado nuevo por código (default = % actual)
  const [pctAcum, setPctAcum] = useState(() => {
    const o = {};
    filas.forEach((f) => { o[f.codigo] = Math.round((f.cd > 0 ? (f.acum / f.cd) * 100 : 0) * 10) / 10; });
    return o;
  });

  // Trae el % desde el avance FÍSICO de metrados (ejecutado ÷ contractual).
  const hayMetrados = Object.keys(pctFisicoPorCodigo).length > 0;
  const usarPctFisico = () => {
    let n = 0;
    setPctAcum((prev) => {
      const o = { ...prev };
      filas.forEach((f) => { const p = pctFisicoPorCodigo[f.codigo]; if (p != null) { o[f.codigo] = Math.round(p * 10) / 10; n++; } });
      return o;
    });
    showToast?.(n ? `📐 % tomado del metrado físico en ${n} partida(s)` : 'No hay metrado contractual cargado todavía', n ? 'success' : 'warning');
  };

  const lineas = useMemo(() => filas.map((f) => {
    const antCD = acumPorCodigo.get(f.codigo) || 0;
    const pct = Math.max(0, Math.min(100, Number(pctAcum[f.codigo]) || 0));
    const acumNuevoCD = round2((pct / 100) * f.cd);
    const periodoCD = round2(acumNuevoCD - antCD);
    return { codigo: f.codigo, descripcion: f.descripcion, cd: f.cd, antCD, pct, acumNuevoCD, periodoCD };
  }), [filas, pctAcum, acumPorCodigo]);

  const cdPeriodo = round2(lineas.reduce((s, l) => s + l.periodoCD, 0));
  // Cara venta del período: CD × (1 + GG% + Utilidad%)
  const factorVenta = 1 + (ggPct / 100) + (utilidadPct / 100);
  const vbBruta = round2(cdPeriodo * factorVenta);
  const liqNeta = round2(vbBruta - (Number(adelanto) || 0));
  const igv = round2(liqNeta * (igvPct / 100));
  const subtotalAPagar = round2(liqNeta + igv);
  const fg = round2(subtotalAPagar * ((Number(fgPct) || 0) / 100));
  const detraccion = round2(subtotalAPagar * ((Number(detraccionPct) || 0) / 100));
  const totalAPagar = round2(subtotalAPagar - fg - detraccion);

  const guardar = async () => {
    if (cdPeriodo === 0) { showToast?.('No hay avance del período (todas las partidas iguales al acumulado)', 'error'); return; }
    setGuardando(true);
    try {
      const data = {
        proyectoId: proyId,
        numeroValorizacion: numero,
        periodoTexto: periodoTexto.trim() || `Valorización N°${numero}`,
        estado: 'borrador',
        partidasValorizadas: lineas
          .filter((l) => Math.abs(l.periodoCD) > 0.005)
          .map((l) => ({ codigo: l.codigo, descripcion: l.descripcion, montoBruto: l.periodoCD, pctAcum: l.pct, acumuladoCD: l.acumNuevoCD })),
        cdPeriodo, ggPct, utilidadPct, igvPct,
        vbBruta, amortizacionAdelanto: Number(adelanto) || 0,
        liqNeta, igv, subtotalAPagar,
        fgPct: Number(fgPct) || 0, fg, detraccionPct: Number(detraccionPct) || 0, detraccion,
        totalAFacturar: subtotalAPagar, totalAPagar,
        creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
      };
      await addDoc(collection(db, 'ValorizacionesContractuales'), data);
      showToast?.(`✅ Valorización V-${numero} creada (${fmtSoles(cdPeriodo)} CD)`, 'success');
      onClose?.();
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy }}>Nueva valorización · V-{numero}</h3>
          <p style={{ fontSize: 11.5, color: BASE.muted, marginTop: 2 }}>Ajusta el <b>% de avance acumulado</b> por partida. El período se calcula contra lo ya valorizado y alimenta el EV del RO.</p>
        </div>
        {hayMetrados && (
          <button onClick={usarPctFisico} title="Toma el % desde el metrado ejecutado ÷ contractual" style={{
            ...btn(BASE.navy, BASE.navyDark), flexShrink: 0,
          }}>📐 USAR % DE METRADOS</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <Campo label="Período"><input value={periodoTexto} onChange={(e) => setPeriodoTexto(e.target.value)} style={inpS} /></Campo>
        <Campo label="Amort. Adelanto (S/)"><input type="number" step="0.01" value={adelanto} onChange={(e) => setAdelanto(e.target.value)} style={inpS} /></Campo>
        <Campo label="Retención FG (%)"><input type="number" step="0.1" value={fgPct} onChange={(e) => setFgPct(e.target.value)} style={inpS} /></Campo>
        <Campo label="Detracción (%)"><input type="number" step="0.1" value={detraccionPct} onChange={(e) => setDetraccionPct(e.target.value)} style={inpS} /></Campo>
      </div>

      {/* Tabla por partida */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '40vh', overflowY: 'auto' }}>
          <table style={tabla}>
            <thead style={{ position: 'sticky', top: 0 }}><tr style={trHead}>
              <th style={th()}>Código</th><th style={th()}>Descripción</th>
              <th style={th({ textAlign: 'right' })}>Ppto CD</th>
              <th style={th({ textAlign: 'right' })}>% acum. ant.</th>
              <th style={th({ textAlign: 'right' })}>% físico</th>
              <th style={th({ textAlign: 'center' })}>% acum. nuevo</th>
              <th style={th({ textAlign: 'right' })}>Período (CD)</th>
            </tr></thead>
            <tbody>
              {lineas.map((l, i) => {
                const pFis = pctFisicoPorCodigo[l.codigo];
                return (
                <tr key={l.codigo} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                  <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{l.codigo}</td>
                  <td style={{ ...td(), fontSize: 11 }}>{l.descripcion}</td>
                  <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(l.cd)}</td>
                  <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{pctTxt(l.cd > 0 ? (l.antCD / l.cd) * 100 : 0)}</td>
                  <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: pFis == null ? BASE.muted : BASE.gold, cursor: pFis == null ? 'default' : 'pointer' }}
                      title={pFis == null ? 'Sin metrado contractual' : 'Click para usar este %'}
                      onClick={() => { if (pFis != null) setPctAcum((s) => ({ ...s, [l.codigo]: Math.round(pFis * 10) / 10 })); }}>
                    {pFis == null ? '—' : pctTxt(pFis)}
                  </td>
                  <td style={{ ...td(), textAlign: 'center' }}>
                    <input type="number" step="0.1" min="0" max="100" value={pctAcum[l.codigo]}
                      onChange={(e) => setPctAcum((s) => ({ ...s, [l.codigo]: e.target.value }))}
                      style={{ width: 64, padding: '5px 7px', borderRadius: 6, border: `1.5px solid ${BASE.border}`, fontSize: 11.5, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }} />
                  </td>
                  <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: l.periodoCD < 0 ? BASE.red : BASE.navy }}>{fmtSoles(l.periodoCD)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liquidación */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <Kpi label="Valorizado período (CD)" valor={fmtSoles(cdPeriodo)} color={BASE.navy} chico />
        <Kpi label={`Val. Bruta (CD+GG+Util)`} valor={fmtSoles(vbBruta)} color="#7c3aed" chico />
        <Kpi label={`+ IGV ${pctTxt(igvPct)}`} valor={fmtSoles(igv)} color="#0ea5e9" chico />
        <Kpi label="A facturar" valor={fmtSoles(subtotalAPagar)} color={BASE.green} chico />
        <Kpi label={`− FG ${pctTxt(fgPct)} − Detr ${pctTxt(detraccionPct)}`} valor={`-${fmtSoles(fg + detraccion)}`} color={BASE.red} chico />
        <Kpi label="TOTAL A PAGAR" valor={fmtSoles(totalAPagar)} color={BASE.gold} chico />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSec}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{ ...btn(BASE.gold, BASE.goldDark), opacity: guardando ? 0.5 : 1 }}>
          {guardando ? '⏳ Guardando…' : `💾 EMITIR V-${numero}`}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DETALLE de una valorización emitida
// ════════════════════════════════════════════════════════════════════
function DetalleValorizacion({ v }) {
  const liq = [
    ['Valorización Bruta (CD+GG+Utilidad)', v.vbBruta, false],
    ['(−) Amortización de Adelanto', -(v.amortizacionAdelanto || 0), false],
    ['Liquidación Neta', v.liqNeta, true],
    [`(+) IGV ${pctTxt(v.igvPct)}`, v.igv, false],
    ['Subtotal a facturar', v.totalAFacturar, 'meta'],
    [`(−) Retención FG ${pctTxt(v.fgPct)}`, -(v.fg || 0), false],
    [`(−) Detracción ${pctTxt(v.detraccionPct)}`, -(v.detraccion || 0), false],
    ['TOTAL A PAGAR', v.totalAPagar, 'total'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontSize: 17, fontWeight: 900, color: BASE.navy }}>Valorización V-{v.numeroValorizacion} · {v.periodoTexto}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(240px, 0.9fr)', gap: 12 }}>
        <Card titulo={`Partidas valorizadas (${v.partidasValorizadas?.length || 0})`}>
          <div style={{ overflowX: 'auto', maxHeight: '50vh', overflowY: 'auto' }}>
            <table style={tabla}>
              <thead style={{ position: 'sticky', top: 0 }}><tr style={trHead}><th style={th()}>Cód.</th><th style={th()}>Descripción</th><th style={th({ textAlign: 'right' })}>Período (CD)</th><th style={th({ textAlign: 'right' })}>% acum.</th></tr></thead>
              <tbody>
                {(v.partidasValorizadas || []).map((p, i) => (
                  <tr key={i} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{p.codigo}</td>
                    <td style={{ ...td(), fontSize: 11 }}>{p.descripcion}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmtSoles(p.montoBruto)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{pctTxt(p.pctAcum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card titulo="Liquidación">
          <table style={tabla}><tbody>
            {liq.map(([etq, val, tipo]) => (
              <tr key={etq} style={{ borderBottom: `1px solid ${BASE.border}`, background: tipo === 'total' ? BASE.goldSoft : tipo === 'meta' ? BASE.navySoft : 'transparent' }}>
                <td style={{ ...td(), fontWeight: tipo ? 900 : 700, color: tipo === 'total' ? BASE.goldDark : BASE.text }}>{etq}</td>
                <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: tipo === 'total' ? 14 : 12.5, color: tipo === 'total' ? BASE.goldDark : (val < 0 ? BASE.red : BASE.text) }}>{fmtSoles(val)}</td>
              </tr>
            ))}
          </tbody></table>
        </Card>
      </div>
    </div>
  );
}

// Input inline del metrado CONTRACTUAL por partida (cantidad + unidad). Guarda
// onBlur para no escribir en cada tecla. Estado local para fluidez.
function MetradoContrInput({ codigo, descripcion, valor, unidad, onGuardar }) {
  const [m, setM] = useState(valor != null ? String(valor) : '');
  const [u, setU] = useState(unidad || '');
  useEffect(() => { setM(valor != null ? String(valor) : ''); }, [valor]);
  useEffect(() => { setU(unidad || ''); }, [unidad]);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input value={m} inputMode="decimal" placeholder="meta"
        onChange={(e) => setM(e.target.value)}
        onBlur={() => onGuardar(codigo, descripcion, 'metrado', m)}
        style={{ width: 62, padding: '5px 6px', borderRadius: 6, border: `1.5px solid ${BASE.border}`, fontSize: 11, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }} />
      <input value={u} placeholder="und"
        onChange={(e) => setU(e.target.value)}
        onBlur={() => onGuardar(codigo, descripcion, 'unidad', u)}
        style={{ width: 42, padding: '5px 5px', borderRadius: 6, border: `1.5px solid ${BASE.border}`, fontSize: 10.5, fontWeight: 600, textAlign: 'center' }} />
    </span>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────
function Kpi({ label, valor, color, chico }) {
  return (
    <div style={{ background: color + '12', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? 14 : 16, fontWeight: 900, color, marginTop: 2, fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}
function Card({ titulo, children }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy, letterSpacing: 0.3 }}>{titulo}</p>
      </div>
      <div style={{ padding: '4px 6px' }}>{children}</div>
    </div>
  );
}
function Campo({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 9.5, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

const tabla = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 };
const trHead = { background: BASE.navy, color: '#fff' };
const th = (extra = {}) => ({ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '8px 12px', fontSize: 12, color: BASE.text, verticalAlign: 'top', ...extra });
const inpS = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 12.5, fontWeight: 600, background: '#fff', boxSizing: 'border-box' };
const btn = (c1, c2) => ({ padding: '10px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${c1}, ${c2})`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.4, boxShadow: `0 4px 12px ${c1}44` });
const btnSec = { padding: '10px 20px', borderRadius: 8, background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const miniBtn = (c) => ({ padding: '5px 10px', borderRadius: 6, background: c, color: '#fff', border: 'none', fontSize: 10, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.3 });
