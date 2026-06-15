// src/views/modulos/wbsEditor/EditorWbsIsp.jsx
// Editor del Catálogo WBS por proyecto — vista tipo "Partida de Control Presupuesto".
//
// Se INGRESA: Metrado e IP en cada OFERTA (por frente) y en ADICIONALES.
// Se CALCULA solo: HH (= Metrado × IP), el CONTRACTUAL (suma de fuentes) y la META.
// El resultado alimenta el ISP / Análisis de Desempeño (CPI).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { CATALOGO_MASTER, INFO_MAP } from '../../../utils/constants';
import { normActividad } from '../../../utils/normalizacion';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from '../../../hooks/useCatalogoWBS';
import {
  num, calcActividad, hhDe, actividadVacia, hardcodedAArbol, totalesArbol,
  normalizarActividad, FRENTE_BASE, COLUMNAS_PLANTILLA, filasAArbol, arbolAFilas,
} from '../../../utils/catalogoWbs';
import { PRESUPUESTO_CREDITEX } from '../../../data/presupuestoCreditex';
import { generarCronogramaDesdeCatalogo, DIAS_LAB_POR_MES } from '../../../utils/autoprograma';
import { calcularIPRealProyecto } from '../../../utils/ipRealProyecto';

const clonar = (x) => JSON.parse(JSON.stringify(x || []));
const fmt = (n, dec = 2) => num(n).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
// Proyectos legacy que usan el catálogo CREDITEX hardcoded (sin doc en Catalogo_WBS).
import { LEGACY_CREDITEX_IDS as LEGACY_IDS } from '../../../config/proyecto';
const isoLocal = (d) => (d instanceof Date && !isNaN(d))
  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const lblModal = { display: 'block', fontSize: '11px', fontWeight: 800, color: BASE.navy, marginBottom: '4px' };
const inputModal = { width: '100%', border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '8px 10px', fontSize: '12px', boxSizing: 'border-box' };

export default function EditorWbsIsp({ showToast }) {
  const { proyectoActivoId, proyectos, frentes, fechaInicioProyecto, PROYECTO_DEFAULT_ID } = useProyectoActivo();
  const { loading, arbol: arbolRemoto, existe } = useCatalogoWBS(proyectoActivoId);

  const [arbol, setArbol]   = useState([]);
  const [dirty, setDirty]   = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado]     = useState(false);
  const [exportOpen, setExportOpen] = useState(false); // menú "Exportar ▾"
  const fileRef = useRef(null);

  // Importar de otro proyecto + Generar programación
  const [modal, setModal]       = useState(null);   // 'importar' | 'programa'
  const [origenSel, setOrigenSel] = useState('');
  const [resetMet, setResetMet] = useState(true);
  const [ipModo, setIpModo]     = useState('real'); // 'real' | 'presupuesto'
  // Comparador de rendimientos reales entre proyectos (A vs B, ambos elegibles)
  const [compA, setCompA]       = useState('');
  const [compB, setCompB]       = useState('');
  const [compRows, setCompRows] = useState(null);
  const [compMeta, setCompMeta] = useState(null);
  const [progFecha, setProgFecha] = useState('');
  const [progHoras, setProgHoras] = useState(8);
  const [progCrew, setProgCrew]   = useState(4);
  const [progMeses, setProgMeses] = useState(''); // duración objetivo (meses); vacío = sin comprimir
  const [trabajando, setTrabajando] = useState(false);

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
  // Correcciones verificadas contra el ISP CREDITEX SEM26. Se aplican al catálogo
  // cargado (sin tocar el resto); luego el usuario pulsa "Guardar cambios".
  const CORRECCIONES_ISP = [
    { act: 'HABILITADO DE ACERO', metContractual: 94371.13, frente: 'PTAR (F1)', ip: 0.0255 },
  ];
  const aplicarCorreccionesISP = () => {
    if (!arbol.length) { toast('Primero carga el presupuesto (botón de la izquierda)', 'warning'); return; }
    const nn = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
    const n = clonar(arbol);
    const detalle = [];
    n.forEach(p => (p.subpartidas || []).forEach(s => (s.actividades || []).forEach(act => {
      const corr = CORRECCIONES_ISP.find(c => nn(c.act) === nn(act.nombre));
      if (!corr) return;
      let metActual = 0; Object.values(act.ofertas || {}).forEach(o => { metActual += num(o.met); }); metActual += num(act.adicional && act.adicional.met);
      if (Math.abs(metActual - corr.metContractual) > 0.5) {
        const otros = metActual - num(act.ofertas && act.ofertas[corr.frente] && act.ofertas[corr.frente].met);
        (act.ofertas || (act.ofertas = {}));
        (act.ofertas[corr.frente] || (act.ofertas[corr.frente] = { met: 0, ip: corr.ip }));
        act.ofertas[corr.frente].met = +(corr.metContractual - otros).toFixed(2);
        detalle.push(`${act.nombre}: ${fmt(metActual)} → ${fmt(corr.metContractual)} ${act.un || ''}`);
      }
    })));
    if (detalle.length) { setArbol(n); setDirty(true); toast(`Corrección ISP aplicada (${detalle.length}): ${detalle.join(' · ')}. Pulsa «Guardar cambios».`, 'success'); }
    else toast('El catálogo ya coincide con el ISP (nada que corregir)', 'info');
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
      // Guard: Firestore limita cada documento a 1 MB. Avisar ANTES de fallar con un error críptico.
      if (JSON.stringify(limpio).length > 950000) {
        toast('El catálogo es demasiado grande para un solo documento (límite 1 MB de Firestore). Reduce partidas/frentes o divide el alcance.', 'error');
        setGuardando(false);
        return;
      }
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
  // ── PLANTILLA VACÍA: solo el formato de columnas (2 filas de ejemplo) ──────
  const descargarPlantilla = async () => {
    setExportOpen(false);
    try {
      const XLSX = await import('xlsx');
      const filas = [
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

  // ── EXPORTAR DATA: tu catálogo en formato LARGO re-importable (round-trip) ──
  // Mismas columnas que el importador lee (filasAArbol): Partida·Subpartida·
  // Actividad·Unidad·Frente·Metrado·IP·IP Meta. Se vuelve a subir SIN warning.
  const exportarData = async () => {
    setExportOpen(false);
    if (!arbol.length) return toast('No hay catálogo para exportar. Carga o importa uno primero.', 'warning');
    try {
      const XLSX = await import('xlsx');
      const filas = arbolAFilas(arbol, columnas);
      const ws = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS_PLANTILLA });
      ws['!cols'] = COLUMNAS_PLANTILLA.map(c => ({ wch: Math.max(13, c.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'WBS');
      XLSX.writeFile(wb, `Data_WBS_${proyectoNombre.replace(/\s+/g, '_')}.xlsx`);
      toast(`Data exportada: ${filas.length} filas. Este Excel se vuelve a subir con «📤 Importar Excel» (aquí o en otro proyecto) sin error.`, 'success');
    } catch (e) { console.error('[exportarData]', e); toast('No se pudo exportar la data', 'error'); }
  };

  // ── EXPORTAR INFORME: tabla visual/detallada (igual que en pantalla) ───────
  // Por frente: Metrado·HH·IP + Adicionales + Contractual + Meta + totales.
  // NO está pensado para re-importar (para eso está "Exportar data").
  const exportarInforme = async () => {
    setExportOpen(false);
    if (!arbol.length) return toast('No hay catálogo para exportar.', 'warning');
    try {
      const XLSX = await import('xlsx');
      const cols = columnas;
      const r2 = (n) => +num(n).toFixed(2);
      // 2 filas de cabecera (grupos + sub-columnas), como en pantalla
      const g1 = ['', '', '', ''];
      const g2 = ['Partida', 'Subpartida', 'Actividad', 'Und'];
      cols.forEach(c => { g1.push(`PPTO OFERTA · ${c.nombre}`, '', ''); g2.push('Metrado', 'HH', 'IP'); });
      g1.push('ADICIONALES', '', ''); g2.push('Metrado', 'HH', 'IP');
      g1.push('PPTO CONTRACTUAL', '', ''); g2.push('Metrado', 'HH', 'IP');
      g1.push('PPTO META', '', ''); g2.push('Metrado', 'HH', 'IP Meta');
      const aoa = [g1, g2];
      const T = { ofe: {}, adicHH: 0, contrMet: 0, contrHH: 0, metaMet: 0, metaHH: 0 };
      cols.forEach(c => { T.ofe[c.id] = { met: 0, hh: 0 }; });
      (arbol || []).forEach(p => {
        aoa.push([(p.nombre || '').toUpperCase()]);
        (p.subpartidas || []).forEach(s => {
          aoa.push(['', (s.nombre || '').toUpperCase()]);
          (s.actividades || []).forEach(a => {
            const c = calcActividad(a);
            const row = ['', '', a.nombre, a.un || 'UND'];
            cols.forEach(col => {
              const o = a.ofertas?.[col.id];
              const met = num(o?.met), hh = hhDe(o), ip = num(o?.ip);
              row.push(met || '', hh || '', ip || '');
              T.ofe[col.id].met += met; T.ofe[col.id].hh += hh;
            });
            const am = num(a.adicional?.met), ah = hhDe(a.adicional), aip = num(a.adicional?.ip);
            row.push(am || '', ah || '', aip || '');
            row.push(r2(c.contractualMet), r2(c.contractualHH), c.contractualIP);
            row.push(r2(c.metaMet), r2(c.metaHH), c.ipMeta);
            T.adicHH += ah; T.contrMet += c.contractualMet; T.contrHH += c.contractualHH;
            T.metaMet += c.metaMet; T.metaHH += c.metaHH;
            aoa.push(row);
          });
        });
      });
      const totalRow = ['TOTAL GENERAL', '', '', ''];
      cols.forEach(col => totalRow.push(r2(T.ofe[col.id].met), r2(T.ofe[col.id].hh), ''));
      totalRow.push('', r2(T.adicHH), '');
      totalRow.push(r2(T.contrMet), r2(T.contrHH), '');
      totalRow.push(r2(T.metaMet), r2(T.metaHH), '');
      aoa.push(totalRow);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Combinar la fila de grupos (igual que el encabezado en pantalla)
      const merges = []; let ci = 4;
      const span3 = (st) => ({ s: { r: 0, c: st }, e: { r: 0, c: st + 2 } });
      cols.forEach(() => { merges.push(span3(ci)); ci += 3; });
      merges.push(span3(ci)); ci += 3;      // adicionales
      merges.push(span3(ci)); ci += 3;      // contractual
      merges.push(span3(ci)); ci += 3;      // meta
      ws['!merges'] = merges;
      ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 34 }, { wch: 7 }, ...Array((cols.length + 3) * 3).fill({ wch: 11 })];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Informe WBS');
      XLSX.writeFile(wb, `Informe_WBS_${proyectoNombre.replace(/\s+/g, '_')}.xlsx`);
      toast('Informe exportado (visual). Para re-subir a otro proyecto usa «Exportar data».', 'success');
    } catch (e) { console.error('[informe]', e); toast('No se pudo exportar el informe', 'error'); }
  };
  const importarExcel = async (file) => {
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const nuevo = filasAArbol(filas, frentesProyecto);
      if (!nuevo.length) return toast('No se encontraron filas válidas. El Excel debe tener columnas Partida, Actividad, Metrado e IP (descarga "Plantilla Excel" para ver el formato). Para copiar de otro proyecto SIN Excel, usa el botón "Importar de proyecto…".', 'warning');
      if (arbol.length && !confirm(`El Excel trae ${nuevo.length} partida(s). Esto reemplaza el catálogo actual. ¿Continuar?`)) return;
      setArbol(nuevo); setDirty(true);
      const t = totalesArbol(nuevo);
      toast(`Importado: ${t.partidas} partidas · ${t.actividades} actividades`, 'success');
    } catch (e) {
      console.error('[importar WBS]', e);
      toast('Error al leer el Excel: ' + e.message, 'error');
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  // ── Importar catálogo de OTRO proyecto (plantilla) ───────────────
  // Proyectos de origen disponibles (otros, + CREDITEX como plantilla siempre).
  const fuentes = useMemo(() => {
    const list = (proyectos || [])
      .filter(p => p.id && p.id !== proyectoActivoId)
      .map(p => ({ id: p.id, nombre: p.nombre || p.codigo || p.id }));
    if (proyectoActivoId !== 'creditex-ptar' && !list.some(x => LEGACY_IDS.includes(x.id))) {
      list.unshift({ id: 'creditex-ptar', nombre: 'CREDITEX PTAR (plantilla)' });
    }
    return list;
  }, [proyectos, proyectoActivoId]);

  // Lista para el comparador: TODOS los proyectos (incluido el activo) + CREDITEX plantilla.
  const proyectosComparables = useMemo(() => {
    const list = (proyectos || []).filter(p => p.id).map(p => ({ id: p.id, nombre: p.nombre || p.codigo || p.id }));
    if (!list.some(x => x.id === 'creditex-ptar' || LEGACY_IDS.includes(x.id))) {
      list.unshift({ id: 'creditex-ptar', nombre: 'CREDITEX PTAR (plantilla)' });
    }
    return list;
  }, [proyectos]);
  const nombreProy = (id) => proyectosComparables.find(p => p.id === id)?.nombre || id || 'proyecto';

  const abrirImportar = () => { setOrigenSel(fuentes[0]?.id || ''); setResetMet(true); setModal('importar'); };
  const abrirComparar = () => {
    setCompA(proyectoActivoId || proyectosComparables[0]?.id || '');
    setCompB((proyectosComparables.find(p => p.id !== proyectoActivoId) || {}).id || '');
    setCompRows(null); setCompMeta(null); setModal('comparar');
  };

  // Compara el IP REAL (productividad probada) del proyecto A vs el B, por actividad.
  const ejecutarComparacion = async () => {
    if (!compA || !compB) return toast('Elige los dos proyectos a comparar', 'warning');
    if (compA === compB) return toast('Elige dos proyectos distintos', 'warning');
    setTrabajando(true);
    try {
      const opt = { proyectoDefaultId: PROYECTO_DEFAULT_ID };
      const [A, B] = await Promise.all([
        calcularIPRealProyecto(compA, opt),
        calcularIPRealProyecto(compB, opt),
      ]);
      const keys = new Set([...Object.keys(A.detalle), ...Object.keys(B.detalle)]);
      const rows = [];
      keys.forEach(k => {
        const da = A.detalle[k], dbb = B.detalle[k];
        const ipA = da?.ip ?? null, ipB = dbb?.ip ?? null;
        if (ipA == null && ipB == null) return;
        const nombre = da?.nombre || dbb?.nombre || k;
        const delta = (ipA != null && ipB != null && ipA > 0) ? +(((ipB - ipA) / ipA) * 100).toFixed(1) : null;
        rows.push({ nombre, ipA, ipB, delta });
      });
      // Δ% = (ipB − ipA)/ipA. Menor IP = mejor. Δ<0 ⇒ el OTRO (B) gasta menos ⇒ A (activo) PEOR.
      rows.sort((x, y) => {
        if ((x.delta == null) !== (y.delta == null)) return x.delta == null ? 1 : -1;
        if (x.delta != null && y.delta != null) return x.delta - y.delta; // A más peor (Δ más negativo) arriba
        return x.nombre.localeCompare(y.nombre);
      });
      const comunes = rows.filter(r => r.delta != null);
      setCompRows(rows);
      setCompMeta({
        comunes: comunes.length,
        mejor: comunes.filter(r => r.delta > 0).length,   // A rinde mejor: el otro gasta más HH/u
        peor: comunes.filter(r => r.delta < 0).length,
      });
    } catch (e) {
      console.error('[comparar]', e);
      toast('Error al comparar: ' + e.message, 'error');
    } finally { setTrabajando(false); }
  };

  const exportarComparacion = async () => {
    if (!compRows || !compRows.length) return;
    try {
      const XLSX = await import('xlsx');
      const nA = nombreProy(compA), nB = nombreProy(compB);
      const COLS = ['Actividad', `IP ${nA}`, `IP ${nB}`, 'Δ%', 'Mejor'];
      const filas = compRows.map(r => ({
        'Actividad': r.nombre,
        [`IP ${nA}`]: r.ipA != null ? r.ipA : '',
        [`IP ${nB}`]: r.ipB != null ? r.ipB : '',
        'Δ%': r.delta != null ? r.delta : '',
        'Mejor': r.delta == null ? '—' : (r.delta > 0 ? nA : (r.delta < 0 ? nB : 'igual')),
      }));
      const ws = XLSX.utils.json_to_sheet(filas, { header: COLS });
      ws['!cols'] = COLS.map(c => ({ wch: c === 'Actividad' ? 38 : Math.max(12, c.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comparación IP');
      XLSX.writeFile(wb, `Comparacion_IP_${nA.replace(/[^\w-]+/g, '_')}_vs_${nB.replace(/[^\w-]+/g, '_')}.xlsx`);
    } catch (e) { console.error('[exportarComparacion]', e); toast('No se pudo exportar la comparación', 'error'); }
  };
  const abrirPrograma = () => {
    if (!arbol.length) return toast('Primero carga/importa el catálogo y captura metrados', 'warning');
    setProgFecha(isoLocal(fechaInicioProyecto) || isoLocal(new Date()));
    setProgHoras(8); setProgCrew(4); setModal('programa');
  };

  const importarDeProyecto = async () => {
    if (!origenSel || origenSel === proyectoActivoId) return toast('Elige un proyecto de origen válido', 'warning');
    setTrabajando(true);
    try {
      let arbolFuente = null;
      const snap = await getDoc(doc(db, 'Catalogo_WBS', origenSel));
      if (snap.exists() && Array.isArray(snap.data().arbol) && snap.data().arbol.length) {
        arbolFuente = snap.data().arbol;
      } else if (LEGACY_IDS.includes(origenSel)) {
        arbolFuente = PRESUPUESTO_CREDITEX;
      }
      if (!arbolFuente || !arbolFuente.length) { toast('Ese proyecto no tiene catálogo WBS para importar', 'warning'); return; }

      // Si se pidió el RENDIMIENTO REAL, calcularlo desde el Historial del origen.
      const realIP = ipModo === 'real'
        ? (await calcularIPRealProyecto(origenSel, { proyectoDefaultId: PROYECTO_DEFAULT_ID })).ip
        : null;
      let nReal = 0;
      const destFrente = columnas[0]?.id || FRENTE_BASE;

      const nuevo = clonar(arbolFuente).map(p => ({
        nombre: p.nombre,
        subpartidas: (p.subpartidas || []).map(s => ({
          nombre: s.nombre,
          actividades: (s.actividades || []).map(a => {
            const ipRealAct = realIP ? realIP[normActividad(a.nombre)] : null;
            if (ipRealAct != null) nReal += 1;
            if (!resetMet) {
              // Copia metrados tal cual; si hay IP real, sobreescribe el rendimiento.
              const na = normalizarActividad(a);
              if (ipRealAct != null) {
                const fids = Object.keys(na.ofertas);
                if (fids.length) fids.forEach(fid => { na.ofertas[fid].ip = ipRealAct; });
                else na.ofertas[destFrente] = { met: 0, ip: ipRealAct };
                na.ipMeta = ipRealAct;
              }
              return na;
            }
            // Resetea metrados a 0 y conserva el rendimiento (real si existe, si no el del presupuesto).
            const c = calcActividad(a);
            const ipOferta = Object.values(a.ofertas || {}).map(o => num(o?.ip)).find(v => v > 0) || 0;
            const ipPresup = c.contractualIP || ipOferta || num(a.ipMeta) || 0;
            const ipRep = (ipRealAct != null) ? ipRealAct : ipPresup;
            return {
              nombre: a.nombre, un: a.un || 'UND',
              ofertas: { [destFrente]: { met: 0, ip: ipRep } },
              adicional: { met: 0, ip: 0 },
              ipMeta: (ipRealAct != null) ? ipRealAct : (num(a.ipMeta) || ipPresup || 0),
            };
          }),
        })),
      }));
      setArbol(nuevo); setDirty(true); setModal(null);
      const t = totalesArbol(nuevo);
      const fuenteIP = ipModo === 'real'
        ? (nReal > 0 ? `con IP REAL probado en ${nReal} actividades` : 'sin avance real en el origen → se usó el IP del presupuesto')
        : 'con IP del presupuesto';
      toast(`Importado de plantilla: ${t.partidas} partidas · ${t.actividades} actividades (${fuenteIP}). Captura metrados y Guarda.`, 'success');
    } catch (e) {
      console.error('[importarDeProyecto]', e);
      toast('Error al importar: ' + e.message, 'error');
    } finally { setTrabajando(false); }
  };

  // ── Generar programación automática (tren de actividades) ────────
  const generarPrograma = async () => {
    if (!proyectoActivoId) return toast('No hay proyecto activo', 'warning');
    const fechaIso = progFecha || isoLocal(fechaInicioProyecto) || isoLocal(new Date());
    setTrabajando(true);
    try {
      const { tareas, resumen } = generarCronogramaDesdeCatalogo(arbol, {
        horasDia: Math.min(24, Math.max(1, num(progHoras) || 8)),
        cuadrillaDefault: Math.max(1, num(progCrew) || 4),
        duracionObjetivoDias: num(progMeses) > 0 ? Math.round(num(progMeses) * DIAS_LAB_POR_MES) : null,
      });
      if (!tareas.length) { toast('No hay actividades con HH > 0. Captura metrados primero.', 'warning'); return; }
      await setDoc(doc(db, 'Cronogramas', proyectoActivoId), {
        proyectoId: proyectoActivoId, fechaInicio: fechaIso, tareas, baseline: null,
        actualizadoEn: serverTimestamp(), origen: 'auto-WBS',
      });
      setModal(null);
      toast(`✅ Cronograma generado: ${resumen.actividades} actividades · ${resumen.hhTotal.toLocaleString('es-PE')} HH. Ábrelo en Planeamiento → Cronograma de Obra (el Last Planner armará el LAP).`, 'success');
    } catch (e) {
      console.error('[generarPrograma]', e);
      toast('Error al generar el cronograma: ' + e.message, 'error');
    } finally { setTrabajando(false); }
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

      {modal === 'importar' && (
        <Modal title="📦 Importar catálogo de otro proyecto" onClose={() => !trabajando && setModal(null)}>
          <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.6, marginBottom: '14px' }}>
            Copia las <b>actividades y rendimientos (IP)</b> del proyecto que elijas a <b>{proyectoNombre}</b>.
            Luego capturas los metrados y el <b>HH se calcula solo</b> (HH = metrado × IP).
          </p>
          <label style={lblModal}>Proyecto de origen (plantilla)</label>
          <select value={origenSel} onChange={e => setOrigenSel(e.target.value)} style={inputModal}>
            <option value="">— Elige un proyecto —</option>
            {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>

          {/* Qué rendimiento (IP) traer: el REAL probado en obra o el del presupuesto */}
          <label style={{ ...lblModal, marginTop: '14px' }}>¿Qué rendimiento (IP) copiar?</label>
          {[
            { v: 'real', t: 'IP REAL logrado en obra (recomendado)', d: 'La productividad PROBADA del proyecto origen (HH real ÷ metrado real). La realidad como base.' },
            { v: 'presupuesto', t: 'IP del presupuesto', d: 'El rendimiento planificado del catálogo origen.' },
          ].map(o => (
            <label key={o.v} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px', cursor: 'pointer',
              border: `1.5px solid ${ipModo === o.v ? BASE.gold : BASE.border}`, borderRadius: '10px',
              padding: '10px 12px', background: ipModo === o.v ? '#fffaf0' : '#fff',
            }}>
              <input type="radio" name="ipModo" checked={ipModo === o.v} onChange={() => setIpModo(o.v)} style={{ marginTop: '2px' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: BASE.navy }}>{o.t}</span>
                <span style={{ display: 'block', fontSize: '10.5px', color: BASE.muted, marginTop: '1px', lineHeight: 1.45 }}>{o.d}</span>
              </span>
            </label>
          ))}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12px', fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>
            <input type="checkbox" checked={resetMet} onChange={e => setResetMet(e.target.checked)} />
            Resetear metrados a 0 y conservar rendimientos (recomendado)
          </label>
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '4px', lineHeight: 1.5 }}>
            Si lo desmarcas, también copia los metrados del proyecto origen tal cual.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Btn onClick={() => setModal(null)} bg={BASE.white} color={BASE.navy} border>Cancelar</Btn>
            <Btn onClick={importarDeProyecto} bg={BASE.navy} color="#fff" disabled={trabajando || !origenSel}>
              {trabajando ? 'Importando…' : 'Importar catálogo'}
            </Btn>
          </div>
        </Modal>
      )}

      {modal === 'comparar' && (
        <Modal title="📊 Comparar rendimientos reales entre proyectos" onClose={() => !trabajando && setModal(null)}>
          <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.6, marginBottom: '12px' }}>
            Compara la <b>productividad REAL</b> (IP = HH ÷ unidad, <b>menor es mejor</b>) de dos proyectos,
            actividad por actividad. Útil para ver si mejoraste de obra a obra.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={lblModal}>Proyecto A</label>
              <select value={compA} onChange={e => { setCompA(e.target.value); setCompRows(null); }} style={inputModal}>
                <option value="">— Elige —</option>
                {proyectosComparables.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={lblModal}>Proyecto B</label>
              <select value={compB} onChange={e => { setCompB(e.target.value); setCompRows(null); }} style={inputModal}>
                <option value="">— Elige —</option>
                {proyectosComparables.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
            <Btn onClick={() => setModal(null)} bg={BASE.white} color={BASE.navy} border>Cerrar</Btn>
            <Btn onClick={ejecutarComparacion} bg={BASE.navy} color="#fff" disabled={trabajando || !compA || !compB}>
              {trabajando ? 'Comparando…' : 'Comparar'}
            </Btn>
          </div>

          {compRows && (
            <div style={{ marginTop: '16px' }}>
              {compMeta && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
                  <ChipCmp txt={`${compMeta.comunes} en ambos`} c={BASE.navy} />
                  <ChipCmp txt={`🟢 ${compMeta.mejor} mejor en ${nombreProy(compA)}`} c={BASE.green} />
                  <ChipCmp txt={`🔴 ${compMeta.peor} mejor en ${nombreProy(compB)}`} c={'#dc2626'} />
                  {compRows.length > 0 && (
                    <button onClick={exportarComparacion} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${BASE.navy}`, background: BASE.navy, color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>⬇️ Exportar (Excel)</button>
                  )}
                </div>
              )}
              {compRows.length === 0 ? (
                <p style={{ fontSize: '12px', color: BASE.muted, textAlign: 'center', padding: '14px' }}>
                  Ninguno de los dos proyectos tiene avance real con IP para comparar.
                </p>
              ) : (
                <>
                  <div style={{ maxHeight: '46vh', overflow: 'auto', border: `1px solid ${BASE.border}`, borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead style={{ position: 'sticky', top: 0 }}>
                        <tr style={{ background: BASE.navy, color: '#fff' }}>
                          <th style={thCmp('left')}>Actividad</th>
                          <th style={thCmp('right')}>IP · {nombreProy(compA).slice(0, 14)}</th>
                          <th style={thCmp('right')}>IP · {nombreProy(compB).slice(0, 14)}</th>
                          <th style={thCmp('right')}>Δ%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compRows.map((r, i) => {
                          const col = r.delta == null ? BASE.muted : (r.delta > 0 ? BASE.green : '#dc2626');
                          return (
                            <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BASE.border}` }}>
                              <td style={tdCmp('left')}>{r.nombre}</td>
                              <td style={tdCmp('right')}>{r.ipA != null ? r.ipA.toFixed(3) : '—'}</td>
                              <td style={tdCmp('right')}>{r.ipB != null ? r.ipB.toFixed(3) : '—'}</td>
                              <td style={{ ...tdCmp('right'), color: col, fontWeight: 800 }}>{r.delta != null ? `${r.delta > 0 ? '+' : ''}${r.delta}%` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '8px', lineHeight: 1.5 }}>
                    Δ% = (IP {nombreProy(compB)} − IP {nombreProy(compA)}) ÷ IP {nombreProy(compA)} · menor IP = mejor.
                    <b style={{ color: BASE.green }}> Verde (Δ&gt;0)</b> = {nombreProy(compA)} rinde mejor (B gasta más HH/u);
                    <b style={{ color: '#dc2626' }}> rojo (Δ&lt;0)</b> = {nombreProy(compA)} rinde peor.
                  </p>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {modal === 'programa' && (
        <Modal title="📅 Generar programación (tren de actividades)" onClose={() => !trabajando && setModal(null)}>
          <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.6, marginBottom: '14px' }}>
            Convierte el catálogo (HH = metrado × IP) en un <b>cronograma</b>: la duración de cada actividad
            = HH ÷ (cuadrilla × jornada), encadenadas como <b>tren de actividades</b> (flujo continuo).
            Luego se calculan la <b>ruta crítica</b> y la <b>Curva S</b>, y el Last Planner arma el LAP.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={lblModal}>Fecha de inicio</label>
              <input type="date" value={progFecha} onChange={e => setProgFecha(e.target.value)} style={inputModal} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={lblModal}>Jornada (horas/día)</label>
              <input type="number" min="1" max="12" value={progHoras} onChange={e => setProgHoras(e.target.value)} style={inputModal} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={lblModal}>Duración objetivo (meses)</label>
              <input type="number" min="1" max="60" step="0.5" placeholder="ej. 4 — vacío = sin comprimir"
                value={progMeses} onChange={e => setProgMeses(e.target.value)} style={inputModal} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={lblModal}>Cuadrilla por defecto (obreros) — para actividades sin cuadrilla conocida</label>
            <input type="number" min="1" max="50" value={progCrew} onChange={e => setProgCrew(e.target.value)} style={inputModal} />
          </div>
          {num(progMeses) > 0 && (
            <p style={{ fontSize: '10.5px', color: BASE.goldDark, marginTop: '8px', lineHeight: 1.5, background: '#fffaf0', border: `1px solid ${BASE.gold}55`, borderRadius: '8px', padding: '8px 10px' }}>
              🎯 Se comprimirá el plan para terminar en ~<b>{num(progMeses)} mes(es)</b> (≈ {Math.round(num(progMeses) * DIAS_LAB_POR_MES)} días laborables): primero solapando más las actividades (más paralelo) y, si hace falta, acortando duraciones. Todo queda editable en el cronograma.
            </p>
          )}
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '10px', lineHeight: 1.5 }}>
            Las actividades estructurales de CREDITEX (excavación, encofrado, concreto…) usan su <b>cuadrilla real</b>;
            el resto, una cuadrilla típica por tipo de trabajo. Todo es editable luego en el cronograma.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Btn onClick={() => setModal(null)} bg={BASE.white} color={BASE.navy} border>Cancelar</Btn>
            <Btn onClick={generarPrograma} bg="#15708A" color="#fff" disabled={trabajando}>
              {trabajando ? 'Generando…' : 'Generar cronograma'}
            </Btn>
          </div>
        </Modal>
      )}

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
          <Btn onClick={abrirImportar} bg={BASE.white} color={BASE.navy} border>📦 Importar de proyecto…</Btn>
          <Btn onClick={abrirComparar} bg={BASE.white} color={BASE.navy} border>📊 Comparar rendimientos</Btn>
          <Btn onClick={aplicarCorreccionesISP} bg={BASE.white} color={BASE.navy} border>🔧 Aplicar correcciones ISP</Btn>
          <div style={{ position: 'relative' }}>
            <Btn onClick={() => setExportOpen(o => !o)} bg={BASE.white} color={BASE.navy} border>⬇️ Exportar ▾</Btn>
            {exportOpen && (
              <>
                <div onClick={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50, background: '#fff', border: `1px solid ${BASE.border}`, borderRadius: '10px', boxShadow: '0 14px 34px -12px rgba(8,26,46,0.45)', minWidth: '262px', overflow: 'hidden' }}>
                  <ExportItem onClick={exportarInforme} icon="📊" title="Informe (visual)" sub="Tabla detallada para leer/imprimir" />
                  <ExportItem onClick={exportarData} icon="🔁" title="Data (re-importable)" sub="Se vuelve a subir con «Importar Excel»" />
                  <ExportItem onClick={descargarPlantilla} icon="📥" title="Plantilla vacía" sub="Solo para ver el formato de columnas" ultimo />
                </div>
              </>
            )}
          </div>
          <Btn onClick={() => fileRef.current?.click()} bg={BASE.white} color={BASE.navy} border>📤 Importar Excel</Btn>
          <Btn onClick={guardar} bg={dirty ? BASE.navy : '#cbd5e1'} color="#fff" disabled={guardando || !dirty}>
            {guardando ? 'Guardando…' : dirty ? '💾 Guardar cambios' : '✓ Guardado'}
          </Btn>
          <Btn onClick={abrirPrograma} bg="#15708A" color="#fff">📅 Generar programación</Btn>
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
            <Btn onClick={abrirImportar} bg={BASE.gold} color={BASE.navy}>📦 Importar de otro proyecto</Btn>
            <Btn onClick={cargarCreditex} bg={BASE.white} color={BASE.navy} border>📋 Presupuesto CREDITEX</Btn>
            <Btn onClick={() => fileRef.current?.click()} bg={BASE.white} color={BASE.navy} border>📤 Importar Excel</Btn>
            <Btn onClick={addPartida} bg={BASE.white} color={BASE.navy} border>➕ Crear primera partida</Btn>
          </div>
        </div>
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'auto', maxHeight: '74vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              {/* Fila de grupos */}
              <tr style={{ height: THG_H }}>
                <th rowSpan={2} style={{ ...thG, height: HEAD_H, lineHeight: `${HEAD_H}px`, minWidth: '320px', textAlign: 'left', padding: '0 8px' }}>ACTIVIDAD</th>
                <th rowSpan={2} style={{ ...thG, height: HEAD_H, lineHeight: `${HEAD_H}px` }}>UND</th>
                {columnas.map(c => (
                  <th key={c.id} colSpan={3} style={{ ...thG, borderBottom: `3px solid ${SEC_ACCENT.oferta}` }}>PPTO OFERTA · {c.nombre}</th>
                ))}
                <th colSpan={3} style={{ ...thG, borderBottom: `3px solid ${SEC_ACCENT.adic}` }}>ADICIONALES</th>
                <th colSpan={3} style={{ ...thG, borderBottom: `3px solid ${SEC_ACCENT.contractual}` }}>PPTO CONTRACTUAL</th>
                <th colSpan={3} style={{ ...thG, borderBottom: `3px solid ${SEC_ACCENT.meta}` }}>PPTO META</th>
                <th rowSpan={2} style={{ ...thG, height: HEAD_H, lineHeight: `${HEAD_H}px` }}></th>
              </tr>
              {/* Fila de sub-columnas */}
              <tr style={{ height: THS_H }}>
                {columnas.map(c => <SubCols key={c.id} accent={SEC_ACCENT.oferta} />)}
                <SubCols accent={SEC_ACCENT.adic} />
                <SubCols accent={SEC_ACCENT.contractual} />
                <SubCols accent={SEC_ACCENT.meta} />
              </tr>
            </thead>
            <tbody>
              {/* TOTAL general — también arriba, FIJO bajo el encabezado al hacer scroll */}
              <FilaSuma cols={columnas} datos={totalGeneral} label="TOTAL GENERAL" tono="total" sticky />
              {arbol.map((p, pi) => {
                const actsPartida = [];
                (p.subpartidas || []).forEach(s => actsPartida.push(...(s.actividades || [])));
                return (
                <React.Fragment key={pi}>
                  {/* Partida */}
                  <tr>
                    <td colSpan={totalCols} style={{ background: '#bcd3f2', borderBottom: `1px solid ${BASE.border}`, padding: '5px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input value={p.nombre} onChange={e => renamePartida(pi, e.target.value)} style={inpNombre(BASE.navy, '12px', '#bcd3f2')} />
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
                          <td colSpan={totalCols} style={{ background: '#f3e2c2', borderBottom: `1px solid ${BASE.border}`, padding: '4px 8px 4px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input value={s.nombre} onChange={e => renameSub(pi, si, e.target.value)} style={inpNombre('#1e293b', '11px', '#f3e2c2')} />
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
                              <td style={{ ...tdC, paddingLeft: '24px', verticalAlign: 'middle' }}>
                                <textarea value={a.nombre} rows={1} ref={autoGrow}
                                  onChange={e => { setActCampo(pi, si, ai, 'nombre', e.target.value); autoGrow(e.target); }}
                                  title={a.nombre} style={inpTxtArea} />
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
function SubCols({ accent }) {
  return (
    <>
      <th style={{ ...thS, color: accent }}>METRADO</th>
      <th style={{ ...thS, color: accent }}>HH</th>
      <th style={{ ...thS, color: accent }}>IP</th>
    </>
  );
}
const TONOS_SUMA = {
  subtotal: { bg: '#e2e8f0', col: '#334155', fs: '10px' },
  partida:  { bg: '#64748b', col: '#ffffff', fs: '10.5px' },
  total:    { bg: '#1e3a5f', col: '#ffffff', fs: '11px' },
};
function FilaSuma({ cols, datos, label, tono = 'subtotal', sticky = false }) {
  const t = TONOS_SUMA[tono] || TONOS_SUMA.subtotal;
  const bg = t.bg, col = t.col;
  // sticky: la fila TOTAL GENERAL queda pegada bajo el encabezado. -1 = cinturón
  // que solapa el borde. dim={} cuando es sticky → celdas OPACAS (no dejan pasar
  // las filas de datos al hacer scroll; con opacity 0.4 se transparentarían).
  const st  = sticky ? { position: 'sticky', top: HEAD_H - 1, zIndex: 3 } : {};
  const dim = sticky ? {} : { opacity: 0.4 };
  const celda = { ...tdC, textAlign: 'right', fontWeight: 900, background: bg, color: col, fontFamily: 'monospace', ...st };
  return (
    <tr>
      <td colSpan={2} style={{ ...tdC, background: bg, color: col, fontWeight: 900, fontSize: t.fs, paddingLeft: '24px', ...st, ...(sticky ? { zIndex: 4 } : {}) }}>{label}</td>
      {cols.map(c => (
        <React.Fragment key={c.id}>
          <td style={{ ...celda, ...dim }}></td>
          <td style={celda}>{fmt(datos.ofe[c.id])}</td>
          <td style={{ ...celda, ...dim }}></td>
        </React.Fragment>
      ))}
      <td style={{ ...celda, ...dim }}></td>
      <td style={celda}>{fmt(datos.adic)}</td>
      <td style={{ ...celda, ...dim }}></td>
      <td style={{ ...celda, ...dim }}></td>
      <td style={celda}>{fmt(datos.contr)}</td>
      <td style={{ ...celda, ...dim }}></td>
      <td style={{ ...celda, ...dim }}></td>
      <td style={celda}>{fmt(datos.meta)}</td>
      <td style={{ ...celda, ...dim }}></td>
      <td style={{ ...celda, ...dim }}></td>
    </tr>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,42,71,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: BASE.white, borderRadius: '14px', width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px -20px rgba(8,26,46,0.6)' }}>
        <div style={{ background: '#0F2A47', color: '#fff', padding: '14px 18px', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: `3px solid ${BASE.gold}`, fontWeight: 900, fontSize: '14px' }}>{title}</div>
        <div style={{ padding: '18px' }}>{children}</div>
      </div>
    </div>
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

// Ítem del menú "Exportar ▾": título + descripción, hover suave.
function ExportItem({ onClick, icon, title, sub, ultimo }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
        padding: '11px 14px', borderBottom: ultimo ? 'none' : `1px solid ${BASE.border}`,
      }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: BASE.navy }}>{title}</span>
        <span style={{ display: 'block', fontSize: '10.5px', color: BASE.muted, marginTop: '1px' }}>{sub}</span>
      </span>
    </button>
  );
}

// Chip resumen del comparador
function ChipCmp({ txt, c }) {
  return (
    <span style={{ background: `${c}14`, border: `1px solid ${c}40`, color: c, borderRadius: '999px', padding: '4px 11px', fontSize: '10.5px', fontWeight: 800 }}>{txt}</span>
  );
}
const thCmp = (align) => ({ padding: '8px 10px', textAlign: align, fontSize: '10px', fontWeight: 800, letterSpacing: '0.3px', borderBottom: `2px solid ${BASE.gold}`, whiteSpace: 'nowrap' });
const tdCmp = (align) => ({ padding: '6px 10px', textAlign: align, color: BASE.text, fontFamily: align === 'right' ? 'var(--grapco-font-mono, monospace)' : 'inherit' });

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
// ── Encabezado institucional (navy + acento por sección): más oscuro y legible
// que los pasteles anteriores, sin llegar al negro. Alturas FIJAS para que el
// TOTAL GENERAL se pegue EXACTO bajo el encabezado al hacer scroll (sin huecos).
const HEAD_NAVY   = '#0F2A47';  // fila de grupos
const HEAD_NAVY2  = '#1B3A5E';  // sub-cabecera (un punto más claro)
const HEAD_BORDER = '#22456A';  // borde de celda dentro del header (sobre navy)
const THG_H = 28;               // alto fijo fila de grupos
const THS_H = 24;               // alto fijo sub-cabecera
const HEAD_H = THG_H + THS_H;   // 52 px — offset para pegar el TOTAL GENERAL
// Acento por sección (muted, paleta GRAPCO). El gold rige lo CONTRACTUAL.
const SEC_ACCENT = {
  oferta:      '#7FA0C0',  // acero
  adic:        '#A18FC2',  // violeta apagado
  contractual: '#E5A82F',  // gold (lo contractual rige)
  meta:        '#54A6B8',  // teal apagado
};
const thG = {
  padding: '0 6px', textAlign: 'center', fontSize: '9px', fontWeight: 900,
  color: '#fff', background: HEAD_NAVY, border: `1px solid ${HEAD_BORDER}`,
  whiteSpace: 'nowrap', letterSpacing: '0.4px',
  boxSizing: 'border-box', height: THG_H, lineHeight: `${THG_H - 3}px`,
  position: 'sticky', top: 0, zIndex: 5,   // ← cabecera de grupos siempre fija
};
// Sub-cabecera (METRADO/HH/IP): navy un punto más claro, rótulo en el acento de
// la sección; fija justo debajo de la fila de grupos.
const thS = {
  ...thG, fontSize: '8px', fontWeight: 800, background: HEAD_NAVY2,
  height: THS_H, lineHeight: `${THS_H}px`, top: THG_H, zIndex: 4,
  boxShadow: '0 2px 3px -2px rgba(8,26,46,0.5)',
};
const tdC = { padding: '2px 4px', border: `1px solid ${BASE.border}` };
const tdN = { ...tdC, textAlign: 'right' };
const tdCalc = (color, bg) => ({
  ...tdC, textAlign: 'right', fontWeight: 700, color, background: bg, fontFamily: 'monospace',
});
// Nombre de actividad: textarea que AJUSTA su alto al contenido (wrap) → el nombre
// completo se ve siempre, en varias líneas si hace falta. autoGrow recalcula el alto.
const inpTxtArea = {
  width: '100%', border: `1px solid ${BASE.border}`, borderRadius: '4px',
  padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box',
  fontFamily: 'inherit', lineHeight: 1.25, resize: 'none', overflow: 'hidden',
  whiteSpace: 'normal', wordBreak: 'break-word', display: 'block', minHeight: '26px',
};
const autoGrow = (el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } };
