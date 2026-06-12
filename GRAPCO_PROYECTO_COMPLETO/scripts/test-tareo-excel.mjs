// Test del generador Excel F13 (node): clona, rellena y verifica.
// Uso: node scripts/test-tareo-excel.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { prepararDatosTareo } from '../src/utils/tareoDatos.js';
import { rellenarHoja, clonarHoja, capturarEstilos } from '../src/utils/tareoExcelF13.js';
import ExcelJS from 'exceljs';

const personalDB = [
  { nombre: 'ARAYA QUISPE CONDORI MARCELINO', dni: '10111965', cargo: 'Capataz' },
  { nombre: 'CASAPAICO MARTINEZ ADRIAN', dni: '8308034', cargo: 'Operario', especialidad: 'Albañilería' },
  { nombre: 'CARVAJAL MARTINEZ CARLOS', cargo: 'Operario', especialidad: 'Albañilería' },
  { nombre: 'CABEZAS AGUILAR JUAN VICTOR', dni: '28270503', cargo: 'Ayudante', especialidad: 'Albañilería' },
  { nombre: 'QUISPE FERNANDEZ EDWIN YONY', dni: '45573430', cargo: 'Operario', especialidad: 'Albañilería' },
  { nombre: 'RAFAEL RIVERA FIDEL', dni: '19833020', cargo: 'Operario', especialidad: 'Albañilería' },
];

const dia = (fecha, extra = []) => ({
  [`${fecha}__ARAYA QUISPE CONDORI MARCELINO`]: [
    { fecha, capataz: 'ARAYA QUISPE CONDORI MARCELINO', actividad: 'MAESTRO',
      detalleTareo: [{ nombre: 'ARAYA QUISPE CONDORI MARCELINO', hn: 8.5, he: 0 }] },
    { fecha, capataz: 'ARAYA QUISPE CONDORI MARCELINO', actividad: 'COLOCADO DE ACERO',
      detalleTareo: [
        { nombre: 'ADRIAN MARTINEZ CASAPAICO', hn: 8.5, he: 0 },     // nombre-primero: debe agrupar
        { nombre: 'CARLOS MARTINEZ CARVAJAL', hn: 4.5, he: 2 },
        ...extra,
      ] },
  ],
});

const registros = {
  ...dia('2026-06-08'),
  ...dia('2026-06-09', [
    { nombre: 'CABEZAS AGUILAR JUAN VICTOR', hn: 8.5, he: 0 },
    { nombre: 'QUISPE FERNANDEZ EDWIN YONY', hn: 8.5, he: 0 },
    { nombre: 'RAFAEL RIVERA FIDEL', hn: 8.5, he: 0 },
    { nombre: 'TRABAJADOR EXTRA UNO', hn: 8.5, he: 0 },
    { nombre: 'TRABAJADOR EXTRA DOS', hn: 8.5, he: 0 },
    { nombre: 'TRABAJADOR EXTRA TRES', hn: 8.5, he: 0 },             // 9 trabajadores → fuerza duplicateRow
  ]),
};

const datos = prepararDatosTareo(registros, personalDB);
console.log('Días:', datos.map(d => `${d.fecha} (${d.trabajadores.length} trab)`).join(', '));

// Verificar orden y nombres
const d0 = datos[0];
console.log('\nDía 1 — orden de trabajadores:');
d0.trabajadores.forEach((t, i) => console.log(`  ${i + 1}. [${t.car}] ${t.nombre} | DNI ${t.dni || '—'} | ${t.ocupacion} | HN ${t.totHN} HE ${t.totHE}`));
if (d0.trabajadores[0].cargo !== 'Capataz') throw new Error('❌ El capataz NO está primero');
if (!d0.trabajadores.some(t => t.nombre === 'CASAPAICO MARTINEZ ADRIAN' && t.dni === '8308034'))
  throw new Error('❌ Adrian no agrupó a la ficha oficial APELLIDOS NOMBRES');

// Generar Excel
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(readFileSync('public/plantillas/tareo-f13.xlsx'));
const plantilla = wb.getWorksheet('Tareo');
const sinLiq = wb.getWorksheet('SIN LIQUIDADOS');
if (sinLiq) wb.removeWorksheet(sinLiq.id);

const snap = capturarEstilos(plantilla);
const hojas = datos.map((d, i) => {
  const nombre = d.fecha.replace(/[^\w-]/g, '');
  if (i === 0) { plantilla.name = nombre; return plantilla; }
  return clonarHoja(wb, plantilla, nombre, snap);
});
hojas.forEach((ws, i) => rellenarHoja(ws, datos[i], 'DIRAC', snap));

const out = await wb.xlsx.writeBuffer();
writeFileSync('scripts/test-tareo-out.xlsx', Buffer.from(out));

// Re-leer y verificar
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(readFileSync('scripts/test-tareo-out.xlsx'));
console.log('\nHojas generadas:', wb2.worksheets.map(w => w.name).join(', '));
const h1 = wb2.worksheets[0];
const h2 = wb2.worksheets[1];
console.log('Hoja1 D6 (cuadrilla):', h1.getCell('D6').value);
console.log('Hoja1 G19 (1er trab):', h1.getCell('G19').value, '| C19:', h1.getCell('C19').value, '| E19:', h1.getCell('E19').value);
console.log('Hoja1 G20:', h1.getCell('G20').value);
console.log('Hoja1 C10 (Act.1):', h1.getCell('C10').value);
console.log('Hoja1 imágenes (logo):', h1.getImages().length);
console.log('Hoja2 G19:', h2.getCell('G19').value, '| imágenes:', h2.getImages().length);
console.log('Hoja2 (9 trab) G27 (trab 9):', h2.getCell('G27').value);
console.log('Hoja2 totales fila', 26 + 3, 'P:', h2.getCell(`P${26 + 3}`).value, 'Z:', h2.getCell(`Z${26 + 3}`).value, 'AC:', h2.getCell(`AC${26 + 3}`).value);
console.log('Hoja2 firma B' + (26 + 3) + ':', h2.getCell(`B${26 + 3}`).value);
console.log('\n✅ Test OK — revisar scripts/test-tareo-out.xlsx');
