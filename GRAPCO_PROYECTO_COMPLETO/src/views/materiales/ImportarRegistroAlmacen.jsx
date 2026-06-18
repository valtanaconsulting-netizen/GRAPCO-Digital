// src/views/materiales/ImportarRegistroAlmacen.jsx
// Importador in-app del "GP-GCE-FOR-F07 · REGISTRO DE ALMACÉN" (S10).
// Sube uno o varios maestros mensuales (acumulados), calcula los DELTAS de cada mes
// y los escribe en Kardex_Movimientos como pares descarga-directa (ENTRADA+SALIDA) por
// partida — alimentando el módulo de Almacén y la pata de Materiales del RO.
//
// Idempotente: usa IDs de documento determinísticos (REGALM_<ym>_<insumo>_<partida>_<E|S>
// y S10_<codigo> para insumos), de modo que reimportar los mismos meses SOBRESCRIBE en
// vez de duplicar. No toca módulos del RO (los edita otra sesión en paralelo).

import React, { useState, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, writeBatch, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from '../../hooks/useCatalogoWBS';
import { fmtSoles } from '../../utils/materialesAnalytics';
import {
  parseRegistroWorkbook, computeMonthlyDeltas, buildCatalogo, distinctPartidaGroups,
} from '../../utils/registroAlmacenParser';

const slug = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'NA';
// Hash estable (FNV-1a) de la clave canónica de la línea → garantiza que dos líneas
// distintas (codigo|partida|subgrupo|clase) NUNCA colisionen en el mismo id de documento,
// aunque sus slugs trunquen/normalicen igual. Determinístico ⇒ reimportar sobrescribe.
const hashClave = (s) => {
  let h = 0x811c9dc5; const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(0, 8);
};
// id de material determinístico; null si el código viene vacío (no crear material fantasma).
const matDocId = (codigo) => {
  const s = String(codigo || '').replace(/[^A-Za-z0-9]+/g, '');
  return s ? 'S10_' + s : null;
};
const BATCH_OPS = 400;

export default function ImportarRegistroAlmacen({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId } = useProyectoActivo();
  const { catalogoMaster } = useCatalogoWBS(proyectoActivoId);

  const [parsed, setParsed] = useState([]);     // [{ filename, tipo, cutoff, rows, total, error }]
  const [parsing, setParsing] = useState(false);
  const [mapeo, setMapeo] = useState({});        // grupoPartida -> partidaDestino (texto)
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(null);// { hechos, total, fase }
  const [resultado, setResultado] = useState(null);

  // Sugerencias de partida para el mapeo: nivel-1 del catálogo WBS del proyecto.
  const sugerenciasPartida = useMemo(() => {
    try { return Object.keys(catalogoMaster || {}).sort(); } catch { return []; }
  }, [catalogoMaster]);

  // ── Parseo de archivos (xlsx perezoso) ──
  const onFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setParsing(true); setResultado(null);
    try {
      const mod = await import('xlsx');
      const XLSX = mod.default || mod;
      const out = [];
      for (const file of files) {
        try {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const r = parseRegistroWorkbook(wb, XLSX, file.name);
          out.push({
            filename: file.name, tipo: r.tipo, cutoff: r.cutoff, rows: r.rows,
            total: r.rows.reduce((a, x) => a + x.costo, 0), error: r.error || null,
          });
        } catch (e) {
          out.push({ filename: file.name, tipo: 'error', cutoff: null, rows: [], total: 0, error: e.message });
        }
      }
      // ordena por fecha de corte para que el preview salga cronológico
      out.sort((a, b) => (a.cutoff?.ym || '').localeCompare(b.cutoff?.ym || ''));
      setParsed(out);
    } finally {
      setParsing(false);
    }
  }, []);

  // ── Cálculo de deltas + catálogo + grupos (memoizado) ──
  const analisis = useMemo(() => {
    const validos = parsed.filter(p => p.rows.length && p.tipo !== 'error');
    if (!validos.length) return null;
    const { meses, avisos } = computeMonthlyDeltas(validos);
    const catalogo = buildCatalogo(validos);
    const grupos = distinctPartidaGroups(validos);
    const totalMovs = meses.reduce((a, m) => a + m.movimientos.length, 0);
    const totalCosto = meses.reduce((a, m) => a + m.movimientos.reduce((s, x) => s + x.costo, 0), 0);
    const porClase = {};
    meses.forEach(m => m.movimientos.forEach(x => { porClase[x.clase] = (porClase[x.clase] || 0) + x.costo; }));
    return { meses, avisos, catalogo, grupos, totalMovs, totalCosto, porClase };
  }, [parsed]);

  // mapeo por defecto: cada grupo se mapea a sí mismo (nombre de partida)
  const mapeoEfectivo = useMemo(() => {
    const m = {};
    (analisis?.grupos || []).forEach(g => { m[g.grupo] = (mapeo[g.grupo] ?? g.grupo); });
    return m;
  }, [analisis, mapeo]);

  // ── Escritura a Firestore ──
  const importar = async () => {
    if (!analisis) return;
    if (!proyectoActivoId) return showToast?.('No hay proyecto activo. Entra al proyecto CREDITEX antes de importar.', 'error');
    setImportando(true); setResultado(null);
    try {
      // 1) Almacén determinístico para los datos del registro.
      const almId = 'ALM_REGISTRO_' + slug(proyectoActivoId);
      await setDoc(doc(db, 'Almacenes', almId), {
        codigo: 'REG-S10', nombre: 'ALMACÉN · REGISTRO S10', tipo: 'obra',
        tipoInventario: 'MATERIALES', proyectoId: proyectoActivoId, activo: true,
        origenImport: 'regalmacen', actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'import',
      }, { merge: true });

      // 2) Resolver materiales existentes — SOLO por codigoS10 (el `codigo` interno es otro
      //    namespace; cruzarlos bindea un insumo a un material ajeno). Respaldo: filas legacy
      //    que guardaron el S10 en `codigo` (solo si parece código S10: numérico largo).
      const matSnap = await getDocs(collection(db, 'Materiales'));
      const porS10 = new Map();
      matSnap.forEach(d => {
        const m = d.data();
        if (m.codigoS10) porS10.set(String(m.codigoS10), d.id);
        else if (m.codigo && /^[0-9]{6,}$/.test(String(m.codigo))) porS10.set(String(m.codigo), d.id);
      });
      const idDeInsumo = (codigo) => porS10.get(String(codigo)) || matDocId(codigo);

      // 3) Construir operaciones.
      const ops = [];
      const idsKardex = new Set();

      // 3a) Catálogo de insumos: a los EXISTENTES solo se les rellena metadata (sin pisar
      //     campos curados: categoría, nombre, unidad, activo); los NUEVOS llevan payload
      //     completo con categoría válida del enum ('OTRO').
      for (const c of analisis.catalogo) {
        if (!c.codigo) continue;
        const id = idDeInsumo(c.codigo);
        if (!id) continue;
        const esNuevo = !porS10.has(String(c.codigo));
        const dataBase = {
          codigoS10: c.codigo, origenImport: 'regalmacen',
          actualizadoEn: serverTimestamp(), actualizadoPor: user?.email || 'import',
        };
        const dataNuevo = esNuevo ? {
          codigo: c.codigo, nombre: c.nombre || c.codigo, unidad: c.unidad || 'UND',
          categoria: 'OTRO', activo: true,
          creadoEn: serverTimestamp(), creadoPor: user?.email || 'import',
        } : {};
        ops.push({ ref: doc(db, 'Materiales', id), data: { ...dataBase, ...dataNuevo }, merge: true });
      }

      // 3b) Movimientos: UNA salida por delta (sin par ENTRADA). El motor de stock clampa los
      //     negativos a 0, así que no hay stock fantasma ni dependencia del orden. `cantidad`
      //     en MAGNITUD (para stock); `costoTotal` CON SIGNO (para que el RO revierta las
      //     reclasificaciones). Solo las líneas MATERIALES llevan partidaDestino → solo ellas
      //     alimentan la pata de Materiales del RO (los SUBCONTRATOS quedan registrados aparte).
      let movs = 0;
      for (const mes of analisis.meses) {
        const fechaTs = new Date(Date.UTC(mes.cutoff.year, mes.cutoff.month - 1, mes.cutoff.day, 12, 0, 0));
        for (const mv of mes.movimientos) {
          if (!mv.codigo) continue;
          const matId = idDeInsumo(mv.codigo);
          if (!matId) continue;
          const cant = Math.abs(mv.cantidad);
          const costoTotal = mv.costo; // con signo (negativo en reclasificaciones)
          const costoUnit = cant !== 0 ? Math.round((Math.abs(costoTotal) / cant) * 100) / 100 : 0;
          const esMaterial = (mv.clase || 'MATERIALES') === 'MATERIALES';
          const partidaDestino = esMaterial ? ((mapeoEfectivo[mv.partida] || mv.partida || null) || null) : null;
          const clave = mv.clave || `${mv.codigo}@@${mv.partida}@@${mv.subgrupo}@@${mv.clase}`;
          const keyLinea = `${slug(proyectoActivoId)}_${mes.ym}_${slug(mv.codigo)}_${slug(mv.partida)}_${slug(mv.subgrupo)}_${slug(mv.clase)}_${hashClave(clave)}`;
          const id = `REGALM_${keyLinea}`;
          idsKardex.add(id);
          ops.push({
            ref: doc(db, 'Kardex_Movimientos', id),
            data: {
              fecha: fechaTs, tipo: 'SALIDA', proyectoId: proyectoActivoId,
              almacenId: almId, almacenDestinoId: null, materialId: matId,
              cantidad: cant, unidad: mv.unidad || 'UND', moneda: 'PEN',
              costoUnitario: costoUnit, costoUnitarioPEN: costoUnit,
              costoTotal, costoTotalPEN: costoTotal,
              numVale: `REG-${mes.ym}`, retiradoPor: 'Registro S10', entregadoPor: user?.email || 'import',
              partidaDestino, partidaId: null, actividadDestino: null,
              grupoAlmacen: mv.partida || null, subgrupoAlmacen: mv.subgrupo || null,
              claseRecurso: mv.clase || 'MATERIALES',
              esDescargaDirecta: true, esReclasificacion: !!mv.reclasificado,
              origenImport: 'regalmacen', importMes: mes.ym,
              observaciones: `Importado de REGISTRO ALMACÉN ${mes.label} · ${mv.partida}${mv.subgrupo ? ' / ' + mv.subgrupo : ''}`,
              registradoPor: user?.email || 'import', registradoEn: serverTimestamp(),
              estado: 'registrado',
            },
            merge: false,
          });
          movs++;
        }
      }

      // 3c) Reconciliación: borra los movimientos REGALM previos de ESTE proyecto en los meses
      //     reimportados cuyo id ya no se produce (líneas renombradas/reclasificadas) → el
      //     re-import es un reemplazo limpio, sin huérfanos que dupliquen el RO. (Consulta por
      //     un solo campo para no requerir índice compuesto; el resto se filtra en memoria.)
      const mesesImportados = new Set(analisis.meses.map(m => m.ym));
      try {
        const prevSnap = await getDocs(query(collection(db, 'Kardex_Movimientos'), where('origenImport', '==', 'regalmacen')));
        prevSnap.forEach(d => {
          const m = d.data();
          if (m.proyectoId === proyectoActivoId && mesesImportados.has(m.importMes) && !idsKardex.has(d.id)) {
            ops.push({ ref: doc(db, 'Kardex_Movimientos', d.id), delete: true });
          }
        });
      } catch (e) { console.warn('[ImportarRegistroAlmacen] reconciliación omitida:', e.message); }

      // 4) Dedup por ruta (a prueba de cualquier colisión de id) y commit por lotes.
      const byPath = new Map();
      for (const op of ops) byPath.set(op.ref.path, op);
      const opsUnicas = [...byPath.values()];
      const total = opsUnicas.length;
      for (let i = 0; i < total; i += BATCH_OPS) {
        const batch = writeBatch(db);
        for (const op of opsUnicas.slice(i, i + BATCH_OPS)) {
          if (op.delete) batch.delete(op.ref);
          else if (op.merge) batch.set(op.ref, op.data, { merge: true });
          else batch.set(op.ref, op.data);
        }
        await batch.commit();
        setProgreso({ hechos: Math.min(i + BATCH_OPS, total), total, fase: 'Escribiendo' });
      }

      setResultado({
        ok: true, materiales: analisis.catalogo.length, movimientos: movs,
        meses: analisis.meses.length, costo: analisis.totalCosto,
      });
      showToast?.(`✅ Importado: ${movs} movimientos en ${analisis.meses.length} meses`, 'success');
    } catch (e) {
      console.error('[ImportarRegistroAlmacen]', e);
      setResultado({ ok: false, error: e.message });
      showToast?.('Error al importar: ' + e.message, 'error');
    } finally {
      setImportando(false); setProgreso(null);
    }
  };

  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14, padding: '22px 24px', borderLeft: `5px solid ${BASE.gold}` }}>
      <h3 style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, marginBottom: 4 }}>
        IMPORTAR REGISTRO DE ALMACÉN (S10 · F07)
      </h3>
      <p style={{ fontSize: 12, color: BASE.muted, marginBottom: 18, lineHeight: 1.5 }}>
        Sube los maestros mensuales <b>GP-GCE-FOR-F07_REGISTRO ALMACEN</b> (uno por mes). Como son
        acumulados, calculo el <b>movimiento de cada mes</b> (delta) y lo cargo como salidas por partida.
        Reimportar los mismos meses <b>sobrescribe</b> (no duplica). Se carga en el proyecto activo
        {proyectoActivoId ? <b> · {proyectoActivoId}</b> : <b style={{ color: BASE.red }}> · ⚠️ SIN PROYECTO ACTIVO</b>}.
      </p>

      {/* Dropzone */}
      <label style={{
        display: 'block', border: `2px dashed ${BASE.border}`, borderRadius: 12, padding: '26px 18px',
        textAlign: 'center', cursor: 'pointer', background: BASE.bgSoft, marginBottom: 16,
      }}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
      >
        <input type="file" accept=".xlsx,.xls,.XLSX" multiple style={{ display: 'none' }}
          onChange={e => onFiles(e.target.files)} />
        <p style={{ fontSize: 13, fontWeight: 800, color: BASE.navy }}>
          {parsing ? '⏳ Leyendo archivos…' : '📂 Arrastra aquí los REGISTRO ALMACEN, o haz clic para elegir'}
        </p>
        <p style={{ fontSize: 11, color: BASE.muted, marginTop: 4 }}>
          Puedes subir varios meses a la vez (dic, ene, feb, … mayo).
        </p>
      </label>

      {/* Archivos cargados */}
      {parsed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={lblSec}>ARCHIVOS LEÍDOS ({parsed.length})</p>
          {parsed.map((p, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8, marginBottom: 4,
              background: p.error ? BASE.redLight : BASE.bgSoft, border: `1px solid ${p.error ? BASE.red : BASE.border}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: BASE.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.error ? '❌' : '✓'} {p.filename}
              </span>
              <span style={{ fontSize: 11, color: BASE.muted, whiteSpace: 'nowrap' }}>
                {p.error ? p.error : `${p.cutoff?.label || 'sin fecha'} · ${p.rows.length} líneas · ${fmtSoles(p.total)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Resumen (DRY RUN) */}
      {analisis && (
        <>
          {analisis.avisos.map((a, i) => (
            <p key={i} style={{ fontSize: 11.5, color: BASE.redDark, background: BASE.redLight, padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}>⚠️ {a}</p>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 8, marginBottom: 14 }}>
            <Stat label="MESES" valor={analisis.meses.length} color={BASE.navy} />
            <Stat label="MOVIMIENTOS (deltas)" valor={analisis.totalMovs} color={BASE.gold} />
            <Stat label="INSUMOS (catálogo)" valor={analisis.catalogo.length} color="#38bdf8" />
            <Stat label="COSTO TOTAL" valor={fmtSoles(analisis.totalCosto)} color={BASE.green} />
          </div>

          {/* Por mes */}
          <div style={{ marginBottom: 14 }}>
            <p style={lblSec}>MOVIMIENTO POR MES (delta)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {analisis.meses.map(m => (
                <span key={m.ym} style={chip}>
                  <b>{m.label}</b> · {m.movimientos.length} mov · {fmtSoles(m.movimientos.reduce((a, x) => a + x.costo, 0))}
                </span>
              ))}
            </div>
          </div>

          {/* Por clase */}
          <div style={{ marginBottom: 14 }}>
            <p style={lblSec}>POR CLASE</p>
            {Object.entries(analisis.porClase).map(([k, v]) => (
              <span key={k} style={{ ...chip, background: k.includes('SUB') ? '#a78bfa22' : `${BASE.green}18` }}>
                {k}: <b>{fmtSoles(v)}</b>
              </span>
            ))}
            <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 6, fontStyle: 'italic' }}>
              Solo las líneas <b>MATERIALES</b> alimentan la pata de Materiales del RO; los SUBCONTRATOS/SERVICIOS quedan registrados aparte (clase del movimiento).
            </p>
          </div>

          {/* Mapeo de partidas */}
          <div style={{ marginBottom: 16, background: BASE.bgSoft, padding: 14, borderRadius: 10 }}>
            <p style={lblSec}>PARTIDA DESTINO POR GRUPO (para el RO)</p>
            <p style={{ fontSize: 10.5, color: BASE.muted, marginBottom: 10 }}>
              El RO cruza la salida con la partida por <b>igualdad EXACTA</b> de <code>partidaDestino</code> con el
              código de partida del RO. Por defecto uso el <b>nombre del grupo</b> (ej. «CONCRETO») — si tu RO usa
              códigos WBS (ej. «04.02.01»), el RO no sumará estas salidas hasta que mapees cada grupo a su código aquí.
              De todos modos los movimientos quedan cargados y agrupados por partida en el Kardex.
            </p>
            <datalist id="sug-partidas">{sugerenciasPartida.map(s => <option key={s} value={s} />)}</datalist>
            {analisis.grupos.map(g => (
              <div key={g.grupo} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.2fr', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: BASE.navy }}>{g.grupo}</span>
                <span style={{ fontSize: 11, color: BASE.muted, fontFamily: 'monospace' }}>{fmtSoles(g.costoTotal)} →</span>
                <input list="sug-partidas" value={mapeoEfectivo[g.grupo] || ''}
                  onChange={e => setMapeo(prev => ({ ...prev, [g.grupo]: e.target.value }))}
                  style={inpS} placeholder="partidaDestino" />
              </div>
            ))}
          </div>

          {/* Importar */}
          {progreso && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ height: 8, borderRadius: 999, background: BASE.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(100 * progreso.hechos / progreso.total)}%`, background: BASE.gold, transition: 'width .2s' }} />
              </div>
              <p style={{ fontSize: 11, color: BASE.muted, marginTop: 4 }}>{progreso.fase} {progreso.hechos}/{progreso.total} operaciones…</p>
            </div>
          )}

          {resultado && resultado.ok && (
            <p style={{ fontSize: 13, fontWeight: 800, color: BASE.greenDark, background: `${BASE.green}18`, padding: '10px 14px', borderRadius: 8, marginBottom: 10 }}>
              ✅ Listo: {resultado.movimientos} movimientos · {resultado.materiales} insumos · {resultado.meses} meses · {fmtSoles(resultado.costo)}
            </p>
          )}
          {resultado && !resultado.ok && (
            <p style={{ fontSize: 13, fontWeight: 800, color: BASE.red, background: BASE.redLight, padding: '10px 14px', borderRadius: 8, marginBottom: 10 }}>
              ❌ {resultado.error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={importar} disabled={importando || !proyectoActivoId} style={{
              padding: '13px 26px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`, color: BASE.navy,
              fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
              cursor: importando || !proyectoActivoId ? 'not-allowed' : 'pointer',
              opacity: importando || !proyectoActivoId ? 0.5 : 1, boxShadow: `0 6px 18px ${BASE.gold}55`,
            }}>
              {importando ? '⏳ Importando…' : `⬆️ IMPORTAR ${analisis.totalMovs} MOVIMIENTOS`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, valor, color }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: '12px 14px', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 900, color, marginTop: 3 }}>{valor}</p>
    </div>
  );
}

const lblSec = { fontSize: 11, fontWeight: 900, color: BASE.navy, letterSpacing: 0.6, marginBottom: 8 };
const chip = { display: 'inline-block', fontSize: 11, color: BASE.navy, background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: 999, padding: '4px 10px', marginRight: 6, marginBottom: 4 };
const inpS = { width: '100%', padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 600, background: '#fff' };
