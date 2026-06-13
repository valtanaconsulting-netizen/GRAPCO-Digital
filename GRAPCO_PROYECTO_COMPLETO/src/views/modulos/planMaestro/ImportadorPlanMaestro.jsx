// src/views/modulos/planMaestro/ImportadorPlanMaestro.jsx — Importar CSV/Excel (B25)

import React, { useState, useMemo } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { parseCSV, mapearWBS } from '../../../utils/import/csvParser';

// Lee un .xlsx/.xls (binario) → { headers, rows } igual que parseCSV.
// xlsx (~700 KB) se carga bajo demanda solo cuando el usuario sube un Excel.
async function parseExcel(file) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (!aoa.length) return { headers: [], rows: [], errors: ['Hoja vacía'] };
  const headers = aoa[0].map(h => (h ?? '').toString().trim());
  const rows = aoa.slice(1).map(arr => {
    const o = {};
    headers.forEach((h, i) => { o[h] = arr[i] ?? ''; });
    return o;
  });
  return { headers, rows, errors: [] };
}

export default function ImportadorPlanMaestro({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivo, frentesDelProyecto } = useProyectoActivo();
  const [archivo, setArchivo] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [frenteDestino, setFrenteDestino] = useState(frentesDelProyecto[0]?.id || '');
  const [guardando, setGuardando] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setArchivo(file);
    try {
      const nombre = (file.name || '').toLowerCase();
      const esExcel = nombre.endsWith('.xlsx') || nombre.endsWith('.xls');
      let csv;
      if (esExcel) {
        csv = await parseExcel(file);
      } else {
        const text = await file.text();
        csv = parseCSV(text);
      }
      const map = mapearWBS(csv.headers, csv.rows);
      setParsed({ csv, map });
    } catch (e) {
      showToast?.('Error leyendo archivo: ' + e.message, 'error');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const totales = useMemo(() => {
    if (!parsed?.map?.items) return null;
    const acts = parsed.map.items;
    const metradoTotal = acts.reduce((s, a) => s + (a.metradoContractual || 0), 0);
    const hhTotal = acts.reduce((s, a) => s + (a.hhTotalPresupuestado || 0), 0);
    const partidas = new Set(acts.map(a => a.partida).filter(Boolean)).size;
    return { total: acts.length, partidas, metradoTotal, hhTotal };
  }, [parsed]);

  const ejecutarImport = async () => {
    if (!parsed?.map?.items?.length) return;
    if (!frenteDestino) { showToast?.('Selecciona un frente destino', 'error'); return; }
    if (!proyectoActivo) { showToast?.('Selecciona un proyecto activo', 'error'); return; }

    setGuardando(true);
    try {
      const acts = parsed.map.items;
      let creadas = 0;
      for (let i = 0; i < acts.length; i += 400) {
        const batch = writeBatch(db);
        acts.slice(i, i + 400).forEach(a => {
          const ref = doc(collection(db, 'PlanMaestro'));
          const { _filaCSV, ...payload } = a;
          batch.set(ref, {
            ...payload,
            proyectoId: proyectoActivo.id,
            frenteId: frenteDestino,
            creadoEn: serverTimestamp(),
            creadoPor: user?.email || 'desconocido',
            origenImport: archivo?.name || 'CSV',
          });
        });
        await batch.commit();
        creadas += Math.min(400, acts.length - i);
      }
      showToast?.(`✅ Importadas ${creadas} actividades · ${totales.hhTotal.toLocaleString('es-PE')} HH`, 'success');
      setArchivo(null); setParsed(null);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (!proyectoActivo) {
    return (
      <div style={emptyS}>
        <p style={{ fontSize: '40px' }}>🌎</p>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginTop: '10px' }}>
          Sin proyecto activo
        </p>
        <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '6px' }}>
          Selecciona un proyecto en la barra superior para importar su Plan Maestro.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        borderRadius: '14px', padding: '20px 26px', color: '#fff',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
          IMPORTADOR · EXCEL / CSV → PLAN MAESTRO
        </p>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>
          Carga Partidas · Subpartidas · Actividades
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
          Detecta automáticamente: Partida, Subpartida, Actividad, Unidad, Metrado, HH e IP meta.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          background: dragOver ? '#dcfce7' : BASE.white,
          border: `2.5px dashed ${dragOver ? '#16a34a' : BASE.border}`,
          borderRadius: '14px',
          padding: '40px 24px',
          textAlign: 'center',
          transition: 'all 0.2s',
        }}>
        <p style={{ fontSize: '50px', marginBottom: '10px' }}>{dragOver ? '⬇️' : '📤'}</p>
        <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy }}>
          {archivo ? `📄 ${archivo.name}` : 'Arrastra un archivo Excel o CSV aquí'}
        </p>
        <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '6px' }}>
          o haz click para seleccionar · soporta .xlsx, .xls, .csv, .txt
        </p>
        <input type="file" accept=".xlsx,.xls,.csv,.txt"
          onChange={(e) => handleFile(e.target.files[0])}
          style={{ display: 'none' }}
          id="csv-input" />
        <label htmlFor="csv-input" style={{
          display: 'inline-block', marginTop: '14px',
          padding: '10px 20px', borderRadius: '8px',
          background: BASE.navy, color: '#fff',
          fontSize: '11.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
        }}>📁 SELECCIONAR ARCHIVO</label>
      </div>

      {/* Vista previa */}
      {parsed && (
        <>
          {parsed.map.errores.length > 0 && (
            <div style={{ background: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '14px 18px', borderRadius: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>⚠️ Errores detectados:</p>
              <ul style={{ marginLeft: '20px', marginTop: '6px', fontSize: '11.5px', color: '#991b1b' }}>
                {parsed.map.errores.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Mapeo de columnas */}
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '16px 20px' }}>
            <p style={{ fontSize: '11.5px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px', marginBottom: '10px' }}>
              COLUMNAS DETECTADAS AUTOMÁTICAMENTE
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {[
                { key: 'cPart', label: 'Partida' },
                { key: 'cSub',  label: 'Subpartida' },
                { key: 'cAct',  label: 'Actividad' },
                { key: 'cUnd',  label: 'Unidad' },
                { key: 'cMet',  label: 'Metrado' },
                { key: 'cHH',   label: 'HH' },
                { key: 'cIP',   label: 'IP meta' },
              ].map(c => {
                const v = parsed.map.columnasDetectadas[c.key];
                return (
                  <div key={c.key} style={{
                    background: v ? '#dcfce7' : '#fef3c7',
                    borderLeft: `3px solid ${v ? '#16a34a' : '#f59e0b'}`,
                    padding: '8px 10px', borderRadius: '6px',
                  }}>
                    <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.4px' }}>{c.label.toUpperCase()}</p>
                    <p style={{ fontSize: '11.5px', fontWeight: '900', color: v ? '#15803d' : BASE.goldDark, marginTop: '2px' }}>
                      {v || 'No detectada'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          {totales && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <Stat label="Filas leídas" valor={parsed.csv.rows.length} color={BASE.navy} />
              <Stat label="Actividades válidas" valor={totales.total} color="#16a34a" />
              <Stat label="Partidas" valor={totales.partidas} color={CHART_PALETTE[3]} />
              <Stat label="HH total presup." valor={totales.hhTotal.toLocaleString('es-PE')} color={BASE.gold} chico />
            </div>
          )}

          {/* Frente destino */}
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '16px 20px' }}>
            <label style={lblS}>FRENTE DESTINO *</label>
            <select value={frenteDestino} onChange={e => setFrenteDestino(e.target.value)} style={selS}>
              <option value="">— selecciona un frente —</option>
              {frentesDelProyecto.map(f => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
            </select>
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
              Las actividades se crearán dentro de este frente del proyecto activo.
            </p>
          </div>

          {/* Preview tabla */}
          {totales && totales.total > 0 && (
            <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                <p style={{ fontSize: '11.5px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
                  VISTA PREVIA (primeras 15 actividades)
                </p>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '40vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: BASE.navy, color: '#fff' }}>
                      <th style={th}>Partida</th>
                      <th style={th}>Subpartida</th>
                      <th style={th}>Actividad</th>
                      <th style={{ ...th, textAlign: 'center' }}>Und</th>
                      <th style={{ ...th, textAlign: 'right' }}>Metrado</th>
                      <th style={{ ...th, textAlign: 'right' }}>HH</th>
                      <th style={{ ...th, textAlign: 'right' }}>IP meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map.items.slice(0, 15).map((a, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                        <td style={{ ...td, fontWeight: '900', color: BASE.navy }}>{a.partida}</td>
                        <td style={{ ...td, color: BASE.muted }}>{a.subpartida || '—'}</td>
                        <td style={td}>{a.actividad}</td>
                        <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace' }}>{a.unidad || '—'}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{a.metradoContractual || ''}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{a.hhTotalPresupuestado || ''}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: BASE.gold }}>
                          {a.ipMeta || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.map.items.length > 15 && (
                <div style={{ padding: '8px 18px', textAlign: 'center', fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>
                  + {parsed.map.items.length - 15} actividades más...
                </div>
              )}
            </div>
          )}

          {/* Acción */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setArchivo(null); setParsed(null); }} style={btnSec}>
              🗑️ Descartar
            </button>
            <button onClick={ejecutarImport} disabled={guardando || !totales?.total || !frenteDestino} style={{
              ...btnPrim,
              opacity: (guardando || !totales?.total || !frenteDestino) ? 0.5 : 1,
            }}>
              {guardando ? '⏳ Importando...' : `🚀 IMPORTAR ${totales?.total || 0} ACTIVIDADES`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, valor, color, chico }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}33`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px', padding: '12px 16px',
    }}>
      <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? '15px' : '20px', fontWeight: '900', color, marginTop: '4px', fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

const lblS = { fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' };
const selS = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '700', background: '#fff', cursor: 'pointer' };
const th = { padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', fontSize: '11.5px', color: BASE.text };
const emptyS = { padding: 30, textAlign: 'center', background: BASE.white, borderRadius: '14px', border: `2px dashed ${BASE.border}` };
const btnPrim = {
  padding: '11px 22px', borderRadius: '8px',
  background: 'linear-gradient(135deg, #16a34a, #15803d)',
  color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
  cursor: 'pointer', letterSpacing: '0.4px',
  boxShadow: '0 4px 12px rgba(22,163,74,0.4)',
};
const btnSec = {
  padding: '11px 22px', borderRadius: '8px',
  background: BASE.bgSoft, color: BASE.muted,
  border: `1.5px solid ${BASE.border}`,
  fontSize: '12px', fontWeight: '900', cursor: 'pointer',
};
