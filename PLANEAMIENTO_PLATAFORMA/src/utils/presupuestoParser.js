// src/utils/presupuestoParser.js
// Lee el PPTTO oficial GRAPCO (formato GP-GCE-FOR-F01) y extrae:
//   - PARTIDAS canónicas del RO (códigos 1001..10xx) con su Ppto por frente (F1/F2).
//     → es la MISMA taxonomía que consume el motor del Resultado Operativo (F06),
//       por eso el Presupuesto "conversa" con el RO sin inventar códigos nuevos.
//   - RESUMEN comercial del presupuesto (Costo Directo → GG → Utilidad → IGV → Total)
//     leído de la hoja "PPTO" (o calculado por defecto si no aparece).
//
// El parseo es por DETECCIÓN (no por índice fijo) para tolerar variaciones de layout
// entre revisiones del Excel.

// Código de partida canónica del RO: 1001..1099 (4 dígitos que empiezan en 10).
const RE_PARTIDA = /^\s*10\d{2}\s*$/;

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const up = (s) => sinTildes(s).toUpperCase().replace(/\s+/g, ' ').trim();

// "1,234.56" | "S/ 1.234,56" | número → number
export function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/s\/\.?|soles|pen|%/gi, '').replace(/\s/g, '');
  if (!s) return 0;
  const coma = s.includes(','), punto = s.includes('.');
  if (coma && punto) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (coma) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  }
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Lee un workbook (xlsx) y devuelve filas (array-of-arrays) de una hoja por nombre.
function hojaAoA(XLSX, wb, nombreExacto) {
  const nombre = wb.SheetNames.find((n) => up(n) === up(nombreExacto));
  if (!nombre) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: '', raw: true });
}

// ── Partidas canónicas (1001..) con sus montos por frente ──────────
// pista: en la hoja RO las columnas son  A=recurso B=FRENTE C=PARTIDA D=Descripción
//        E=Ppto F1 (PTARI)  F=Ppto F2 (NAVE). Detectamos la columna PARTIDA por la
//        frecuencia de códigos 10xx y leemos descripción + montos a su derecha.
function extraerPartidas(aoa) {
  if (!aoa || !aoa.length) return [];
  // 1) columna donde más aparecen los códigos de partida
  const conteo = {};
  aoa.forEach((r) => (r || []).forEach((c, i) => { if (RE_PARTIDA.test(String(c))) conteo[i] = (conteo[i] || 0) + 1; }));
  const cols = Object.keys(conteo).map(Number).sort((a, b) => conteo[b] - conteo[a]);
  if (!cols.length) return [];
  const pCol = cols[0];

  const partidas = [];
  for (const row of aoa) {
    if (!row || !RE_PARTIDA.test(String(row[pCol]))) continue;
    const codigo = String(row[pCol]).trim();
    const resto = row.slice(pCol + 1);
    // Con raw:true, xlsx devuelve los importes como number y los textos como string.
    // descripción = primer texto con letras; montos = celdas numéricas (1º=F1, 2º=F2).
    const descripcion = resto.find((c) => typeof c === 'string' && /[a-zA-Z]/.test(c)) || codigo;
    const montos = [];
    for (const c of resto) {
      if (typeof c === 'number' && Number.isFinite(c)) montos.push(c);
      else if (typeof c === 'string' && /\d/.test(c) && !/[a-zA-Z]/.test(c)) { const n = aNumero(c); if (Math.abs(n) > 0) montos.push(n); }
    }
    partidas.push({
      codigo,
      descripcion: String(descripcion).trim(),
      montoF1: aNumero(montos[0] || 0),
      montoF2: aNumero(montos[1] || 0),
    });
  }
  return partidas;
}

// ── Resumen comercial (CD → GG → Utilidad → Subtotal → IGV → Total) ─
function extraerResumen(aoa) {
  const r = { cd: 0, gg: 0, ggPct: 0, utilidad: 0, utilidadPct: 0, subtotal: 0, igv: 0, igvPct: 0, total: 0, costoObra: 0 };
  if (!aoa || !aoa.length) return r;
  // El IMPORTE de cada fila del pie es el número de mayor magnitud (los % y conteos
  // son pequeños). Tomar el máximo absoluto evita confundir 26.47% con S/.483,145.
  const maxNumero = (row) => {
    let v = 0;
    (row || []).forEach((c) => {
      if (typeof c !== 'number' && !/\d/.test(String(c))) return;
      const n = aNumero(c);
      if (Math.abs(n) > Math.abs(v)) v = n;
    });
    return v;
  };
  const ultimoNumero = maxNumero;
  const pctDeFila = (row) => {
    for (const c of row || []) {
      if (typeof c === 'string' && c.includes('%')) return aNumero(c);
      if (typeof c === 'number' && c > 0 && c < 1) return +(c * 100).toFixed(2);
    }
    return 0;
  };
  for (const row of aoa) {
    const etiqueta = up((row || []).map((c) => (typeof c === 'string' ? c : '')).join(' '));
    if (!etiqueta) continue;
    if (/COSTO DIRECTO TOTAL|COSTO DIRECTO/.test(etiqueta) && !r.cd) r.cd = ultimoNumero(row);
    else if (/GASTOS GENERALES/.test(etiqueta) && !r.gg) { r.gg = ultimoNumero(row); r.ggPct = pctDeFila(row); }
    else if (/UTILIDAD/.test(etiqueta) && !r.utilidad) { r.utilidad = ultimoNumero(row); r.utilidadPct = pctDeFila(row); }
    else if (/SUB ?TOTAL/.test(etiqueta) && !r.subtotal) r.subtotal = ultimoNumero(row);
    else if (/\bIGV\b/.test(etiqueta) && !r.igv) { r.igv = ultimoNumero(row); r.igvPct = pctDeFila(row); }
    else if (/COSTO TOTAL/.test(etiqueta) && !r.total) r.total = ultimoNumero(row);
    else if (/TOTAL COSTO DE OBRA/.test(etiqueta) && !r.costoObra) r.costoObra = ultimoNumero(row);
  }
  return r;
}

/**
 * Parser principal. Recibe un File (del input) y devuelve la estructura del presupuesto.
 * @returns {Promise<{partidas, resumen, totalPartidasF1, totalPartidasF2, hojaPartidas}>}
 */
export async function parsePresupuestoExcel(file) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });

  // Partidas: preferimos la hoja "RO"; si no, la primera hoja con códigos 10xx.
  let aoaPart = hojaAoA(XLSX, wb, 'RO');
  let hojaPartidas = 'RO';
  let partidas = extraerPartidas(aoaPart);
  if (!partidas.length) {
    for (const n of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true });
      const p = extraerPartidas(aoa);
      if (p.length) { partidas = p; hojaPartidas = n; break; }
    }
  }

  // Resumen comercial: hoja "PPTO" si existe; si no, la hoja de partidas.
  const aoaResumen = hojaAoA(XLSX, wb, 'PPTO') || aoaPart
    || XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true });
  const resumen = extraerResumen(aoaResumen);

  const totalPartidasF1 = partidas.reduce((s, p) => s + p.montoF1, 0);
  const totalPartidasF2 = partidas.reduce((s, p) => s + p.montoF2, 0);

  // Si el Excel no traía costo directo, lo derivamos de las partidas.
  if (!resumen.cd) resumen.cd = +(totalPartidasF1 + totalPartidasF2).toFixed(2);
  if (!resumen.costoObra && resumen.cd && resumen.gg) resumen.costoObra = +(resumen.cd + resumen.gg).toFixed(2);

  return { partidas, resumen, totalPartidasF1, totalPartidasF2, hojaPartidas };
}

// Porcentajes comerciales por defecto del contrato CREDITEX (si el Excel no los trae).
export const PCT_DEFAULT = { ggPct: 26.47, utilidadPct: 9, igvPct: 18 };
