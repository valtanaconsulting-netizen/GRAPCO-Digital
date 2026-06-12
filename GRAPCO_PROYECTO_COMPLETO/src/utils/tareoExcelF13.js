// src/utils/tareoExcelF13.js
// Genera el Excel del tareo usando el PROPIO archivo F13_MPO como plantilla
// (público en /plantillas/tareo-f13.xlsx): estilos, grises, bordes, colores
// del pie y logo quedan EXACTOS al original — solo se rellenan los datos.
// exceljs se importa dinámicamente (chunk aparte, no engorda el bundle).
//
// Mapa de la plantilla (hoja "Tareo"):
//   S3        fecha (formato "lunes, junio 08, 2026" viene de la celda)
//   D5        supervisor      D6  cuadrilla (capataz)
//   C10..C16  Act. 1-7        M10..M16  Act. 8-14
//   Filas 19-25 (7): B=N° C=CAR D=OCUP E=DNI G=NOMBRE L=ingreso N=salida
//                    P..Y=horas act 1-10  Z=HN  AA=HE*0.6  AB=HE  AC=TOT
//   Fila 26   totales P..Y + Z/AA/AB/AC   ·   AB27 = N° trabajadores

const HORA_INGRESO = 0.3125;             // 7:30 como fracción de día Excel
const HORA_SALIDA = 0.7083333333333334;  // 17:00

const FILA_TRAB_INI = 19;
const FILAS_TRAB_PLANTILLA = 7;          // filas 19-25
const COLS_ACT = ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

function fechaLocalDate(fechaIso) {
  const [y, m, d] = (fechaIso || '').split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // mediodía: evita corrimiento por TZ
}

// Snapshot de TODOS los estilos (bordes/grises/fuentes) de la plantilla virgen.
// exceljs PIERDE bordes de las celdas esclavas al re-aplicar merges (hojas
// clonadas y filas duplicadas) — este snapshot permite re-imponerlos al final.
export function capturarEstilos(ws, maxFila = 28, maxCol = 30) {
  const snap = {};
  for (let r = 1; r <= maxFila; r++) {
    snap[r] = {};
    for (let c = 1; c <= maxCol; c++) {
      snap[r][c] = ws.getRow(r).getCell(c).style;
    }
  }
  return snap;
}

// Re-impone los estilos del snapshot: filaDestino = filaOrigen + desplaza
function aplicarEstilosFila(ws, snap, filaOrigen, filaDestino, maxCol = 30) {
  for (let c = 1; c <= maxCol; c++) {
    if (snap[filaOrigen]?.[c]) ws.getRow(filaDestino).getCell(c).style = snap[filaOrigen][c];
  }
}

export function rellenarHoja(ws, dia, supervisor, snap) {
  const { fecha, capataz, trabajadores, actividades, totales } = dia;

  ws.getCell('S3').value = fechaLocalDate(fecha);
  ws.getCell('D5').value = supervisor;
  ws.getCell('D6').value = capataz;

  // Actividades Act.1-7 (C10..C16) y Act.8-14 (M10..M16)
  for (let i = 0; i < 7; i++) {
    ws.getCell(`C${10 + i}`).value = actividades[i] || '';
    ws.getCell(`M${10 + i}`).value = actividades[i + 7] || '';
  }

  // ¿Faltan filas? La plantilla trae 7; si hay más trabajadores se duplica la
  // última fila de datos (hereda estilos) y se re-crean sus merges E:F y G:K.
  const extra = Math.max(0, trabajadores.length + 1 - FILAS_TRAB_PLANTILLA); // +1: fila vacía de reserva
  if (extra > 0) {
    ws.duplicateRow(FILA_TRAB_INI + FILAS_TRAB_PLANTILLA - 1, extra, true);
    for (let i = 0; i < extra; i++) {
      const r = FILA_TRAB_INI + FILAS_TRAB_PLANTILLA + i;
      // re-crear los merges DNI (E:F) y NOMBRE (G:K) de cada fila insertada
      try { ws.unMergeCells(`E${r}:F${r}`); } catch { /* no estaba */ }
      try { ws.mergeCells(`E${r}:F${r}`); } catch { /* conflicto: se ve igual por overflow */ }
      try { ws.unMergeCells(`G${r}:K${r}`); } catch { /* no estaba */ }
      try { ws.mergeCells(`G${r}:K${r}`); } catch { /* conflicto: se ve igual por overflow */ }
    }
  }
  const numFilasTrab = FILAS_TRAB_PLANTILLA + extra;

  // Limpiar TODAS las filas de datos (la plantilla trae valores de ejemplo)
  for (let i = 0; i < numFilasTrab; i++) {
    const r = FILA_TRAB_INI + i;
    ['B', 'C', 'D', 'E', 'G', 'L', 'N', ...COLS_ACT, 'Z', 'AA', 'AB', 'AC'].forEach(col => {
      ws.getCell(`${col}${r}`).value = null;
    });
  }

  // Rellenar trabajadores (capataz primero, luego alfabético — ya ordenados)
  trabajadores.forEach((t, idx) => {
    const r = FILA_TRAB_INI + idx;
    ws.getCell(`B${r}`).value = idx + 1;
    ws.getCell(`C${r}`).value = t.car;
    ws.getCell(`D${r}`).value = t.ocupacion;
    ws.getCell(`E${r}`).value = t.dni || '';
    ws.getCell(`G${r}`).value = t.nombre;
    ws.getCell(`L${r}`).value = HORA_INGRESO;
    ws.getCell(`N${r}`).value = HORA_SALIDA;
    for (let n = 0; n < 10; n++) {
      const act = actividades[n];
      const v = act ? (t.actividades[act] || 0) : 0;
      if (v) ws.getCell(`${COLS_ACT[n]}${r}`).value = Number(v.toFixed(1));
    }
    ws.getCell(`Z${r}`).value = Number(t.totHN.toFixed(1));
    if (t.totHE > 0) {
      ws.getCell(`AA${r}`).value = Number((t.totHE * 0.6).toFixed(1));
      ws.getCell(`AB${r}`).value = Number(t.totHE.toFixed(1));
    }
    ws.getCell(`AC${r}`).value = Number((t.totHN + t.totHE).toFixed(1));
  });

  // Fila vacía de reserva (numerada, con 0 como el original)
  const rVacia = FILA_TRAB_INI + trabajadores.length;
  ws.getCell(`B${rVacia}`).value = trabajadores.length + 1;
  ws.getCell(`Z${rVacia}`).value = 0;
  ws.getCell(`AC${rVacia}`).value = 0;

  // Totales (la fila se desplaza si se insertaron filas extra)
  const rTot = 26 + extra;
  for (let n = 0; n < 10; n++) {
    ws.getCell(`${COLS_ACT[n]}${rTot}`).value = Number(totales.porCol[n].toFixed(1));
  }
  ws.getCell(`Z${rTot}`).value = Number(totales.hn.toFixed(1));
  ws.getCell(`AA${rTot}`).value = Number(totales.he06.toFixed(1));
  ws.getCell(`AB${rTot}`).value = Number(totales.he.toFixed(1));
  ws.getCell(`AC${rTot}`).value = Number(totales.total.toFixed(1));

  // Número de trabajadores (merge AB27:AC28 en la plantilla)
  ws.getCell(`AB${27 + extra}`).value = trabajadores.length;

  // ── Re-imponer estilos del snapshot (los merges/duplicados los pisaron) ──
  if (snap) {
    // Filas fijas 1-25 → idénticas a la plantilla
    for (let r = 1; r <= 25; r++) aplicarEstilosFila(ws, snap, r, r);
    // Filas insertadas → estilo de la última fila de datos (25)
    for (let i = 0; i < extra; i++) aplicarEstilosFila(ws, snap, 25, 26 + i);
    // Pie (26-28 en plantilla) → desplazado `extra` filas
    for (let r = 26; r <= 28; r++) aplicarEstilosFila(ws, snap, r, r + extra);
  }
}

// Clona la hoja plantilla (estilos, merges, anchos, altos e imagen del logo)
export function clonarHoja(wb, plantilla, nombre, snap) {
  const nueva = wb.addWorksheet(nombre);
  nueva.model = Object.assign({}, JSON.parse(JSON.stringify(plantilla.model)), {
    name: nombre,
    mergeCells: plantilla.model.merges,
  });
  nueva.name = nombre;
  // Anchos de columna explícitos (el .model a veces los reporta distinto)
  for (let c = 1; c <= 30; c++) {
    const w = plantilla.getColumn(c).width;
    if (w) nueva.getColumn(c).width = w;
  }
  // Re-imponer estilos celda a celda: re-aplicar merges via .model pisa los
  // bordes de las celdas esclavas (los merges toman el estilo de la master)
  if (snap) for (let r = 1; r <= 28; r++) aplicarEstilosFila(nueva, snap, r, r);
  // Re-anclar el logo (las imágenes no viajan con .model)
  try {
    plantilla.getImages().forEach(img => {
      nueva.addImage(Number(img.imageId), img.range);
    });
  } catch { /* sin logo en la copia — el contenido queda intacto */ }
  return nueva;
}

export async function generarExcelTareoF13(registrosPorDia, personalDB, supervisor = 'DIRAC') {
  const [{ prepararDatosTareo }, ExcelJSmod] = await Promise.all([
    import('./tareoDatos.js'),
    import('exceljs'),
  ]);
  const ExcelJS = ExcelJSmod.default || ExcelJSmod;

  const datos = prepararDatosTareo(registrosPorDia, personalDB);
  if (!datos.length) throw new Error('Sin registros para exportar');

  const resp = await fetch('/plantillas/tareo-f13.xlsx');
  if (!resp.ok) throw new Error('No se pudo cargar la plantilla del tareo');
  const buf = await resp.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const plantilla = wb.getWorksheet('Tareo');
  if (!plantilla) throw new Error('La plantilla no tiene hoja "Tareo"');

  // Fuera la hoja secundaria de la plantilla
  const sinLiq = wb.getWorksheet('SIN LIQUIDADOS');
  if (sinLiq) wb.removeWorksheet(sinLiq.id);

  // Snapshot de estilos de la plantilla VIRGEN — clonado y duplicado de filas
  // pisan bordes de celdas merged; el snapshot los restaura al final.
  const snap = capturarEstilos(plantilla);

  // 1° CLONAR todas las hojas desde la plantilla VIRGEN (si se rellenara antes
  // de clonar, los clones heredarían los datos del primer día), 2° rellenar.
  const hojas = datos.map((dia, i) => {
    const nombreHoja = `${dia.fecha}`.replace(/[^\w-]/g, '').slice(0, 31) || `Dia${i + 1}`;
    if (i === 0) { plantilla.name = nombreHoja; return plantilla; }
    return clonarHoja(wb, plantilla, nombreHoja, snap);
  });
  hojas.forEach((ws, i) => rellenarHoja(ws, datos[i], supervisor, snap));

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechas = datos.map(d => d.fecha);
  a.href = url;
  a.download = fechas.length > 1
    ? `Tareo_${fechas[0]}_a_${fechas[fechas.length - 1]}.xlsx`
    : `Tareo_${fechas[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return datos.length;
}
