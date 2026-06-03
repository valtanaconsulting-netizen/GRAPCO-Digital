// Extrae el Análisis de Restricciones (AR) del Excel GP-GCR-FOR-F04 (la semana más
// reciente acumula TODAS las restricciones) → src/data/arCreditex.js
// Uso: node scripts/extraerAr.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const RAIZ = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/5. Last Planner System/2. AR';
// archivo más reciente (mayor SEM) entre raíz y Superado
function ultimoAr() {
  const cands = [];
  for (const dir of [RAIZ, path.join(RAIZ, '2. Superado')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/AR\s*SEM\s*0*(\d+)/i);
      if (m && /\.xlsx$/i.test(f)) cands.push({ sem: +m[1], file: path.join(dir, f) });
    }
  }
  cands.sort((a, b) => b.sem - a.sem);
  return cands[0];
}

const txt = (v) => (v == null ? '' : String(v).trim());
const MES = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12, ene:1,abr:4,ago:8,set:9,dic:12 };
function parseFecha(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ]?(\d{2,4})?$/);
  if (m) {
    const mo = MES[m[2].toLowerCase()]; if (!mo) return null;
    let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : (mo >= 11 ? 2025 : 2026);
    return `${y}-${String(mo).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`; }
  return null;
}
function mapEstado(k) {
  const s = txt(k).toUpperCase();
  if (/REALIZ|LIBERAD|OK|LEVANT/.test(s)) return 'liberada';
  if (/PROCESO|GESTI/.test(s)) return 'en_proceso';
  if (/PENDIENTE|NO/.test(s)) return 'pendiente';
  return s ? 'pendiente' : null;
}
function mapTipo(rst, desc) {
  const c = txt(rst).toUpperCase();
  if (c) {
    if (/INF/.test(c)) return 'informacion';
    if (/EY|EQ|MAQ|HERR/.test(c)) return 'equipos';
    if (/PRC|PRO|MAT|COMP/.test(c)) return 'materiales';
    if (/MO|CUAD|PERS/.test(c)) return 'mano_obra';
    if (/REC|\$|PAG|OC/.test(c)) return 'recursos';
    if (/EXT|CLI|MUN/.test(c)) return 'externos';
    if (/PRE|SEC/.test(c)) return 'prerequisitos';
  }
  const d = txt(desc).toUpperCase();
  if (/GRUA|EQUIPO|MAQUINAR|MEZCLAD|ANDAMIO|BOMBA|PLANCHA COMP/.test(d)) return 'equipos';
  if (/PROVEEDOR|\bOC\b|COMPRA|COTIZ|PRESUPUESTO|PAGO|FACTURA/.test(d)) return 'recursos';
  if (/MATERIAL|ACERO|CONCRETO|CEMENTO|ENCOFRAD|AGREGAD|TUBER|GEOMEMBRANA/.test(d)) return 'materiales';
  if (/CUADRILLA|PERSONAL|MANO DE OBRA|CAPACITA|OPERAD/.test(d)) return 'mano_obra';
  if (/LICENCIA|MUNICIPAL|CLIENTE|PERMISO|EXTERNO|SUPERVIS/.test(d)) return 'externos';
  if (/PREREQ|ACTIVIDAD PREVIA|SECTOR|LIBERA|TRASLAD/.test(d)) return 'prerequisitos';
  if (/APROBACI|DISEÑO|DISENO|PLANO|RFI|DEFINIR|INFORMACI|\bFT\b|ESPECIFIC|PETS|PROCEDIMIENT/.test(d)) return 'informacion';
  return 'informacion';
}

const sel = ultimoAr();
if (!sel) { console.error('No se encontró archivo AR'); process.exit(1); }
console.error('AR fuente:', path.basename(sel.file), '(SEM', sel.sem + ')');
const wb = XLSX.readFile(sel.file, { cellDates: true });
const ws = wb.Sheets['AR'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
const hdr = rows.findIndex(r => txt(r[0]).toLowerCase() === 'frente' && /restric/i.test(txt(r[3])));
if (hdr < 0) { console.error('No se encontró cabecera'); process.exit(1); }

const ESTADOS_VALIDOS = /REALIZ|PROCESO|PENDIENTE|GESTI|LIBERAD/i;
const restricciones = [];
let actActual = null, frenteActual = null;
for (let r = hdr + 1; r < rows.length; r++) {
  const row = rows[r] || [];
  const A = txt(row[0]), C = txt(row[2]), D = txt(row[3]), K = txt(row[10]);
  // Cabecera de grupo: N1/N2/N3 sin estado → fija actividad/frente de contexto.
  const esNivel = /^N\d/i.test(A);
  if (esNivel && !ESTADOS_VALIDOS.test(K)) { if (D) actActual = D; continue; }
  if (/^F\d/i.test(A)) frenteActual = A;     // F1..F5 = frente
  if (!ESTADOS_VALIDOS.test(K) || !D) continue;   // no es una restricción
  // saltar filas de totales/encabezados sueltos
  if (/^(N°|%|RESTRICC|LEYEN)/i.test(A) || /^(N°|%)/i.test(D)) continue;
  restricciones.push({
    id: 'ar-' + (restricciones.length + 1),
    frente: (/^F\d/i.test(A) ? A : frenteActual) || null,
    actividad: C || actActual || '',
    descripcion: D,
    tipoFlujo: mapTipo(row[5], D),
    responsable: txt(row[6]) || '',
    responsableLevanta: txt(row[9]) || '',
    fechaCompromisoLiberacion: parseFecha(row[7]) || '',
    fechaConciliada: parseFecha(row[8]) || '',
    estado: mapEstado(K),
    fuente: 'AR-excel',
  });
}

const replacer = (k, v) => (v === null || v === '') ? undefined : v;
const out = `// src/data/arCreditex.js
// ANÁLISIS DE RESTRICCIONES (AR) — Last Planner System · PTARI CREDITEX.
// Extraído de ${path.basename(sel.file)} (la semana más reciente acumula todo).
// Re-generar con scripts/extraerAr.cjs. Campos compatibles con VDC_Restricciones.
export const AR_CREDITEX = ${JSON.stringify(restricciones, replacer)};
export default AR_CREDITEX;
`;
const dest = path.join(__dirname, '..', 'src', 'data', 'arCreditex.js');
fs.writeFileSync(dest, out, 'utf8');
const porEstado = {}; const porTipo = {};
restricciones.forEach(r => { porEstado[r.estado] = (porEstado[r.estado] || 0) + 1; porTipo[r.tipoFlujo] = (porTipo[r.tipoFlujo] || 0) + 1; });
console.error(`>>> ${restricciones.length} restricciones | estados ${JSON.stringify(porEstado)} | tipos ${JSON.stringify(porTipo)}`);
console.error('Ejemplos:'); restricciones.slice(0, 4).forEach(r => console.error('  ·', r.actividad.slice(0, 24), '→', r.descripcion.slice(0, 40), '|', r.estado, '|', r.tipoFlujo, '|', r.fechaCompromisoLiberacion));
