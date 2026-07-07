// scripts/extraerNormalTec.cjs
// Extrae la NORMAL TECNOLÓGICA (formato GP-GCR-FOR-F08) del PTARI CREDITEX.
// Hojas: "NT-EXC+CALZ" (Mov. de tierras + calzadura) y "NT-CIMEN+MURO" (estructuras).
// Cada hoja es una MATRIZ secuencia constructiva = actividades (agrupadas por fase WBS,
// filas con código "N4") × días (D1..Dn), marcadas con "X" en el día que toca la actividad.
//   Col C = código de especialidad (TOP, MOV, ENC, CON, CUR, ACE, VAR, BIT, PRU...)  o "N4" = fase
//   Col D = nombre de la actividad / fase
//   Col E.. = D1..Dn (marca "X")
// Detecta la fila de cabecera por CONTENIDO ("ACTIVIDADES" + "D1"), no por posición fija.
// Escribe src/data/normalTecnologicaCreditex.js con `export const NORMAL_TECNOLOGICA` + default.
// Ejecutar:  node scripts/extraerNormalTec.cjs   (desde GRAPCO_PROYECTO_COMPLETO)

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SRC = 'c:/Users/fjros/OneDrive/Escritorio/04. Gestión Cronograma/6. Productividad/1. Normal Tecnológica/GP-GCR-FOR-F08_CREDITEX Normal Tecnológica 2025.09.13.xlsx';
const OUT = path.join(__dirname, '..', 'src', 'data', 'normalTecnologicaCreditex.js');

// Hojas-matriz a extraer (orden = orden en la vista)
const HOJAS = [
  { sheet: 'NT-EXC+CALZ',   bloque: 'MOV. DE TIERRAS Y CALZADURA' },
  { sheet: 'NT-CIMEN+MURO', bloque: 'ESTRUCTURAS' },
];

const norm = (v) => (v == null ? '' : String(v).trim());
const colLetter = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// Una celda está "marcada" si su contenido (mayúsculas) es X. Tolera #DIV/0!, #REF!, espacios.
const esMarca = (v) => {
  const s = norm(v).toUpperCase();
  if (!s || s === '#DIV/0!' || s === '#REF!' || s === '#N/A' || s === '#VALUE!') return false;
  return s === 'X' || s === '✓' || s === '1';
};

function cell(ws, R, C) {
  const c = ws[colLetter(C) + (R + 1)];
  return c ? c.v : null;
}

function extraerHoja(ws, meta) {
  const rng = XLSX.utils.decode_range(ws['!ref']);
  // 1) Detectar fila de cabecera por CONTENIDO: la fila que tiene "ACTIVIDADES" en alguna
  //    columna y "D1" justo a su derecha.
  let headerRow = -1, colAct = -1, colCod = -1, colD1 = -1;
  for (let R = rng.s.r; R <= Math.min(rng.s.r + 25, rng.e.r); R++) {
    for (let C = rng.s.c; C <= rng.e.c; C++) {
      if (norm(cell(ws, R, C)).toUpperCase() === 'ACTIVIDADES') {
        // ¿columna siguiente es D1?
        for (let CC = C + 1; CC <= Math.min(C + 3, rng.e.c); CC++) {
          if (norm(cell(ws, R, CC)).toUpperCase() === 'D1') { colD1 = CC; break; }
        }
        if (colD1 !== -1) { headerRow = R; colAct = C; colCod = C - 1; break; }
      }
    }
    if (headerRow !== -1) break;
  }
  if (headerRow === -1) throw new Error(`[${meta.sheet}] No se encontró fila de cabecera (ACTIVIDADES + D1)`);

  // 2) Mapear columnas de días: desde colD1 mientras la cabecera diga "D<num>"
  const diasCols = [];
  for (let C = colD1; C <= rng.e.c; C++) {
    const h = norm(cell(ws, headerRow, C)).toUpperCase();
    const m = h.match(/^D\s*(\d+)$/);
    if (!m) break;
    diasCols.push({ col: C, dia: Number(m[1]) });
  }
  const nDias = diasCols.length;

  // 3) Recorrer filas debajo de la cabecera. N4 = fase; resto = actividad.
  const fases = [];
  let faseActual = null;
  let nActividades = 0;
  let nMarcas = 0;
  for (let R = headerRow + 1; R <= rng.e.r; R++) {
    const cod = norm(cell(ws, R, colCod)).toUpperCase();
    const act = norm(cell(ws, R, colAct));
    if (!cod && !act) {
      // fila totalmente vacía: si ya pasamos las filas con datos, cortar al acumular vacías
      // (toleramos huecos: solo cortamos si encontramos 4 filas vacías seguidas tras datos)
      continue;
    }
    if (cod === 'N4') {
      // nueva fase / grupo WBS
      faseActual = { fase: act, actividades: [] };
      fases.push(faseActual);
      continue;
    }
    if (!act) continue; // código suelto sin actividad → ignorar
    // actividad: leer marcas por día
    const grid = new Array(nDias).fill(null);
    let primero = null, ultimo = null;
    for (let i = 0; i < nDias; i++) {
      if (esMarca(cell(ws, R, diasCols[i].col))) {
        grid[i] = 'X';
        nMarcas++;
        if (primero == null) primero = diasCols[i].dia;
        ultimo = diasCols[i].dia;
      }
    }
    // Si una actividad no tiene fase previa (cabecera suelta), crear fase "GENERAL"
    if (!faseActual) { faseActual = { fase: 'GENERAL', actividades: [] }; fases.push(faseActual); }
    faseActual.actividades.push({
      cod,
      actividad: act,
      grid,
      inicio: primero,
      fin: ultimo,
      dur: primero != null ? (ultimo - primero + 1) : 0,
    });
    nActividades++;
  }

  // Limpiar fases sin actividades (p.ej. encabezados huérfanos al final)
  const fasesLimpias = fases.filter((f) => f.actividades.length > 0);

  // Último día realmente usado (para no arrastrar columnas vacías del Excel)
  let maxDiaUsado = 0;
  for (const f of fasesLimpias) for (const a of f.actividades) if (a.fin != null && a.fin > maxDiaUsado) maxDiaUsado = a.fin;

  return {
    sheet: meta.sheet,
    bloque: meta.bloque,
    nDias,
    maxDiaUsado,
    dias: diasCols.map((d) => d.dia).slice(0, maxDiaUsado),
    fases: fasesLimpias.map((f) => ({
      fase: f.fase,
      actividades: f.actividades.map((a) => ({ ...a, grid: a.grid.slice(0, maxDiaUsado) })),
    })),
    _stats: { nActividades, nMarcas, nFases: fasesLimpias.length, headerRow: headerRow + 1, maxDiaUsado },
  };
}

function main() {
  if (!fs.existsSync(SRC)) { console.error('NO existe el archivo fuente:', SRC); process.exit(1); }
  const wb = XLSX.readFile(SRC);

  const bloques = [];
  for (const meta of HOJAS) {
    const ws = wb.Sheets[meta.sheet];
    if (!ws) { console.error(`[WARN] Hoja no encontrada: ${meta.sheet}`); continue; }
    const b = extraerHoja(ws, meta);
    console.error(`[${b.sheet}] hdr@fila${b._stats.headerRow}  fases=${b._stats.nFases}  actividades=${b._stats.nActividades}  marcas=${b._stats.nMarcas}  diasUsados=${b._stats.maxDiaUsado}/${b.nDias}`);
    delete b._stats;
    bloques.push(b);
  }

  // Salario MO (referencia, tal cual el Excel)
  let salarioMO = [];
  const wsSal = wb.Sheets['Salario MO'];
  if (wsSal) {
    const rows = XLSX.utils.sheet_to_json(wsSal, { header: 'A', defval: null });
    for (const r of rows) {
      const cargo = norm(r.B), s = r.C;
      if (cargo && typeof s === 'number') salarioMO.push({ cargo, salario: Number(s) });
    }
  }

  // Totales
  const totActividades = bloques.reduce((s, b) => s + b.fases.reduce((a, f) => a + f.actividades.length, 0), 0);
  const totFases = bloques.reduce((s, b) => s + b.fases.length, 0);
  const maxDias = Math.max(0, ...bloques.map((b) => b.maxDiaUsado || b.nDias));

  const DATA = {
    titulo: 'PTARI CREDITEX',
    formato: 'GP-GCR-FOR-F08',
    descripcion: 'Normal Tecnológica — secuencia constructiva (precedencias) por fase y día.',
    totActividades,
    totFases,
    maxDias,
    salarioMO,
    bloques,
  };

  // replacer: omite null y '' para no inflar el archivo
  const replacer = (k, v) => (v === null || v === '' ? undefined : v);
  const body = JSON.stringify(DATA, replacer);

  const out = `// src/data/normalTecnologicaCreditex.js
// NORMAL TECNOLÓGICA (GP-GCR-FOR-F08) — PTARI CREDITEX.
// Matriz secuencia constructiva: actividades (agrupadas por fase WBS) × días; cada
// celda marcada ("X" en el Excel) indica el día en que se ejecuta la actividad → el
// desfase diagonal entre filas es la PRECEDENCIA. AUTOGENERADO por
// scripts/extraerNormalTec.cjs — NO editar a mano; re-generar con
//   node scripts/extraerNormalTec.cjs
export const NORMAL_TECNOLOGICA = ${body};
export default NORMAL_TECNOLOGICA;
`;
  fs.writeFileSync(OUT, out, 'utf8');
  console.error(`OK → ${OUT}`);
  console.error(`TOTALES: bloques=${bloques.length}  fases=${totFases}  actividades=${totActividades}  maxDias=${maxDias}  salarioMO=${salarioMO.length}`);
}

main();
