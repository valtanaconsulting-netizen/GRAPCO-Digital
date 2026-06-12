// TareoPDFHtml — Réplica EXACTA del formato F13_MPO (Excel oficial GRAPCO).
// Todo el cuerpo es UNA SOLA tabla de 23 columnas (como la grilla del Excel):
// así las celdas de arriba (CUENTA DE COSTO / Uni / Avance / Rendim.) y los
// totales de colores del pie quedan perfectamente alineados con las columnas
// 1-10 / N / 0.6 / 1.0 / TOT de la tabla de trabajadores.
import html2pdf from 'html2pdf.js';
import { crearResolverNombre } from '../utils/nombresCanonicos';

const GREY = '#d9d9d9';
const PEACH = '#fde9d9';   // totales por actividad
const GREEN = '#e2efda';   // totales N / 0.6 / 1.0
const SALMON = '#f8b9b9';  // total general

const CAR_MAP = { Capataz: 'MA', Operario: 'OP', Oficial: 'OF', Ayudante: 'AYU' };
const OCUP_MAP = {
  'Albañilería': 'ALBAÑIL', 'Encofrado': 'ENCOFRADO', 'Acero': 'ACERO',
  'Concreto': 'CONCRETO', 'Instalaciones': 'INSTALAC.', 'Movimiento de Tierras': 'MOV.TIERRA',
  'General': 'GENERAL',
};

// 23 columnas de la grilla (suman 100)
const COLS = [4, 3.2, 6, 5.8, 16, 4.5, 7.5, 4.5, 7.5, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 2.6, 3, 3, 3, 6];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtFechaLarga(fechaIso) {
  const [y, m, d] = (fechaIso || '').split('-').map(Number);
  if (!y) return fechaIso;
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('es-ES', { weekday: 'long' });
  const month = dt.toLocaleDateString('es-ES', { month: 'long' });
  return `${weekday}, ${month} ${String(d).padStart(2, '0')}, ${y}`;
}

async function cargarLogo() {
  try {
    const resp = await fetch('/grapco-logo-wide.png');
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// celda genérica
const td = (content, { cs = 1, bg = '', bold = false, align = 'center', fs = 8, pad = '3px 4px', h = '' } = {}) =>
  `<td colspan="${cs}" style="border:1px solid #000;${bg ? `background:${bg};` : ''}font-size:${fs}px;${bold ? 'font-weight:bold;' : ''}text-align:${align};padding:${pad};${h ? `height:${h}px;` : ''}vertical-align:middle;">${content}</td>`;

function paginaHTML({ fecha, capataz, trabajadores, actividades, totales, supervisor, ruc, logo, esUltima }) {
  const fechaLarga = fmtFechaLarga(fecha);

  // ── Filas de actividades (Act.1-7 | Act.8-14) ──
  const filasActs = [0, 1, 2, 3, 4, 5, 6].map(i => `
    <tr>
      ${td(`Act. ${i + 1}`, { cs: 1, bold: true, fs: 8.5, align: 'center' })}
      ${td(esc(actividades[i] || ''), { cs: 4, align: 'left', fs: 7 })}
      ${td(`Act. ${i + 8}`, { cs: 1, bold: true, fs: 8.5, align: 'center' })}
      ${td(esc(actividades[i + 7] || ''), { cs: 3, align: 'left', fs: 7 })}
      ${td('', { cs: 10 })}${td('', { cs: 1 })}${td('', { cs: 2 })}${td('', { cs: 1 })}
    </tr>`).join('');

  // ── Filas de trabajadores ──
  const filasTrab = trabajadores.map((t, idx) => `
    <tr>
      ${td(idx + 1, { bold: true, h: 22 })}
      ${td(esc(t.car), { bold: true, fs: 7 })}
      ${td(esc(t.ocupacion), { bold: true, fs: 6.5 })}
      ${td(esc(t.dni), { bold: true, fs: 7 })}
      ${td(esc(t.nombre), { align: 'left', bold: true, fs: 7 })}
      ${td('7:30', { fs: 7.5 })}
      ${td('')}
      ${td('17:00', { fs: 7.5 })}
      ${td('')}
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
        const act = actividades[n];
        const v = act ? (t.actividades[act] || 0) : 0;
        return td(v ? v.toFixed(1) : '', { fs: 7.5 });
      }).join('')}
      ${td(t.totHN.toFixed(1), { fs: 7.5 })}
      ${td(t.totHE > 0 ? (t.totHE * 0.6).toFixed(1) : '', { fs: 7.5 })}
      ${td(t.totHE > 0 ? t.totHE.toFixed(1) : '', { fs: 7.5 })}
      ${td((t.totHN + t.totHE).toFixed(1), { bold: true, fs: 7.5 })}
    </tr>`).join('');

  // Fila vacía de reserva (como en el formato original)
  const filaVacia = `
    <tr>
      ${td(trabajadores.length + 1, { bold: true, h: 22 })}
      ${td('')}${td('')}${td('')}${td('', { align: 'left' })}
      ${td('')}${td('')}${td('')}${td('')}
      ${[...Array(10)].map(() => td('')).join('')}
      ${td('0.0', { fs: 7.5 })}${td('')}${td('')}${td('0.0', { bold: true, fs: 7.5 })}
    </tr>`;

  // ── Fila de totales con colores (alineada bajo columnas 1-10/N/0.6/1.0/TOT) ──
  const celdasTotales = `
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => td(totales.porCol[n].toFixed(1), { bg: PEACH, bold: true, fs: 7.5 })).join('')}
    ${td(totales.hn.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.he06.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.he.toFixed(1), { bg: GREEN, bold: true, fs: 7.5 })}
    ${td(totales.total.toFixed(1), { bg: SALMON, bold: true, fs: 7.5 })}`;

  return `
  <div class="tareo-page" style="width:1122px;padding:24px 28px 10px;${esUltima ? '' : 'page-break-after:always;'}font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;">

    <!-- ENCABEZADO (sin bordes) -->
    <div style="position:relative;height:52px;margin-bottom:4px;">
      ${logo
        ? `<img src="${logo}" style="position:absolute;left:0;top:0;height:46px;" />`
        : `<span style="position:absolute;left:0;top:8px;font-weight:bold;font-size:16px;">GRAPCO <span style="font-size:9px;">S.A.C</span></span>`}
      <span style="position:absolute;left:190px;top:16px;font-weight:bold;font-size:10px;">RUC: ${esc(ruc)}</span>
      <span style="position:absolute;left:63%;top:16px;font-weight:bold;font-size:9px;">FECHA:</span>
      <span style="position:absolute;left:78%;top:16px;font-weight:bold;font-size:9px;">${esc(fechaLarga)}</span>
    </div>

    <!-- Supervisor / HORARIO DE TRABAJO (sin bordes) -->
    <div style="position:relative;height:18px;margin-bottom:2px;">
      <span style="position:absolute;left:6px;font-weight:bold;font-size:9px;">Supervisor:&nbsp;&nbsp;&nbsp;${esc(supervisor)}</span>
      <span style="position:absolute;left:76%;font-weight:bold;font-size:9px;">HORARIO DE TRABAJO</span>
    </div>

    <!-- GRILLA ÚNICA (23 columnas) -->
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>${COLS.map(w => `<col style="width:${w}%;">`).join('')}</colgroup>

      <!-- Bloque info -->
      <tr>
        ${td('CUADRILLA', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td(esc(capataz), { cs: 3, align: 'left', fs: 7.5 })}
        ${td('ZONA:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('', { cs: 6, bg: GREY })}
        ${td('INICIO', { cs: 2, bg: GREY, bold: true, fs: 8 })}
        ${td('FIN', { cs: 1, bg: GREY, bold: true, fs: 8 })}
      </tr>
      <tr>
        ${td('ESPECIALIDAD', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td('', { cs: 3 })}
        ${td('SECTOR:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('Jornada:', { cs: 6, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 2 })}
        ${td('', { cs: 1 })}
      </tr>
      <tr>
        ${td('JEFE GRUPO', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8, h: 20 })}
        ${td('', { cs: 3 })}
        ${td('NIVEL:', { cs: 2, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 7 })}
        ${td('Refrigerio:', { cs: 6, bg: GREY, bold: true, align: 'left', fs: 8 })}
        ${td('', { cs: 2 })}
        ${td('', { cs: 1 })}
      </tr>
      <tr>
        ${td('', { cs: 9, h: 20 })}
        ${td('CUENTA DE COSTO (Fase)', { cs: 10, bg: GREY, bold: true, fs: 8 })}
        ${td('Uni', { cs: 1, bg: GREY, bold: true, fs: 8 })}
        ${td('Avance', { cs: 2, bg: GREY, bold: true, fs: 8 })}
        ${td('Rendim.', { cs: 1, bg: GREY, bold: true, fs: 8 })}
      </tr>

      <!-- Actividades Act.1-7 | Act.8-14 -->
      ${filasActs}

      <!-- Cabeceras de sección -->
      <tr>
        ${td('REFERENCIAS', { cs: 9, bg: GREY, bold: true, fs: 8, h: 18 })}
        ${td('ACTIVIDADES', { cs: 10, bg: GREY, bold: true, fs: 8 })}
        ${td('HORAS REALES', { cs: 4, bg: GREY, bold: true, fs: 8 })}
      </tr>

      <!-- Cabecera tabla trabajadores -->
      <tr>
        ${td('CODIGO', { bg: GREY, bold: true, fs: 6.5, h: 24 })}
        ${td('CAR.', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('OCUPACION', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('DNI', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('TRABAJADORES', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('Hora<br>Ingreso', { bg: GREY, bold: true, fs: 6.5, pad: '1px 2px' })}
        ${td('FIRMA INGRESO', { bg: GREY, bold: true, fs: 6.5 })}
        ${td('Hora<br>Salida', { bg: GREY, bold: true, fs: 6.5, pad: '1px 2px' })}
        ${td('FIRMA SALIDA', { bg: GREY, bold: true, fs: 6.5 })}
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => td(n, { bg: GREY, bold: true, fs: 7 })).join('')}
        ${td('N', { bg: GREY, bold: true, fs: 7 })}
        ${td('0.6', { bg: GREY, bold: true, fs: 7 })}
        ${td('1.0', { bg: GREY, bold: true, fs: 7 })}
        ${td('TOT.', { bg: GREY, bold: true, fs: 7 })}
      </tr>

      <!-- Trabajadores -->
      ${filasTrab}
      ${filaVacia}

      <!-- Pie: firmas + totales de colores (misma grilla → alineación perfecta) -->
      <tr>
        ${td('ARAYA QUISPECONDORI MARCELINO', { cs: 4, bold: true, fs: 7.5, h: 30 })}
        ${td('RAFAEL CONDORI ALEXANDER', { cs: 2, bold: true, fs: 7.5 })}
        ${td('GONZALES GUTIERREZ GUIDO', { cs: 3, bold: true, fs: 7.5 })}
        ${celdasTotales}
      </tr>
      <tr>
        ${td('MAESTRO', { cs: 4, bold: true, fs: 7.5, h: 18 })}
        ${td('INGENIERO DE PRODUCCIÓN', { cs: 2, bold: true, fs: 7.5 })}
        ${td('INGENIERO RESIDENTE', { cs: 3, bold: true, fs: 7.5 })}
        ${td('Número de Trabajadores Parte', { cs: 13, bold: true, fs: 7 })}
        ${td(trabajadores.length, { cs: 1, bold: true, fs: 8 })}
      </tr>
    </table>
  </div>`;
}

export async function generarPDFTareoHtml(registrosPorDia, personalDB, ruc, supervisor = 'DIRAC') {
  const resolverNombre = crearResolverNombre(Object.values(registrosPorDia).flat() || [], personalDB || []);

  const fichaPorCanonico = {};
  (personalDB || []).forEach(p => {
    if (!p?.nombre) return;
    const c = resolverNombre(p.nombre);
    if (c && !fichaPorCanonico[c]) fichaPorCanonico[c] = p;
  });

  const logo = await cargarLogo();

  // Ordenar páginas por fecha y capataz
  const entradas = Object.entries(registrosPorDia)
    .filter(([, regs]) => regs.length)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entradas.length) throw new Error('Sin registros para exportar');

  const paginas = entradas.map(([fechaCapKey, registros], i) => {
    const [fecha, capataz] = fechaCapKey.split('__');

    // Trabajadores agrupados por nombre canónico (el MISMO obrero escrito
    // distinto cuenta como UNA persona) + HN/HE separados para N / 0.6 / 1.0.
    const trabajadoresMap = {};
    registros.forEach(r => {
      (r.detalleTareo || []).forEach(t => {
        if (!t?.nombre) return;
        const nomKey = resolverNombre(t.nombre);
        if (!trabajadoresMap[nomKey]) {
          const ficha = fichaPorCanonico[nomKey] || {};
          const cargo = ficha.cargo || 'Operario';
          trabajadoresMap[nomKey] = {
            nombre: nomKey,
            dni: ficha.dni || '',
            cargo,
            car: CAR_MAP[cargo] || cargo.slice(0, 2).toUpperCase(),
            ocupacion: cargo === 'Capataz'
              ? 'GENERAL'
              : (OCUP_MAP[ficha.especialidad] || (ficha.especialidad || cargo).toUpperCase().slice(0, 10)),
            actividades: {},
            totHN: 0,
            totHE: 0,
          };
        }
        const act = r._actividadCanonica || r.actividad;
        const hn = parseFloat(t.hn) || 0;
        const he = parseFloat(t.he) || 0;
        trabajadoresMap[nomKey].actividades[act] = (trabajadoresMap[nomKey].actividades[act] || 0) + hn + he;
        trabajadoresMap[nomKey].totHN += hn;
        trabajadoresMap[nomKey].totHE += he;
      });
    });

    // Capataz primero (es el MAESTRO del parte), resto alfabético
    const trabajadores = Object.values(trabajadoresMap).sort((a, b) => {
      if (a.cargo === 'Capataz' && b.cargo !== 'Capataz') return -1;
      if (b.cargo === 'Capataz' && a.cargo !== 'Capataz') return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    const actividades = [...new Set(registros.map(r => r._actividadCanonica || r.actividad))].slice(0, 14);

    // Totales: columnas 1-10 SIEMPRE muestran valor (0.0 incluido, como el original)
    const totales = { porCol: [], hn: 0, he: 0, he06: 0, total: 0 };
    for (let n = 0; n < 10; n++) {
      const act = actividades[n];
      totales.porCol[n] = act
        ? trabajadores.reduce((s, t) => s + (t.actividades[act] || 0), 0)
        : 0;
    }
    trabajadores.forEach(t => { totales.hn += t.totHN; totales.he += t.totHE; });
    totales.he06 = totales.he * 0.6;
    totales.total = totales.hn + totales.he;

    return paginaHTML({
      fecha, capataz, trabajadores, actividades, totales,
      supervisor, ruc, logo, esUltima: i === entradas.length - 1,
    });
  });

  const container = document.createElement('div');
  container.innerHTML = paginas.join('');

  const fechas = entradas.map(([k]) => k.split('__')[0]);
  const nombre = fechas.length > 1
    ? `Tareo_${fechas[0]}_a_${fechas[fechas.length - 1]}.pdf`
    : `Tareo_${fechas[0]}.pdf`;

  await html2pdf().set({
    margin: [6, 6, 6, 6],
    filename: nombre,
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
    pagebreak: { mode: ['css', 'legacy'] },
  }).from(container).save();

  return entradas.length;
}
