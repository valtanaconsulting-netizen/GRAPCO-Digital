// src/utils/import/csvParser.js — Parser CSV simple sin dependencias (B25)
//
// Soporta CSV exportado desde Excel/S10. Detecta separador (, ; tab),
// quotes, y escape de quotes con doble quote.

/**
 * Parse CSV a array de objetos. Primera fila = headers.
 * Devuelve { headers: string[], rows: Object[], errors: string[] }
 */
export function parseCSV(text, opts = {}) {
  const { delimiter = null, skipEmpty = true } = opts;
  if (!text || !text.trim()) return { headers: [], rows: [], errors: ['Archivo vacío'] };

  // Detectar delimitador automáticamente
  const sep = delimiter || detectDelimiter(text);

  const lines = parseLines(text, sep);
  if (lines.length === 0) return { headers: [], rows: [], errors: ['Sin líneas'] };

  const headers = lines[0].map(h => h.trim());
  const errors = [];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const linea = lines[i];
    if (skipEmpty && linea.every(c => !c || !c.trim())) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = linea[idx] !== undefined ? linea[idx] : '';
    });
    rows.push(obj);
  }
  return { headers, rows, errors };
}

function detectDelimiter(text) {
  const muestra = text.split('\n').slice(0, 5).join('\n');
  const candidatos = [',', ';', '\t', '|'];
  let mejor = ',', mejorCount = 0;
  for (const sep of candidatos) {
    const c = (muestra.match(new RegExp(`\\${sep === '\t' ? 't' : sep}`, 'g')) || []).length;
    if (c > mejorCount) { mejor = sep; mejorCount = c; }
  }
  return mejor;
}

/**
 * Parse texto CSV a líneas, respetando quotes y escapes.
 */
function parseLines(text, sep) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { cell += '"'; i += 2; continue; }
      if (ch === '"') { inQuote = false; i++; continue; }
      cell += ch; i++; continue;
    }

    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === sep) { row.push(cell); cell = ''; i++; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); cell = '';
      lines.push(row); row = [];
      i++; continue;
    }
    cell += ch; i++;
  }
  if (cell || row.length > 0) { row.push(cell); lines.push(row); }
  return lines;
}

/**
 * Mapea filas de un CSV a actividades del Plan Maestro.
 * Detecta automáticamente las columnas más comunes.
 *
 * Columnas reconocidas (case-insensitive):
 * - código / codigo / item / partida
 * - descripcion / descripción / nombre / partida
 * - unidad / und / unit
 * - metrado / cantidad / qty
 * - precio / pu / p.u. / precio unitario
 * - hh / horas hombre / hh presupuestado
 *
 * Devuelve { actividades, errores, columnasDetectadas }
 */
export function mapearCSVAActividades(headers, rows) {
  const errores = [];
  const norm = (s) => (s || '').toString().toLowerCase().trim();

  // Mapear columnas
  const findCol = (candidatos) => {
    for (const cand of candidatos) {
      const idx = headers.findIndex(h => norm(h) === cand || norm(h).includes(cand));
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  const colCodigo = findCol(['código', 'codigo', 'item', 'partida', 'cod']);
  const colDesc   = findCol(['descripcion', 'descripción', 'nombre']);
  const colUnidad = findCol(['unidad', 'und', 'unit']);
  const colMetra  = findCol(['metrado', 'cantidad', 'qty', 'metr']);
  const colPrecio = findCol(['precio unitario', 'p.u.', 'pu ', 'pu', 'precio']);
  const colHH     = findCol(['hh', 'horas']);

  const columnasDetectadas = { colCodigo, colDesc, colUnidad, colMetra, colPrecio, colHH };

  if (!colCodigo) errores.push('No se detectó columna "código" o "partida"');
  if (!colDesc) errores.push('No se detectó columna "descripción" o "nombre"');

  if (errores.length > 0) return { actividades: [], errores, columnasDetectadas };

  const actividades = rows.map((r, idx) => {
    const cod = (r[colCodigo] || '').toString().trim();
    const desc = (r[colDesc] || '').toString().trim();
    if (!cod || !desc) return null;

    const metra = parseFloat((r[colMetra] || '0').toString().replace(/[,]/g, '').replace(/\s/g, ''));
    const precio = parseFloat((r[colPrecio] || '0').toString().replace(/[,]/g, '').replace(/\s/g, ''));
    const hh = parseFloat((r[colHH] || '0').toString().replace(/[,]/g, '').replace(/\s/g, ''));

    return {
      codigo: cod,
      descripcion: desc,
      unidad: (r[colUnidad] || '').toString().trim() || null,
      metradoContractual: isNaN(metra) ? 0 : metra,
      precioUnitario: isNaN(precio) ? 0 : precio,
      hhTotalPresupuestado: isNaN(hh) ? 0 : hh,
      estado: 'no_iniciada',
      avanceMetradoAcum: 0,
      hhAcumReal: 0,
      costoRealAcum: 0,
      predecesoras: [],
      _filaCSV: idx + 2, // 1-indexed + header
    };
  }).filter(Boolean);

  return { actividades, errores, columnasDetectadas };
}

/**
 * Mapea filas a estructura WBS jerárquica: Partida → Subpartida → Actividad,
 * con Metrado, HH e IP por actividad. Para importar el plan de un proyecto nuevo.
 * Detecta encabezados flexibles (acentos / variantes).
 * Devuelve { items, errores, columnasDetectadas }
 */
export function mapearWBS(headers, rows) {
  const errores = [];
  const norm = (s) => (s || '').toString().toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  const findCol = (cands) => {
    for (const c of cands) {
      const i = headers.findIndex(h => { const n = norm(h); return n === c || n.includes(c); });
      if (i !== -1) return headers[i];
    }
    return null;
  };
  const num = (v) => {
    const n = parseFloat((v ?? '').toString().replace(/,/g, '').replace(/\s/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const cPart = findCol(['partida']);
  const cSub  = findCol(['subpartida', 'sub-partida', 'sub partida']);
  const cAct  = findCol(['actividad', 'descripcion', 'descripción', 'nombre']);
  const cUnd  = findCol(['unidad', 'und', 'unit']);
  const cMet  = findCol(['metrado', 'cantidad', 'metr', 'qty']);
  const cHH   = findCol(['hh', 'horas hombre', 'horas']);
  const cIP   = findCol(['ip meta', 'ip', 'indice productividad', 'índice de productividad', 'rendimiento']);

  const columnasDetectadas = { cPart, cSub, cAct, cUnd, cMet, cHH, cIP };
  if (!cPart) errores.push('No se detectó la columna "Partida"');
  if (!cAct)  errores.push('No se detectó la columna "Actividad"');
  if (errores.length) return { items: [], errores, columnasDetectadas };

  let lastPart = '', lastSub = '';
  const items = rows.map((r, idx) => {
    // Arrastra partida/subpartida si la fila viene vacía (Excel jerárquico típico)
    const part = (r[cPart] || '').toString().trim() || lastPart;
    const sub  = (cSub ? (r[cSub] || '').toString().trim() : '') || (r[cPart] ? '' : lastSub);
    const act  = (r[cAct] || '').toString().trim();
    if (part) lastPart = part;
    if (cSub && (r[cSub] || '').toString().trim()) lastSub = (r[cSub]).toString().trim();
    if (!act) return null;

    return {
      partida: part.toUpperCase(),
      subpartida: (sub || '').toUpperCase(),
      actividad: act,
      descripcion: act,
      codigo: '',
      unidad: cUnd ? (r[cUnd] || '').toString().trim() || 'UND' : 'UND',
      metradoContractual: cMet ? num(r[cMet]) : 0,
      hhTotalPresupuestado: cHH ? num(r[cHH]) : 0,
      ipMeta: cIP ? num(r[cIP]) : 0,
      estado: 'no_iniciada',
      avanceMetradoAcum: 0,
      hhAcumReal: 0,
      costoRealAcum: 0,
      predecesoras: [],
      _filaCSV: idx + 2,
    };
  }).filter(Boolean);

  if (items.length === 0) errores.push('No se encontraron filas con actividad válida');
  return { items, errores, columnasDetectadas };
}
