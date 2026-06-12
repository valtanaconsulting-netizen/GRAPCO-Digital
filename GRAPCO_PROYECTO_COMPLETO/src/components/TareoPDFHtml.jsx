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

  Object.entries(registrosPorDia).forEach(([fechaCapKey, registros]) => {
    const [fecha, capataz] = fechaCapKey.split('__');
    if (!registros.length) return;

    const trabajadoresMap = {};
    const actividadesPorTrab = {};

    registros.forEach(r => {
      (r.detalleTareo || []).forEach(t => {
        if (!t?.nombre) return;
        const nomKey = resolverNombre(t.nombre);
        if (!trabajadoresMap[nomKey]) {
          const ficha = fichaPorCanonico[nomKey];
          trabajadoresMap[nomKey] = { nombre: nomKey, dni: ficha?.dni || '', cargo: ficha?.cargo || 'OP' };
          actividadesPorTrab[nomKey] = {};
        }
        const act = r._actividadCanonica || r.actividad;
        const hh = (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
        if (!actividadesPorTrab[nomKey][act]) actividadesPorTrab[nomKey][act] = 0;
        actividadesPorTrab[nomKey][act] += hh;
      });
    });

    const trabajadores = Object.values(trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const todasActividades = [...new Set(registros.flatMap(r => [(r._actividadCanonica || r.actividad)]))].slice(0, 14);

    const totalesPorAct = {};
    todasActividades.forEach(act => {
      totalesPorAct[act] = 0;
      Object.keys(actividadesPorTrab).forEach(nom => {
        totalesPorAct[act] += actividadesPorTrab[nom][act] || 0;
      });
    });

    const fechaObj = new Date(fecha + 'T00:00:00');
    const fechaFormato = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 8px; padding: 0.25in; line-height: 1; }
          .page { width: 11in; height: 7.5in; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #000; }
          .logo-section { display: flex; gap: 4px; align-items: center; }
          .logo { width: 32px; height: 32px; }
          .logo-text { font-weight: bold; font-size: 8px; }
          .header-center { flex: 1; text-align: center; }
          .header-right { text-align: right; font-size: 7px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 2px 3px; font-size: 7.5px; }
          .grey-header { background: #d3d3d3; font-weight: bold; }
          .info-section { margin-bottom: 1px; }
          .act-section { margin-bottom: 1px; }
          .workers-section { flex: 1; overflow: auto; margin-bottom: 1px; }
          .footer-section { }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 7px; }
        </style>
      </head>
      <body>
      <div class="page">
        <!-- HEADER -->
        <div class="header">
          <div class="logo-section">
            <img src="/brand/grapco-256.png" class="logo">
            <span class="logo-text">GRAPCO<br><span class="small">S.A.C</span></span>
          </div>
          <div class="header-center">
            <span class="small">RUC: ${ruc}</span>
          </div>
          <div class="header-right">
            <div class="small"><strong>FECHA:</strong></div>
            <div class="small"><strong>${fechaFormato}</strong></div>
          </div>
        </div>

        <!-- INFO TABLE -->
        <div class="info-section">
          <table>
            <tr>
              <td class="grey-header" style="width: 10%;">Supervisor:</td>
              <td class="text-left" style="width: 10%;">${supervisor}</td>
              <td colspan="2"></td>
              <td class="grey-header" style="width: 15%;">HORARIO DE TRABAJO</td>
              <td style="width: 15%;"></td>
              <td class="grey-header" style="width: 8%;">INICIO</td>
              <td class="grey-header" style="width: 8%;">FIN</td>
            </tr>
            <tr>
              <td class="grey-header">CUADRILLA</td>
              <td class="text-left" colspan="3">${capataz}</td>
              <td class="grey-header">ZONA:</td>
              <td></td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td class="grey-header">ESPECIALIDAD</td>
              <td></td>
              <td class="grey-header" style="width: 10%;">SECTOR:</td>
              <td></td>
              <td class="grey-header">Jornada:</td>
              <td></td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td class="grey-header">JEFE GRUPO</td>
              <td></td>
              <td class="grey-header">NIVEL:</td>
              <td></td>
              <td class="grey-header">Refrigerio:</td>
              <td></td>
              <td colspan="2"></td>
            </tr>
          </table>
        </div>

        <!-- ACTIVITIES TABLE -->
        <div class="act-section">
          <table>
            <tr>
              <td class="text-left" style="width: 25%;">Act. 1 ${todasActividades[0] || ''}</td>
              <td class="text-left" style="width: 25%;">Act. 8 ${todasActividades[7] || ''}</td>
              <td style="width: 25%;"></td>
              <td class="grey-header text-center" style="width: 25%;">CUENTA DE COSTO (Fase)</td>
            </tr>
            <tr>
              <td class="text-left">Act. 2 ${todasActividades[1] || ''}</td>
              <td class="text-left">Act. 9 ${todasActividades[8] || ''}</td>
              <td></td>
              <td class="text-center small">Uni</td>
            </tr>
            <tr>
              <td class="text-left">Act. 3 ${todasActividades[2] || ''}</td>
              <td class="text-left">Act. 10 ${todasActividades[9] || ''}</td>
              <td></td>
              <td class="text-center small">Avance</td>
            </tr>
            <tr>
              <td class="text-left">Act. 4 ${todasActividades[3] || ''}</td>
              <td class="text-left">Act. 11 ${todasActividades[10] || ''}</td>
              <td></td>
              <td class="text-center small">Rendim.</td>
            </tr>
            <tr>
              <td class="text-left">Act. 5 ${todasActividades[4] || ''}</td>
              <td class="text-left">Act. 12 ${todasActividades[11] || ''}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td class="text-left">Act. 6 ${todasActividades[5] || ''}</td>
              <td class="text-left">Act. 13 ${todasActividades[12] || ''}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td class="text-left">Act. 7 ${todasActividades[6] || ''}</td>
              <td class="text-left">Act. 14 ${todasActividades[13] || ''}</td>
              <td colspan="2"></td>
            </tr>
          </table>
        </div>

        <!-- SECTION HEADER -->
        <table style="margin-bottom: 1px;">
          <tr>
            <td class="grey-header text-center" style="width: 40%;">REFERENCIAS</td>
            <td class="grey-header text-center" style="width: 35%;">ACTIVIDADES</td>
            <td class="grey-header text-center" style="width: 25%;">HORAS REALES</td>
          </tr>
        </table>

        <!-- WORKERS TABLE -->
        <div class="workers-section">
          <table>
            <thead>
              <tr>
                <th style="width: 3%;">CODIGO</th>
                <th style="width: 4%;">CAR.</th>
                <th style="width: 6%;">OCUPACION</th>
                <th style="width: 6%;">DNI</th>
                <th style="width: 14%; text-align: left;">TRABAJADORES</th>
                <th style="width: 4%;">Hora Ingreso</th>
                <th style="width: 5%;">FIRMA INGRESO</th>
                <th style="width: 4%;">Hora Salida</th>
                <th style="width: 5%;">FIRMA SALIDA</th>
                <th style="width: 2%; text-align: center;">1</th>
                <th style="width: 2%; text-align: center;">2</th>
                <th style="width: 2%; text-align: center;">3</th>
                <th style="width: 2%; text-align: center;">4</th>
                <th style="width: 2%; text-align: center;">5</th>
                <th style="width: 2%; text-align: center;">6</th>
                <th style="width: 2%; text-align: center;">7</th>
                <th style="width: 2%; text-align: center;">8</th>
                <th style="width: 2%; text-align: center;">9</th>
                <th style="width: 2%; text-align: center;">10</th>
                <th style="width: 2%; text-align: center;">N</th>
                <th style="width: 2%; text-align: center;">0.6</th>
                <th style="width: 2%; text-align: center;">1.0</th>
                <th style="width: 2%; text-align: center;">TOT.</th>
              </tr>
            </thead>
            <tbody>
              ${trabajadores.map((t, idx) => {
                const totHH = Object.values(actividadesPorTrab[t.nombre] || {}).reduce((a, b) => a + b, 0);
                return `
                  <tr>
                    <td style="width: 3%; text-align: center;">${idx + 1}</td>
                    <td style="width: 4%; text-align: center;">${t.cargo.slice(0, 2)}</td>
                    <td style="width: 6%; text-align: center;">${t.cargo}</td>
                    <td style="width: 6%; text-align: center;">${t.dni}</td>
                    <td style="width: 14%; text-align: left;">${t.nombre}</td>
                    <td style="width: 4%; text-align: center;">7:30</td>
                    <td style="width: 5%;"></td>
                    <td style="width: 4%; text-align: center;">17:00</td>
                    <td style="width: 5%;"></td>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                      const act = todasActividades[n - 1];
                      const val = act ? (actividadesPorTrab[t.nombre]?.[act] || 0) : 0;
                      return `<td style="width: 2%; text-align: center;">${val ? val.toFixed(1) : ''}</td>`;
                    }).join('')}
                    <td style="width: 2%;"></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 2%;"></td>
                    <td style="width: 2%; text-align: center; font-weight: bold;">${totHH.toFixed(1)}</td>
                  </tr>
                `;
              }).join('')}
              <!-- TOTALS ROW -->
              <tr>
                <td colspan="9" style="text-align: right; padding-right: 4px; font-weight: bold;"></td>
                ${todasActividades.slice(0, 10).map(act => {
                  const total = totalesPorAct[act] || 0;
                  return `<td style="width: 2%; text-align: center; font-weight: bold;">${total ? total.toFixed(1) : ''}</td>`;
                }).join('')}
                <td style="width: 2%;"></td>
                <td style="width: 2%;"></td>
                <td style="width: 2%;"></td>
                <td style="width: 2%; text-align: center; font-weight: bold;">${Object.values(totalesPorAct).reduce((a,b) => a+b, 0).toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- FOOTER -->
        <div class="footer-section">
          <table>
            <tr style="height: 18px;">
              <td style="width: 25%; text-align: center; font-weight: bold;">ARAYA QUISPECONDORI MARCELINO</td>
              <td style="width: 25%; text-align: center; font-weight: bold;">RAFAEL CONDORI ALEXANDER</td>
              <td style="width: 25%; text-align: center; font-weight: bold;">GONZALES GUTIERREZ GUIDO</td>
              <td style="width: 25%; text-align: center; font-weight: bold;">6</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold; font-size: 7px;">MAESTRO</td>
              <td style="text-align: center; font-weight: bold; font-size: 7px;">INGENIERO DE PRODUCCIÓN</td>
              <td style="text-align: center; font-weight: bold; font-size: 7px;">INGENIERO RESIDENTE</td>
              <td style="text-align: center; font-size: 7px;">Número de Trabajadores Parte</td>
            </tr>
          </table>
        </div>
      </div>
      </body>
      </html>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;

    html2pdf().set({
      margin: [2, 2, 2, 2],
      filename: `Tareo_${fecha}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'l', unit: 'mm', format: 'a4' },
      pagebreak: { mode: 'avoid-all' }
    }).from(element).save();
  });
}
