// src/views/BimShell.jsx
// Shell compartido estilo "BIMPulse" para los 3 módulos BIM (Costo, Sectorización, Plazos).
// Header institucional + subida directa de Revit + visor Forge real (izq) +
// panel dark (der) con tarjetas de Nivel y cross-filter. El contenido analítico
// de la derecha lo aporta cada módulo vía renderPanel(ctx).

import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { extraerElementosBIM } from '../utils/bimQuantities';
import { cargarPropiedades, mapearDbIds } from '../utils/bimPropsStore';
import BimViewerAPS from './BimViewerAPS';
import BimUploader from './BimUploader';
import BimFichaElemento from './BimFichaElemento';

// Visor AR: lazy — solo carga (junto con <model-viewer>) al pulsar el botón AR
const BimVisorAR = lazy(() => import('./BimVisorAR'));

// Disciplina (macro-categoría) a partir de la categoría Revit
const _n = (s) => (s || '').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const macroDe = (c) => {
  const x = _n(c);
  if (/(MURO|PISO|SUELO|TECHO|PUERTA|VENTANA|ACABAD|ALBA|TARRAJ|PINTURA|CIELO|MOBILIAR|ESCALER|BARAND)/.test(x)) return 'Arquitectura';
  if (/(TUBER|ELECTR|SANITAR|MECANIC|DUCTO|BANDEJA|LUMINAR|CABLE|MEP|HVAC|PLOMER)/.test(x)) return 'MEP';
  return 'Estructuras';
};
const MACROS = [
  { id: 'Estructuras', ic: '🏗️' },
  { id: 'Arquitectura', ic: '🧱' },
  { id: 'MEP', ic: '⚙️' },
];

// ── Persistencia: el modelo elegido y sus elementos sobreviven cambios de
//    pestaña / módulo / navegación (cache en memoria + localStorage).
const ELS_CACHE = new Map();        // urn -> elementos extraídos
const LS_URN = 'grapco_bim_urn';
const getSavedUrn = () => { try { return localStorage.getItem(LS_URN) || ''; } catch { return ''; } };
const saveUrn = (u) => { try { u ? localStorage.setItem(LS_URN, u) : localStorage.removeItem(LS_URN); } catch { /* noop */ } };

// Paleta oficial GRAPCO (navy + gold + emerald/rose)
export const PAL = ['#0F2A47', '#E5A82F', '#10B981', '#E11D48', '#1E4674', '#B07D1B', '#047857', '#5B6878'];
export const RGB = {
  '#0F2A47':[0.059,0.165,0.278], '#E5A82F':[0.898,0.659,0.184], '#10B981':[0.063,0.725,0.506],
  '#E11D48':[0.882,0.114,0.282], '#1E4674':[0.118,0.275,0.455], '#B07D1B':[0.690,0.490,0.106],
  '#047857':[0.016,0.471,0.341], '#5B6878':[0.357,0.408,0.471],
};
// Tema claro alineado a la plataforma GRAPCO + tokens de diseño premium
export const D = {
  bg: '#F4F7FB', card: '#FFFFFF', soft: '#F7F9FC',
  border: '#E7EBF1', borderSoft: '#EEF2F7',
  text: '#0F172A', muted: '#5B6878', dim: '#9AA5B5',
  accent: '#0F2A47', gold: '#E5A82F', green: '#10B981', red: '#E11D48',
  // elevación / movimiento
  shadow: '0 1px 2px rgba(15,42,71,0.04), 0 4px 16px -6px rgba(15,42,71,0.10)',
  shadowHover: '0 2px 4px rgba(15,42,71,0.06), 0 12px 28px -8px rgba(15,42,71,0.16)',
  radius: '14px', radiusSm: '10px',
  ease: 'cubic-bezier(.22,1,.36,1)',
  num: { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontFeatureSettings: '"tnum" 1' },
};

export default function BimShell({ titulo, objetivo, accent = '#3B82F6', modelosDisponibles = [], showToast, renderPanel }) {
  const [urnSel, setUrnSel] = useState(getSavedUrn);
  const [els, setEls] = useState(() => {
    const u = getSavedUrn();
    return u && ELS_CACHE.has(u) ? ELS_CACHE.get(u) : [];
  });
  const [extrayendo, setExtrayendo] = useState(false);
  const [err, setErr] = useState('');
  const [secSel, setSecSel] = useState([]);   // niveles seleccionados (multi)
  const [catSel, setCatSel] = useState([]);   // categorías seleccionadas (multi)
  const [showUpload, setShowUpload] = useState(false);
  const [verClasif, setVerClasif] = useState(true);
  const [soloSel, setSoloSel] = useState(true);   // true = solo lo elegido · false = mostrar todo (resaltado)
  const [leftPct, setLeftPct] = useState(40);   // ancho del visor (arrastrable)
  const [showAR, setShowAR] = useState(false);  // visor de realidad aumentada
  // Parámetros COMPLETOS server-side (bimPropsStore): fuente de verdad de la data
  const [store, setStore] = useState(null);
  const [propsEstado, setPropsEstado] = useState('');   // '' | cargando | listo | fallback
  const [elemSel, setElemSel] = useState(null);          // elemento clickeado en el 3D
  const viewerRef = useRef(null);
  const dualRef = useRef(null);

  // Cambiar de modelo: persiste y restaura del cache si ya se extrajo antes
  const elegirModelo = useCallback((u) => {
    setUrnSel(u); saveUrn(u);
    setSecSel([]); setCatSel([]); setErr('');
    setEls(u && ELS_CACHE.has(u) ? ELS_CACHE.get(u) : []);
  }, []);

  // Divisor arrastrable: actualiza leftPct y reajusta el visor Forge
  const startDrag = useCallback((e) => {
    e.preventDefault();
    const onMove = (ev) => {
      const cont = dualRef.current;
      if (!cont) return;
      const r = cont.getBoundingClientRect();
      const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      const pct = Math.min(75, Math.max(25, (x / r.width) * 100));
      setLeftPct(pct);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      try { viewerRef.current?.resize?.(); } catch { /* noop */ }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, []);

  const onModelReady = useCallback((viewer) => {
    viewerRef.current = viewer;
    const u = getSavedUrn();
    setErr('');
    (async () => {
      // 1) Parámetros COMPLETOS server-side (todos los parámetros Revit, categorías
      //    reales de la jerarquía, unidades verificadas). Cacheado por URN.
      try {
        setPropsEstado('cargando');
        setExtrayendo(true);
        const st = await cargarPropiedades(u);
        const mapa = await mapearDbIds(viewer);
        const r = st.quantities(mapa);
        ELS_CACHE.set(u, r);
        setStore(st); setEls(r); setExtrayendo(false); setPropsEstado('listo');
        return;
      } catch (e) {
        console.warn('[BimShell] Parámetros server-side no disponibles, fallback al visor:', e?.message);
        setStore(null);
        setPropsEstado('fallback');
      }
      // 2) Fallback: extracción básica desde el visor (comportamiento anterior)
      if (u && ELS_CACHE.has(u)) { setEls(ELS_CACHE.get(u)); setExtrayendo(false); return; }
      extraerElementosBIM(viewer)
        .then(r => { ELS_CACHE.set(u, r); setEls(r); setExtrayendo(false); })
        .catch(e => { setErr(e.message); setExtrayendo(false); });
    })();
  }, []);

  // Selección en el 3D → ficha con todos los parámetros. Memoizado: el useEffect
  // del visor depende de onSeleccion; una identidad nueva por render lo reiniciaría.
  const onSeleccion = useCallback((sel) => setElemSel(sel), []);

  const niveles = useMemo(() => {
    const m = {};
    els.forEach(e => {
      m[e.nivel] = m[e.nivel] || { nivel: e.nivel, n: 0, vol: 0, area: 0, dbIds: [] };
      m[e.nivel].n++; m[e.nivel].vol += e.volumen; m[e.nivel].area += e.area; m[e.nivel].dbIds.push(e.dbId);
    });
    return Object.values(m)
      .map((x, i) => ({ ...x, vol: +x.vol.toFixed(1), area: +x.area.toFixed(0), color: PAL[i % PAL.length] }))
      .sort((a, b) => a.nivel.localeCompare(b.nivel));
  }, [els]);

  const isolate = useCallback((dbIds, color) => {
    const v = viewerRef.current;
    if (!v) return;
    v.clearThemingColors?.(v.model);
    if (!dbIds || !dbIds.length) { v.isolate([]); v.fitToView?.(); v.impl?.invalidate(true); return; }
    v.isolate(dbIds);
    v.fitToView?.(dbIds);
    if (window.THREE && color && RGB[color]) {
      const [r, g, b] = RGB[color];
      const c = new window.THREE.Vector4(r, g, b, 1);
      dbIds.forEach(id => v.setThemingColor(id, c, v.model));
    }
    v.impl?.invalidate(true);
  }, []);

  // Clasificación = categorías Revit
  const categorias = useMemo(() => {
    const m = {};
    els.forEach(e => {
      const k = e.categoria || 'Sin categoría';
      m[k] = m[k] || { cat: k, n: 0, vol: 0, dbIds: [] };
      m[k].n++; m[k].vol += e.volumen; m[k].dbIds.push(e.dbId);
    });
    return Object.values(m)
      .map((x, i) => ({ ...x, vol: +x.vol.toFixed(1), color: PAL[i % PAL.length] }))
      .sort((a, b) => b.vol - a.vol || b.n - a.n);
  }, [els]);

  const volTotalNiv = useMemo(() => niveles.reduce((s, n) => s + n.vol, 0) || 1, [niveles]);
  const catsPorMacro = useMemo(() => {
    const g = { Estructuras: [], Arquitectura: [], MEP: [] };
    categorias.forEach(c => g[macroDe(c.cat)].push(c));
    return g;
  }, [categorias]);

  // Filtro = UNIÓN de niveles seleccionados ∩ UNIÓN de categorías seleccionadas.
  // (multi-selección: se acumulan, click de nuevo quita)
  const filtrar = useCallback((lvls, cats) => {
    return els.filter(e =>
      (lvls.length === 0 || lvls.includes(e.nivel)) &&
      (cats.length === 0 || cats.includes(e.categoria || 'Sin categoría'))
    );
  }, [els]);

  // Aplica el estado del visor según selección + modo (solo / todo).
  // soloSel=true → aísla lo elegido · false → muestra todo y solo lo colorea.
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !els.length) return;
    if (!secSel.length && !catSel.length) {
      v.clearThemingColors?.(v.model); v.isolate?.([]); v.fitToView?.(); v.impl?.invalidate(true);
      return;
    }
    const fil = filtrar(secSel, catSel);
    const ids = fil.map(e => e.dbId);
    const colorByLvl = {}; niveles.forEach(n => { colorByLvl[n.nivel] = n.color; });
    v.clearThemingColors?.(v.model);
    if (soloSel) { v.isolate?.(ids.length ? ids : [0]); v.fitToView?.(ids); }
    else { v.isolate?.([]); }
    if (window.THREE) {
      fil.forEach(e => {
        const hex = colorByLvl[e.nivel];
        if (hex && RGB[hex]) {
          const [r, g, b] = RGB[hex];
          v.setThemingColor(e.dbId, new window.THREE.Vector4(r, g, b, 1), v.model);
        }
      });
    }
    v.impl?.invalidate(true);
  }, [secSel, catSel, soloSel, els, niveles, filtrar]);

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  const elegirNivel = (nv) => setSecSel(prev => toggle(prev, nv));
  const elegirCat = (c)  => setCatSel(prev => toggle(prev, c));
  const limpiarTodo = () => { setSecSel([]); setCatSel([]); };
  const limpiarCats = () => setCatSel([]);
  // Toggle de una LISTA de categorías (clic en grupo): todas → quita; si no → agrega.
  const toggleCats = (list) => {
    if (!list || !list.length) return;
    setCatSel(prev => {
      const allIn = list.every(x => prev.includes(x));
      return allIn ? prev.filter(x => !list.includes(x)) : [...new Set([...prev, ...list])];
    });
  };

  const elsSel = useMemo(() => filtrar(secSel, catSel), [filtrar, secSel, catSel]);
  const elsF = (secSel.length || catSel.length) && !soloSel ? els : elsSel;
  const hayModelo = !!urnSel;
  const hayDatos = els.length > 0;

  return (
    <div style={{ border: `1px solid ${D.border}`, borderRadius: D.radius, overflow: 'hidden', boxShadow: D.shadow, background: D.card }}>
      {/* HEADER — navy GRAPCO, refinado */}
      <div style={{
        background: 'linear-gradient(180deg,#123353,#0F2A47)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '14px', flexWrap: 'wrap', borderBottom: `2px solid ${accent}`,
        boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.04)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px',
            background: `linear-gradient(135deg,${accent},#1E4674)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px',
            boxShadow: `0 6px 16px -4px ${accent}99, inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}>◆</div>
          <div>
            <p style={{ fontSize: '14.5px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{titulo}</p>
            <p style={{ fontSize: '10.5px', color: '#9DB0C7', marginTop: '1px', letterSpacing: '0.2px' }}>{objetivo}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 12px',
            borderRadius: '999px', border: `1px solid ${hayModelo ? '#1E4674' : '#2A3F5C'}`,
            background: 'rgba(255,255,255,0.04)', fontSize: '10.5px', fontWeight: 700,
            color: hayModelo ? '#7FE3C0' : '#7F8DA6',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: hayModelo ? D.green : '#5C6B82', boxShadow: hayModelo ? `0 0 8px ${D.green}` : 'none' }} />
            {hayModelo ? (extrayendo ? 'Procesando' : 'Modelo activo') : 'Sin modelo'}
          </span>
          <select value={urnSel} onChange={e => elegirModelo(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: D.radiusSm, border: '1px solid #244A73', background: '#0B2138', color: '#E3EAF3', fontSize: '12px', fontWeight: 600, maxWidth: '220px', cursor: 'pointer' }}>
            <option value="">— Modelo cargado —</option>
            {modelosDisponibles.map(m => <option key={m.id} value={m.urn}>{m.nombreOriginal || m.nombre || m.archivo || m.id}</option>)}
          </select>
          <button onClick={() => setShowUpload(s => !s)}
            style={{ padding: '8px 16px', borderRadius: D.radiusSm, border: 'none', cursor: 'pointer', background: accent, color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2px', boxShadow: `0 6px 16px -6px ${accent}`, transition: `transform .15s ${D.ease}` }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            ⬆ Subir Revit
          </button>
          <button onClick={() => hayModelo && setShowAR(true)} disabled={!hayModelo}
            title={hayModelo ? 'Ver el modelo con la cámara (realidad aumentada)' : 'Selecciona un modelo primero'}
            style={{
              padding: '8px 16px', borderRadius: D.radiusSm, border: 'none',
              cursor: hayModelo ? 'pointer' : 'not-allowed', opacity: hayModelo ? 1 : 0.45,
              background: `linear-gradient(135deg,${D.gold},#C98F1F)`, color: '#0F2A47',
              fontSize: '12px', fontWeight: 800, letterSpacing: '0.2px',
              boxShadow: hayModelo ? `0 6px 16px -6px ${D.gold}` : 'none', transition: `transform .15s ${D.ease}`,
            }}
            onMouseEnter={e => { if (hayModelo) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            📷 Ver en obra (AR)
          </button>
        </div>
      </div>

      {/* VISOR AR — overlay fullscreen (lazy: carga model-viewer solo al abrirse) */}
      {showAR && hayModelo && (
        <Suspense fallback={null}>
          <BimVisorAR
            modelo={modelosDisponibles.find(m => m.urn === urnSel) || { urn: urnSel }}
            onClose={() => setShowAR(false)}
            showToast={showToast}
          />
        </Suspense>
      )}

      {showUpload && (
        <div style={{ background: D.soft, padding: '14px', borderBottom: `1px solid ${D.border}` }}>
          <BimUploader showToast={showToast || (() => {})} onModeloListo={(urn) => { elegirModelo(urn); setShowUpload(false); }} />
        </div>
      )}

      {/* DUAL · con divisor arrastrable */}
      <div ref={dualRef} style={{ display: 'flex', minHeight: '600px', position: 'relative', userSelect: 'none' }}>
        {/* IZQ · VISOR REAL */}
        <div style={{ flex: `0 0 ${leftPct}%`, minWidth: 0, background: 'linear-gradient(160deg,#FBFCFD,#EEF1F5)', padding: '14px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <p style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>Visor BIM · Modelo Real (Forge)</p>
          <p style={{ fontSize: '10px', color: '#64748B', marginBottom: '10px' }}>
            {hayModelo
              ? (extrayendo
                ? (propsEstado === 'cargando' ? 'Extrayendo TODOS los parámetros del modelo…' : 'Extrayendo cantidades…')
                : `${els.length} elementos · ${niveles.length} niveles${propsEstado === 'listo' && store ? ` · ${store.stats.params} parámetros Revit` : ''} · toca un elemento para ver su ficha`)
              : 'Sin modelo seleccionado'}
          </p>
          {hayModelo ? (
            <BimViewerAPS urn={urnSel} onModelReady={onModelReady} onSeleccion={onSeleccion} alturaVisor="520px" />
          ) : (
            <div style={{ flex: 1, minHeight: '520px', borderRadius: '14px', border: '2px dashed #CBD5E1', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `linear-gradient(135deg,${accent},#1E4674)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>⬆</div>
              <p style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Sube tu modelo Revit / IFC</p>
              <p style={{ fontSize: '11px', color: '#64748B', maxWidth: '280px' }}>
                Pulsa <strong>"⬆ Subir Revit"</strong>. Al terminar la traducción APS aparecerá aquí y la analítica se calculará 100% desde el modelo.
              </p>
              <button onClick={() => setShowUpload(true)} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: accent, color: '#fff', fontSize: '12px', fontWeight: 800 }}>Subir modelo ahora</button>
            </div>
          )}

          {/* FICHA DEL ELEMENTO — flotante sobre el visor (todos los parámetros Revit) */}
          {elemSel && hayModelo && (
            <BimFichaElemento seleccion={elemSel} store={store} onCerrar={() => setElemSel(null)} />
          )}
        </div>

        {/* DIVISOR ARRASTRABLE */}
        <div onMouseDown={startDrag} onTouchStart={startDrag} title="Arrastra para ajustar visor / panel"
          style={{
            flex: '0 0 10px', cursor: 'col-resize', background: D.border,
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: `background .15s ${D.ease}`,
          }}
          onMouseEnter={e => e.currentTarget.style.background = accent}
          onMouseLeave={e => e.currentTarget.style.background = D.border}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 3px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 4px rgba(15,42,71,0.18)' }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: D.dim }} />)}
          </div>
        </div>

        {/* DER · PANEL */}
        <div style={{ flex: '1 1 0', minWidth: 0, background: D.bg, color: D.text, padding: '22px', overflowY: 'auto', maxHeight: '760px' }}>
          {!hayModelo && <Empty icon="🧊" title="Sin modelo BIM" text="Toda la analítica se genera del modelo Revit/IFC. Sube y selecciona un modelo. No hay datos de ejemplo." />}
          {hayModelo && extrayendo && <Empty icon="⏳" title="Procesando modelo" text="Leyendo propiedades y cantidades reales (volumen, área, nivel, categoría)…" />}
          {err && <div style={{ background: D.card, border: `1px solid ${D.red}`, borderRadius: '12px', padding: '16px', color: D.red, fontSize: '12px', fontWeight: 700 }}>⚠️ {err}</div>}

          {hayDatos && (
            <>
              {/* Tarjetas de Nivel (cross-filter común) */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 800, color: D.dim, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Sectores · Niveles del modelo</p>
                <p style={{ fontSize: '10.5px', color: D.dim, fontWeight: 600 }}>Volumen total <strong style={{ color: D.text, ...D.num }}>{fmtN(volTotalNiv)} m³</strong></p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: '10px', marginBottom: '18px' }}>
                {niveles.slice(0, 8).map(nv => {
                  const a = secSel.includes(nv.nivel);
                  const pct = Math.round((nv.vol / volTotalNiv) * 100);
                  return (
                    <button key={nv.nivel} onClick={() => elegirNivel(nv.nivel)} style={{
                      textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderRadius: D.radiusSm,
                      border: `1px solid ${a ? nv.color : D.border}`,
                      borderLeft: `3px solid ${nv.color}`,
                      background: a ? `linear-gradient(150deg, ${nv.color}14, ${D.card} 60%)` : D.card,
                      boxShadow: a ? `0 6px 16px -8px ${nv.color}80` : D.shadow,
                      transition: `transform .15s ${D.ease}, box-shadow .15s ${D.ease}`,
                    }}
                    onMouseEnter={e => { if (!a) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = D.shadowHover; } }}
                    onMouseLeave={e => { if (!a) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = D.shadow; } }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: nv.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: a ? nv.color : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nv.nivel}</span>
                        </div>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, color: nv.color, ...D.num }}>{pct}%</span>
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 800, marginTop: '5px', color: D.text, letterSpacing: '-0.3px', ...D.num }}>
                        {fmtN(nv.vol)}<span style={{ fontSize: '9.5px', color: D.muted, marginLeft: '3px', fontWeight: 600 }}>m³</span>
                      </p>
                      <p style={{ fontSize: '9px', color: D.muted, marginTop: '1px' }}>{nv.n} elementos</p>
                      <div style={{ marginTop: '7px', height: '3px', borderRadius: '999px', background: D.soft, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(3, pct)}%`, height: '100%', borderRadius: '999px', background: nv.color, transition: `width .4s ${D.ease}` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clasificación · panel premium de categorías */}
              <div style={{ ...card, padding: '16px 18px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: verClasif ? '12px' : 0 }}>
                  <button onClick={() => setVerClasif(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: '3px', height: '15px', borderRadius: '2px', background: accent }} />
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: D.text, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Clasificar por categoría</span>
                    <span style={{ fontSize: '12px', color: D.dim, transition: `transform .18s ${D.ease}`, transform: verClasif ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {catSel.length > 0
                      ? <button onClick={limpiarCats} style={{ ...clearBtn, padding: '5px 12px', fontSize: '10.5px' }}>✕ Limpiar ({catSel.length})</button>
                      : <span style={{ fontSize: '10.5px', color: D.dim, fontWeight: 600 }}>{categorias.length} categorías · multi-selección</span>}
                    <button onClick={() => setVerClasif(v => !v)} style={{ ...clearBtn, padding: '5px 12px', fontSize: '10.5px' }}>
                      {verClasif ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
                {verClasif && (
                <>
                <div style={{ marginBottom: '14px' }}>
                  <button onClick={limpiarCats} style={catChip(!catSel.length, D.accent)}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: D.accent }} />
                    Todas las categorías
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px', alignItems: 'start' }}>
                  {MACROS.filter(mc => (catsPorMacro[mc.id] || []).length).map(mc => {
                    const volM = catsPorMacro[mc.id].reduce((s, c) => s + c.vol, 0);
                    return (
                      <div key={mc.id} style={{ background: D.soft, border: `1px solid ${D.borderSoft}`, borderRadius: D.radiusSm, padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${D.border}` }}>
                          <span style={{ fontSize: '13px' }}>{mc.ic}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: D.text, letterSpacing: '0.8px', textTransform: 'uppercase', flex: 1 }}>{mc.id}</span>
                          <span style={{ fontSize: '9.5px', color: D.dim, fontWeight: 700, ...D.num }}>{fmtN(volM)} m³</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {catsPorMacro[mc.id].map(c => {
                            const on = catSel.includes(c.cat);
                            return (
                              <button key={c.cat} onClick={() => elegirCat(c.cat)} style={{
                                display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                                padding: '8px 11px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                                border: `1px solid ${on ? c.color : 'transparent'}`,
                                background: on ? `linear-gradient(135deg, ${c.color}1F, ${D.card})` : D.card,
                                boxShadow: on ? `0 4px 12px -6px ${c.color}80` : 'none',
                                transition: `all .14s ${D.ease}`,
                              }}
                              onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = c.color + (on ? '' : '66'); }}
                              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = D.card; e.currentTarget.style.borderColor = 'transparent'; } }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color, boxShadow: on ? `0 0 0 3px ${c.color}26` : 'none', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '11.5px', fontWeight: on ? 800 : 600, color: on ? c.color : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cat}</span>
                                <span style={{ ...D.num, fontSize: '10px', fontWeight: 800, color: on ? c.color : D.dim, background: on ? c.color + '24' : D.bg, padding: '2px 8px', borderRadius: '999px', flexShrink: 0 }}>{c.n}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
                )}
              </div>

              {/* Modo de vista: solo lo elegido / todo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: D.dim, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Vista de datos {(secSel.length || catSel.length) ? `· ${elsSel.length} de ${els.length} elementos` : `· ${els.length} elementos`}
                </span>
                <div style={{ display: 'inline-flex', background: D.soft, border: `1px solid ${D.border}`, borderRadius: '999px', padding: '3px' }}>
                  {[
                    { v: true, l: 'Solo lo seleccionado' },
                    { v: false, l: 'Mostrar todo' },
                  ].map(o => {
                    const on = soloSel === o.v;
                    return (
                      <button key={String(o.v)} onClick={() => setSoloSel(o.v)} style={{
                        padding: '6px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                        background: on ? accent : 'transparent', color: on ? '#fff' : D.muted,
                        fontSize: '11px', fontWeight: 800, transition: `all .15s ${D.ease}`,
                      }}>{o.l}</button>
                    );
                  })}
                </div>
              </div>

              {renderPanel && renderPanel({ els, elsF, niveles, categorias, secSel, catSel, soloSel, setSecSel: elegirNivel, setCatSel: elegirCat, toggleCats, isolate, viewerRef, store, propsEstado })}

              {(secSel.length > 0 || catSel.length > 0) && (
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: D.dim, letterSpacing: '0.6px' }}>FILTROS ACTIVOS:</span>
                  {secSel.map(s => <button key={'s' + s} onClick={() => elegirNivel(s)} style={{ ...clearBtn, padding: '5px 12px', fontSize: '10.5px' }}>✕ {s}</button>)}
                  {catSel.map(c => <button key={'c' + c} onClick={() => elegirCat(c)} style={{ ...clearBtn, padding: '5px 12px', fontSize: '10.5px' }}>✕ {c}</button>)}
                  <button onClick={limpiarTodo} style={{ ...clearBtn, padding: '5px 14px', fontSize: '10.5px', color: D.red, borderColor: D.red + '55' }}>Limpiar todo</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const fmtN = (n) => Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
const card = { background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, boxShadow: D.shadow };
const clearBtn = { background: D.card, border: `1px solid ${D.border}`, color: D.muted, padding: '7px 16px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', boxShadow: D.shadow };
const catChip = (activo, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '8px 14px', borderRadius: '999px', cursor: 'pointer',
  border: `1px solid ${activo ? color : D.border}`,
  background: activo ? `linear-gradient(135deg, ${color}1F, ${color}0D)` : D.card,
  color: activo ? color : D.text,
  fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap',
  boxShadow: activo ? `0 6px 16px -6px ${color}80` : D.shadow,
  transition: `all .16s ${D.ease}`,
});

function Empty({ icon, title, text }) {
  return (
    <div style={{ minHeight: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', padding: '40px' }}>
      <p style={{ fontSize: '40px' }}>{icon}</p>
      <p style={{ fontSize: '15px', fontWeight: 800, color: D.text }}>{title}</p>
      <p style={{ fontSize: '12px', color: D.muted, maxWidth: '360px', lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
