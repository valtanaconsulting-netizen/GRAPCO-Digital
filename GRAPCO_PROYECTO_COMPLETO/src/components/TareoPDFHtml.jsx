import html2pdf from 'html2pdf.js';
import { crearResolverNombre } from '../utils/nombresCanonicos';

export async function generarPDFTareoHtml(registrosPorDia, personalDB, ruc, supervisor = 'DIRAC') {
  const resolverNombre = crearResolverNombre(Object.values(registrosPorDia).flat() || [], personalDB || []);

  const fichaPorCanonico = {};
  (personalDB || []).forEach(p => {
    if (!p?.nombre) return;
    const c = resolverNombre(p.nombre);
    if (c && !fichaPorCanonico[c]) fichaPorCanonico[c] = p;
  });

  const pages = Object.entries(registrosPorDia).map(([fechaCapKey, registros]) => {
    const [fecha, capataz] = fechaCapKey.split('__');
    if (!registros.length) return null;

    const trabajadoresMap = {};
    registros.forEach(r => {
      (r.detalleTareo || []).forEach(t => {
        if (!t?.nombre) return;
        const nomKey = resolverNombre(t.nombre);
        if (!trabajadoresMap[nomKey]) {
          const ficha = fichaPorCanonico[nomKey];
          trabajadoresMap[nomKey] = {
            nombre: nomKey,
            dni: ficha?.dni || '',
            cargo: ficha?.cargo || 'OP',
            horas: {},
          };
        }
        const act = r._actividadCanonica || r.actividad;
        const hh = (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
        if (!trabajadoresMap[nomKey].horas[act]) trabajadoresMap[nomKey].horas[act] = 0;
        trabajadoresMap[nomKey].horas[act] += hh;
      });
    });

    const trabajadores = Object.values(trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const todasActividades = [...new Set(registros.flatMap(r => [(r._actividadCanonica || r.actividad)]))].slice(0, 14);

    const fechaObj = new Date(fecha + 'T00:00:00');
    const fechaFormato = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' });

    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 8px; }
          .page { width: 11in; height: 7.5in; padding: 0.4in; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 6px; }
          .logo-section { display: flex; gap: 4px; align-items: center; }
          .logo { width: 35px; height: 35px; }
          .logo-text { font-weight: bold; }
          .header-right { text-align: right; }
          .fecha-label { font-weight: bold; font-size: 7px; }
          .fecha-value { font-weight: bold; font-size: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 0; }
          th, td { border: 1px solid #000; padding: 3px 2px; text-align: left; font-size: 7px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          td { text-align: center; }
          .label-cell { background-color: #e8e8e8; font-weight: bold; text-align: left; }
          .text-left { text-align: left !important; }
          .text-right { text-align: right !important; }
          .info-section { width: 100%; margin-bottom: 0; }
          .activities-section { width: 100%; margin: 4px 0; display: flex; gap: 6px; }
          .activities-col { flex: 1; }
          .activity-row { display: flex; border: 1px solid #000; margin-bottom: -1px; min-height: 16px; }
          .activity-num { width: 35%; border-right: 1px solid #000; padding: 2px; font-weight: bold; display: flex; align-items: center; }
          .activity-name { width: 65%; padding: 2px; display: flex; align-items: center; }
          .table-section { margin: 0; }
          .footer-row { display: flex; border: 1px solid #000; margin-top: 0; min-height: 18px; }
          .footer-cell { flex: 1; border-right: 1px solid #000; padding: 4px 2px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7px; font-weight: bold; }
          .footer-cell:last-child { border-right: none; }
          .worker-total { font-weight: bold; }
        </style>
      </head>
      <body>
      <div class="page">
        <!-- HEADER -->
        <div class="header">
          <div class="logo-section">
            <img src="/brand/grapco-256.png" class="logo">
            <div class="logo-text">GRAPCO<br><span style="font-size: 6px;">S.A.C</span></div>
          </div>
          <div>
            <div style="font-size: 7px;">RUC: ${ruc}</div>
          </div>
          <div class="header-right">
            <div class="fecha-label">FECHA:</div>
            <div class="fecha-value">${fechaFormato}</div>
          </div>
        </div>

        <!-- INFO ROWS -->
        <div class="info-section">
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="label-cell" style="width: 15%;">Supervisor:</td>
              <td style="width: 15%; text-align: left;">${supervisor}</td>
              <td class="label-cell" style="width: 15%;">CUADRILLA</td>
              <td style="width: 15%; text-align: left;">${capataz}</td>
              <td class="label-cell" style="width: 20%;">ZONA:</td>
              <td style="width: 20%;"></td>
              <td class="label-cell" style="width: 20%;">HORARIO DE TRABAJO</td>
            </tr>
          </table>

          <table style="margin-bottom: -1px;">
            <tr>
              <td class="label-cell" style="width: 15%;">ESPECIALIDAD</td>
              <td style="width: 15%;"></td>
              <td class="label-cell" style="width: 15%;">SECTOR:</td>
              <td style="width: 15%;"></td>
              <td class="label-cell" style="width: 20%;">Jornada:</td>
              <td style="width: 20%;"></td>
              <td style="width: 20%; border: 1px solid #000; padding: 3px;">INICIO &nbsp; FIN</td>
            </tr>
          </table>

          <table>
            <tr>
              <td class="label-cell" style="width: 15%;">JEFE GRUPO</td>
              <td style="width: 15%;"></td>
              <td class="label-cell" style="width: 15%;">NIVEL:</td>
              <td style="width: 15%;"></td>
              <td class="label-cell" style="width: 20%;">Refrigerio:</td>
              <td style="width: 20%;"></td>
              <td style="width: 20%; border: 1px solid #000;"></td>
            </tr>
          </table>
        </div>

        <!-- ACTIVITIES -->
        <div class="activities-section">
          <div class="activities-col">
            ${todasActividades.slice(0, 7).map((act, i) => `
              <div class="activity-row">
                <div class="activity-num">Act. ${i + 1}</div>
                <div class="activity-name">${act}</div>
              </div>
            `).join('')}
          </div>
          <div class="activities-col">
            ${todasActividades.slice(7, 14).map((act, i) => `
              <div class="activity-row">
                <div class="activity-num">Act. ${i + 8}</div>
                <div class="activity-name">${act}</div>
              </div>
            `).join('')}
          </div>
          <div style="flex: 1.5; border: 1px solid #000; padding: 2px;">
            <div style="font-weight: bold; font-size: 6px;">CUENTA DE COSTO (Fase)</div>
            <div style="display: flex; gap: 4px; margin-top: 6px;">
              <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 2px; font-weight: bold; font-size: 6px;">Uni</div>
              <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 2px; font-weight: bold; font-size: 6px;">Avance</div>
              <div style="flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 2px; font-weight: bold; font-size: 6px;">Rendim.</div>
            </div>
          </div>
        </div>

        <!-- TABLE -->
        <div class="table-section" style="flex: 1; overflow: auto;">
          <table style="font-size: 6.5px; margin: 0;">
            <thead>
              <tr>
                <th style="width: 3%;">CODIGO</th>
                <th style="width: 3%;">CAR.</th>
                <th style="width: 5%;">OCUPACION</th>
                <th style="width: 5%;">DNI</th>
                <th style="width: 18%; text-align: left;">TRABAJADORES</th>
                <th style="width: 3%;">Hora Ingreso</th>
                <th style="width: 5%;">FIRMA INGRESO</th>
                <th style="width: 3%;">Hora Salida</th>
                <th style="width: 5%;">FIRMA SALIDA</th>
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<th style="width: 2%;">${n}</th>`).join('')}
                <th style="width: 2%;">N</th>
                <th style="width: 2%;">0.6</th>
                <th style="width: 2%;">1.0</th>
                <th style="width: 3%;">TOT.</th>
              </tr>
            </thead>
            <tbody>
              ${trabajadores.map((t, idx) => {
                const totHH = Object.values(t.horas).reduce((a, b) => a + b, 0);
                return `
                  <tr>
                    <td style="width: 3%;">${idx + 1}</td>
                    <td style="width: 3%;">${t.cargo.slice(0, 2)}</td>
                    <td style="width: 5%;">${t.cargo}</td>
                    <td style="width: 5%;">${t.dni}</td>
                    <td style="width: 18%; text-align: left;">${t.nombre}</td>
                    <td style="width: 3%;">7:30</td>
                    <td style="width: 5%;"></td>
                    <td style="width: 3%;">17:00</td>
                    <td style="width: 5%;"></td>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                      const act = todasActividades[n - 1];
                      const val = act ? (t.horas[act] || 0) : 0;
                      return `<td style="width: 2%;">${val ? val.toFixed(1) : ''}</td>`;
                    }).join('')}
                    <td style="width: 2%;"></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 3%;" class="worker-total">${totHH.toFixed(1)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- FOOTER -->
        <div class="footer-row" style="margin-top: 4px;">
          <div class="footer-cell">ARAYA QUISPECONDORI MARCELINO</div>
          <div class="footer-cell">RAFAEL CONDORI ALEXANDER</div>
          <div class="footer-cell">GONZALES GUTIERREZ GUIDO</div>
          <div class="footer-cell" style="flex: 0.5;">${trabajadores.length}</div>
        </div>

        <div class="footer-row">
          <div class="footer-cell">MAESTRO</div>
          <div class="footer-cell">INGENIERO DE PRODUCCIÓN</div>
          <div class="footer-cell">INGENIERO RESIDENTE</div>
          <div class="footer-cell" style="flex: 0.5; font-size: 6px;">Número de Trabajadores Parte</div>
        </div>
      </div>
      </body>
      </html>
    `;

    return html;
  }).filter(Boolean);

  // Generar PDF combinado
  const promises = pages.map((html, idx) => {
    const element = document.createElement('div');
    element.innerHTML = html;

    return new Promise(resolve => {
      html2pdf().set({
        margin: 2,
        filename: `Tareo_${idx}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'l', unit: 'mm', format: 'a4' },
        pagebreak: { mode: ['avoid-all'] }
      }).from(element).save();

      resolve();
    });
  });

  return Promise.all(promises);
}
