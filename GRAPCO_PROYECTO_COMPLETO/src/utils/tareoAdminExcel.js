// src/utils/tareoAdminExcel.js
// TAREO ADMIN PARA PAGO — Excel con exceljs (estilos completos, lazy):
//
//   Hoja 1 «HH por Día»: bloques por SEMANA del proyecto. Trabajadores en
//     filas; por cada día L-D tres subcolumnas: HN | HE 60% | HE 100%.
//     Las 2 PRIMERAS horas extra del día pagan +60% (160%); de la 3.ª en
//     adelante pagan +100% (200%). Totales por día, por semana y por mes.
//
//   Hoja 2 «Por Actividad»: bloques por SEMANA. Matriz trabajadores ×
//     actividades AGRUPADAS POR PARTIDA (encabezado de dos niveles), con
//     totales por actividad, por partida y por trabajador.
//
//   Hoja 3 «Resumen Pago»: consolidado por trabajador para planilla.
//
// Nombres SIEMPRE canónicos (APELLIDOS NOMBRES, sin duplicar) — ver
// utils/nombresCanonicos. El cargo/DNI salen de la ficha de Personal.
import { crearResolverNombre } from './nombresCanonicos.js';

const NAVY = 'FF0F2A47';
const GREY = 'FFD9D9D9';
const GOLD = 'FFFCEFC9';
const PEACH = 'FFFDE9D9';
const GREEN = 'FFE2EFDA';
const SALMON = 'FFF8B9B9';
const DIAS_LBL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const bordeFino = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

const celda = (ws, ref, valor, { bold = false, fill = '', center = true, size = 9, fmt = '', color = '' } = {}) => {
  const c = ws.getCell(ref);
  c.value = valor;
  c.font = { name: 'Calibri', size, bold, color: color ? { argb: color } : undefined };
  if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  c.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true };
  c.border = bordeFino;
  if (fmt) c.numFmt = fmt;
  return c;
};

const fechaDe = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const isoDe = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
// Lunes de la semana de una fecha
const lunesDe = (iso) => { const dt = fechaDe(iso); const dow = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - dow); return dt; };
const fmtCorto = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;

// Reparto legal de las HE de UN día: 2 primeras al 60%, resto al 100%
const repartirHE = (he) => ({ he60: Math.min(he, 2), he100: Math.max(0, he - 2) });

export async function generarTareoAdminExcel(registros, personalDB, fechaIni, fechaFin) {
  const ExcelJSmod = await import('exceljs');
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;

  const resolverNombre = crearResolverNombre(registros || [], personalDB || []);
  const fichaPorCanonico = {};
  (personalDB || []).forEach(p => {
    if (!p?.nombre) return;
    const c = resolverNombre(p.nombre);
    if (c && !fichaPorCanonico[c]) fichaPorCanonico[c] = p;
  });

  // ── Acumular: trabajador → día → {hn, he} · y → semana → actividad ──
  // (todo con nombre canónico; partida/actividad canónicas si existen)
  const porDia = {};            // nombre → { iso: {hn, he} }
  const porSemAct = {};         // semana → nombre → actKey → hh
  const porSemDiaAct = {};      // semana → fechaIso → nombre → actKey → hh
  const actInfo = {};           // actKey → { partida, actividad }
  const semanas = new Set();
  const nombres = new Set();

  (registros || []).forEach(r => {
    if (!r?.fecha) return;
    const sem = r.semana ?? '?';
    semanas.add(sem);
    const partida = (r._partidaCanonica || r.partida || 'SIN PARTIDA').toUpperCase();
    const act = r._actividadCanonica || r.actividad || 'SIN ACTIVIDAD';
    const actKey = `${partida}__${act}`;
    if (!actInfo[actKey]) actInfo[actKey] = { partida, actividad: act };

    (r.detalleTareo || []).forEach(t => {
      if (!t?.nombre) return;
      const nom = resolverNombre(t.nombre).replace(/\s*,\s*/g, ' ');
      nombres.add(nom);
      const hn = parseFloat(t.hn) || 0;
      const he = parseFloat(t.he) || 0;
      if (!porDia[nom]) porDia[nom] = {};
      if (!porDia[nom][r.fecha]) porDia[nom][r.fecha] = { hn: 0, he: 0 };
      porDia[nom][r.fecha].hn += hn;
      porDia[nom][r.fecha].he += he;
      if (!porSemAct[sem]) porSemAct[sem] = {};
      if (!porSemAct[sem][nom]) porSemAct[sem][nom] = {};
      porSemAct[sem][nom][actKey] = (porSemAct[sem][nom][actKey] || 0) + hn + he;
      if (!porSemDiaAct[sem]) porSemDiaAct[sem] = {};
      if (!porSemDiaAct[sem][r.fecha]) porSemDiaAct[sem][r.fecha] = {};
      if (!porSemDiaAct[sem][r.fecha][nom]) porSemDiaAct[sem][r.fecha][nom] = {};
      porSemDiaAct[sem][r.fecha][nom][actKey] = (porSemDiaAct[sem][r.fecha][nom][actKey] || 0) + hn + he;
    });
  });

  // Capataz primero, resto alfabético
  const listaNombres = [...nombres].sort((a, b) => {
    const ca = fichaPorCanonico[a]?.cargo === 'Capataz', cb = fichaPorCanonico[b]?.cargo === 'Capataz';
    if (ca && !cb) return -1;
    if (cb && !ca) return 1;
    return a.localeCompare(b);
  });

  // Semanas presentes, con su lunes (derivado de las fechas reales)
  const semanasOrden = [...semanas].sort((a, b) => a - b);
  const lunesDeSemana = {};
  (registros || []).forEach(r => {
    if (!r?.fecha) return;
    const sem = r.semana ?? '?';
    const lun = lunesDe(r.fecha);
    if (!lunesDeSemana[sem] || lun < lunesDeSemana[sem]) lunesDeSemana[sem] = lun;
  });

  const wb = new ExcelJS.Workbook();

  // ════════════════ HOJA 1 — HH POR DÍA (semanas L-D) ════════════════
  const ws1 = wb.addWorksheet('HH por Día');
  ws1.getColumn(1).width = 4;
  ws1.getColumn(2).width = 38;
  for (let c = 3; c <= 3 + 7 * 3 + 4; c++) ws1.getColumn(c).width = 6.5;

  let fila = 1;
  ws1.mergeCells(fila, 1, fila, 27);
  celda(ws1, `A${fila}`, 'CONTROL DE HH NORMALES Y EXTRAS POR DÍA', { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 12 });
  fila++;
  ws1.mergeCells(fila, 1, fila, 27);
  celda(ws1, `A${fila}`, `Período: ${fechaIni} al ${fechaFin} · HE: 2 primeras horas +60% (160%) · 3.ª en adelante +100% (200%)`, { size: 9 });
  fila += 2;

  const totalMes = {};  // 'YYYY-MM' → {hn, he60, he100}

  for (const sem of semanasOrden) {
    const lun = lunesDeSemana[sem];
    if (!lun) continue;
    const diasIso = [...Array(7)].map((_, i) => { const d = new Date(lun); d.setDate(d.getDate() + i); return d; });

    // Título de semana
    ws1.mergeCells(fila, 1, fila, 27);
    celda(ws1, `A${fila}`, `SEMANA ${sem}  (${fmtCorto(diasIso[0])} al ${fmtCorto(diasIso[6])})`, { bold: true, fill: GOLD, size: 11 });
    fila++;

    // Encabezado 2 niveles: día (colspan 3) → HN | 60% | 100%
    const fDia = fila, fSub = fila + 1;
    ws1.mergeCells(fDia, 1, fSub, 1); celda(ws1, `A${fDia}`, '#', { bold: true, fill: GREY });
    ws1.mergeCells(fDia, 2, fSub, 2); celda(ws1, `B${fDia}`, 'TRABAJADOR', { bold: true, fill: GREY });
    diasIso.forEach((d, i) => {
      const c0 = 3 + i * 3;
      ws1.mergeCells(fDia, c0, fDia, c0 + 2);
      celda(ws1, ws1.getRow(fDia).getCell(c0).address, `${DIAS_LBL[i]} ${fmtCorto(d)}`, { bold: true, fill: GREY });
      ['HN', '60%', '100%'].forEach((lbl, j) =>
        celda(ws1, ws1.getRow(fSub).getCell(c0 + j).address, lbl, { bold: true, fill: GREY, size: 7.5 }));
    });
    const cTot = 3 + 21;
    ws1.mergeCells(fDia, cTot, fDia, cTot + 3);
    celda(ws1, ws1.getRow(fDia).getCell(cTot).address, 'TOTAL SEMANA', { bold: true, fill: GREY });
    ['HN', '60%', '100%', 'HH'].forEach((lbl, j) =>
      celda(ws1, ws1.getRow(fSub).getCell(cTot + j).address, lbl, { bold: true, fill: GREY, size: 7.5 }));
    fila += 2;

    // Filas de trabajadores
    const sumDia = diasIso.map(() => ({ hn: 0, he60: 0, he100: 0 }));
    listaNombres.forEach((nom, idx) => {
      // ¿Trabajó esta semana?
      const tieneDatos = diasIso.some(d => porDia[nom]?.[isoDe(d)]);
      if (!tieneDatos) return;
      celda(ws1, `A${fila}`, idx + 1, { size: 8 });
      celda(ws1, `B${fila}`, nom, { center: false, bold: true, size: 8 });
      let sHN = 0, s60 = 0, s100 = 0;
      diasIso.forEach((d, i) => {
        const reg = porDia[nom]?.[isoDe(d)];
        const c0 = 3 + i * 3;
        if (reg) {
          const { he60, he100 } = repartirHE(reg.he);
          celda(ws1, ws1.getRow(fila).getCell(c0).address, reg.hn || '', { size: 8 });
          celda(ws1, ws1.getRow(fila).getCell(c0 + 1).address, he60 || '', { size: 8 });
          celda(ws1, ws1.getRow(fila).getCell(c0 + 2).address, he100 || '', { size: 8 });
          sHN += reg.hn; s60 += he60; s100 += he100;
          sumDia[i].hn += reg.hn; sumDia[i].he60 += he60; sumDia[i].he100 += he100;
          const mesKey = isoDe(d).slice(0, 7);
          if (!totalMes[mesKey]) totalMes[mesKey] = { hn: 0, he60: 0, he100: 0 };
          totalMes[mesKey].hn += reg.hn; totalMes[mesKey].he60 += he60; totalMes[mesKey].he100 += he100;
        } else {
          for (let j = 0; j < 3; j++) celda(ws1, ws1.getRow(fila).getCell(c0 + j).address, '', {});
        }
      });
      celda(ws1, ws1.getRow(fila).getCell(cTot).address, sHN || 0, { bold: true, size: 8, fill: GREEN });
      celda(ws1, ws1.getRow(fila).getCell(cTot + 1).address, s60 || 0, { bold: true, size: 8, fill: GREEN });
      celda(ws1, ws1.getRow(fila).getCell(cTot + 2).address, s100 || 0, { bold: true, size: 8, fill: GREEN });
      celda(ws1, ws1.getRow(fila).getCell(cTot + 3).address, sHN + s60 + s100 ? Number((sHN + s60 + s100).toFixed(1)) : 0, { bold: true, size: 8, fill: SALMON });
      fila++;
    });

    // TOTAL DÍA
    ws1.mergeCells(fila, 1, fila, 2);
    celda(ws1, `A${fila}`, 'TOTAL DÍA', { bold: true, fill: PEACH });
    let tHN = 0, t60 = 0, t100 = 0;
    diasIso.forEach((d, i) => {
      const c0 = 3 + i * 3;
      celda(ws1, ws1.getRow(fila).getCell(c0).address, sumDia[i].hn ? Number(sumDia[i].hn.toFixed(1)) : '', { bold: true, fill: PEACH, size: 8 });
      celda(ws1, ws1.getRow(fila).getCell(c0 + 1).address, sumDia[i].he60 ? Number(sumDia[i].he60.toFixed(1)) : '', { bold: true, fill: PEACH, size: 8 });
      celda(ws1, ws1.getRow(fila).getCell(c0 + 2).address, sumDia[i].he100 ? Number(sumDia[i].he100.toFixed(1)) : '', { bold: true, fill: PEACH, size: 8 });
      tHN += sumDia[i].hn; t60 += sumDia[i].he60; t100 += sumDia[i].he100;
    });
    celda(ws1, ws1.getRow(fila).getCell(cTot).address, Number(tHN.toFixed(1)), { bold: true, fill: GREEN });
    celda(ws1, ws1.getRow(fila).getCell(cTot + 1).address, Number(t60.toFixed(1)), { bold: true, fill: GREEN });
    celda(ws1, ws1.getRow(fila).getCell(cTot + 2).address, Number(t100.toFixed(1)), { bold: true, fill: GREEN });
    celda(ws1, ws1.getRow(fila).getCell(cTot + 3).address, Number((tHN + t60 + t100).toFixed(1)), { bold: true, fill: SALMON });
    fila++;

    // TOTAL SEMANA (HH global de la semana)
    ws1.mergeCells(fila, 1, fila, 2);
    celda(ws1, `A${fila}`, `TOTAL SEMANA ${sem}`, { bold: true, fill: GOLD });
    ws1.mergeCells(fila, 3, fila, cTot - 1);
    celda(ws1, `C${fila}`, `HN: ${tHN.toFixed(1)}   ·   HE 60%: ${t60.toFixed(1)}   ·   HE 100%: ${t100.toFixed(1)}   ·   HH TOTAL: ${(tHN + t60 + t100).toFixed(1)}`, { bold: true, fill: GOLD });
    ws1.mergeCells(fila, cTot, fila, cTot + 3);
    celda(ws1, ws1.getRow(fila).getCell(cTot).address, Number((tHN + t60 + t100).toFixed(1)), { bold: true, fill: SALMON, size: 10 });
    fila += 2; // espacio entre semanas
  }

  // TOTAL POR MES
  ws1.mergeCells(fila, 1, fila, 27);
  celda(ws1, `A${fila}`, 'TOTAL POR MES', { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 11 });
  fila++;
  ['MES', 'HN', 'HE 60%', 'HE 100%', 'HH TOTAL'].forEach((lbl, j) => {
    const col = j === 0 ? 2 : 2 + j * 2;
    if (j === 0) { ws1.mergeCells(fila, 1, fila, 2); celda(ws1, `A${fila}`, lbl, { bold: true, fill: GREY }); }
    else { ws1.mergeCells(fila, col + 1, fila, col + 2); celda(ws1, ws1.getRow(fila).getCell(col + 1).address, lbl, { bold: true, fill: GREY }); }
  });
  fila++;
  Object.keys(totalMes).sort().forEach(mesKey => {
    const [y, m] = mesKey.split('-').map(Number);
    const t = totalMes[mesKey];
    ws1.mergeCells(fila, 1, fila, 2);
    celda(ws1, `A${fila}`, `${MESES[m - 1].toUpperCase()} ${y}`, { bold: true });
    [[t.hn, GREEN], [t.he60, GREEN], [t.he100, GREEN], [t.hn + t.he60 + t.he100, SALMON]].forEach(([v, f], j) => {
      const col = 2 + (j + 1) * 2;
      ws1.mergeCells(fila, col + 1, fila, col + 2);
      celda(ws1, ws1.getRow(fila).getCell(col + 1).address, Number(v.toFixed(1)), { bold: true, fill: f });
    });
    fila++;
  });

  // ════════════════ HOJA 2 — POR ACTIVIDAD (partida → actividad) ════════════════
  const ws2 = wb.addWorksheet('Por Actividad');
  ws2.getColumn(1).width = 4;
  ws2.getColumn(2).width = 38;

  let f2 = 1;
  ws2.mergeCells(f2, 1, f2, 16);
  celda(ws2, `A${f2}`, 'HH POR PARTIDA Y ACTIVIDAD — SEMANAL', { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 12 });
  f2++;
  ws2.mergeCells(f2, 1, f2, 16);
  celda(ws2, `A${f2}`, `Período: ${fechaIni} al ${fechaFin} · HH = horas normales + extras`, { size: 9 });
  f2 += 2;

  // Pinta una matriz trabajadores × actividades (con encabezado de 2 niveles
  // PARTIDA → actividad y totales por actividad/partida). Devuelve la fila
  // siguiente. Se usa para CADA DÍA y para el consolidado semanal.
  const pintarMatriz = (fIni, titulo, tituloFill, datosNomAct) => {
    let f = fIni;
    const actKeys = [...new Set(Object.values(datosNomAct).flatMap(o => Object.keys(o)))]
      .sort((a, b) => a.localeCompare(b));
    if (!actKeys.length) return f;
    const nCols = actKeys.length;

    ws2.mergeCells(f, 1, f, 2 + nCols + 1);
    celda(ws2, `A${f}`, titulo, { bold: true, fill: tituloFill, size: 10 });
    f++;

    // Encabezado nivel 1: PARTIDA (merge sobre sus actividades) · nivel 2: actividad
    const fPart = f, fAct = f + 1;
    ws2.mergeCells(fPart, 1, fAct, 1); celda(ws2, `A${fPart}`, '#', { bold: true, fill: GREY });
    ws2.mergeCells(fPart, 2, fAct, 2); celda(ws2, `B${fPart}`, 'TRABAJADOR', { bold: true, fill: GREY });
    let c = 3, i = 0;
    while (i < nCols) {
      const partida = actInfo[actKeys[i]].partida;
      let j = i;
      while (j < nCols && actInfo[actKeys[j]].partida === partida) j++;
      ws2.mergeCells(fPart, c, fPart, c + (j - i) - 1);
      celda(ws2, ws2.getRow(fPart).getCell(c).address, partida, { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 8 });
      for (let k = i; k < j; k++) {
        if (!ws2.getColumn(c + (k - i)).width || ws2.getColumn(c + (k - i)).width < 14) ws2.getColumn(c + (k - i)).width = 14;
        celda(ws2, ws2.getRow(fAct).getCell(c + (k - i)).address, actInfo[actKeys[k]].actividad, { bold: true, fill: GREY, size: 7 });
      }
      c += (j - i);
      i = j;
    }
    ws2.mergeCells(fPart, c, fAct, c);
    if (!ws2.getColumn(c).width || ws2.getColumn(c).width < 9) ws2.getColumn(c).width = 9;
    celda(ws2, ws2.getRow(fPart).getCell(c).address, 'TOTAL HH', { bold: true, fill: GREY });
    f += 2;

    // Filas de trabajadores
    const totalPorAct = actKeys.map(() => 0);
    listaNombres.forEach((nom, idx) => {
      const o = datosNomAct[nom];
      if (!o) return;
      celda(ws2, `A${f}`, idx + 1, { size: 8 });
      celda(ws2, `B${f}`, nom, { center: false, bold: true, size: 8 });
      let suma = 0;
      actKeys.forEach((k, kk) => {
        const v = o[k] || 0;
        suma += v;
        totalPorAct[kk] += v;
        celda(ws2, ws2.getRow(f).getCell(3 + kk).address, v ? Number(v.toFixed(1)) : '', { size: 8 });
      });
      celda(ws2, ws2.getRow(f).getCell(3 + nCols).address, Number(suma.toFixed(1)), { bold: true, fill: GREEN, size: 8 });
      f++;
    });

    // TOTAL POR ACTIVIDAD
    ws2.mergeCells(f, 1, f, 2);
    celda(ws2, `A${f}`, 'TOTAL ACTIVIDAD', { bold: true, fill: PEACH });
    let granTotal = 0;
    actKeys.forEach((k, kk) => {
      granTotal += totalPorAct[kk];
      celda(ws2, ws2.getRow(f).getCell(3 + kk).address, totalPorAct[kk] ? Number(totalPorAct[kk].toFixed(1)) : '', { bold: true, fill: PEACH, size: 8 });
    });
    celda(ws2, ws2.getRow(f).getCell(3 + nCols).address, Number(granTotal.toFixed(1)), { bold: true, fill: SALMON });
    f++;

    // TOTAL POR PARTIDA (mismos merges que el encabezado)
    ws2.mergeCells(f, 1, f, 2);
    celda(ws2, `A${f}`, 'TOTAL PARTIDA', { bold: true, fill: GOLD });
    c = 3; i = 0;
    while (i < nCols) {
      const partida = actInfo[actKeys[i]].partida;
      let j = i, sumaP = 0;
      while (j < nCols && actInfo[actKeys[j]].partida === partida) { sumaP += totalPorAct[j]; j++; }
      ws2.mergeCells(f, c, f, c + (j - i) - 1);
      celda(ws2, ws2.getRow(f).getCell(c).address, Number(sumaP.toFixed(1)), { bold: true, fill: GOLD });
      c += (j - i); i = j;
    }
    celda(ws2, ws2.getRow(f).getCell(3 + nCols).address, Number(granTotal.toFixed(1)), { bold: true, fill: SALMON });
    return f + 1;
  };

  for (const sem of semanasOrden) {
    const datosSem = porSemAct[sem];
    if (!datosSem) continue;

    ws2.mergeCells(f2, 1, f2, 16);
    celda(ws2, `A${f2}`, `SEMANA ${sem}`, { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 11 });
    f2 += 1;

    // ── DÍA POR DÍA: una matriz por cada día con registros ──
    const fechasSem = Object.keys(porSemDiaAct[sem] || {}).sort();
    for (const iso of fechasSem) {
      const dt = fechaDe(iso);
      const nombreDia = DIAS_LBL[(dt.getDay() + 6) % 7];
      f2 = pintarMatriz(f2, `${nombreDia} ${fmtCorto(dt)}`, GOLD, porSemDiaAct[sem][iso]);
    }

    // ── CONSOLIDADO DE LA SEMANA ──
    f2 = pintarMatriz(f2, `CONSOLIDADO SEMANA ${sem}`, PEACH, datosSem);
    f2 += 1; // espacio entre semanas
  }

  // ════════════════ HOJA 3 — RESUMEN PAGO ════════════════
  const ws3 = wb.addWorksheet('Resumen Pago');
  const cols3 = [5, 11, 38, 13, 7, 9, 9, 9, 10];
  cols3.forEach((w, i) => { ws3.getColumn(i + 1).width = w; });
  let f3 = 1;
  ws3.mergeCells(f3, 1, f3, 9);
  celda(ws3, `A${f3}`, 'TAREO CONSOLIDADO PARA PAGO', { bold: true, fill: NAVY, color: 'FFFFFFFF', size: 12 });
  f3++;
  ws3.mergeCells(f3, 1, f3, 9);
  celda(ws3, `A${f3}`, `Período: ${fechaIni} al ${fechaFin}`, { size: 9 });
  f3 += 2;
  ['#', 'DNI', 'APELLIDOS Y NOMBRES', 'CARGO', 'DÍAS', 'HN', 'HE 60%', 'HE 100%', 'HH TOTAL'].forEach((lbl, j) =>
    celda(ws3, ws3.getRow(f3).getCell(j + 1).address, lbl, { bold: true, fill: GREY }));
  f3++;
  let g = { dias: 0, hn: 0, he60: 0, he100: 0 };
  listaNombres.forEach((nom, idx) => {
    const dias = Object.keys(porDia[nom] || {});
    let hn = 0, he60 = 0, he100 = 0;
    dias.forEach(d => {
      const reg = porDia[nom][d];
      const rep = repartirHE(reg.he);
      hn += reg.hn; he60 += rep.he60; he100 += rep.he100;
    });
    const ficha = fichaPorCanonico[nom] || {};
    [[idx + 1], [ficha.dni || '—'], [nom, false], [ficha.cargo || '—'], [dias.length],
     [Number(hn.toFixed(1))], [Number(he60.toFixed(1))], [Number(he100.toFixed(1))],
     [Number((hn + he60 + he100).toFixed(1)), true, SALMON],
    ].forEach(([v, b, f], j) => celda(ws3, ws3.getRow(f3).getCell(j + 1).address, v, { center: j !== 2, bold: j === 2 || !!b, fill: f || '', size: 8.5 }));
    g.dias += dias.length; g.hn += hn; g.he60 += he60; g.he100 += he100;
    f3++;
  });
  ws3.mergeCells(f3, 1, f3, 4);
  celda(ws3, `A${f3}`, 'TOTALES', { bold: true, fill: GOLD });
  [[g.dias], [Number(g.hn.toFixed(1))], [Number(g.he60.toFixed(1))], [Number(g.he100.toFixed(1))], [Number((g.hn + g.he60 + g.he100).toFixed(1))]]
    .forEach(([v], j) => celda(ws3, ws3.getRow(f3).getCell(j + 5).address, v, { bold: true, fill: j === 4 ? SALMON : GOLD }));

  // ── Descargar ──
  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tareo_Admin_${fechaIni}_a_${fechaFin}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return { trabajadores: listaNombres.length, semanas: semanasOrden.length };
}
