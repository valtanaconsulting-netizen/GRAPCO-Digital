// Extrae los 28 LAP (Lookahead Planning) de Last Planner System y genera
// src/data/lapCreditex.js con la data lista para la plataforma.
// Uso: node scripts/extraerLap.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const RAIZ = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/5. Last Planner System/1. LAP';
const DIRS = [RAIZ, path.join(RAIZ, '3. Superado')];

const MES = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
              Ene:1,Abr:4,Ago:8,Set:9,Dic:12 };
const num = (v) => {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const txt = (v) => (v == null ? '' : String(v).trim());
const iso = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

// Encuentra la hoja LAP principal (matriz de actividades), no la de seguimiento/sectores.
function hallarHojaLap(wb) {
  const cands = wb.SheetNames.filter(n => /lap/i.test(n) && !/seguim/i.test(n) && !/sector/i.test(n));
  for (const name of (cands.length ? cands : wb.SheetNames)) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:false, defval:'' });
    const hdr = rows.findIndex(r => txt(r[0]).toUpperCase()==='ID' && /CREDITEX/i.test(txt(r[1])));
    if (hdr >= 0) return { name, rows, hdr };
  }
  return null;
}

function parseArchivo(file) {
  const wb = XLSX.readFile(file, { cellDates:false });
  const found = hallarHojaLap(wb);
  if (!found) return null;
  const { name: hoja, rows, hdr } = found;

  // Filas de cabecera (offsets validados en SEM01 y SEM27).
  const semanaRow = rows[hdr-4] || [];
  let monthRow    = rows[hdr-2] || [];
  let dayRow      = rows[hdr-1] || [];
  // Validación: monthRow debe contener nombres de mes; si no, buscar.
  const tieneMes = (r) => (r||[]).filter(c => MES[txt(c)]).length > 3;
  if (!tieneMes(monthRow)) {
    for (let k = hdr-4; k < hdr; k++) { if (tieneMes(rows[k])) { monthRow = rows[k]; dayRow = rows[k+1]; break; } }
  }

  // Columna donde arranca la grilla de días (primer weekday tras la col I).
  const WD = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Lun|Mar|Mi|Jue|Vie|Sab|Dom)/i;
  const wdRow = rows[hdr] || [];
  let gridIni = -1;
  for (let c = 9; c < wdRow.length; c++) { if (WD.test(txt(wdRow[c]))) { gridIni = c; break; } }
  if (gridIni < 0) gridIni = 10;

  // Eje de fechas por columna (mes+día con año inferido por rollover).
  const cols = [];   // { c, fecha, semana }
  let year = null, prevM = null, semActual = '';
  for (let c = gridIni; c < monthRow.length; c++) {
    const m = MES[txt(monthRow[c])];
    const d = num(dayRow[c]);
    if (txt(semanaRow[c])) semActual = txt(semanaRow[c]);
    if (!m || !d) continue;
    if (year == null) year = (m >= 11) ? 2025 : 2026;
    // El proyecto termina en 2026 → nunca pasamos de ese año (evita que columnas
    // ruidosas con meses fuera de orden disparen un rollover falso a 2027).
    if (prevM != null && m < prevM && year < 2026) year++;
    prevM = m;
    cols.push({ c, fecha: iso(year, m, d), semana: semActual });
  }
  const colByIdx = {}; cols.forEach(x => { colByIdx[x.c] = x; });
  const fechasGrid = cols.map(x => x.fecha);
  const fechaIniG = fechasGrid[0] || null;
  const fechaFinG = fechasGrid[fechasGrid.length-1] || null;

  // Bloques por SEMANA (label -> rango de fechas).
  const semMap = {};
  cols.forEach(x => {
    const k = x.semana || '—';
    if (!semMap[k]) semMap[k] = { label:k, ini:x.fecha, fin:x.fecha };
    if (x.fecha < semMap[k].ini) semMap[k].ini = x.fecha;
    if (x.fecha > semMap[k].fin) semMap[k].fin = x.fecha;
  });
  const semanas = Object.values(semMap);

  // Actividades.
  const actividades = [];
  let seccionActual = null;   // último grupo N1/N2 visto (NAVE, ESTRUCTURAS, …)
  for (let r = hdr+1; r < rows.length; r++) {
    const row = rows[r] || [];
    const A = txt(row[0]), B = txt(row[1]);
    const metrado = num(row[2]);
    // Marcas en la grilla.
    const fechasMarca = [];
    for (const x of cols) { const v = txt(row[x.c]); if (v && v !== '·') fechasMarca.push(x.fecha); }
    const tieneMarca = fechasMarca.length > 0;
    if (!B && !tieneMarca && metrado == null) continue;     // fila vacía
    const esNivel = /^N\d/i.test(A);
    const tipo = (metrado == null && !tieneMarca && esNivel) ? 'grupo'
               : (metrado == null && !tieneMarca) ? 'grupo' : 'tarea';
    const nivelUp = esNivel ? A.toUpperCase() : null;
    // Cabecera de sección: los grupos N1/N2 definen el frente/familia (NAVE, ESTRUCTURAS…).
    if (tipo === 'grupo' && (nivelUp === 'N1' || nivelUp === 'N2') && B) seccionActual = B;
    fechasMarca.sort();
    actividades.push({
      tipo,
      nivel: nivelUp,
      id: esNivel ? null : (A || null),
      actividad: B,
      seccion: seccionActual,
      metrado, und: txt(row[3]) || null,
      sectores: num(row[4]),
      ip: num(row[6]), hh: num(row[7]), mo: num(row[8]),
      fechaIni: fechasMarca[0] || null,
      fechaFin: fechasMarca[fechasMarca.length-1] || null,
      nDias: fechasMarca.length,
      dias: fechasMarca,
    });
  }

  const tareas = actividades.filter(a => a.tipo === 'tarea');
  const kpis = {
    nTareas: tareas.length,
    nProgramadas: tareas.filter(a => a.nDias > 0).length,
    totalHH: +tareas.reduce((s,a)=>s+(a.hh||0),0).toFixed(2),
    totalMO: +tareas.reduce((s,a)=>s+(a.mo||0),0).toFixed(2),
  };

  // Metadatos de cabecera.
  const buscar = (label) => {
    for (let r = 0; r < hdr; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length-1; c++) {
        if (new RegExp(label,'i').test(txt(row[c]))) return txt(row[c+1]) || txt(row[c+2]);
      }
    }
    return '';
  };

  return {
    hoja, fechaIni: fechaIniG, fechaFin: fechaFinG, semanas, kpis, actividades,
    elaboradoPor: buscar('ELABORADO'), revisadoPor: buscar('REVISADO'),
    proyecto: buscar('OBRA') || 'PTARI CREDITEX',
    fechaDoc: buscar('^FECHA'),
  };
}

// Recolectar archivos.
const archivos = [];
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (/\.xlsx$/i.test(f) && /LAP/i.test(f)) archivos.push(path.join(dir, f));
  }
}
const semanas = [];
for (const file of archivos) {
  const mm = path.basename(file).match(/SEM\s*0*(\d+)/i);
  const sem = mm ? parseInt(mm[1],10) : null;
  try {
    const data = parseArchivo(file);
    if (!data) { console.error('SIN HOJA LAP:', path.basename(file)); continue; }
    semanas.push({ semana: sem, archivo: path.basename(file), ...data });
    console.error(`OK SEM${String(sem).padStart(2,'0')} | hoja "${data.hoja}" | ${data.kpis.nTareas} tareas (${data.kpis.nProgramadas} progr) | HH ${data.kpis.totalHH} | ${data.fechaIni}→${data.fechaFin}`);
  } catch (e) {
    console.error('ERROR', path.basename(file), e.message);
  }
}
semanas.sort((a,b)=>(a.semana||0)-(b.semana||0));

// ── Plan consolidado por actividad (con días marcados) ──
// Recorremos las semanas en orden ascendente y nos quedamos con la ÚLTIMA
// programación conocida de cada actividad (la del LAP más reciente que la incluye).
// Esto es lo que alimenta el Lookahead 6-sem en la plataforma, tal cual el Excel.
const porNombre = new Map();
for (const snap of semanas) {
  for (const a of (snap.actividades || [])) {
    if (a.tipo !== 'tarea') continue;     // incluimos TODAS las tareas (estén o no programadas)
    const key = (a.actividad || '').toUpperCase().trim();
    if (!key) continue;
    const prev = porNombre.get(key);
    // dias: conservamos la última programación NO vacía conocida.
    const dias = (a.dias && a.dias.length) ? a.dias : (prev ? prev.dias : []);
    porNombre.set(key, {
      actividad: a.actividad, nivel: a.nivel || null, id: a.id || null, seccion: a.seccion || (prev && prev.seccion) || null,
      metrado: a.metrado, und: a.und, sectores: a.sectores,
      ip: a.ip, hh: a.hh, mo: a.mo,
      ini: dias[0] || null, fin: dias[dias.length - 1] || null, nDias: dias.length, dias,
      semanaLAP: snap.semana,
    });
  }
}
// Orden: por sección y luego por fecha de inicio (sin fecha → al final de su grupo).
const plan = [...porNombre.values()].sort((x, y) =>
  (x.seccion || 'zzz').localeCompare(y.seccion || 'zzz') || (x.ini || '9999').localeCompare(y.ini || '9999'));

// Para LAP_CREDITEX (snapshots) quitamos 'dias' (pesado); el detalle vive en LAP_PLAN.
const semanasLite = semanas.map(s => ({
  ...s, actividades: (s.actividades || []).map(a => { const { dias, ...rest } = a; return rest; }),
}));

const replacer = (k, v) => (v === null || v === '') ? undefined : v;
const out = `// src/data/lapCreditex.js
// LOOKAHEAD PLANNING (LAP) — Last Planner System · Proyecto PTARI CREDITEX.
// Generado automáticamente desde los ${semanas.length} archivos GP-GCR-FOR-F03_LAP SEMxx
// (carpeta "04. Gestión Cronograma/5. Last Planner System/1. LAP").
// NO editar a mano: re-generar con scripts/extraerLap.cjs si cambian los Excel.
//
//  LAP_CREDITEX → 28 snapshots semanales (actividades con rango fechaIni→fechaFin, sin días).
//  LAP_PLAN     → plan consolidado por actividad (última programación) CON 'dias' (ISO marcados),
//                 'seccion' (frente N1/N2) y métricas; alimenta el Lookahead 6-sem.

export const LAP_CREDITEX = ${JSON.stringify(semanasLite, replacer)};

export const LAP_PLAN = ${JSON.stringify(plan, replacer)};

export const LAP_SEMANAS = LAP_CREDITEX.map(s => s.semana);
export default LAP_CREDITEX;
`;
const dest = path.join(__dirname, '..', 'src', 'data', 'lapCreditex.js');
fs.writeFileSync(dest, out, 'utf8');
console.error(`\n>>> Escrito ${dest} | ${semanas.length} semanas | ${(out.length/1024).toFixed(0)} KB`);
