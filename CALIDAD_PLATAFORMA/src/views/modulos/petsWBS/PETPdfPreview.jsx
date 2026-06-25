// src/views/modulos/petsWBS/PETPdfPreview.jsx
// Vista de impresión A4 de un PET con el mismo formato visual del PDF original.
// Disparar window.print() desde aquí genera el PDF tal cual los originales SGC-CAL-PETS-XXX.

import React, { useState } from 'react';
import { LOGO, BASE } from '../../../utils/styles';
import { descargarPETPdf } from '../../../utils/descargarPETPdf';

const A4_STYLE = `
@page {
  size: A4 portrait;
  margin: 14mm 14mm 18mm 14mm;
}
@media print {
  body { background: #fff !important; }
  .pet-print-root { box-shadow: none !important; }
  .pet-no-print { display: none !important; }
  .pet-page { page-break-after: always; }
  .pet-page:last-child { page-break-after: auto; }
}
.pet-print-root {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  background: #fff;
  max-width: 210mm;
  margin: 0 auto;
  padding: 0;
  font-size: 11px;
  line-height: 1.45;
}
.pet-print-root h1 { font-size: 22px; margin: 0; letter-spacing: 0.5px; font-weight: 800; }
.pet-print-root h2 { font-size: 14px; margin: 14px 0 6px; font-weight: 800; }
.pet-print-root h3 { font-size: 12px; margin: 10px 0 4px; font-weight: 700; }
.pet-print-root p { margin: 0 0 6px; }
.pet-page {
  padding: 6mm;
  background: #fff;
}
.pet-header-row {
  display: grid;
  grid-template-columns: 110px 1fr 130px 60px;
  border: 1px solid #000;
  align-items: stretch;
}
.pet-header-row > div {
  padding: 5px 8px;
  border-right: 1px solid #000;
}
.pet-header-row > div:last-child { border-right: none; }
.pet-header-title { font-weight: 800; font-size: 11px; }
.pet-header-meta { font-size: 9px; }
.pet-section {
  border-left: 3px solid #1e3a5f;
  padding-left: 8px;
  margin-top: 10px;
}
.pet-section-num {
  display: inline-block;
  width: 22px;
  font-weight: 800;
}
ul.pet-list, ol.pet-list { margin: 4px 0 8px 22px; padding: 0; }
ul.pet-list li, ol.pet-list li { margin-bottom: 3px; }
.pet-cover {
  border: 1.5px solid #000;
  padding: 16px;
  margin-bottom: 10px;
}
.pet-cover-title {
  text-align: center;
  font-size: 24px;
  font-weight: 800;
  margin: 12px 0;
  letter-spacing: 1px;
}
.pet-cover-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.pet-cover-logo img {
  width: 110px;
  height: 110px;
  object-fit: contain;
}
.pet-firmantes {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 10px;
}
.pet-firmantes th, .pet-firmantes td {
  border: 1px solid #000;
  padding: 6px 8px;
  vertical-align: middle;
}
.pet-firmantes th {
  background: #f3f4f6;
  font-weight: 800;
  text-align: center;
  font-size: 9.5px;
  letter-spacing: 0.4px;
}
.pet-firmantes td.rol { font-weight: 800; text-align: center; width: 80px; background: #fafafa; }
.pet-firmantes td.fecha { text-align: center; width: 90px; font-family: monospace; }
.pet-firmantes td.firma { width: 160px; height: 46px; }
.pet-footer-cell {
  border: 1px solid #000;
  border-top: none;
  padding: 6px 8px;
  font-size: 10px;
}
.pet-foot-note {
  font-size: 8.5px;
  font-style: italic;
  text-align: center;
  margin-top: 6px;
  color: #444;
  border: 1px solid #999;
  padding: 4px 8px;
}
.pet-def-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 8px;
  margin-bottom: 4px;
}
.pet-def-row .t { font-weight: 800; }
.pet-control-cambios {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-top: 4px;
}
.pet-control-cambios th, .pet-control-cambios td {
  border: 1px solid #000;
  padding: 5px 7px;
}
.pet-control-cambios th { background: #fbbf24; font-weight: 800; }
.pet-toolbar {
  position: sticky;
  top: 0;
  background: ${BASE.navy};
  color: #fff;
  padding: 10px 14px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}
.pet-toolbar button {
  background: ${BASE.gold};
  color: ${BASE.navyDark};
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
}
.pet-toolbar button.secondary {
  background: rgba(255,255,255,0.18);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.4);
}
`;

function fmtFecha(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    // YYYY-MM-DD → DD/MM/YYYY
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return d;
  }
  try { return new Date(d).toLocaleDateString('es-PE'); } catch { return String(d); }
}

function HeaderBar({ pet, pagina, totalPaginas }) {
  return (
    <div className="pet-header-row">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GRAPCO" style={{ width: 80, height: 50, objectFit: 'contain' }} />
      </div>
      <div className="pet-header-title">
        PROCEDIMIENTO ESCRITO DE TRABAJO SEGURO<br />
        <span style={{ fontWeight: 600 }}>{pet.titulo}</span>
      </div>
      <div className="pet-header-meta">
        <strong>Rev.:</strong> {pet.version || '00'}<br />
        <strong>Código:</strong> {pet.codigo}
      </div>
      <div className="pet-header-meta" style={{ textAlign: 'center' }}>
        <strong>Pág.</strong><br />
        {pagina} de {totalPaginas}
      </div>
    </div>
  );
}

function FootNote() {
  return (
    <p className="pet-foot-note">
      Este documento una vez impreso se convertirá en una copia no controlada, pudiendo estar obsoleto;
      para ello, antes de usar consulte con La Lista Maestra del SGC.
    </p>
  );
}

export default function PETPdfPreview({ pet, onClose }) {
  if (!pet) return null;
  const aprobaciones = pet.aprobaciones || [];
  const referencias = pet.referencias || [];
  const definiciones = pet.definiciones || [];
  const epp = pet.epp || [];
  const equipos = pet.equipos || [];
  const procedimiento = pet.procedimiento || {};
  const responsabilidades = pet.responsabilidades || [];
  const controlCambios = pet.controlCambios || [];
  const anexos = pet.anexos || [];

  // Conteo aproximado de páginas (visual; el browser lo recalcula al imprimir).
  // Mostramos "X" en el header y dejamos que el navegador maneje los page breaks.
  const totalPag = 1; // simbólico; el navegador divide

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)',
      zIndex: 1000, overflow: 'auto',
    }}>
      <style>{A4_STYLE}</style>

      {/* Toolbar — solo en pantalla, no se imprime */}
      <div className="pet-toolbar pet-no-print">
        <span style={{ fontWeight: 800, fontSize: 13 }}>
          Vista PDF · {pet.codigo} · {pet.titulo}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
          <button className="secondary" onClick={onClose}>✕ Cerrar</button>
        </div>
      </div>

      <div className="pet-print-root">

        {/* ─────── PORTADA ─────── */}
        <div className="pet-page">
          <HeaderBar pet={pet} pagina={1} totalPaginas={totalPag} />

          <div className="pet-cover">
            <div className="pet-cover-logo">
              <img src={LOGO} alt="GRAPCO" />
            </div>
            <h1 className="pet-cover-title">{pet.titulo}</h1>

            <table className="pet-firmantes">
              <thead>
                <tr>
                  <th></th>
                  <th>RESPONSABLE / CARGO</th>
                  <th>FECHA</th>
                  <th>FIRMA</th>
                </tr>
              </thead>
              <tbody>
                {aprobaciones.map((ap, i) => (
                  <tr key={i}>
                    <td className="rol">{ap.rol}</td>
                    <td>
                      <strong>{ap.nombre || '—'}</strong><br />
                      <span style={{ fontSize: 9, color: '#555' }}>{ap.cargo || ''}</span>
                    </td>
                    <td className="fecha">{fmtFecha(ap.fecha)}</td>
                    <td className="firma"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="pet-firmantes" style={{ marginTop: 0, borderTop: 'none' }}>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', fontWeight: 800 }}>
                    GERENCIA DE OPERACIONES
                  </td>
                  <td colSpan={2} style={{ textAlign: 'center' }}>
                    Rev: <strong>{pet.version || '00'}</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center' }}>
                    PROCEDIMIENTO ESCRITO DE TRABAJO SEGURO (PETS)
                  </td>
                  <td colSpan={2} style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {pet.codigo}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <FootNote />
        </div>

        {/* ─────── CONTENIDO ─────── */}
        <div className="pet-page">
          <HeaderBar pet={pet} pagina="—" totalPaginas={totalPag} />

          {/* 1. PROPÓSITO */}
          <div className="pet-section">
            <h2><span className="pet-section-num">1.</span> PROPÓSITO</h2>
            <p>{pet.proposito || '—'}</p>
          </div>

          {/* 2. ALCANCES */}
          <div className="pet-section">
            <h2><span className="pet-section-num">2.</span> ALCANCES</h2>
            <p>{pet.alcance || '—'}</p>
          </div>

          {/* 3. REFERENCIAS */}
          <div className="pet-section">
            <h2><span className="pet-section-num">3.</span> REFERENCIA</h2>
            {referencias.length === 0 ? <p>—</p> : (
              <ul className="pet-list">
                {referencias.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>

          {/* 4. DEFINICIONES */}
          <div className="pet-section">
            <h2><span className="pet-section-num">4.</span> DEFINICIONES</h2>
            {definiciones.length === 0 ? <p>—</p> : (
              <div>
                {definiciones.map((d, i) => (
                  <div key={i} className="pet-def-row">
                    <span className="t">{d.termino}:</span>
                    <span>{d.descripcion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. EPP */}
          <div className="pet-section">
            <h2><span className="pet-section-num">5.</span> EQUIPO DE PROTECCIÓN PERSONAL / COLECTIVA</h2>
            {epp.length === 0 ? <p>—</p> : (
              <ul className="pet-list">
                {epp.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* 6. EQUIPOS */}
          <div className="pet-section">
            <h2><span className="pet-section-num">6.</span> EQUIPO / HERRAMIENTAS / MATERIALES</h2>
            {equipos.length === 0 ? <p>—</p> : (
              <ul className="pet-list">
                {equipos.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* 7. PROCEDIMIENTO */}
          <div className="pet-section">
            <h2><span className="pet-section-num">7.</span> PROCEDIMIENTO DE TRABAJO</h2>
            <h3>7.1 Consideraciones Iniciales</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{procedimiento.consideracionesIniciales || '—'}</p>

            <h3>7.2 Desarrollo de la Actividad / Proceso</h3>
            {(procedimiento.desarrollo || []).length === 0 ? <p>—</p> : (
              <ol className="pet-list">
                {(procedimiento.desarrollo || []).map((p, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <strong>{p.titulo}</strong>
                    {p.descripcion ? <div style={{ marginTop: 2 }}>{p.descripcion}</div> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 8. RESPONSABILIDADES */}
          <div className="pet-section">
            <h2><span className="pet-section-num">8.</span> RESPONSABILIDADES</h2>
            {responsabilidades.length === 0 ? <p>—</p> : (
              <div>
                {responsabilidades.map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <h3 style={{ textDecoration: 'underline' }}>{r.cargo}</h3>
                    {(r.items || []).length === 0 ? null : (
                      <ul className="pet-list">
                        {(r.items || []).map((it, j) => <li key={j}>{it}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 9. CONTROL DE CAMBIOS */}
          <div className="pet-section">
            <h2><span className="pet-section-num">9.</span> CONTROL DE CAMBIOS</h2>
            <table className="pet-control-cambios">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rev.</th>
                  <th style={{ width: 70 }}>N° Página</th>
                  <th style={{ width: 70 }}>N° Inciso</th>
                  <th>Descripción del Cambio</th>
                </tr>
              </thead>
              <tbody>
                {controlCambios.length === 0 ? (
                  <tr><td colSpan={4} style={{ height: 28 }}>&nbsp;</td></tr>
                ) : controlCambios.map((c, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center' }}>{c.rev}</td>
                    <td style={{ textAlign: 'center' }}>{c.pagina}</td>
                    <td style={{ textAlign: 'center' }}>{c.inciso}</td>
                    <td>{c.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 10. ANEXOS */}
          <div className="pet-section">
            <h2><span className="pet-section-num">10.</span> ANEXOS</h2>
            {anexos.length === 0 ? <p>—</p> : (
              <ul className="pet-list">
                {anexos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </div>

          <FootNote />
        </div>
      </div>
    </div>
  );
}
