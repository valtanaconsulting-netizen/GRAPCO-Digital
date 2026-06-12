// Test del Tareo Admin Excel (node): genera y verifica estructura.
// El módulo usa document/URL para descargar — aquí se interceptan.
import { writeFileSync } from 'node:fs';

// Shims mínimos de browser para correr en node
let capturedBlob = null;
globalThis.Blob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
globalThis.URL = { createObjectURL: (b) => { capturedBlob = b; return 'blob:x'; }, revokeObjectURL: () => {} };
globalThis.document = { createElement: () => ({ click() {}, set href(v) {}, set download(v) { this._d = v; } }) };

const { generarTareoAdminExcel } = await import('../src/utils/tareoAdminExcel.js');

const personalDB = [
  { nombre: 'ARAYA QUISPE CONDORI MARCELINO', dni: '10111965', cargo: 'Capataz' },
  { nombre: 'CASAPAICO MARTINEZ ADRIAN', dni: '8308034', cargo: 'Operario' },
  { nombre: 'RAFAEL RIVERA FIDEL', dni: '19833020', cargo: 'Operario' },
];

const reg = (fecha, semana, partida, actividad, detalle) => ({
  fecha, semana, partida, _partidaCanonica: partida, actividad, _actividadCanonica: actividad,
  capataz: 'ARAYA QUISPE CONDORI MARCELINO', detalleTareo: detalle,
});

const registros = [
  // Semana 31 — lunes 1 jun 2026
  reg('2026-06-01', 31, 'ESTRUCTURAS', 'COLOCADO DE ACERO', [
    { nombre: 'ARAYA QUISPE CONDORI MARCELINO', hn: 8.5, he: 0 },
    { nombre: 'ADRIAN MARTINEZ CASAPAICO', hn: 8.5, he: 3 },   // 3 HE → 2 al 60% + 1 al 100%
  ]),
  reg('2026-06-02', 31, 'ESTRUCTURAS', 'ENCOFRADO DE MUROS', [
    { nombre: 'ADRIAN MARTINEZ CASAPAICO', hn: 8.5, he: 1.5 }, // 1.5 HE → todo al 60%
    { nombre: 'RAFAEL RIVERA FIDEL', hn: 8.5, he: 0 },
  ]),
  // Semana 32 — lunes 8 jun
  reg('2026-06-08', 32, 'OBRAS PRELIMINARES', 'MAESTRO', [
    { nombre: 'ARAYA QUISPE CONDORI MARCELINO', hn: 8.5, he: 0 },
  ]),
  reg('2026-06-09', 32, 'ESTRUCTURAS', 'COLOCADO DE ACERO', [
    { nombre: 'RAFAEL RIVERA FIDEL', hn: 8.5, he: 4 },          // 4 HE → 2+2
  ]),
];

const res = await generarTareoAdminExcel(registros, personalDB, '2026-06-01', '2026-06-14');
console.log('Resultado:', res);

// Guardar y re-leer
const buf = capturedBlob.parts[0];
writeFileSync('scripts/test-admin-out.xlsx', Buffer.from(buf));

const ExcelJS = (await import('exceljs')).default;
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(buf);
console.log('Hojas:', wb.worksheets.map(w => w.name).join(' | '));

const h1 = wb.getWorksheet('HH por Día');
// Buscar celdas clave
let semana31Fila = 0, semana32Fila = 0;
h1.eachRow((row, n) => {
  const v = String(row.getCell(1).value || '');
  if (v.startsWith('SEMANA 31')) semana31Fila = n;
  if (v.startsWith('SEMANA 32')) semana32Fila = n;
});
console.log('SEMANA 31 en fila', semana31Fila, '| SEMANA 32 en fila', semana32Fila);

// Verificar reparto HE de Adrian el lunes 1 jun (3 HE → 2.0 + 1.0)
// estructura: título sem (f), header (f+1,f+2), luego trabajadores
const fAdrian = semana31Fila + 3 + 1; // capataz primero, Adrian segundo
const rowA = h1.getRow(fAdrian);
console.log('Fila Adrian:', rowA.getCell(2).value, '| L: HN', rowA.getCell(3).value, '60%', rowA.getCell(4).value, '100%', rowA.getCell(5).value);
if (rowA.getCell(4).value !== 2 || rowA.getCell(5).value !== 1) throw new Error('❌ Reparto HE 60/100 incorrecto');

const h2 = wb.getWorksheet('Por Actividad');
let tienePartida = false;
h2.eachRow(row => row.eachCell(c => { if (String(c.value) === 'ESTRUCTURAS') tienePartida = true; }));
console.log('Hoja 2 muestra partidas:', tienePartida);

const h3 = wb.getWorksheet('Resumen Pago');
console.log('Hoja 3 OK:', !!h3);
console.log('\n✅ Test Tareo Admin OK');
