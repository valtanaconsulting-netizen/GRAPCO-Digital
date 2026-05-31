// src/views/ImportarCartaBalance.jsx
// Importador de Carta Balance POR CONTEOS. En lugar de re-capturar 475 celdas,
// se ingresan los conteos por código y trabajador (el bloque "ORDEN DE DATOS"
// que ya traen los formatos GP-GCR-FOR). Genera el array de observaciones que
// consume el motor de análisis y guarda en Cartas_Balance.

import React, { useState, useMemo, useCallback } from 'react';
import { collection, addDoc, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE, CB_COL, CARGOS, CARGOS_CORTO, inp } from '../utils/styles';
import { clasificarLUF } from '../utils/cartaBalanceAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import VistaHeader from '../components/VistaHeader';
import ConfirmModal from '../components/ConfirmModal';

// Catálogo de códigos (cubre el formato GP-GCR-FOR de habilitado/colocación de acero).
const CODIGOS = {
  TP: [
    { cod: 'ACE', desc: 'Armado de acero' },
    { cod: 'AMA', desc: 'Amarrando acero' },
  ],
  TC: [
    { cod: 'AM', desc: 'Acarreo de materiales' },
    { cod: 'AV', desc: 'Alineado vertical (aplomado)' },
    { cod: 'AP', desc: 'Alineado vertical / Aplomado' },
    { cod: 'NA', desc: 'Nivelando acero' },
    { cod: 'SA', desc: 'Subiendo acero' },
    { cod: 'MD', desc: 'Midiendo distancias' },
    { cod: 'COO', desc: 'Coordinación' },
    { cod: 'CI', desc: 'Colocación de instrumentos' },
    { cod: 'AA', desc: 'Armado de andamio' },
    { cod: 'CA', desc: 'Cortando acero' },
  ],
  TNC: [
    { cod: 'VI', desc: 'Viaje' },
    { cod: 'TR', desc: 'Trabajo rehecho' },
    { cod: 'BA', desc: 'Baño' },
    { cod: 'ES', desc: 'Tiempo de espera' },
    { cod: 'DE', desc: 'Descanso' },
    { cod: 'CO', desc: 'Conversación' },
  ],
};
const DESC = {};
Object.values(CODIGOS).flat().forEach((c) => { DESC[c.cod] = c.desc; });
const CAT_DE = {};
Object.entries(CODIGOS).forEach(([cat, arr]) => arr.forEach((c) => { CAT_DE[c.cod] = cat; }));

// Plantillas precargadas (cartas reales ya digitadas) — se cargan con el selector.
const PLANTILLAS = [
  {
    key: 'd08', label: 'CREDITEX · 08-ene · Colocación de Acero (5)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-08', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'CALLE LOS HORNOS 185 URB. VULCANO, ATE', horaInicio: '11:30', horaFin: '12:30',
      trabajadores: [
        { letra: 'A', nombre: 'LIDER LOPEZ VILLANUEVA', cargo: 'Operario' },
        { letra: 'B', nombre: 'SERGIO OLIVERIO PIMPINCO CRUZADO', cargo: 'Operario' },
        { letra: 'C', nombre: 'OSWALDO VALDEZ GAMBOA', cargo: 'Operario' },
        { letra: 'D', nombre: 'SANTIAGO ALFONSO RUIZ RIOS', cargo: 'Operario' },
        { letra: 'E', nombre: 'RICHARD ARENA RODRIGUEZ', cargo: 'Ayudante' },
      ],
      conteos: {
        A: { ACE: 27, AMA: 16, AM: 11, NA: 21, SA: 13, COO: 4, ES: 2, CO: 4 },
        B: { ACE: 41, AMA: 16, AM: 3, NA: 6, SA: 13, MD: 4, COO: 3, BA: 2, ES: 9, DE: 3 },
        C: { ACE: 36, AMA: 14, AM: 27, NA: 15, SA: 18, COO: 4, AA: 2, ES: 11 },
        D: { ACE: 27, AMA: 12, AM: 3, NA: 8, SA: 29, CI: 5, AA: 4, ES: 1, CO: 4 },
        E: { ACE: 7, AM: 28, NA: 8, SA: 3, COO: 2, ES: 8, DE: 1 },
      },
    },
  },
  {
    key: 'd12', label: 'CREDITEX · 12-ene · Colocación de Acero (7)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-12', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '09:30', horaFin: '12:00',
      conclusiones: 'TP 50% (armado y amarrado de acero). El TNC fue casi todo ESPERA (90.7%) por falta de sincronización entre quien sube el acero y quien lo arma. Recomendación: un grupo sube el acero de forma continua y otro lo arma de inmediato; poner a los trabajadores más rápidos en la parte inferior para marcar el ritmo.',
      trabajadores: [
        { letra: 'A', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'B', nombre: 'PIMPINCO CRUZADO, SERGIO OLIVERIO', cargo: 'Operario' },
        { letra: 'C', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'D', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Operario' },
        { letra: 'E', nombre: 'VALDEZ GAMBOA, OSWALDO', cargo: 'Operario' },
        { letra: 'F', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'G', nombre: 'LOPEZ VILLANUEVA, LIDER', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 49, AMA: 29, AV: 31, SA: 11, COO: 3, ES: 26 },
        B: { ACE: 47, AMA: 50, AV: 24, SA: 5, ES: 19, CO: 1 },
        C: { ACE: 32, AMA: 42, AM: 6, AV: 5, SA: 1, COO: 3, AA: 2, BA: 3, ES: 48, DE: 2, CO: 1 },
        D: { ACE: 15, AMA: 25, AM: 14, SA: 68, MD: 2, COO: 2, ES: 22 },
        E: { ACE: 51, AMA: 33, AV: 8, SA: 20, MD: 3, COO: 7, CI: 3, BA: 3, ES: 20 },
        F: { ACE: 24, AMA: 24, AM: 42, SA: 8, MD: 24, BA: 3, ES: 23 },
        G: { ACE: 47, AMA: 50, AM: 7, AV: 15, SA: 3, MD: 12, COO: 1, BA: 3, ES: 7, CO: 1 },
      },
    },
  },
  {
    key: 'd15', label: 'CREDITEX · 15-ene · Colocación de Acero (7)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-15', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '09:30', horaFin: '12:30',
      conclusiones: 'TP 49% (colocación y amarrado de acero). El TC se concentró en acarreo (32%), aplomado (31%) y subida de acero (21%) por la lejanía del acopio y el trabajo en altura. El TNC (15%) fue dominado por ESPERA (85.9%) por descoordinación en el izaje. Recomendación: reubicar el acopio más cerca del frente y definir una secuencia clara de izaje con roles fijos.',
      trabajadores: [
        { letra: 'A', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'B', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'C', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'D', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Operario' },
        { letra: 'E', nombre: 'CRISTOBAL MORENO, JUAN CARLOS', cargo: 'Operario' },
        { letra: 'F', nombre: 'LOPEZ VILLANUEVA, LIDER', cargo: 'Operario' },
        { letra: 'G', nombre: 'PIMPINCO CRUZADO, SERGIO OLIVERIO', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 21, AMA: 26, AM: 55, AV: 10, SA: 21, MD: 5, COO: 1, VI: 6, ES: 27 },
        B: { ACE: 33, AMA: 44, AM: 23, AV: 20, SA: 11, MD: 6, COO: 1, VI: 1, ES: 19, DE: 4 },
        C: { ACE: 12, AMA: 34, AM: 37, AV: 15, SA: 30, MD: 8, COO: 4, ES: 23, CO: 4 },
        D: { ACE: 29, AMA: 67, AM: 16, AV: 19, SA: 3, MD: 4, COO: 5, AA: 1, ES: 8 },
        E: { ACE: 42, AMA: 64, AM: 3, AV: 12, SA: 6, MD: 9, COO: 2, AA: 8, ES: 18 },
        F: { ACE: 41, AMA: 61, AV: 12, SA: 9, MD: 2, COO: 2, VI: 2, ES: 36, DE: 8 },
        G: { ACE: 28, AMA: 67, AV: 41, SA: 7, MD: 8, ES: 15 },
      },
    },
  },
  {
    key: 'd28', label: 'CREDITEX · 28-ene · Colocación de Acero (5)',
    data: {
      obra: 'CREDITEX PTARI', fecha: '2026-01-28', actividad: 'COLOCACIÓN DE ACERO',
      ubicacion: 'Av. Los Hornos 185, Ate.', horaInicio: '10:00', horaFin: '12:00',
      conclusiones: 'TP 51%. El TC estuvo dominado por el acarreo de materiales (79.4%) por la entrada pequeña a la zona de trabajo. El TNC (10%) se generó por tiempo de espera (47.9%) y baño (33.3%) por el acceso complicado. Recomendación: mejorar el acceso a la zona de trabajo y añadir un rol fijo de acarreo para subir la productividad.',
      trabajadores: [
        { letra: 'A', nombre: 'VEGA LOPEZ, ANDERSON JULIO', cargo: 'Oficial' },
        { letra: 'B', nombre: 'RUIZ RIOS, SANTIAGO ALFONSO', cargo: 'Operario' },
        { letra: 'C', nombre: 'VENTURO MURGA, ALEXANDER NICOLAY', cargo: 'Operario' },
        { letra: 'D', nombre: 'TORRES DOMINGUES, VICTOR RAUL', cargo: 'Operario' },
        { letra: 'E', nombre: 'VELARDE MENDOZA, SAMUEL MOISES', cargo: 'Operario' },
      ],
      conteos: {
        A: { ACE: 40, AMA: 44, AM: 7, AP: 8, COO: 1, ES: 4 },
        B: { ACE: 37, AMA: 22, AM: 15, AP: 5, MD: 2, COO: 1, CA: 10, ES: 6, DE: 3 },
        C: { ACE: 18, AMA: 23, AM: 38, MD: 1, COO: 4, BA: 16, ES: 4, DE: 1 },
        D: { ACE: 3, AMA: 4, AM: 77, COO: 7, VI: 2, ES: 9, CO: 3 },
        E: { ACE: 39, AMA: 18, AM: 13 },
      },
    },
  },
];
// Abre con la ÚLTIMA carta cargada (la más reciente) — lista para guardar.
const PRECARGA = PLANTILLAS[PLANTILLAS.length - 1].data;

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const n = (v) => parseInt(v, 10) || 0;

export default function ImportarCartaBalance({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes } = useProyectoActivo();

  const [ficha, setFicha] = useState({
    obra: PRECARGA.obra, fecha: PRECARGA.fecha, actividad: PRECARGA.actividad,
    ubicacion: PRECARGA.ubicacion, horaInicio: PRECARGA.horaInicio, horaFin: PRECARGA.horaFin,
    conclusiones: PRECARGA.conclusiones || '',
  });
  const [trab, setTrab] = useState(PRECARGA.trabajadores);
  const [conteos, setConteos] = useState(PRECARGA.conteos);
  const [guardando, setGuardando] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [confirm, setConfirm] = useState(null); // { ids, docData, obs, actNorm, fecha }

  const setCount = (letra, cod, val) => {
    setConteos((prev) => ({ ...prev, [letra]: { ...(prev[letra] || {}), [cod]: val === '' ? '' : n(val) } }));
  };
  const setTrabajador = (i, campo, val) => {
    setTrab((prev) => prev.map((t, idx) => idx === i ? { ...t, [campo]: val } : t));
  };
  const addTrab = () => {
    const usadas = trab.map((t) => t.letra);
    const libre = LETRAS.find((l) => !usadas.includes(l));
    if (!libre) return;
    setTrab((p) => [...p, { letra: libre, nombre: '', cargo: 'Operario' }]);
  };
  const removeTrab = (letra) => {
    setTrab((p) => p.filter((t) => t.letra !== letra));
    setConteos((p) => { const c = { ...p }; delete c[letra]; return c; });
  };
  const cargarPlantilla = (key) => {
    const p = PLANTILLAS.find((x) => x.key === key);
    if (!p) return;
    const d = p.data;
    setFicha({ obra: d.obra, fecha: d.fecha, actividad: d.actividad, ubicacion: d.ubicacion, horaInicio: d.horaInicio, horaFin: d.horaFin, conclusiones: d.conclusiones || '' });
    setTrab(d.trabajadores);
    setConteos(d.conteos);
  };
  const vaciar = () => {
    setFicha({ obra: 'CREDITEX PTARI', fecha: '', actividad: '', ubicacion: '', horaInicio: '', horaFin: '', conclusiones: '' });
    setTrab([{ letra: 'A', nombre: '', cargo: 'Operario' }]);
    setConteos({});
  };

  // ── KPIs en vivo ──
  const kpis = useMemo(() => {
    let tp = 0, tc = 0, tnc = 0;
    trab.forEach((t) => {
      const c = conteos[t.letra] || {};
      Object.entries(c).forEach(([cod, v]) => {
        const cat = CAT_DE[cod]; const val = n(v);
        if (cat === 'TP') tp += val; else if (cat === 'TC') tc += val; else if (cat === 'TNC') tnc += val;
      });
    });
    const total = tp + tc + tnc;
    const pTP = total ? (tp / total) * 100 : 0;
    const pTC = total ? (tc / total) * 100 : 0;
    const pTNC = total ? (tnc / total) * 100 : 0;
    const luf = pTP + 0.5 * pTC;
    return { tp, tc, tnc, total, pTP, pTC, pTNC, luf };
  }, [conteos, trab]);

  const guardar = useCallback(async () => {
    if (!user?.uid) { showToast?.('Debes iniciar sesión para guardar', 'warning'); return; }
    if (!ficha.fecha || !ficha.actividad.trim()) { showToast?.('Completa fecha y actividad', 'warning'); return; }
    if (kpis.total === 0) { showToast?.('Ingresa al menos un conteo', 'warning'); return; }
    setGuardando(true);
    try {
      const personas = trab.map((t) => ({ id: t.letra, nombre: t.nombre.trim() || `Trabajador ${t.letra}`, cargo: CARGOS_CORTO[t.cargo] || 'OP' }));
      const observaciones = [];
      trab.forEach((t) => {
        const c = conteos[t.letra] || {};
        Object.entries(c).forEach(([cod, v]) => {
          const cat = CAT_DE[cod]; const cnt = n(v);
          if (!cat || cnt <= 0) return;
          for (let k = 0; k < cnt; k++) {
            observaciones.push({
              personaId: t.letra, categoria: cat,
              subcategoria: cat === 'TP' ? null : cod,
              codigo: cod, descripcion: DESC[cod] || cod,
            });
          }
        });
      });
      const actNorm = ficha.actividad.trim().toUpperCase();
      const docData = {
        obra: ficha.obra, fecha: ficha.fecha, actividad: actNorm,
        ubicacion: ficha.ubicacion, horaInicio: ficha.horaInicio, horaFin: ficha.horaFin,
        conclusiones: (ficha.conclusiones || '').trim(),
        trabajadores: trab.map((t) => ({ nombre: t.nombre.trim(), cargo: CARGOS_CORTO[t.cargo] || 'OP' })),
        personas, observaciones, formatoVersion: 2,
        proyectoId: proyectoActivoId || null,
        frenteId: modoTodosFrentes ? null : (frenteActivoId || null),
        fuente: 'importador-conteos',
        timestamp: new Date(),
        uidAutor: user.uid,
      };

      // ── Anti-duplicado: misma fecha + actividad + proyecto ──
      // Query por fecha (un solo campo → sin índice) y filtro fino en cliente.
      const snap = await getDocs(query(collection(db, 'Cartas_Balance'), where('fecha', '==', ficha.fecha)));
      const dups = snap.docs.filter((d) => {
        const x = d.data() || {};
        return (x.actividad || '').toUpperCase() === actNorm && (x.proyectoId || null) === (proyectoActivoId || null);
      });

      if (dups.length > 0) {
        // Abre el modal premium y espera la decisión del usuario.
        setConfirm({ ids: dups.map((d) => d.id), docData, obs: observaciones.length, actNorm, fecha: ficha.fecha });
        return;
      }
      await addDoc(collection(db, 'Cartas_Balance'), docData);
      setOkMsg(`Carta Balance guardada ✓ (${observaciones.length} observaciones)`);
      showToast?.('Carta Balance importada a la base de datos ✓', 'success');
      setTimeout(() => setOkMsg(''), 6000);
    } catch (e) {
      console.error('[ImportarCB]', e);
      showToast?.('Error al guardar: ' + (e?.message || e), 'error');
    } finally { setGuardando(false); }
  }, [user, ficha, trab, conteos, kpis, proyectoActivoId, frenteActivoId, modoTodosFrentes, showToast]);

  // Reemplazo confirmado desde el modal: sobreescribe 1 y elimina las copias extra.
  const ejecutarReemplazo = useCallback(async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'Cartas_Balance', c.ids[0]), c.docData);
      let borradas = 0;
      for (let i = 1; i < c.ids.length; i++) {
        try { await deleteDoc(doc(db, 'Cartas_Balance', c.ids[i])); borradas++; } catch { /* requiere admin */ }
      }
      setOkMsg(`Carta Balance reemplazada ✓${borradas ? ` · ${borradas} copia(s) duplicada(s) eliminada(s)` : ''}`);
      showToast?.('Carta Balance reemplazada ✓', 'success');
      setTimeout(() => setOkMsg(''), 6000);
    } catch (e) {
      console.error('[ImportarCB reemplazo]', e);
      showToast?.('Error al reemplazar: ' + (e?.message || e), 'error');
    } finally { setGuardando(false); }
  }, [confirm, showToast]);

  const clsLuf = clasificarLUF(kpis.luf);
  const inpMini = { width: '52px', padding: '5px 4px', textAlign: 'center', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: BASE.navy };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <ConfirmModal
        abierto={!!confirm}
        icono="🗂️"
        titulo="Esta Carta Balance ya existe"
        mensaje={confirm
          ? `Ya guardaste ${confirm.ids.length === 1 ? 'una Carta Balance' : `${confirm.ids.length} Cartas Balance`} de “${confirm.actNorm}” del ${confirm.fecha}. ¿Reemplazar con estos datos?`
          : ''}
        detalle={confirm && confirm.ids.length > 1
          ? `Se conservará 1 y se eliminarán las ${confirm.ids.length - 1} copias duplicadas.`
          : undefined}
        textoConfirmar="Reemplazar"
        textoCancelar="Cancelar"
        onConfirmar={ejecutarReemplazo}
        onCancelar={() => setConfirm(null)}
      />

      <VistaHeader icono="registro" eyebrow="Carta Balance"
        titulo="Importar por conteos"
        subtitulo="Ingresa los conteos del bloque 'ORDEN DE DATOS' del formato. Genera la carta y la guarda en la base."
        derecha={(
          <button onClick={guardar} disabled={guardando} style={{
            background: guardando ? 'rgba(255,255,255,0.25)' : `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
            color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px',
            fontSize: '13px', fontWeight: 900, cursor: guardando ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          }}>{guardando ? 'Guardando…' : '💾 Guardar en base'}</button>
        )} />

      {okMsg && (
        <div style={{ background: BASE.greenLight, color: BASE.greenDark, border: `1px solid ${BASE.green}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 800 }}>
          ✅ {okMsg}
        </div>
      )}

      {/* Selector de plantillas */}
      <div style={{ background: BASE.navySoft, border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: BASE.navy }}>📋 Cargar plantilla:</span>
        <select onChange={(e) => { cargarPlantilla(e.target.value); e.target.value = ''; }} defaultValue=""
          style={{ ...inp({ width: 'auto', minWidth: '260px', padding: '8px 10px' }) }}>
          <option value="" disabled>Elegir una carta ya digitada…</option>
          {PLANTILLAS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button onClick={vaciar} style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '7px', padding: '7px 12px', cursor: 'pointer' }}>🗑️ Vaciar</button>
      </div>

      {/* Ficha */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 16px', boxShadow: BASE.shadowSm, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <Campo l="Obra"><input style={inp()} value={ficha.obra} onChange={(e) => setFicha({ ...ficha, obra: e.target.value })} /></Campo>
        <Campo l="Fecha"><input type="date" style={inp()} value={ficha.fecha} onChange={(e) => setFicha({ ...ficha, fecha: e.target.value })} /></Campo>
        <Campo l="Actividad (enlaza con CPI)"><input style={inp()} value={ficha.actividad} onChange={(e) => setFicha({ ...ficha, actividad: e.target.value })} /></Campo>
        <Campo l="Ubicación"><input style={inp()} value={ficha.ubicacion} onChange={(e) => setFicha({ ...ficha, ubicacion: e.target.value })} /></Campo>
        <Campo l="Hora inicio"><input style={inp()} value={ficha.horaInicio} onChange={(e) => setFicha({ ...ficha, horaInicio: e.target.value })} /></Campo>
        <Campo l="Hora término"><input style={inp()} value={ficha.horaFin} onChange={(e) => setFicha({ ...ficha, horaFin: e.target.value })} /></Campo>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>Conclusiones / recomendaciones (opcional)</label>
          <textarea value={ficha.conclusiones} onChange={(e) => setFicha({ ...ficha, conclusiones: e.target.value })} rows={3}
            placeholder="Ej: TNC dominado por ESPERA. Recomendación: separar roles de subida y armado…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', color: BASE.text, background: BASE.bgSoft, boxSizing: 'border-box', resize: 'vertical', fontFamily: BASE.font }} />
        </div>
      </div>

      {/* KPIs en vivo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <Kpi l="TP · Productivo" v={`${Math.round(kpis.pTP)}%`} c={CB_COL.TP} sub={`${kpis.tp} obs`} />
        <Kpi l="TC · Contributorio" v={`${Math.round(kpis.pTC)}%`} c={CB_COL.TC} sub={`${kpis.tc} obs`} />
        <Kpi l="TNC · No contrib." v={`${Math.round(kpis.pTNC)}%`} c={CB_COL.TNC} sub={`${kpis.tnc} obs`} />
        <Kpi l="LUF" v={`${Math.round(kpis.luf)}%`} c={clsLuf.color} sub={clsLuf.label} />
      </div>

      {/* Grid de conteos */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', boxShadow: BASE.shadowSm, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BASE.border}`, background: BASE.bgSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy }}>CONTEOS POR CÓDIGO Y TRABAJADOR</span>
          <button onClick={addTrab} style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, background: BASE.bg, border: `1px solid ${BASE.border}`, borderRadius: '7px', padding: '5px 10px', cursor: 'pointer' }}>+ Trabajador</button>
        </div>
        {/* Encabezado de trabajadores */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px', width: '100%' }}>
            <thead>
              <tr style={{ background: BASE.navySoft }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', color: BASE.navy, fontWeight: 800, minWidth: '180px' }}>CÓDIGO</th>
                {trab.map((t, i) => (
                  <th key={t.letra} style={{ padding: '6px 6px', minWidth: '120px' }}>
                    <input value={t.nombre} onChange={(e) => setTrabajador(i, 'nombre', e.target.value)} placeholder={`Trab. ${t.letra}`}
                      style={{ width: '110px', fontSize: '10px', fontWeight: 700, color: BASE.navy, border: 'none', background: 'transparent', textAlign: 'center' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: BASE.gold }}>{t.letra}</span>
                      <select value={t.cargo} onChange={(e) => setTrabajador(i, 'cargo', e.target.value)}
                        style={{ fontSize: '9px', border: `1px solid ${BASE.border}`, borderRadius: '4px', padding: '1px' }}>
                        {CARGOS.map((c) => <option key={c} value={c}>{CARGOS_CORTO[c]}</option>)}
                      </select>
                      {trab.length > 1 && <button onClick={() => removeTrab(t.letra)} title="Quitar" style={{ border: 'none', background: 'transparent', color: BASE.red, cursor: 'pointer', fontSize: '11px', padding: 0 }}>✕</button>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['TP', 'TC', 'TNC'].map((cat) => (
                <React.Fragment key={cat}>
                  <tr><td colSpan={trab.length + 1} style={{ padding: '6px 12px', background: CB_COL[cat] + '18', color: CB_COL[cat], fontWeight: 900, fontSize: '10.5px', letterSpacing: '0.5px' }}>
                    {cat === 'TP' ? 'TRABAJO PRODUCTIVO' : cat === 'TC' ? 'TRABAJO CONTRIBUTORIO' : 'TRABAJO NO CONTRIBUTORIO'}
                  </td></tr>
                  {CODIGOS[cat].map((c) => (
                    <tr key={c.cod} style={{ borderTop: `1px solid ${BASE.borderSoft}` }}>
                      <td style={{ padding: '5px 10px', color: BASE.text }}>
                        <b style={{ color: BASE.navy }}>{c.cod}</b> <span style={{ color: BASE.muted, fontSize: '11px' }}>{c.desc}</span>
                      </td>
                      {trab.map((t) => (
                        <td key={t.letra} style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <input type="number" min="0" value={conteos[t.letra]?.[c.cod] ?? ''} onChange={(e) => setCount(t.letra, c.cod, e.target.value)} style={inpMini} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: '10.5px', color: BASE.muted, textAlign: 'center', fontStyle: 'italic' }}>
        Tip: copia los números del bloque «ORDEN DE DATOS» del formato. Al guardar, la carta aparece en Análisis (tendencia, comparar, metas) y se cruza con el CPI por actividad.
      </p>
    </div>
  );
}

function Campo({ l, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>{l}</label>
      {children}
    </div>
  );
}
function Kpi({ l, v, c, sub }) {
  return (
    <div style={{ background: c + '0F', border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`, borderRadius: '10px', padding: '10px 13px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 900, color: BASE.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</p>
      <p style={{ fontSize: '22px', fontWeight: 900, color: c, fontFamily: 'monospace', lineHeight: 1.1, marginTop: '2px' }}>{v}</p>
      {sub && <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>}
    </div>
  );
}
