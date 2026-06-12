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

    // Calcular totales por actividad
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
          body { font-family: Arial, sans-serif; font-size: 8px; padding: 0.3in; }
          .page { width: 11in; height: 7.5in; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #000; }
          .logo-section { display: flex; gap: 3px; align-items: center; }
          .logo { width: 30px; height: 30px; }
          .logo-text { font-weight: bold; font-size: 8px; line-height: 1.2; }
          .ruc-text { font-size: 6px; }
          .header-right { text-align: right; }
          .fecha-value { font-weight: bold; font-size: 7px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #000; padding: 2px 1px; font-size: 7px; text-align: center; }
          .label { background: #ddd; font-weight: bold; text-align: left; padding-left: 3px; }
          .value { text-align: left; padding-left: 3px; }
          .acts-table { margin: 2px 0; }
          .act-cell { text-align: left; padding-left: 2px; }
          .worker-row { height: 14px; }
          .footer { margin-top: 4px; }
        </style>
      </head>
      <body>
      <div class="page">
        <!-- HEADER -->
        <div class="header">
          <div class="logo-section">
            <img src="/brand/grapco-256.png" class="logo" style="width: 30px; height: 30px;">
            <div class="logo-text">GRAPCO<br><span class="ruc-text">S.A.C</span></div>
          </div>
          <div class="ruc-text">RUC: ${ruc}</div>
          <div class="header-right">
            <div style="font-size: 6px;">FECHA:</div>
            <div class="fecha-value">${fechaFormato}</div>
          </div>
        </div>

        <!-- INFO ROWS -->
        <table style="margin-bottom: 2px; font-size: 7px;">
          <tr>
            <td class="label" style="width: 10%;">Supervisor:</td>
            <td class="value" style="width: 10%;">${supervisor}</td>
            <td class="label" style="width: 10%;">CUADRILLA</td>
            <td class="value" style="width: 20%;">${capataz}</td>
            <td class="label" style="width: 10%;">ZONA:</td>
            <td style="width: 30%;"></td>
            <td class="label" style="width: 10%;">HORARIO DE TRABAJO</td>
          </tr>
          <tr>
            <td class="label" style="width: 10%;">ESPECIALIDAD</td>
            <td style="width: 10%;"></td>
            <td class="label" style="width: 10%;">SECTOR:</td>
            <td style="width: 20%;"></td>
            <td class="label" style="width: 10%;">Jornada:</td>
            <td style="width: 30%;"></td>
            <td class="label" style="width: 10%;">INICIO&nbsp;&nbsp;FIN</td>
          </tr>
          <tr>
            <td class="label" style="width: 10%;">JEFE GRUPO</td>
            <td style="width: 10%;"></td>
            <td class="label" style="width: 10%;">NIVEL:</td>
            <td style="width: 20%;"></td>
            <td class="label" style="width: 10%;">Refrigerio:</td>
            <td style="width: 30%;"></td>
            <td class="label" style="width: 10%;" rowspan="2">CUENTA DE COSTO<br>(Fase)<br>Uni<br>Avance<br>Rendim.</td>
          </tr>
          <tr style="height: 2px;">
            <td colspan="6"></td>
          </tr>
        </table>

        <!-- ACTIVITIES -->
        <table class="acts-table" style="margin-bottom: 2px; font-size: 6.5px;">
          <tr>
            <td class="act-cell" style="width: 25%;">Act. 1 ${todasActividades[0] || ''}</td>
            <td class="act-cell" style="width: 25%;">Act. 8 ${todasActividades[7] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 2 ${todasActividades[1] || ''}</td>
            <td class="act-cell">Act. 9 ${todasActividades[8] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 3 ${todasActividades[2] || ''}</td>
            <td class="act-cell">Act. 10 ${todasActividades[9] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 4 ${todasActividades[3] || ''}</td>
            <td class="act-cell">Act. 11 ${todasActividades[10] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 5 ${todasActividades[4] || ''}</td>
            <td class="act-cell">Act. 12 ${todasActividades[11] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 6 ${todasActividades[5] || ''}</td>
            <td class="act-cell">Act. 13 ${todasActividades[12] || ''}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td class="act-cell">Act. 7 ${todasActividades[6] || ''}</td>
            <td class="act-cell">Act. 14 ${todasActividades[13] || ''}</td>
            <td colspan="2"></td>
          </tr>
        </table>

        <!-- WORKERS TABLE -->
        <table style="font-size: 6.5px; flex: 1;">
          <thead style="height: 14px;">
            <tr>
              <th style="width: 3%;">CODIGO</th>
              <th style="width: 3%;">CAR.</th>
              <th style="width: 5%;">OCUPACION</th>
              <th style="width: 5%;">DNI</th>
              <th style="width: 17%; text-align: left;">TRABAJADORES</th>
              <th style="width: 3%;">Hora Ingreso</th>
              <th style="width: 4%;">FIRMA INGRESO</th>
              <th style="width: 3%;">Hora Salida</th>
              <th style="width: 4%;">FIRMA SALIDA</th>
              ${[1,2,3,4,5,6,7,8,9,10].map(n => `<th style="width: 1.8%;">${n}</th>`).join('')}
              <th style="width: 1.8%;">N</th>
              <th style="width: 1.8%;">0.6</th>
              <th style="width: 1.8%;">1.0</th>
              <th style="width: 2%;">TOT.</th>
            </tr>
          </thead>
          <tbody>
            ${trabajadores.map((t, idx) => {
              const totHH = Object.values(actividadesPorTrab[t.nombre] || {}).reduce((a, b) => a + b, 0);
              return `
                <tr class="worker-row">
                  <td style="width: 3%;">${idx + 1}</td>
                  <td style="width: 3%;">${t.cargo.slice(0, 2)}</td>
                  <td style="width: 5%;">${t.cargo}</td>
                  <td style="width: 5%;">${t.dni}</td>
                  <td style="width: 17%; text-align: left; padding-left: 2px;">${t.nombre}</td>
                  <td style="width: 3%;">7:30</td>
                  <td style="width: 4%;"></td>
                  <td style="width: 3%;">17:00</td>
                  <td style="width: 4%;"></td>
                  ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const act = todasActividades[n - 1];
                    const val = act ? (actividadesPorTrab[t.nombre]?.[act] || 0) : 0;
                    return `<td style="width: 1.8%;">${val ? val.toFixed(1) : ''}</td>`;
                  }).join('')}
                  <td style="width: 1.8%;"></td>
                  <td style="width: 1.8%;"></td>
                  <td style="width: 1.8%;"></td>
                  <td style="width: 2%;">${totHH.toFixed(1)}</td>
                </tr>
              `;
            }).join('')}
            <!-- TOTALS ROW -->
            <tr class="worker-row">
              <td colspan="9" style="text-align: right; padding-right: 4px; font-weight: bold;"></td>
              ${todasActividades.slice(0, 10).map(act => {
                const total = totalesPorAct[act] || 0;
                return `<td style="width: 1.8%; font-weight: bold;">${total ? total.toFixed(1) : ''}</td>`;
              }).join('')}
              <td style="width: 1.8%;"></td>
              <td style="width: 1.8%;"></td>
              <td style="width: 1.8%;"></td>
              <td style="width: 2%; font-weight: bold;">${Object.values(totalesPorAct).reduce((a,b) => a+b, 0).toFixed(1)}</td>
            </tr>
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <table style="font-size: 7px;">
            <tr style="height: 20px;">
              <td style="width: 25%; font-weight: bold;">ARAYA QUISPECONDORI MARCELINO</td>
              <td style="width: 25%; font-weight: bold;">RAFAEL CONDORI ALEXANDER</td>
              <td style="width: 25%; font-weight: bold;">GONZALES GUTIERREZ GUIDO</td>
              <td style="width: 25%; text-align: center; font-weight: bold;">${trabajadores.length}</td>
            </tr>
            <tr style="height: 12px;">
              <td style="text-align: center; font-weight: bold; font-size: 7px;">MAESTRO</td>
              <td style="text-align: center; font-weight: bold; font-size: 7px;">INGENIERO DE PRODUCCIÓN</td>
              <td style="text-align: center; font-weight: bold; font-size: 7px;">INGENIERO RESIDENTE</td>
              <td style="text-align: center; font-weight: bold; font-size: 6px;">Número de Trabajadores Parte</td>
            </tr>
          </table>
        </div>
      </div>
      </body>
      </html>
    `;

    // Generar PDF
    const element = document.createElement('div');
    element.innerHTML = html;

    html2pdf().set({
      margin: [3, 3, 3, 3],
      filename: `Tareo_${fecha}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'l', unit: 'mm', format: 'a4' },
      pagebreak: { mode: 'avoid-all' }
    }).from(element).save();
  });
}
