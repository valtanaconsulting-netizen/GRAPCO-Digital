// src/utils/excelExport.js — V2 con costos HE 60/100 y CPI en %
import * as XLSX from 'xlsx';
import {
  XL_COLORS, calcularCostosHEPorTrabajador,
} from './helpers';

const FNT = (color = '000000', bold = false, sz = 10) => ({
  name: 'Calibri', sz, color: { rgb: color }, bold,
});
const BG = (rgb) => ({ patternType: 'solid', fgColor: { rgb }, bgColor: { rgb } });
const BORDER = (clr = 'CBD5E1') => {
  const side = { style: 'thin', color: { rgb: clr } };
  return { top: side, bottom: side, left: side, right: side };
};
const BORDER_THICK = (clr = '1E3A5F') => {
  const side = { style: 'medium', color: { rgb: clr } };
  return { top: side, bottom: side, left: side, right: side };
};

export const ST = {
  titulo: { font: FNT(XL_COLORS.white, true, 16), fill: BG(XL_COLORS.navy),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  subtitulo: { font: FNT(XL_COLORS.navy, true, 11), fill: BG(XL_COLORS.grayL),
    alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER() },
  header: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.navy),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  headerOrange: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.orange),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  headerGreen: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.green),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  headerPurple: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.purple),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  headerRed: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.red),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_THICK() },
  partida: { font: FNT('1E3A5F', true, 11), fill: BG('DBEAFE'),
    alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER() },
  subpartida: { font: FNT('334155', true, 10), fill: BG('F1F5F9'),
    alignment: { horizontal: 'left', vertical: 'center', indent: 1 }, border: BORDER() },
  actividad: { font: FNT('475569', false, 10), fill: BG(XL_COLORS.white),
    alignment: { horizontal: 'left', vertical: 'center', indent: 2, wrapText: true }, border: BORDER() },
  num: { font: FNT('1E293B', false, 10),
    alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER(), numFmt: '#,##0.00' },
  numBold: { font: FNT(XL_COLORS.navy, true, 10),
    alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER(), numFmt: '#,##0.00' },
  pct: { font: FNT('1E293B', false, 10),
    alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER(), numFmt: '0%' },
  money: { font: FNT('1E293B', false, 10),
    alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER(), numFmt: '"S/"#,##0.00' },
  moneyBold: { font: FNT(XL_COLORS.navy, true, 10),
    alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER(), numFmt: '"S/"#,##0.00' },
  totalRow: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.navy),
    alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THICK(), numFmt: '#,##0.00' },
  totalRowL: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.navy),
    alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER_THICK() },
  totalRowMoney: { font: FNT(XL_COLORS.white, true, 11), fill: BG(XL_COLORS.navy),
    alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER_THICK(), numFmt: '"S/"#,##0.00' },
  info: { font: FNT(XL_COLORS.gray, false, 10), alignment: { horizontal: 'left', vertical: 'center' } },
  infoBold: { font: FNT(XL_COLORS.navy, true, 10), alignment: { horizontal: 'left', vertical: 'center' } },
};

export const applyCellStyle = (ws, ref, style) => {
  if (!ws[ref]) ws[ref] = { t: 's', v: '' };
  ws[ref].s = style;
};

export const buildStyledSheet = (aoa, styleMap = {}, opts = {}) => {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  Object.keys(styleMap).forEach(ref => applyCellStyle(ws, ref, styleMap[ref]));
  if (opts.cols) ws['!cols'] = opts.cols;
  if (opts.rows) ws['!rows'] = opts.rows;
  if (opts.merges) ws['!merges'] = opts.merges;
  return ws;
};

const styleCPI = (cpi) => {
  let bg = 'FFFFFF', font = FNT('475569', false, 10);
  if (cpi !== null && cpi !== undefined) {
    if (cpi >= 1) { bg = 'D1FAE5'; font = FNT('15803D', true, 10); }
    else if (cpi >= 0.85) { bg = 'FEF3C7'; font = FNT('B45309', true, 10); }
    else { bg = 'FEE2E2'; font = FNT('991B1B', true, 10); }
  }
  return { font, fill: BG(bg), alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER(), numFmt: '0%' };
};

// ──────────────────────────────────────────────────────────────
// VALORIZACIÓN — informe principal con bloques META/PPTO/SALDO
// CPI ahora se exporta como porcentaje (0% format)
// ──────────────────────────────────────────────────────────────

export const exportarValorizacionData = ({ wbs, periodo }) => {
  const aoa = [];
  const styles = {};

  aoa.push([`INFORME DE VALORIZACIÓN — GRAPCO SAC`]);
  aoa.push([`Período: ${periodo || 'Acumulado'}`]);
  aoa.push([`Generado: ${new Date().toLocaleString('es-PE')}`]);
  aoa.push([]);
  styles['A1'] = ST.titulo;
  styles['A2'] = ST.infoBold;
  styles['A3'] = ST.info;

  const HEADERS_TOP = [
    'CONCEPTO', 'UND', 'METRADO',
    'ACUMULADO ACTUAL (REAL)', '', '', '',
    'ANALISIS RESPECTO AL META', '', '', '',
    'SALDO POR EJECUTAR', '', '', '',
    'ANALISIS RESPECTO AL PPTO', '', '',
    'CPI %',
  ];
  const HEADERS = [
    'Partida / Actividad', 'Und', 'Avance',
    'HH Real', 'HH Meta', 'HH Ppto', 'IP Real',
    'Var HH', 'Var %', 'CPI %', 'Cumple',
    'Saldo Met', 'HH Saldo Meta', 'HH Saldo Real', 'HH EAC',
    'Var HH', 'CPI Ppto %', 'Eficiencia %',
    'Estado',
  ];

  const headerStartRow = aoa.length + 1;
  aoa.push(HEADERS_TOP);
  aoa.push(HEADERS);

  const topRow = headerStartRow;
  const dataRow = headerStartRow + 1;
  for (let c = 0; c < HEADERS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: topRow - 1, c });
    let style = ST.header;
    if (c >= 7 && c <= 10) style = ST.headerGreen;
    else if (c >= 11 && c <= 14) style = ST.headerPurple;
    else if (c >= 15 && c <= 17) style = ST.headerOrange;
    styles[ref] = style;

    const ref2 = XLSX.utils.encode_cell({ r: dataRow - 1, c });
    let style2 = ST.subtitulo;
    if (c >= 7 && c <= 10) style2 = { ...ST.subtitulo, fill: BG('D1FAE5'), font: FNT('15803D', true, 10) };
    else if (c >= 11 && c <= 14) style2 = { ...ST.subtitulo, fill: BG('EDE9FE'), font: FNT('7C3AED', true, 10) };
    else if (c >= 15 && c <= 17) style2 = { ...ST.subtitulo, fill: BG('FED7AA'), font: FNT('C2410C', true, 10) };
    styles[ref2] = style2;
  }

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: topRow - 1, c: 3 }, e: { r: topRow - 1, c: 6 } },
    { s: { r: topRow - 1, c: 7 }, e: { r: topRow - 1, c: 10 } },
    { s: { r: topRow - 1, c: 11 }, e: { r: topRow - 1, c: 14 } },
    { s: { r: topRow - 1, c: 15 }, e: { r: topRow - 1, c: 17 } },
  ];

  let granTotalReal = 0, granTotalMeta = 0, granTotalPpto = 0;
  let granTotalSaldoMet = 0, granTotalSaldoMeta = 0, granTotalSaldoReal = 0, granTotalEAC = 0;

  Object.keys(wbs).forEach(partidaName => {
    const p = wbs[partidaName];
    const subs = p.subs || {};

    let pSaldoMet = 0, pSaldoMeta = 0, pSaldoReal = 0, pEAC = 0;
    Object.keys(subs).forEach(spN => {
      const sub = subs[spN];
      Object.keys(sub.acts || {}).forEach(aN => {
        const act = sub.acts[aN];
        const ad = act._info || { ipM: 1, ipP: 1, metP: 0 };
        const sm = Math.max(0, (ad.metP || 0) - act.met);
        const ipReal = act.met > 0 ? act.hhR / act.met : (ad.ipP || 1);
        pSaldoMet += sm;
        pSaldoMeta += sm * (ad.ipM || 1);
        pSaldoReal += sm * ipReal;
        pEAC += act.hhR + sm * ipReal;
      });
    });

    const cpiReal = p.hhR > 0 ? p.hhM / p.hhR : null;
    const cpiPpto = p.hhR > 0 ? p.hhP / p.hhR : null;
    const varMeta = p.hhM - p.hhR;
    const varMetaPct = p.hhM > 0 ? varMeta / p.hhM : 0;
    const varPpto = p.hhP - p.hhR;
    const cumple = cpiReal !== null && cpiReal >= 1;
    const eficiencia = p.hhR > 0 ? p.hhP / p.hhR : 0;

    if (p.hhR === 0 && p.hhM === 0) return;

    const filaPartida = aoa.length;
    aoa.push([
      partidaName, '', '',
      p.hhR, p.hhM, p.hhP, '',
      varMeta, varMetaPct, cpiReal, cumple ? '✓' : '✗',
      pSaldoMet, pSaldoMeta, pSaldoReal, pEAC,
      varPpto, cpiPpto, eficiencia,
      cpiReal,
    ]);

    granTotalReal += p.hhR; granTotalMeta += p.hhM; granTotalPpto += p.hhP;
    granTotalSaldoMet += pSaldoMet; granTotalSaldoMeta += pSaldoMeta;
    granTotalSaldoReal += pSaldoReal; granTotalEAC += pEAC;

    for (let c = 0; c < HEADERS.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: filaPartida, c });
      let st = { ...ST.partida };
      if (c >= 3 && c <= 5) st = { ...ST.partida, alignment:{horizontal:'center'}, numFmt:'#,##0.00' };
      else if ([7, 11, 12, 13, 14, 15].includes(c)) st = { ...ST.partida, alignment:{horizontal:'center'}, numFmt:'#,##0.00' };
      else if (c === 8 || c === 17) st = { ...ST.partida, alignment:{horizontal:'center'}, numFmt:'0%' };
      else if (c === 9 || c === 16 || c === 18) st = styleCPI(c === 16 ? cpiPpto : cpiReal);
      else if (c === 10) st = { ...ST.partida, alignment:{horizontal:'center'}, font: FNT(cumple ? '15803D' : '991B1B', true, 12) };
      styles[ref] = st;
    }

    Object.keys(subs).forEach(spName => {
      const sub = subs[spName];
      if (sub.hhR === 0 && sub.hhM === 0) return;

      let spSaldoMet = 0, spSaldoMeta = 0, spSaldoReal = 0, spEAC = 0;
      Object.keys(sub.acts || {}).forEach(aN => {
        const act = sub.acts[aN];
        const ad = act._info || { ipM: 1, ipP: 1, metP: act.met };
        const sm = Math.max(0, (ad.metP || 0) - act.met);
        const ipReal = act.met > 0 ? act.hhR / act.met : (ad.ipP || 1);
        spSaldoMet += sm;
        spSaldoMeta += sm * (ad.ipM || 1);
        spSaldoReal += sm * ipReal;
        spEAC += act.hhR + sm * ipReal;
      });

      const cpiSubReal = sub.hhR > 0 ? sub.hhM / sub.hhR : null;
      const cpiSubPpto = sub.hhR > 0 ? sub.hhP / sub.hhR : null;
      const varSubMeta = sub.hhM - sub.hhR;
      const varSubMetaPct = sub.hhM > 0 ? varSubMeta / sub.hhM : 0;
      const varSubPpto = sub.hhP - sub.hhR;
      const cumpleSub = cpiSubReal !== null && cpiSubReal >= 1;
      const efSub = sub.hhR > 0 ? sub.hhP / sub.hhR : 0;

      const filaSub = aoa.length;
      aoa.push([
        spName, '', '',
        sub.hhR, sub.hhM, sub.hhP, '',
        varSubMeta, varSubMetaPct, cpiSubReal, cumpleSub ? '✓' : '✗',
        spSaldoMet, spSaldoMeta, spSaldoReal, spEAC,
        varSubPpto, cpiSubPpto, efSub,
        cpiSubReal,
      ]);

      for (let c = 0; c < HEADERS.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: filaSub, c });
        let st = { ...ST.subpartida };
        if (c >= 3 && c <= 5) st = { ...ST.subpartida, alignment:{horizontal:'center'}, numFmt:'#,##0.00' };
        else if ([7,11,12,13,14,15].includes(c)) st = { ...ST.subpartida, alignment:{horizontal:'center'}, numFmt:'#,##0.00' };
        else if (c === 8 || c === 17) st = { ...ST.subpartida, alignment:{horizontal:'center'}, numFmt:'0%' };
        else if (c === 9 || c === 16 || c === 18) st = styleCPI(c === 16 ? cpiSubPpto : cpiSubReal);
        else if (c === 10) st = { ...ST.subpartida, alignment:{horizontal:'center'}, font: FNT(cumpleSub ? '15803D' : '991B1B', true, 11) };
        styles[ref] = st;
      }

      Object.keys(sub.acts || {}).forEach(actName => {
        const act = sub.acts[actName];
        if (act.hhR === 0 && act.hhM === 0 && act.met === 0) return;

        const ad = act._info || { ipM: 1, ipP: 1, metP: act.met, un: 'UND' };
        const sm = Math.max(0, (ad.metP || 0) - act.met);
        const ipRealAct = act.met > 0 ? act.hhR / act.met : null;
        const hhSMeta = sm * (ad.ipM || 1);
        const hhSReal = sm * (ipRealAct || ad.ipP || 1);
        const hhEACa = act.hhR + hhSReal;
        const cpiAReal = act.hhR > 0 ? act.hhM / act.hhR : null;
        const cpiAPpto = act.hhR > 0 ? act.hhP / act.hhR : null;
        const varA = act.hhM - act.hhR;
        const varAPct = act.hhM > 0 ? varA / act.hhM : 0;
        const varAPpto = act.hhP - act.hhR;
        const cumpleA = cpiAReal !== null && cpiAReal >= 1;
        const efA = act.hhR > 0 ? act.hhP / act.hhR : 0;

        const filaAct = aoa.length;
        aoa.push([
          `   ↳ ${actName}`, ad.un || 'UND', act.met,
          act.hhR, act.hhM, act.hhP, ipRealAct,
          varA, varAPct, cpiAReal, cumpleA ? '✓' : '✗',
          sm, hhSMeta, hhSReal, hhEACa,
          varAPpto, cpiAPpto, efA,
          cpiAReal,
        ]);

        for (let c = 0; c < HEADERS.length; c++) {
          const ref = XLSX.utils.encode_cell({ r: filaAct, c });
          let st = { ...ST.actividad };
          if (c === 2 || (c >= 3 && c <= 6)) st = { ...ST.num };
          else if ([7, 11, 12, 13, 14, 15].includes(c)) st = { ...ST.num };
          else if (c === 8 || c === 17) st = { ...ST.pct };
          else if (c === 9 || c === 16 || c === 18) st = styleCPI(c === 16 ? cpiAPpto : cpiAReal);
          else if (c === 10) st = { ...ST.actividad, alignment:{horizontal:'center'}, font: FNT(cumpleA ? '15803D' : '991B1B', true, 12) };
          styles[ref] = st;
        }
      });
    });
  });

  const cpiGlobal = granTotalReal > 0 ? granTotalMeta / granTotalReal : null;
  const cpiGlobalPpto = granTotalReal > 0 ? granTotalPpto / granTotalReal : null;
  const varGlobalMeta = granTotalMeta - granTotalReal;
  const varGlobalMetaPct = granTotalMeta > 0 ? varGlobalMeta / granTotalMeta : 0;
  const varGlobalPpto = granTotalPpto - granTotalReal;
  const cumpleGlobal = cpiGlobal !== null && cpiGlobal >= 1;
  const efGlobal = granTotalReal > 0 ? granTotalPpto / granTotalReal : 0;

  const filaTotal = aoa.length;
  aoa.push([
    'TOTAL GENERAL', '', '',
    granTotalReal, granTotalMeta, granTotalPpto, '',
    varGlobalMeta, varGlobalMetaPct, cpiGlobal, cumpleGlobal ? '✓' : '✗',
    granTotalSaldoMet, granTotalSaldoMeta, granTotalSaldoReal, granTotalEAC,
    varGlobalPpto, cpiGlobalPpto, efGlobal,
    cpiGlobal,
  ]);

  for (let c = 0; c < HEADERS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: filaTotal, c });
    let st = { ...ST.totalRow };
    if (c === 0) st = ST.totalRowL;
    else if (c === 8 || c === 17) st = { ...ST.totalRow, numFmt:'0%' };
    else if (c === 9 || c === 16 || c === 18) st = { ...ST.totalRow, numFmt:'0%' };
    styles[ref] = st;
  }

  const cols = [
    { wch:38 }, { wch:6 }, { wch:11 },
    { wch:11 }, { wch:11 }, { wch:11 }, { wch:9 },
    { wch:10 }, { wch:8 }, { wch:9 }, { wch:8 },
    { wch:11 }, { wch:12 }, { wch:12 }, { wch:11 },
    { wch:10 }, { wch:10 }, { wch:11 },
    { wch:9 },
  ];
  const rows = [];
  rows[0] = { hpt: 32 }; rows[1] = { hpt: 18 }; rows[2] = { hpt: 18 };
  rows[topRow - 1] = { hpt: 28 }; rows[dataRow - 1] = { hpt: 32 };

  return { aoa, styles, cols, rows, merges };
};

// ──────────────────────────────────────────────────────────────
// HOJA DE COSTOS HE 60/100 — para administración
// ──────────────────────────────────────────────────────────────

export const generarHojaCostosHE = (registros, costosCustomMap = {}, periodo = '') => {
  const datos = calcularCostosHEPorTrabajador(registros, costosCustomMap);
  const aoa = [];
  const styles = {};

  aoa.push(['REPORTE DE COSTOS HH y HE 60% / 100% — ADMINISTRACIÓN']);
  aoa.push([`Período: ${periodo || 'Acumulado'} · Generado: ${new Date().toLocaleString('es-PE')}`]);
  aoa.push([]);

  styles['A1'] = ST.titulo;
  styles['A2'] = ST.info;

  const HEADERS_TOP = [
    'TRABAJADOR', '', '', '', 'TARIFA',
    'DÍAS',
    'HORAS TRABAJADAS', '', '', '',
    'COSTOS', '', '', '',
  ];
  const HEADERS = [
    '#', 'NOMBRE COMPLETO', 'DNI', 'CARGO', 'COSTO/H',
    'DÍAS',
    'HN', 'HE 60%', 'HE 100%', 'HH TOT',
    'COSTO HN', 'COSTO HE 60%', 'COSTO HE 100%', 'COSTO TOTAL',
  ];

  const headerTopRow = aoa.length;
  aoa.push(HEADERS_TOP);
  const headerRow = aoa.length;
  aoa.push(HEADERS);

  // Estilos cabecera doble
  for (let c = 0; c < HEADERS.length; c++) {
    const refTop = XLSX.utils.encode_cell({ r: headerTopRow, c });
    const ref = XLSX.utils.encode_cell({ r: headerRow, c });
    let stTop = ST.header;
    let st = ST.subtitulo;
    if (c >= 6 && c <= 9) { stTop = ST.headerOrange; st = { ...ST.subtitulo, fill: BG('FED7AA'), font: FNT('C2410C', true, 10) }; }
    else if (c >= 10) { stTop = ST.headerGreen; st = { ...ST.subtitulo, fill: BG('D1FAE5'), font: FNT('15803D', true, 10) }; }
    else { stTop = ST.header; st = ST.subtitulo; }
    styles[refTop] = stTop;
    styles[ref] = st;
  }

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADERS.length - 1 } },
    { s: { r: headerTopRow, c: 0 }, e: { r: headerTopRow, c: 3 } },
    { s: { r: headerTopRow, c: 6 }, e: { r: headerTopRow, c: 9 } },
    { s: { r: headerTopRow, c: 10 }, e: { r: headerTopRow, c: 13 } },
  ];

  // Datos
  let totHN = 0, totHE60 = 0, totHE100 = 0, totHH = 0;
  let totCostoHN = 0, totCostoHE60 = 0, totCostoHE100 = 0, totCostoTotal = 0, totDias = 0;

  datos.forEach((t, i) => {
    const r = aoa.length;
    aoa.push([
      i + 1, t.nombre, t.dni || '—', t.cargo, t.costoHora,
      t.diasTrabajados,
      t.hn, t.he60, t.he100, t.totalHH,
      t.costoHN, t.costoHE60, t.costoHE100, t.costoTotal,
    ]);
    totHN += t.hn; totHE60 += t.he60; totHE100 += t.he100; totHH += t.totalHH;
    totCostoHN += t.costoHN; totCostoHE60 += t.costoHE60;
    totCostoHE100 += t.costoHE100; totCostoTotal += t.costoTotal;
    totDias += t.diasTrabajados;

    styles[XLSX.utils.encode_cell({ r, c: 0 })] = { ...ST.num, numFmt: '0' };
    styles[XLSX.utils.encode_cell({ r, c: 1 })] = { font: FNT('1E293B', true, 10), alignment:{horizontal:'left',vertical:'center',indent:1}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 2 })] = { font: FNT('64748B', false, 10), alignment:{horizontal:'center',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 3 })] = { font: FNT('1E3A5F', true, 10), alignment:{horizontal:'center',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 4 })] = ST.money;
    styles[XLSX.utils.encode_cell({ r, c: 5 })] = { ...ST.num, numFmt: '0' };
    styles[XLSX.utils.encode_cell({ r, c: 6 })] = ST.num;
    styles[XLSX.utils.encode_cell({ r, c: 7 })] = { ...ST.num, font: FNT('B45309', true, 10), fill: BG('FEF3C7') };
    styles[XLSX.utils.encode_cell({ r, c: 8 })] = { ...ST.num, font: FNT('991B1B', true, 10), fill: BG('FEE2E2') };
    styles[XLSX.utils.encode_cell({ r, c: 9 })] = ST.numBold;
    styles[XLSX.utils.encode_cell({ r, c: 10 })] = ST.money;
    styles[XLSX.utils.encode_cell({ r, c: 11 })] = { ...ST.money, font: FNT('B45309', true, 10), fill: BG('FEF3C7') };
    styles[XLSX.utils.encode_cell({ r, c: 12 })] = { ...ST.money, font: FNT('991B1B', true, 10), fill: BG('FEE2E2') };
    styles[XLSX.utils.encode_cell({ r, c: 13 })] = { ...ST.moneyBold, font: FNT('15803D', true, 11), fill: BG('D1FAE5') };
  });

  // TOTAL
  const totalRow = aoa.length;
  aoa.push([
    '', 'TOTAL GENERAL', '', '', '',
    totDias,
    totHN, totHE60, totHE100, totHH,
    totCostoHN, totCostoHE60, totCostoHE100, totCostoTotal,
  ]);
  for (let c = 0; c < HEADERS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: totalRow, c });
    let st = ST.totalRow;
    if (c === 0) st = { ...ST.totalRowL, alignment: { horizontal: 'center', vertical: 'center' } };
    else if (c === 1) st = ST.totalRowL;
    else if (c >= 2 && c <= 4) st = ST.totalRowL;
    else if (c === 4) st = ST.totalRowMoney;
    else if (c >= 10) st = ST.totalRowMoney;
    styles[ref] = st;
  }

  const cols = [
    { wch: 5 }, { wch: 36 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
    { wch: 7 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 10 },
    { wch: 13 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  const rows = [{ hpt: 32 }, { hpt: 18 }, undefined, { hpt: 24 }, { hpt: 30 }];

  return { aoa, styles, cols, rows, merges };
};

// ──────────────────────────────────────────────────────────────
// EXPORTAR VALORIZACIÓN COMPLETA (Valorización + Costos HE)
// ──────────────────────────────────────────────────────────────

export const exportarValorizacionCompleta = ({ wbs, periodo, semana, registros, costosCustomMap = {} }) => {
  const wb = XLSX.utils.book_new();

  const val = exportarValorizacionData({ wbs, periodo });
  const wsVal = buildStyledSheet(val.aoa, val.styles, { cols: val.cols, rows: val.rows, merges: val.merges });
  XLSX.utils.book_append_sheet(wb, wsVal, 'Valorización');

  if (registros && registros.length > 0) {
    const cos = generarHojaCostosHE(registros, costosCustomMap, periodo);
    const wsCos = buildStyledSheet(cos.aoa, cos.styles, { cols: cos.cols, rows: cos.rows, merges: cos.merges });
    XLSX.utils.book_append_sheet(wb, wsCos, 'Costos HE 60-100');
  }

  const fname = `Valorizacion_${semana || 'Acumulado'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
};

// Alias para compatibilidad (lo usabas como exportarValorizacion antes)
export const exportarValorizacion = exportarValorizacionCompleta;

// ──────────────────────────────────────────────────────────────
// EXPORTAR SOLO COSTOS HE (botón separado)
// ──────────────────────────────────────────────────────────────

export const exportarCostosHE = ({ registros, costosCustomMap = {}, periodo }) => {
  if (!registros || !registros.length) throw new Error('Sin datos para exportar');
  const cos = generarHojaCostosHE(registros, costosCustomMap, periodo);
  const ws = buildStyledSheet(cos.aoa, cos.styles, { cols: cos.cols, rows: cos.rows, merges: cos.merges });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Costos HE 60-100');
  const fname = `Costos_HE_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
};

// ──────────────────────────────────────────────────────────────
// REPORTE DE ALMACEN FISICO VALORIZADO (Formato S10)
// ──────────────────────────────────────────────────────────────

export const exportarValorizadoS10 = ({ filas, fechaCorte, totalGeneral, proyectoNombre, almacenNombre, fechaDesde }) => {
  const aoa = [];
  const styles = {};

  aoa.push(['REPORTE DE ALMACEN FISICO VALORIZADO — FORMATO S10']);
  aoa.push([`Proyecto: ${proyectoNombre || '—'}    ·    Almacen: ${almacenNombre || 'Todos'}`]);
  aoa.push([`Periodo: ${fechaDesde || '(inicio)'} al ${fechaCorte}    ·    Generado: ${new Date().toLocaleString('es-PE')}`]);
  aoa.push([]);
  styles['A1'] = ST.titulo;
  styles['A2'] = ST.infoBold;
  styles['A3'] = ST.info;

  const HEADERS = ['#', 'Cod. S10', 'Cod. Interno', 'Material', 'Und', 'Categoria', 'Almacen', 'Cantidad', 'P. Unit. CPP', 'Subtotal'];
  const headerRow = aoa.length;
  aoa.push(HEADERS);
  HEADERS.forEach((_, c) => {
    styles[XLSX.utils.encode_cell({ r: headerRow, c })] = ST.header;
  });

  filas.forEach((f, i) => {
    const r = aoa.length;
    aoa.push([
      i + 1,
      f.codigoS10,
      f.codigoInterno,
      f.nombre,
      f.unidad,
      f.categoria,
      f.almacen,
      f.cantidad,
      f.precioUnitario,
      f.subtotal,
    ]);
    styles[XLSX.utils.encode_cell({ r, c: 0 })] = { ...ST.num, numFmt: '0' };
    styles[XLSX.utils.encode_cell({ r, c: 1 })] = { font: FNT('1E3A5F', true, 10), alignment:{horizontal:'left',vertical:'center',indent:1}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 2 })] = { font: FNT('64748B', false, 10), alignment:{horizontal:'left',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 3 })] = { font: FNT('1E293B', true, 10), alignment:{horizontal:'left',vertical:'center',indent:1,wrapText:true}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 4 })] = { font: FNT('64748B', false, 10), alignment:{horizontal:'center',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 5 })] = { font: FNT('64748B', false, 10), alignment:{horizontal:'center',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 6 })] = { font: FNT('64748B', false, 10), alignment:{horizontal:'left',vertical:'center'}, border: BORDER() };
    styles[XLSX.utils.encode_cell({ r, c: 7 })] = ST.num;
    styles[XLSX.utils.encode_cell({ r, c: 8 })] = ST.money;
    styles[XLSX.utils.encode_cell({ r, c: 9 })] = { ...ST.moneyBold, font: FNT('15803D', true, 10), fill: BG('D1FAE5') };
  });

  const totalRow = aoa.length;
  aoa.push(['', '', '', 'TOTAL VALORIZADO', '', '', '', '', '', totalGeneral]);
  HEADERS.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r: totalRow, c });
    if (c === 3) styles[ref] = ST.totalRowL;
    else if (c === 9) styles[ref] = ST.totalRowMoney;
    else styles[ref] = ST.totalRow;
  });

  const cols = [
    { wch: 5 }, { wch: 16 }, { wch: 14 }, { wch: 36 }, { wch: 6 },
    { wch: 12 }, { wch: 24 }, { wch: 11 }, { wch: 12 }, { wch: 14 },
  ];
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADERS.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: HEADERS.length - 1 } },
  ];
  const rows = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, undefined, { hpt: 26 }];

  const ws = buildStyledSheet(aoa, styles, { cols, rows, merges });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Valorizado S10');
  const fname = `Almacen_Valorizado_S10_${fechaCorte}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
};

// ──────────────────────────────────────────────────────────────
// EXPORTAR HH SEMANAL (igual que antes)
// ──────────────────────────────────────────────────────────────

export const exportarHHSemanal = (hhPorSemana, hhTotales, totalRegistros) => {
  const aoa = [];
  const styles = {};

  aoa.push(['DISTRIBUCIÓN DE HORAS HOMBRE POR SEMANA — GRAPCO SAC']);
  aoa.push([`Generado: ${new Date().toLocaleString('es-PE')}`]);
  aoa.push([]);
  aoa.push(['Semana', 'HH Normales', 'HH Extras', 'Total HH', 'Registros', '% del Total']);

  styles['A1'] = ST.titulo;
  styles['A2'] = ST.info;
  ['A4','B4','C4','D4','E4','F4'].forEach(r => { styles[r] = ST.header; });

  hhPorSemana.forEach((s, idx) => {
    const pct = hhTotales.total > 0 ? (s.total / hhTotales.total) : 0;
    const row = idx + 5;
    aoa.push([`Sem. ${s.semana}`, s.hn, s.he, s.total, s.registros, pct]);
    styles[`A${row}`] = { ...ST.num, alignment:{horizontal:'left', vertical:'center'}, font: FNT('1E3A5F', true, 10) };
    styles[`B${row}`] = ST.num;
    styles[`C${row}`] = s.he > 0 ? { ...ST.num, font: FNT('EA580C', true, 10) } : ST.num;
    styles[`D${row}`] = ST.numBold;
    styles[`E${row}`] = ST.num;
    styles[`F${row}`] = { ...ST.pct, numFmt: '0.0%' };
  });

  const totalRow = hhPorSemana.length + 5;
  aoa.push(['TOTAL', hhTotales.hn, hhTotales.he, hhTotales.total, totalRegistros, 1]);
  ['A','B','C','D','E','F'].forEach(c => {
    styles[`${c}${totalRow}`] = c === 'F'
      ? { ...ST.totalRow, numFmt: '0.0%' }
      : c === 'A' ? ST.totalRowL : ST.totalRow;
  });

  const cols = [{ wch:14 }, { wch:14 }, { wch:14 }, { wch:14 }, { wch:12 }, { wch:14 }];
  const merges = [{ s:{r:0,c:0}, e:{r:0,c:5} }, { s:{r:1,c:0}, e:{r:1,c:5} }];
  const rows = [{ hpt: 32 }, { hpt: 18 }, undefined, { hpt: 28 }];

  const ws = buildStyledSheet(aoa, styles, { cols, rows, merges });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HH Semanales');
  const fname = `HH_Semanales_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
};