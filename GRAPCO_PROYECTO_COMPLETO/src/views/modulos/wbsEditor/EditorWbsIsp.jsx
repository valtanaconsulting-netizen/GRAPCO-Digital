// src/views/modulos/wbsEditor/EditorWbsIsp.jsx
// Editor del Catálogo WBS por proyecto — vista tipo "Partida de Control Presupuesto".
//
// Se INGRESA: Metrado e IP en cada OFERTA (por frente) y en ADICIONALES.
// Se CALCULA solo: HH (= Metrado × IP), el CONTRACTUAL (suma de fuentes) y la META.
// El resultado alimenta el ISP / Análisis de Desempeño (CPI).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { CATALOGO_MASTER, INFO_MAP } from '../../../utils/constants';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from '../../../hooks/useCatalogoWBS';
import {
  num, calcActividad, hhDe, actividadVacia, hardcodedAArbol, totalesArbol,
  normalizarActividad, FRENTE_BASE, COLUMNAS_PLANTILLA, filasAArbol, arbolAFilas,
} from '../../../utils/catalogoWbs';
import { PRESUPUESTO_CREDITEX } from '../../../data/presupuestoCreditex';

const clonar = (x) => JSON.parse(JSON.stringify(x || []));
const fmt = (n, dec = 2) => num(n).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function EditorWbsIsp({ showToast }) {
  const { proyectoActivoId, proyectos, frentes } = useProyectoActivo();
  const { loading, arbol: arbolRemoto, existe } = useCatalogoWBS(proyectoActivoId);

  const [arbol, setArbol]   = useState([]);
  const [dirty, setDirty]   = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado]     = useState(false);
  const fileRef = useRef(null);

  const proyectoNombre = useMemo(
    () => (proyectos || []).find(p => p.id === proyectoActivoId)?.nombre || 'proyecto activo',
    [proyectos, proyectoActivoId]
  );

  const frentesProyecto = useMemo(() => {
    const fs = (frentes || []).filter(f => f.proyectoId === proyectoActivoId);
    return fs.length
      ? fs.map(f => ({ id: f.id, nombre: f.nombre || f.codigo || f.id }))
      : [{ id: FRENTE_BASE, nombre: 'Oferta' }];
  }, [frentes, proyectoActivoId]);

  // Columnas de oferta: si el catálogo ya tiene datos, salen de los datos;
  // si está vacío, se usan los frentes del proyecto (para entrada manual).
  const columnas = useMemo(() => {
    const enDatos = {};
    (arbol || []).forEach(p => (p.subpartidas || []).forEach(s => (s.actividades || []).forEach(a => {
      Object.keys(a.ofertas || {}).forEach(fid => { enDatos[fid] = true; });
    })));
    const ids = Object.keys(enDatos);
    if (ids.length) {
      const nom = {};
      frentesProyecto.forEach(f => { nom[f.id] = f.nombre; });
      return ids.map(id => ({ id, nombre: nom[id] || id }));
    }
    return frentesProyecto;
  }, [frentesProyecto, arbol]);

  useEffect(() => { setCargado(false); setDirty(false); }, [proyectoActivoId]);
  useEffect(() => {
    if (loading || cargado) return;
    setArbol(arbolRemoto ? clonar(arbolRemoto) : []);
    setCargado(true);
  }, [loading, arbolRemoto, cargado]);

  const toast = (m, t = 'info') => showToast ? showToast(m, t) : null;
  const tot = useMemo(() => totalesArbol(arbol), [arbol]);

  const nCols = columnas.length;
  const totalCols = 2 + nCols * 3 + 3 + 3 + 3 + 1; // act,und + frentes + adic + contr + meta + acciones

  // ── Mutaciones ──────────────────────────────────────────────────
  const mut = (fn) => { setArbol(prev => { const n = clonar(prev); fn(n); return n; }); setDirty(true); };
  const addPartida    = () => mut(a => a.push({ nombre: 'NUEVA PARTIDA', subpartidas: [] }));
  const renamePartida = (pi, v) => mut(a => { a[pi].nombre = v; });
  const delPartida    = (pi) => { if (confirm('¿Eliminar la partida y todo su contenido?')) mut(a => a.splice(pi, 1)); };
  const addSub    = (pi) => mut(a => { (a[pi].subpartidas ||= []).push({ nombre: 'NUEVA SUB-PARTIDA', actividades: [] }); });
  const renameSub = (pi, si, v) => mut(a => { a[pi].subpartidas[si].nombre = v; });
  const delSub    = (pi, si) => { if (confirm('¿Eliminar la sub-partida?')) mut(a => a[pi].subpartidas.splice(si, 1)); };
  const addAct    = (pi, si) => mut(a => { (a[pi].subpartidas[si].actividades ||= []).push({ ...actividadVacia(), nombre: 'NUEVA ACTIVIDAD' }); });
  const delAct    = (pi, si, ai) => mut(a => a[pi].subpartidas[si].actividades.splice(ai, 1));
  const setActCampo = (pi, si, ai, campo, val) => mut(a => { a[pi].subpartidas[si].actividades[ai][campo] = val; });
  const setOferta = (pi, si, ai, fid, campo, val) => mut(a => {
    const act = a[pi].subpartidas[si].actividades[ai];
    (act.ofertas ||= {}); (act.ofertas[fid] ||= { met: 0, ip: 0 });
    act.ofertas[fid][campo] = val;
  });
  const setAdic = (pi, si, ai, campo, val) => mut(a => {
    const act = a[pi].subpartidas[si].actividades[ai];
    (act.adicional ||= { met: 0, ip: 0 });
    act.adicional[campo] = val;
  });

  // ── Acciones globales ───────────────────────────────────────────
  const cargarBase = () => {
    if (arbol.length && !confirm('Esto reemplaza el catálogo actual con el catálogo base. ¿Continuar?')) return;
    setArbol(hardcodedAArbol(CATALOGO_MASTER, INFO_MAP, columnas[0]?.id || FRENTE_BASE));
    setDirty(true);
    toast('Catálogo base cargado — repártelo entre frentes y guarda', 'success');
  };
  // Carga el presupuesto:
  //  · Si el proyecto YA tiene uno guardado → recarga ESE (tu última versión guardada).
  //  · Si no hay nada guardado → usa el preset base de CREDITEX.
  const cargarCreditex = () => {
    const guardado = Array.isArray(arbolRemoto) && arbolRemoto.length > 0;
    if (dirty && arbol.length &&
        !confirm('Tienes cambios sin guardar. Esto los descarta y recarga el presupuesto guardado. ¿Continuar?')) return;
    if (guardado) {
      setArbol(clonar(arbolRemoto));
      setDirty(false);
      toast('Recargado tu presupuesto guardado', 'success');
    } else {
      setArbol(clonar(PRESUPUESTO_CREDITEX));
      setDirty(true);
      toast('Presupuesto CREDITEX cargado — revisa y pulsa "Guardar cambios"', 'success');
    }
  };
  const guardar = async () => {
    if (!proyectoActivoId) return toast('No hay proyecto activo', 'warning');
    setGuardando(true);
    try {
      const limpio = (arbol || []).map(p => ({
        nombre: (p.nombre || '').trim(),
        subpartidas: (p.subpartidas || []).map(s => ({
          nombre: (s.nombre || '').trim(),
          actividades: (s.actividades || []).map(normalizarActividad),
        })),
      }));
      await setDoc(doc(db, 'Catalogo_WBS', proyectoActivoId), {
        proyectoId: proyectoActivoId, arbol: limpio, actualizadoEn: serverTimestamp(),
      });
      setArbol(limpio); setDirty(false);
      toast('Catálogo WBS guardado ✓', 'success');
    } catch (e) {
      console.error('[guardar WBS]', e);
      toast('Error al guardar: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };
  const descargarPlantilla = async () => {
    try {
      const XLSX = await import('xlsx');
      const filas = arbol.length ? arbolAFilas(arbol, columnas) : [
        { 'Partida': 'TRABAJOS PRELIMINARES', 'Subpartida': 'TOPOGRAFÍA', 'Actividad': 'TRAZO Y REPLANTEO TOPOGRAFICO', 'Unidad': 'MES', 'Frente': columnas[0]?.nombre || 'F1', 'Metrado': 4, 'IP': 311.76, 'IP Meta': 280 },
        { 'Partida': 'TRABAJOS PRELIMINARES', 'Subpartida': 'TOPOGRAFÍA', 'Actividad': 'TRAZO Y REPLANTEO TOPOGRAFICO', 'Unidad': 'MES', 'Frente': columnas[1]?.nombre || 'F2', 'Metrado': 1, 'IP': 311.76, 'IP Meta': 280 },
      ];
      const ws = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS_PLANTILLA });
      ws['!cols'] = COLUMNAS_PLANTILLA.map(c => ({ wch: Math.max(13, c.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'WBS');
      XLSX.writeFile(wb, `Plantilla_WBS_${proyectoNombre.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) { console.error('[plantilla]', e); toast('No se pudo generar la plantilla', 'error'); }
  };
  const importarExcel = async (file) => {
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const nuevo = filasAArbol(filas, frentesProyecto);
      if (!nuevo.length) return toast('No se encontraron filas válidas (revisa los encabezados)', 'warning');
      if (arbol.length && !confirm(`El Excel trae ${nuevo.length} partida(s). Esto reemplaza el catálogo actual. ¿Continuar?`)) return;
      setArbol(nuevo); setDirty(true);
      const t = totalesArbol(nuevo);
      toast(`Importado: ${t.partidas} partidas · ${t.actividades} actividades`, 'success');
    } catch (e) {
      console.error('[importar WBS]', e);
      toast('Error al leer el Excel: ' + e.message, 'error');
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  // Subtotal HH de un conjunto de actividades, por columna
  const sumar = (acts) => {
    const ofe = {}; columnas.forEach(c => { ofe[c.id] = 0; });
    let adic = 0, contr = 0, meta = 0;
    (acts || []).forEach(a => {
      columnas.forEach(c => { ofe[c.id] += hhDe(a.ofertas?.[c.id]); });
      adic += hhDe(a.adicional);
      const cc = calcActividad(a);
      contr += cc.contractualHH; meta += cc.metaHH;
    });
    return { ofe, adic, contr, meta };
  };
  const totalGeneral = useMemo(() => {
    const acts = [];
    (arbol || []).forEach(p => (p.subpartidas || []).forEach(s => acts.push(...(s.actividades || []))));
    return sumar(acts);
  }, [arbol, columnas]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando catálogo WBS…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={e => importarExcel(e.target.files?.[0])} />

      {/* Cabecera */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`, borderRadius: '12px', padding: '14px 16px',
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>🗂️ PARTIDA DE CONTROL PRESUPUESTO — {proyectoNombre}</p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            {tot.partidas} partidas · {tot.subpartidas} sub-partidas · {tot.actividades} actividades · {nCols} frente{nCols !== 1 ? 's' : ''}
            {tot.sinDatos > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}> · {tot.sinDatos} sin datos</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Btn onClick={cargarCreditex} bg={BASE.gold} color={BASE.navy}>
            {existe ? '🔄 Recargar guardado' : '📋 Presupuesto CREDITEX'}
          </Btn>
          <Btn onClick={descargarPlantilla} bg={BASE.white} color={BASE.navy} border>📥 Plantilla Excel</Btn>
          <Btn onClick={() => fileRef.current?.click()} bg={BASE.white} color={BASE.navy} border>📤 Importar Excel</Btn>
          <Btn onClick={guardar} bg={dirty ? BASE.navy : '#cbd5e1'} color="#fff" disabled={guardando || !dirty}>
            {guardando ? 'Guardando…' : dirty ? '💾 Guardar cambios' : '✓ Guardado'}
          </Btn>
        </div>
      </div>

      {arbol.length === 0 ? (
        <div style={{ background: BASE.white, border: `2px dashed ${BASE.border}`, borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '34px', marginBottom: '10px' }}>🗂️</p>
          <p style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy }}>Este proyecto aún no tiene catálogo WBS propio</p>
          <p style={{ fontSize: '12px', color: BASE.muted, margin: '6px auto 16px', maxWidth: '480px', lineHeight: 1.6 }}>
            Carga el catálogo base, importa tu Excel de presupuesto (con columna Frente), o empieza desde cero.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn onClick={cargarCreditex} bg={BASE.gold} color={BASE.navy}>📋 Cargar presupuesto CREDITEX</Btn>
            <Btn onClick={() => fileRef.current?.click()} bg={BASE.white} color={BASE.navy} border>📤 Importar Excel</Btn>
            <Btn onClick={addPartida} bg={BASE.white} color={BASE.navy} border>➕ Crear primera partida</Btn>
          </div>
        </div>
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              {/* Fila de grupos */}
              <tr>
                <th rowSpan={2} style={{ ...thG, minWidth: '320px', textAlign: 'left' }}>ACTIVIDAD</th>
                <th rowSpan={2} style={thG}>UND</th>
                {columnas.map(c => (
                  <th key={c.id} colSpan={3} style={{ ...thG, background: '#e2e8f0' }}>PPTO OFERTA · {c.nombre}</th>
                ))}
                <th colSpan={3} style={{ ...thG, background: '#f3e8ff', color: '#6b21a8' }}>ADICIONALES</th>
                <th colSpan={3} style={{ ...thG, background: '#fef9c3', color: '#a16207' }}>PPTO CONTRACTUAL</th>
                <th colSpan={3} style={{ ...thG, background: '#cffafe', color: '#0e7490' }}>PPTO META</th>
                <th rowSpan={2} style={thG}></th>
              </tr>
              {/* Fila de sub-columnas */}
              <tr>
                {columnas.map(c => <SubCols key={c.id} bg="#eef2f7" />)}
                <SubCols bg="#faf5ff" />
                <SubCols bg="#fefce8" />
                <SubCols bg="#ecfeff" />
              </tr>
            </thead>
            <tbody>
              {/* TOTAL general — también arriba */}
              <FilaSuma cols={columnas} datos={totalGeneral} label="TOTAL GENERAL" tono="total" />
              {arbol.map((p, pi) => {
                const actsPartida = [];
                (p.subpartidas || []).forEach(s => actsPartida.push(...(s.actividades || [])));
                return (
                <React.Fragment key={pi}>
                  {/* Partida */}
                  <tr>
                    <td colSpan={totalCols} style={{ background: '#dbeafe', borderBottom: `1px solid ${BASE.border}`, padding: '5px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input value={p.nombre} onChange={e => renamePartida(pi, e.target.value)} style={inpNombre(BASE.navy, '12px', '#dbeafe')} />
                        <Btn onClick={() => addSub(pi)} bg="#eef2ff" color="#3730a3" sm>➕ Sub-partida</Btn>
                        <Btn onClick={() => delPartida(pi)} bg="#fef2f2" color="#dc2626" sm>🗑</Btn>
                      </div>
                    </td>
                  </tr>

                  {(p.subpartidas || []).map((s, si) => {
                    const st = sumar(s.actividades);
                    return (
                      <React.Fragment key={si}>
                        {/* Sub-partida */}
                        <tr>
                          <td colSpan={totalCols} style={{ background: '#fdf3e3', borderBottom: `1px solid ${BASE.border}`, padding: '4px 8px 4px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input value={s.nombre} onChange={e => renameSub(pi, si, e.target.value)} style={inpNombre('#1e293b', '11px', '#fdf3e3')} />
                              <Btn onClick={() => addAct(pi, si)} bg="#ecfdf5" color="#047857" sm>➕ Actividad</Btn>
                              <Btn onClick={() => delSub(pi, si)} bg="#fef2f2" color="#dc2626" sm>🗑</Btn>
                            </div>
                          </td>
                        </tr>

                        {/* Actividades */}
                        {(s.actividades || []).map((a, ai) => {
                          const c = calcActividad(a);
                          const adicVac = !num(a.adicional?.met) && !num(a.adicional?.ip);
                          return (
                            <tr key={ai}>
                              <td style={{ ...tdC, paddingLeft: '24px' }}>
                                <input value={a.nombre} onChange={e => setActCampo(pi, si, ai, 'nombre', e.target.value)} style={inpTxt('100%')} />
                              </td>
                              <td style={tdC}><input value={a.un} onChange={e => setActCampo(pi, si, ai, 'un', e.target.value)} style={inpTxt('46px')} /></td>
                              {columnas.map(col => {
                                const o = a.ofertas?.[col.id];
                                const vac = !o || (!num(o.met) && !num(o.ip));
                                return (
                                  <React.Fragment key={col.id}>
                                    <td style={tdN}><NumCell value={vac ? '' : (o?.met ?? '')} dec={2} onCommit={v => setOferta(pi, si, ai, col.id, 'met', v)} /></td>
                                    <td style={tdCalc('#475569', '#f1f5f9')}>{vac ? '' : fmt(hhDe(o), 2)}</td>
                                    <td style={tdN}><NumCell value={vac ? '' : (o?.ip ?? '')} dec={4} onCommit={v => setOferta(pi, si, ai, col.id, 'ip', v)} /></td>
                                  </React.Fragment>
                                );
                              })}
                              {/* Adicionales */}
                              <td style={tdN}><NumCell value={adicVac ? '' : (a.adicional?.met ?? '')} dec={2} onCommit={v => setAdic(pi, si, ai, 'met', v)} /></td>
                              <td style={tdCalc('#6b21a8', '#faf5ff')}>{adicVac ? '' : fmt(hhDe(a.adicional), 2)}</td>
                              <td style={tdN}><NumCell value={adicVac ? '' : (a.adicional?.ip ?? '')} dec={4} onCommit={v => setAdic(pi, si, ai, 'ip', v)} /></td>
                              {/* Contractual (calculado) */}
                              <td style={tdCalc('#a16207', '#fefce8')}>{fmt(c.contractualMet, 2)}</td>
                              <td style={tdCalc('#a16207', '#fefce8')}>{fmt(c.contractualHH, 2)}</td>
                              <td style={tdCalc('#a16207', '#fefce8')}>{fmt(c.contractualIP, 4)}</td>
                              {/* Meta */}
                              <td style={tdCalc('#0e7490', '#ecfeff')}>{fmt(c.metaMet, 2)}</td>
                              <td style={tdCalc('#0e7490', '#ecfeff')}>{fmt(c.metaHH, 2)}</td>
                              <td style={tdN}><NumCell value={a.ipMeta ?? ''} dec={4} bg="#ecfeff" onCommit={v => setActCampo(pi, si, ai, 'ipMeta', v)} /></td>
                              <td style={tdC}>
                                <button onClick={() => delAct(pi, si, ai)} title="Eliminar actividad"
                                  style={{ border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: '5px', cursor: 'pointer', padding: '3px 6px', fontSize: '10px' }}>🗑</button>
                              </td>
                            </tr>
                          );
                        })}
                        {(s.actividades || []).length === 0 && (
                          <tr><td colSpan={totalCols} style={{ ...tdC, color: BASE.muted, fontStyle: 'italic', paddingLeft: '24px' }}>Sin actividades — usa "➕ Actividad".</td></tr>
                        )}
                        {/* Subtotal de la sub-partida */}
                        {(s.actividades || []).length > 0 && (
                          <FilaSuma cols={columnas} datos={st} label="Subtotal" />
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* TOTAL de la partida */}
                  <FilaSuma cols={columnas} datos={sumar(actsPartida)} label={`TOTAL · ${(p.nombre || 'PARTIDA').trim()}`} tono="partida" />
                  {/* Separación entre partidas */}
                  <tr><td colSpan={totalCols} style={{ height: '10px', background: 'transparent', border: 'none', padding: 0 }} /></tr>
                </React.Fragment>
                );
              })}
              {/* TOTAL general — al final */}
              <FilaSuma cols={columnas} datos={totalGeneral} label="TOTAL GENERAL" tono="total" />
            </tbody>
          </table>
        </div>
      )}

      {arbol.length > 0 && (
        <>
          <Btn onClick={addPartida} bg={BASE.white} color={BASE.navy} border>➕ Agregar partida</Btn>
          <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', lineHeight: 1.6 }}>
            Ingresas <b>Metrado</b> e <b>IP</b> en cada oferta y en adicionales. El <b>HH se calcula solo</b> (HH = Metrado × IP).<br />
            El <b>CONTRACTUAL</b> suma todas las fuentes · la <b>META</b> copia el metrado y recalcula HH con el IP Meta.<br />
            Recuerda <b>Guardar cambios</b> para que el ISP / CPI use estos valores.
          </p>
        </>
      )}
    </div>
  );
}

// ── Sub-componentes (nivel módulo, estables) ──────────────────────
function SubCols({ bg }) {
  return (
    <>
      <th style={{ ...thS, background: bg }}>METRADO</th>
      <th style={{ ...thS, background: bg }}>HH</th>
      <th style={{ ...thS, background: bg }}>IP</th>
    </>
  );
}
const TONOS_SUMA = {
  subtotal: { bg: '#e2e8f0', col: '#334155', fs: '10px' },
  partida:  { bg: '#64748b', col: '#ffffff', fs: '10.5px' },
  total:    { bg: '#1e3a5f', col: '#ffffff', fs: '11px' },
};
function FilaSuma({ cols, datos, label, tono = 'subtotal' }) {
  const t = TONOS_SUMA[tono] || TONOS_SUMA.subtotal;
  const bg = t.bg, col = t.col;
  const celda = { ...tdC, textAlign: 'right', fontWeight: 900, background: bg, color: col, fontFamily: 'monospace' };
  return (
    <tr>
      <td colSpan={2} style={{ ...tdC, background: bg, color: col, fontWeight: 900, fontSize: t.fs, paddingLeft: '24px' }}>{label}</td>
      {cols.map(c => (
        <React.Fragment key={c.id}>
          <td style={{ ...celda, opacity: 0.4 }}></td>
          <td style={celda}>{fmt(datos.ofe[c.id])}</td>
          <td style={{ ...celda, opacity: 0.4 }}></td>
        </React.Fragment>
      ))}
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={celda}>{fmt(datos.adic)}</td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={celda}>{fmt(datos.contr)}</td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={celda}>{fmt(datos.meta)}</td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
      <td style={{ ...celda, opacity: 0.4 }}></td>
    </tr>
  );
}
function Btn({ children, onClick, bg, color, border, sm, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, color, cursor: disabled ? 'default' : 'pointer',
      border: border ? `1px solid ${BASE.border}` : 'none',
      borderRadius: '8px', fontWeight: '800',
      fontSize: sm ? '10px' : '12px', padding: sm ? '4px 8px' : '9px 14px',
      opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

// Celda numérica: muestra el valor formateado (Metrado/HH 2 dec · IP 4 dec)
// cuando NO está enfocada; al editar muestra el valor crudo; al salir, formatea.
function NumCell({ value, dec, onCommit, bg }) {
  const [foco, setFoco] = useState(false);
  const [draft, setDraft] = useState('');
  const vacio = value === '' || value === null || value === undefined;
  const display = foco ? draft : (vacio ? '' : num(value).toFixed(dec));
  return (
    <input
      type="text" inputMode="decimal" value={display}
      onFocus={() => { setFoco(true); setDraft(vacio ? '' : String(value)); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setFoco(false); const s = String(draft).trim(); onCommit(s === '' ? '' : num(s)); }}
      style={{ ...inpNum, background: bg || BASE.white }}
    />
  );
}

const inpNombre = (color, fontSize, bg) => ({
  flex: 1, minWidth: '120px', border: `1px solid ${BASE.border}`,
  borderRadius: '5px', padding: '5px 8px', fontSize, fontWeight: 800,
  color, background: bg || BASE.white, textTransform: 'uppercase',
});
const inpTxt = (w) => ({
  width: w, border: `1px solid ${BASE.border}`, borderRadius: '4px',
  padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box',
});
const inpNum = {
  width: '100%', minWidth: '58px', border: `1px solid ${BASE.border}`, borderRadius: '4px',
  padding: '4px 4px', fontSize: '10px', textAlign: 'right', boxSizing: 'border-box',
};
const thG = {
  padding: '5px 6px', textAlign: 'center', fontSize: '9px', fontWeight: 900,
  color: BASE.muted, background: '#f8fafc', border: `1px solid ${BASE.border}`,
  whiteSpace: 'nowrap',
};
const thS = { ...thG, fontSize: '8px' };
const tdC = { padding: '2px 4px', border: `1px solid ${BASE.border}` };
const tdN = { ...tdC, textAlign: 'right' };
const tdCalc = (color, bg) => ({
  ...tdC, textAlign: 'right', fontWeight: 700, color, background: bg, fontFamily: 'monospace',
});
