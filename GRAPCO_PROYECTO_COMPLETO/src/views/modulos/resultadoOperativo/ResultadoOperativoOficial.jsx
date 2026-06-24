// src/views/modulos/resultadoOperativo/ResultadoOperativoOficial.jsx
// RO Oficial (formato GP-GCE-FOR-F06) — réplica fiel del Excel maestro, EN VIVO.
//
// Estructura de columnas idéntica al F06:
//   FRENTE · PARTIDA · Descripción
//   PRESUPUESTO        → Ppto F1 · Ppto F2 · Deductivos · Adicionales · Ppto Total (BAC)
//   PROGRAMADO (PV)    → PV F1 · PV F2 · PV Deductivos · PV Adicionales · Plan Value
//   VALORIZADO (EV)    → Val F1 · Val F2 · Val Deductivos · Val Adicionales · Earned Value
//   COSTO REAL         → ISP (HH) · Real (AC) · Margen (CV) · CPI
//   ESTIMADO AL TÉRMINO→ Saldo x ejecutar · Saldo costo (ETC) · Costo Total (EAC) · Margen (VAC) · CPI · Var. Cronog. · SPI
//   COMENTARIOS
//
// Fuentes de la data (todo en vivo, sin carga manual):
//   - F1/F2: se corre el motor RO por frente (igual que ROFrentes) y se cruza por partida.
//   - ISP (HH): horas-hombre del CR = costoMO / S/25.5 (los tareos alimentan el CR, y el CR jala el ISP).
//   - AC (Costo Real): ISP (HH×S/25.5) + Almacén (pendiente de subir) + Facturas + Subcontratos.
//   - Deductivos / Adicionales (F05): a nivel de obra (fila TOTAL); por partida llegan en olas siguientes.

import React, { useMemo } from 'react';
import { BASE } from '../../../utils/styles';
import { calcularROMensual, COSTO_HORA_RO } from '../../../utils/planMaestroAnalytics';
import { calcularReporteTareos } from '../../../utils/helpers';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useRO from './useRO';
import usePresupuestoContractual from '../../../hooks/usePresupuestoContractual';
import EmptyState from '../../../components/EmptyState';

// ── Formateadores ──
const esZero = (n) => n == null || n === '' || (typeof n === 'number' && Math.abs(n) < 0.005);
const blank = <span style={{ color: '#cbd5e1' }}>—</span>;
const S = (n) => {
  if (n == null || n === '' || typeof n !== 'number') return blank;
  if (esZero(n)) return <span style={{ color: '#cbd5e1' }}>0</span>;
  return `${Math.round(n).toLocaleString('es-PE')}`;
};
const HHf = (n) => {
  if (typeof n !== 'number' || esZero(n)) return <span style={{ color: '#cbd5e1' }}>—</span>;
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};
const P = (n) => (typeof n === 'number' && n !== 0) ? `${Math.round(n * 100)}%` : blank;
const cpiCol = (v) => (typeof v !== 'number' || v === 0) ? BASE.muted : v >= 1 ? '#16a34a' : v >= 0.9 ? '#d97706' : '#dc2626';
const varCol = (v) => (typeof v !== 'number' || v === 0) ? BASE.muted : v > 0 ? '#16a34a' : '#dc2626';

// Cruce nombre-de-partida (tareos) → código del presupuesto. Normaliza acentos/puntuación
// y une variantes ("MOVIMIENTO(S) DE TIERRAS", "VARIOS ESTRUCTURA(S)", "TRABAJOS PRELIMINARES.").
const _normPart = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
const _ALIAS_PART = { MOVIMIENTODETIERRAS: 'MOVIMIENTOSDETIERRAS', VARIOSESTRUCTURA: 'VARIOSESTRUCTURAS' };
const keyPart = (s) => { const k = _normPart(s); return _ALIAS_PART[k] || k; };

// ── Definición de grupos / columnas (réplica del F06) ──
const buildCols = (l1, l2) => ([
  { id: 'ppt', label: 'PRESUPUESTO', c: '#f59e0b', cols: [
    { k: 'pptoF1', l: l1 }, { k: 'pptoF2', l: l2 },
    { k: 'deduct', l: 'Deduct.' }, { k: 'adic', l: 'Adic.' },
    { k: 'bac', l: 'Ppto Total (BAC)', bold: true },
  ] },
  { id: 'prog', label: 'PROGRAMADO (PV)', c: '#6366f1', cols: [
    { k: 'pvF1', l: l1 }, { k: 'pvF2', l: l2 },
    { k: 'pvDeduct', l: 'Deduct.' }, { k: 'pvAdic', l: 'Adic.' },
    { k: 'pv', l: 'Plan Value', bold: true },
  ] },
  { id: 'val', label: 'VALORIZADO (EV)', c: '#10b981', cols: [
    { k: 'valF1', l: l1 }, { k: 'valF2', l: l2 },
    { k: 'valDeduct', l: 'Deduct.' }, { k: 'valAdic', l: 'Adic.' },
    { k: 'ev', l: 'Earned Value', bold: true },
  ] },
  { id: 'costo', label: 'COSTO REAL', c: '#0ea5e9', cols: [
    { k: 'hh', l: 'ISP (HH)', tipo: 'hh' },
    { k: 'ac', l: 'Real (AC)', bold: true },
    { k: 'cv', l: 'Margen (CV)', tipo: 'var' },
    { k: 'cpi', l: 'CPI', tipo: 'cpi' },
  ] },
  { id: 'etc', label: 'ESTIMADO AL TÉRMINO', c: '#06b6d4', cols: [
    { k: 'saldoTeorico', l: 'Saldo x ejec.' },
    { k: 'etc', l: 'Saldo costo' },
    { k: 'eac', l: 'Costo Total (EAC)', bold: true },
    { k: 'vac', l: 'Margen (VAC)', tipo: 'var' },
    { k: 'cpi2', l: 'CPI', tipo: 'cpi' },
    { k: 'sv', l: 'Var. Cronog.', tipo: 'var' },
    { k: 'spi', l: 'SPI', tipo: 'cpi' },
  ] },
]);

export default function ResultadoOperativoOficial({ showToast }) {
  // ignorarFrente: cargamos TODA la obra para mostrar F1/F2 lado a lado (como el Excel).
  const {
    ro, loading,
    actividades, apus, tareos, kardexMov, valorizaciones,
    facturas, valorizacionesSC, adicionales, deductivos,
  } = useRO({ ignorarFrente: true });
  const { proyectoActivo, frentesDelProyecto } = useProyectoActivo();

  // Presupuesto contractual (MISMA fuente que el módulo Presupuesto) → manda en las
  // columnas PRESUPUESTO del F06 (Ppto F1 · Ppto F2 · BAC). Lo vivo (PV/EV/AC/CPI/SPI)
  // se sigue calculando del motor. Así el F06 y el Presupuesto muestran los mismos montos.
  const { mapaPorCodigo: pptoMapa, totales: pptoTot, hayPresupuesto } = usePresupuestoContractual();

  // Frentes → columnas F1 / F2 (los dos primeros del proyecto; el resto se agrega al total).
  const f1 = frentesDelProyecto?.[0] || null;
  const f2 = frentesDelProyecto?.[1] || null;
  const l1 = f1?.codigo || f1?.nombre || 'F1';
  const l2 = f2?.codigo || f2?.nombre || 'F2';

  // Corre el motor por frente y devuelve un map code → { BAC, PV, EV }.
  const mapaPorFrente = useMemo(() => {
    const byFr = (arr, fid) => (arr || []).filter(x => !x.frenteId || x.frenteId === fid);
    const calcular = (fr) => {
      if (!fr) return new Map();
      const actsF = (actividades || []).filter(a => a.frenteId === fr.id);
      if (actsF.length === 0) return new Map();
      const r = calcularROMensual({
        actividades: actsF, apus,
        tareos: byFr(tareos, fr.id),
        kardexMovimientos: byFr(kardexMov, fr.id),
        valorizaciones,
        facturas: byFr(facturas, fr.id),
        valorizacionesSC: byFr(valorizacionesSC, fr.id),
        gastosGenerales: [],
        adicionales: byFr(adicionales, fr.id),
        deductivos: byFr(deductivos, fr.id),
        fechaActual: new Date(), margenMeta: 15,
      });
      const m = new Map();
      (r.detallePartidas || []).forEach(p => m.set(p.codigo, { BAC: p.BAC, PV: p.PV, EV: p.EV }));
      return m;
    };
    return { f1: calcular(f1), f2: calcular(f2) };
  }, [actividades, apus, tareos, kardexMov, valorizaciones, facturas, valorizacionesSC, adicionales, deductivos, f1, f2]);

  // Partidas a mostrar = las del PRESUPUESTO contractual (1001-1018) ∪ las que tienen
  // valorizado/costo real vivo. Así el F06 lista todas las partidas presupuestadas aunque
  // aún no tengan avance, y conserva las que tienen movimiento aunque no estén en el ppto.
  const partidas = useMemo(() => {
    const detalle = ro?.detallePartidas || [];
    const byCode = new Map(detalle.map(p => [String(p.codigo), p]));
    const codes = new Set();
    if (hayPresupuesto) pptoMapa.forEach((b, c) => { if ((b.montoF1 + b.montoF2) > 0.005) codes.add(String(c)); });
    detalle.forEach(p => { if (Math.abs(p.BAC || 0) > 0.005 || Math.abs(p.EV || 0) > 0.005 || Math.abs(p.AC || 0) > 0.005) codes.add(String(p.codigo)); });
    const VACIO = { BAC: 0, PV: 0, EV: 0, AC: 0, CV: 0, CPI: 0, SPI: 0, SV: 0, ETC: 0, EAC: 0, VAC: 0, costoMORealAct: 0 };
    return [...codes]
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
      .map(c => {
        const d = byCode.get(c);
        const desc = d?.descripcion || pptoMapa.get(c)?.descripcion || c;
        return d ? { ...d, codigo: c, descripcion: desc } : { ...VACIO, codigo: c, descripcion: desc };
      });
  }, [ro, pptoMapa, hayPresupuesto]);

  // Costo Real de MANO DE OBRA por partida desde los TAREOS (misma fuente que el CR vivo).
  // Hoy Kardex/Facturas/Subcontratos del proyecto están vacíos → el AC del F06 = costo de MO.
  const crTareos = useMemo(() => {
    const rep = calcularReporteTareos(tareos || [], COSTO_HORA_RO);
    const ac = new Map(), hh = new Map();
    (rep.partidas || []).forEach(p => {
      const k = keyPart(p.nombre);
      ac.set(k, (ac.get(k) || 0) + (p.costo || 0));
      hh.set(k, (hh.get(k) || 0) + (p.hh || 0));
    });
    return { ac, hh, totalCosto: rep.totalCosto || 0, totalHH: rep.totalHH || 0 };
  }, [tareos]);

  // Comentario automático breve según el desempeño de la partida.
  const comentarioAuto = (p) => {
    if ((p.BAC || 0) > 0.005 && esZero(p.EV) && esZero(p.AC)) return 'Sin avance ni costo';
    if (!esZero(p.AC) && esZero(p.EV)) return 'Costo sin valorizar';
    if (!esZero(p.AC) && typeof p.CPI === 'number' && p.CPI < 0.9) return '⚠ Sobrecosto';
    if (typeof p.CPI === 'number' && p.CPI >= 1.05) return '✅ Bajo presupuesto';
    return '';
  };

  // Filas: TOTAL COSTO DE OBRA + partidas.
  const filas = useMemo(() => {
    if (!ro) return [];
    const t = ro.totales || {};
    const gg = ro.gastosGenerales || { total: 0 };
    const aj = ro.ajustes || {};
    const hayGG = Math.abs(gg.total || 0) > 0.005;
    // AC total = Costo Real de MO (tareos) + GG; si no hay tareos, el bottom-up del motor.
    const acRealMO = crTareos.totalCosto || 0;
    const acTotal = acRealMO > 0 ? +(acRealMO + (gg.total || 0)).toFixed(2) : (hayGG ? gg.acConGG : t.AC);
    const adicP = aj.adicionales?.presupuesto || 0;
    const dedP = aj.deductivos?.presupuesto || 0;
    // BAC total: el Costo Directo CONTRACTUAL (± adicionales/deductivos) si hay presupuesto
    // cargado; si no, el bottom-up del motor.
    const bacTotal = hayPresupuesto ? +(pptoTot.cd + adicP - dedP).toFixed(2)
                   : aj.hayAjustes ? aj.bacContractual : t.BAC;
    const evTotal = aj.hayAjustes ? aj.evContractual : t.EV;
    const cpiTotal = acTotal > 0 ? evTotal / acTotal : 0;
    const eacTotal = cpiTotal > 0 ? bacTotal / cpiTotal : bacTotal;

    // Total de HH = HH real de los tareos (fallback: suma de partidas del motor).
    const hhSum = crTareos.totalHH > 0 ? crTareos.totalHH : partidas.reduce((s, p) => s + (p.costoMORealAct || 0) / COSTO_HORA_RO, 0);

    const total = {
      key: '__TOTAL__', tipo: 'total', frente: '', codigo: '', descripcion: 'TOTAL COSTO DE OBRA',
      v: {
        pptoF1: hayPresupuesto ? (pptoTot.totF1 || null) : (mapaPorFrente.f1.size ? [...mapaPorFrente.f1.values()].reduce((s, x) => s + (x.BAC || 0), 0) : null),
        pptoF2: hayPresupuesto ? (pptoTot.totF2 || null) : (mapaPorFrente.f2.size ? [...mapaPorFrente.f2.values()].reduce((s, x) => s + (x.BAC || 0), 0) : null),
        deduct: -(aj.deductivos?.presupuesto || 0) || null,
        adic: (aj.adicionales?.presupuesto || 0) || null,
        bac: bacTotal,
        pvF1: mapaPorFrente.f1.size ? [...mapaPorFrente.f1.values()].reduce((s, x) => s + (x.PV || 0), 0) : null,
        pvF2: mapaPorFrente.f2.size ? [...mapaPorFrente.f2.values()].reduce((s, x) => s + (x.PV || 0), 0) : null,
        pvDeduct: null, pvAdic: null, pv: t.PV,
        valF1: mapaPorFrente.f1.size ? [...mapaPorFrente.f1.values()].reduce((s, x) => s + (x.EV || 0), 0) : null,
        valF2: mapaPorFrente.f2.size ? [...mapaPorFrente.f2.values()].reduce((s, x) => s + (x.EV || 0), 0) : null,
        valDeduct: -(aj.deductivos?.valorizado || 0) || null,
        valAdic: (aj.adicionales?.valorizado || 0) || null,
        ev: evTotal,
        hh: hhSum, ac: acTotal, cv: (evTotal || 0) - (acTotal || 0), cpi: cpiTotal,
        saldoTeorico: (bacTotal || 0) - (evTotal || 0),
        etc: (eacTotal || 0) - (acTotal || 0),
        eac: eacTotal, vac: (bacTotal || 0) - (eacTotal || 0), cpi2: cpiTotal,
        sv: (evTotal || 0) - (t.PV || 0), spi: ro.indicadoresGlobales?.SPI,
      },
      coment: hayGG ? `Incluye GG: S/ ${Math.round(gg.total).toLocaleString('es-PE')}` : '',
    };

    const filasPart = partidas.map(p => {
      const fr1 = mapaPorFrente.f1.get(p.codigo);
      const fr2 = mapaPorFrente.f2.get(p.codigo);
      const ppto = hayPresupuesto ? pptoMapa.get(p.codigo) : null;
      // PRESUPUESTO por partida: contractual si existe; si no, BAC del motor por frente.
      const pptoF1 = ppto ? (ppto.montoF1 || null) : (fr1?.BAC ?? null);
      const pptoF2 = ppto ? (ppto.montoF2 || null) : (fr2?.BAC ?? null);
      const bac = ppto ? +((ppto.montoF1 || 0) + (ppto.montoF2 || 0)).toFixed(2) : p.BAC;
      // AC = Costo Real de MO desde los tareos (Kardex/Facturas/SC vacíos hoy). CPI = EV/AC.
      const acReal = crTareos.ac.get(keyPart(p.descripcion));
      const ac = (acReal != null && acReal > 0) ? +acReal.toFixed(2) : (p.AC || 0);
      const hhReal = crTareos.hh.get(keyPart(p.descripcion)) || 0;
      const hh = hhReal > 0 ? hhReal : ((p.costoMORealAct || 0) / COSTO_HORA_RO);
      const cpi = ac > 0 ? +((p.EV || 0) / ac).toFixed(3) : 0;
      const eac = (cpi > 0) ? +(bac / cpi).toFixed(2) : bac;
      const hasF1 = (pptoF1 != null) || (fr1 && (fr1.BAC || fr1.EV));
      const hasF2 = (pptoF2 != null) || (fr2 && (fr2.BAC || fr2.EV));
      const frenteLabel = hasF1 && hasF2 ? `${l1}+${l2}` : hasF1 ? l1 : hasF2 ? l2 : '';
      return {
        key: p.codigo, tipo: 'partida', frente: frenteLabel, codigo: p.codigo, descripcion: p.descripcion,
        v: {
          pptoF1, pptoF2, deduct: null, adic: null, bac,
          pvF1: fr1?.PV ?? null, pvF2: fr2?.PV ?? null, pvDeduct: null, pvAdic: null, pv: p.PV,
          valF1: fr1?.EV ?? null, valF2: fr2?.EV ?? null, valDeduct: null, valAdic: null, ev: p.EV,
          hh, ac, cv: +((p.EV || 0) - ac).toFixed(2), cpi,
          saldoTeorico: (bac || 0) - (p.EV || 0), etc: +((eac || 0) - ac).toFixed(2),
          eac, vac: +((bac || 0) - (eac || 0)).toFixed(2), cpi2: cpi, sv: p.SV, spi: p.SPI,
        },
        coment: comentarioAuto({ ...p, BAC: bac, AC: ac, CPI: cpi }),
      };
    });

    return [total, ...filasPart];
  }, [ro, partidas, mapaPorFrente, l1, l2, pptoMapa, pptoTot, hayPresupuesto, crTareos]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Calculando el Resultado Operativo…</p>;
  if (!ro || partidas.length === 0) {
    return (
      <EmptyState
        icono="📑"
        variante="bim"
        titulo="El RO se calcula en vivo — aún no hay datos"
        descripcion="Este Resultado Operativo (formato F06) se arma cruzando Plan Maestro + APUs + Tareos (ISP) + Almacén + Valorizaciones. En cuanto registres avance y costos, la tabla se llena sola."
      />
    );
  }

  const GROUPS = buildCols(l1, l2);
  // Cada columna lleva el color de su grupo y si es la PRIMERA del grupo, para dibujar
  // separadores verticales y un código de color por bloque (mismo color que las KPI cards).
  const ALLCOLS = GROUPS.flatMap(g => g.cols.map((c, i) => ({ ...c, gC: g.c, first: i === 0 })));
  const total = filas[0];
  const t = total?.v || {};

  // Presupuesto contractual (top-down) vs BAC bottom-up.
  const presupuesto = proyectoActivo?.presupuestoContractual || 0;
  const coberturaBAC = (presupuesto > 0 && t.bac) ? Math.round((t.bac / presupuesto) * 100) : null;

  const exportarRO = async () => {
    try {
      const { exportarPDF } = await import('../../../utils/pdfExport');
      const Sp = (n) => (typeof n === 'number') ? `S/ ${Math.round(n).toLocaleString('es-PE')}` : '—';
      const Pp = (n) => (typeof n === 'number' && n !== 0) ? `${Math.round(n * 100)}%` : '—';
      const headers = [['Frente', 'Partida', `BAC`, `PV`, `EV`, 'HH', 'AC', 'CV', 'CPI', 'EAC', 'VAC', 'SPI']];
      const rows = filas.map(f => [
        f.frente || '', (f.codigo ? f.codigo + ' ' : '') + (f.descripcion || ''),
        Sp(f.v.bac), Sp(f.v.pv), Sp(f.v.ev),
        (typeof f.v.hh === 'number' ? f.v.hh.toFixed(1) : '—'),
        Sp(f.v.ac), Sp(f.v.cv), Pp(f.v.cpi), Sp(f.v.eac), Sp(f.v.vac), Pp(f.v.spi),
      ]);
      await exportarPDF({
        titulo: 'Resultado Operativo (GP-GCE-FOR-F06)',
        subtitulo: proyectoActivo?.nombre || 'Proyecto activo',
        headers, rows,
        nombreArchivo: `RO_${(proyectoActivo?.nombre || 'proyecto').replace(/\s+/g, '_')}.pdf`,
        orientacion: 'l',
        metadata: { 'CPI global': Pp(t.cpi), 'BAC': Sp(t.bac), 'EV': Sp(t.ev), 'AC': Sp(t.ac) },
      });
      showToast?.('📄 PDF del RO generado', 'success');
    } catch (e) {
      showToast?.('Error generando PDF: ' + e.message, 'error');
    }
  };

  // Render de una celda numérica según su tipo.
  const celda = (f, col) => {
    const v = f.v?.[col.k];
    const dark = f.tipo === 'total';
    if (col.tipo === 'hh') return <span style={{ color: dark ? '#fff' : '#6366f1', fontWeight: 800 }}>{HHf(v)}</span>;
    if (col.tipo === 'cpi') return <span style={{ color: dark ? '#fbbf24' : cpiCol(v), fontWeight: 800 }}>{P(v)}</span>;
    if (col.tipo === 'var') return <span style={{ color: dark ? (v >= 0 ? '#4ade80' : '#fca5a5') : varCol(v), fontWeight: 700 }}>{S(v)}</span>;
    return <span style={{ color: dark ? '#fff' : BASE.text, fontWeight: col.bold ? 800 : 600 }}>{S(v)}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Cabecera / meta */}
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', borderRadius: 12, padding: '13px 16px', boxShadow: BASE.shadowMd, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.4, color: BASE.gold }}>GP-GCE-FOR-F06 · RESULTADO OPERATIVO · EN VIVO</p>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>El Estado de Resultados de la Obra</h2>
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            {proyectoActivo?.nombre || 'Proyecto activo'} · {partidas.length} partidas ·{' '}
            {(f1 || f2) ? <span>frentes: <b style={{ color: BASE.gold }}>{[l1, f2 && l2].filter(Boolean).join(' / ')}</b></span> : 'toda la obra'} ·{' '}
            <span style={{ fontWeight: 800, color: ro.evReal ? '#4ade80' : '#fbbf24' }}>
              {ro.evReal ? 'EV valorizado al cliente' : 'EV estimado (avance × PU)'}
            </span>
          </p>
          {presupuesto > 0 && (
            <p style={{ fontSize: 11, opacity: 0.82, marginTop: 3 }}>
              Presupuesto contractual: <b style={{ color: BASE.gold }}>{proyectoActivo.moneda === 'USD' ? '$' : 'S/'} {Math.round(presupuesto).toLocaleString('es-PE')}</b>
              {coberturaBAC != null && <> · el BAC de partidas cubre <b style={{ color: coberturaBAC >= 98 ? '#4ade80' : coberturaBAC >= 90 ? '#fbbf24' : '#fca5a5' }}>{coberturaBAC}%</b></>}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: BASE.gold }}>CPI GLOBAL</p>
          <p style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: cpiCol(t.cpi) === '#16a34a' ? '#4ade80' : '#fbbf24' }}>{P(t.cpi)}</p>
        </div>
      </div>

      {/* KPIs del total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
        {[
          { l: 'Presupuesto (BAC)', v: <>S/ {S(t.bac)}</>, c: '#f59e0b' },
          { l: 'Valorizado (EV)', v: <>S/ {S(t.ev)}</>, c: '#10b981' },
          { l: 'ISP · HH', v: HHf(t.hh), c: '#6366f1' },
          { l: 'Costo Real (AC)', v: <>S/ {S(t.ac)}</>, c: '#0ea5e9' },
          { l: 'Margen (CV)', v: <>S/ {S(t.cv)}</>, c: varCol(t.cv) },
          { l: 'Estimado término (EAC)', v: <>S/ {S(t.eac)}</>, c: '#06b6d4' },
          { l: 'Variación (VAC)', v: <>S/ {S(t.vac)}</>, c: varCol(t.vac) },
        ].map((k) => (
          <div key={k.l} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `3px solid ${k.c}`, borderRadius: 10, padding: '10px 13px', boxShadow: BASE.shadowSm }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: k.c, marginTop: 2, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Nota de fuente + export */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={exportarRO} style={{ fontSize: 11, fontWeight: 800, padding: '7px 14px', borderRadius: 9, border: `1px solid ${BASE.navy}`, background: BASE.navy, color: '#fff', cursor: 'pointer' }}>📄 Exportar PDF</button>
        <span style={{ fontSize: 11, color: BASE.muted, marginLeft: 'auto' }}>
          AC = ISP (HH × S/{COSTO_HORA_RO}) + Almacén <i>(pendiente de subir)</i> + Facturas + Subcontratos
        </span>
      </div>

      {/* Tabla RO (formato F06) */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: BASE.shadowSm }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 10.5, minWidth: 1700, width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thBase, textAlign: 'left', minWidth: 50, position: 'sticky', left: 0, background: BASE.navy, zIndex: 3 }}>FRENTE</th>
                <th rowSpan={2} style={{ ...thBase, textAlign: 'left', minWidth: 56, position: 'sticky', left: 50, background: BASE.navy, zIndex: 3 }}>PARTIDA</th>
                <th rowSpan={2} style={{ ...thBase, textAlign: 'left', minWidth: 210, position: 'sticky', left: 106, background: BASE.navy, zIndex: 3, borderRight: `2px solid ${BASE.gold}` }}>DESCRIPCIÓN</th>
                {GROUPS.map(g => (
                  <th key={g.id} colSpan={g.cols.length} style={{ ...thBase, color: g.c, borderBottom: `3px solid ${g.c}`, borderLeft: '2px solid rgba(255,255,255,0.20)' }}>{g.label}</th>
                ))}
                <th rowSpan={2} style={{ ...thBase, minWidth: 150, textAlign: 'left' }}>COMENTARIOS</th>
              </tr>
              <tr>
                {ALLCOLS.map((c, i) => (
                  <th key={c.k + i} style={{ ...thCol, color: c.bold ? '#fff' : '#cbd5e1', borderLeft: c.first ? `2px solid ${c.gC}` : undefined }}>{c.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, idx) => {
                const isTotal = f.tipo === 'total';
                const bg = isTotal ? BASE.navy : (idx % 2 === 0 ? BASE.white : (BASE.bgSoft || '#f8fafc'));
                return (
                  <tr key={f.key} style={{ background: bg, borderTop: isTotal ? `2px solid ${BASE.gold}` : `1px solid ${BASE.borderSoft || BASE.border}` }}>
                    <td style={{ ...tdSticky(bg, 0), color: isTotal ? BASE.gold : BASE.muted, fontWeight: 700, fontSize: 9, fontFamily: 'monospace' }}>{f.frente}</td>
                    <td style={{ ...tdSticky(bg, 50), color: isTotal ? BASE.gold : BASE.muted, fontWeight: 700, fontSize: 9.5, fontFamily: 'monospace' }}>{f.codigo}</td>
                    <td style={{ ...tdSticky(bg, 106), color: isTotal ? '#fff' : BASE.navy, fontWeight: isTotal ? 900 : 700, fontSize: 11, whiteSpace: 'nowrap', borderRight: `2px solid ${isTotal ? BASE.gold : BASE.border}` }}>{f.descripcion}</td>
                    {ALLCOLS.map((c, i) => (
                      <td key={c.k + i} style={{ padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--grapco-font-mono, monospace)', borderLeft: c.first ? `1px solid ${isTotal ? 'rgba(255,255,255,0.18)' : c.gC + '33'}` : undefined }}>
                        {celda(f, c)}
                      </td>
                    ))}
                    <td style={{ padding: '5px 9px', textAlign: 'left', whiteSpace: 'nowrap', fontSize: 9.5, fontWeight: 700, color: isTotal ? 'rgba(255,255,255,0.85)' : (f.coment?.startsWith('⚠') ? '#dc2626' : f.coment?.startsWith('✅') ? '#16a34a' : BASE.muted) }}>
                        {f.coment || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 10, color: BASE.muted }}>
        Réplica del formato GP-GCE-FOR-F06 · todas las cifras en S/ (HH en horas-hombre) · F1/F2 desde el motor por frente ·
        deductivos/adicionales por partida y el detalle de Almacén llegan al subir esa data.
      </p>
    </div>
  );
}

const thBase = { padding: '7px 7px', background: BASE.navy, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
const thCol = { padding: '5px 7px', background: '#1a2c4d', color: '#cbd5e1', fontSize: 8.5, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' };
const tdSticky = (bg, left) => ({ padding: '5px 8px', position: 'sticky', left, background: bg, zIndex: 1, whiteSpace: 'nowrap' });
