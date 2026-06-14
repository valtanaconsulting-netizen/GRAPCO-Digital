// src/views/modulos/resultadoOperativo/ImportadorRegistros.jsx
// Importador GENÉRICO y reusable: Excel/CSV → cualquier colección de costo real
// (Registro_Facturas, GG_Oficina, ValorizacionesSubcontratistas, …).
// "Importar = solo subir": el usuario sube el archivo y este botón in-app escribe
// a Firestore con el proyectoId del contexto. El motor (useRO/calcularROMensual)
// recoge la colección automáticamente y recalcula el RO en vivo.
//
// Se parametriza con `campos`: [{ campo, etiquetas[], tipo, requerido }].

import React, { useState, useMemo } from 'react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';

// ── helpers ──────────────────────────────────────────────────────────────
const norm = (s) => (s ?? '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin tildes
  .replace(/[^a-z0-9]/g, '');                          // solo alfanumérico

// "1,234.56" / "S/ 1.234,56" / "1234" → number. Heurística miles/decimal.
export function parseNumero(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  let s = v.toString().trim().replace(/s\/\.?|soles|pen/gi, '').replace(/\s/g, '');
  if (!s) return 0;
  const tieneComa = s.includes(','), tienePunto = s.includes('.');
  if (tieneComa && tienePunto) {
    // el último separador es el decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (tieneComa) {
    // coma sola: decimal si hay 1-2 dígitos tras ella, si no, miles
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  }
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function parseExcel(file) {
  const mod = await import('xlsx');
  const XLSX = mod.default || mod;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (!aoa.length) return { headers: [], rows: [] };
  const headers = aoa[0].map(h => (h ?? '').toString().trim());
  const rows = aoa.slice(1).map(arr => {
    const o = {};
    headers.forEach((h, i) => { o[h] = arr[i] ?? ''; });
    return o;
  });
  return { headers, rows };
}

function parseCSVSimple(text) {
  const lineas = text.split(/\r?\n/).filter(l => l.trim());
  if (!lineas.length) return { headers: [], rows: [] };
  const sep = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ';' : ',';
  const split = (l) => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
  const headers = split(lineas[0]);
  const rows = lineas.slice(1).map(l => {
    const arr = split(l); const o = {};
    headers.forEach((h, i) => { o[h] = arr[i] ?? ''; });
    return o;
  });
  return { headers, rows };
}

// Detecta, para cada campo del esquema, qué header del archivo le corresponde.
function detectarColumnas(headers, campos) {
  const hNorm = headers.map(h => ({ raw: h, n: norm(h) }));
  const mapa = {};
  for (const c of campos) {
    let hit = hNorm.find(h => c.etiquetas.some(e => h.n === norm(e)));      // match exacto
    if (!hit) hit = hNorm.find(h => c.etiquetas.some(e => h.n.includes(norm(e)))); // match parcial
    mapa[c.campo] = hit?.raw || null;
  }
  return mapa;
}

export default function ImportadorRegistros({
  titulo, subtitulo, coleccion, campos,
  frenteId = null, extra = {}, onDone, showToast,
}) {
  const { user } = useAuth();
  const { proyectoActivo } = useProyectoActivo();
  const [archivo, setArchivo] = useState(null);
  const [parsed, setParsed] = useState(null);   // { headers, rows, mapa, items }
  const [guardando, setGuardando] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setArchivo(file);
    try {
      const nombre = (file.name || '').toLowerCase();
      const esExcel = nombre.endsWith('.xlsx') || nombre.endsWith('.xls');
      const { headers, rows } = esExcel ? await parseExcel(file) : parseCSVSimple(await file.text());
      const mapa = detectarColumnas(headers, campos);
      const items = rows.map(r => {
        const o = {};
        for (const c of campos) {
          const col = mapa[c.campo];
          const val = col ? r[col] : '';
          o[c.campo] = c.tipo === 'numero' ? parseNumero(val) : (val ?? '').toString().trim();
        }
        return o;
      }).filter(o => campos.some(c => c.requerido ? (c.tipo === 'numero' ? Math.abs(o[c.campo]) > 0.005 : o[c.campo]) : false)
                  || campos.filter(c => c.requerido).length === 0);
      setParsed({ headers, rows, mapa, items });
    } catch (e) {
      showToast?.('Error leyendo archivo: ' + e.message, 'error');
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const stats = useMemo(() => {
    if (!parsed) return null;
    const campoMonto = campos.find(c => c.tipo === 'numero' && c.requerido) || campos.find(c => c.tipo === 'numero');
    const total = campoMonto ? parsed.items.reduce((s, it) => s + (it[campoMonto.campo] || 0), 0) : 0;
    return { filas: parsed.rows.length, validas: parsed.items.length, total, campoMonto: campoMonto?.campo };
  }, [parsed, campos]);

  const ejecutar = async () => {
    if (!parsed?.items?.length || !proyectoActivo) return;
    setGuardando(true);
    try {
      const items = parsed.items;
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db);
        items.slice(i, i + 400).forEach(it => {
          const ref = doc(collection(db, coleccion));
          batch.set(ref, {
            ...it, ...extra,
            proyectoId: proyectoActivo.id,
            frenteId: frenteId || null,
            estado: 'vigente',
            creadoEn: serverTimestamp(),
            creadoPor: user?.email || 'desconocido',
            origenImport: archivo?.name || 'import',
          });
        });
        await batch.commit();
      }
      showToast?.(`✅ Importados ${items.length} registros a ${coleccion}`, 'success');
      setArchivo(null); setParsed(null);
      onDone?.(items.length);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (!proyectoActivo) {
    return <p style={{ padding: 24, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo para importar.</p>;
  }

  const fmt = (n) => `S/ ${Math.round(Number(n) || 0).toLocaleString('es-PE')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, borderRadius: 12, padding: '14px 20px', color: '#fff', borderLeft: `5px solid ${BASE.gold}` }}>
        <p style={{ fontSize: 9.5, fontWeight: 900, color: BASE.gold, letterSpacing: 1.2 }}>IMPORTAR · EXCEL / CSV → {coleccion}</p>
        <h3 style={{ fontSize: 17, fontWeight: 900, marginTop: 3 }}>{titulo}</h3>
        {subtitulo && <p style={{ fontSize: 11.5, opacity: 0.9, marginTop: 3 }}>{subtitulo}</p>}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{ background: dragOver ? '#dcfce7' : BASE.white, border: `2.5px dashed ${dragOver ? '#16a34a' : BASE.border}`, borderRadius: 12, padding: '30px 24px', textAlign: 'center', transition: 'all 0.2s' }}>
        <p style={{ fontSize: 40, marginBottom: 8 }}>{dragOver ? '⬇️' : '📤'}</p>
        <p style={{ fontSize: 14, fontWeight: 900, color: BASE.navy }}>{archivo ? `📄 ${archivo.name}` : 'Arrastra un Excel/CSV o haz click'}</p>
        <p style={{ fontSize: 11, color: BASE.muted, marginTop: 4 }}>soporta .xlsx, .xls, .csv</p>
        <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} id={`imp-${coleccion}`} />
        <label htmlFor={`imp-${coleccion}`} style={{ display: 'inline-block', marginTop: 12, padding: '9px 18px', borderRadius: 8, background: BASE.navy, color: '#fff', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' }}>📁 SELECCIONAR ARCHIVO</label>
      </div>

      {parsed && (
        <>
          {/* Columnas detectadas */}
          <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy, letterSpacing: 0.4, marginBottom: 8 }}>COLUMNAS DETECTADAS</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {campos.map(c => {
                const v = parsed.mapa[c.campo];
                const falta = c.requerido && !v;
                return (
                  <div key={c.campo} style={{ background: v ? '#dcfce7' : (falta ? '#fee2e2' : '#fef3c7'), borderLeft: `3px solid ${v ? '#16a34a' : (falta ? '#dc2626' : '#f59e0b')}`, padding: '7px 10px', borderRadius: 6 }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{c.campo.toUpperCase()}{c.requerido ? ' *' : ''}</p>
                    <p style={{ fontSize: 11, fontWeight: 900, color: v ? '#15803d' : (falta ? '#991b1b' : BASE.goldDark), marginTop: 2 }}>{v || 'No detectada'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Stat label="Filas leídas" valor={stats.filas} color={BASE.navy} />
              <Stat label="Registros válidos" valor={stats.validas} color="#16a34a" />
              <Stat label={`Total ${stats.campoMonto || ''}`} valor={fmt(stats.total)} color={BASE.gold} chico />
            </div>
          )}

          {/* Preview */}
          {parsed.items.length > 0 && (
            <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: BASE.navy }}>VISTA PREVIA (primeros 12)</p>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '38vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: BASE.navy, color: '#fff' }}>
                      {campos.map(c => <th key={c.campo} style={{ ...thS, textAlign: c.tipo === 'numero' ? 'right' : 'left' }}>{c.campo}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.items.slice(0, 12).map((it, i) => (
                      <tr key={i} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                        {campos.map(c => (
                          <td key={c.campo} style={{ ...tdS, textAlign: c.tipo === 'numero' ? 'right' : 'left', fontFamily: c.tipo === 'numero' ? 'monospace' : undefined, fontWeight: c.tipo === 'numero' ? 800 : 400 }}>
                            {c.tipo === 'numero' ? fmt(it[c.campo]) : (it[c.campo] || '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setArchivo(null); setParsed(null); }} style={btnSec}>🗑️ Descartar</button>
            <button onClick={ejecutar} disabled={guardando || !parsed.items.length} style={{ ...btnPrim, opacity: (guardando || !parsed.items.length) ? 0.5 : 1 }}>
              {guardando ? '⏳ Importando…' : `🚀 IMPORTAR ${parsed.items.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, valor, color, chico }) {
  return (
    <div style={{ background: color + '12', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.5 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? 14 : 19, fontWeight: 900, color, marginTop: 3, fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

const thS = { padding: '8px 10px', fontSize: 10, fontWeight: 900, letterSpacing: 0.3, whiteSpace: 'nowrap' };
const tdS = { padding: '6px 10px', fontSize: 11, color: BASE.text, whiteSpace: 'nowrap' };
const btnPrim = { padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' };
const btnSec = { padding: '10px 20px', borderRadius: 8, background: BASE.bgSoft, color: BASE.muted, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
