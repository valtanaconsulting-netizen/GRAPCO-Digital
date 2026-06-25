// src/views/oficinatecnica/MetradoSustentoModal.jsx
// "Metrar con formato" DESDE el ISP. Reusa la misma planilla de cómputo del Sustento de
// Metrados y guarda un doc en `SustentoMetrados` — el mismo que alimenta la Valorización
// F07 en vivo y el RO. Cierra el lazo que pidió el usuario:
//   ISP (auditoría, metro por actividad con formato) → Sustento OT → Valorización → RO.
// El metrado cae EXACTO en la partida F07 elegida (codigoPartida = item) y queda
// etiquetado con su familia (prefijo) para el rollup en dinero del RO.
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import Modal from '../../components/Modal';
import FotoUploader from '../../components/FotoUploader';
import PlanillaMetrado, { TIPOS_METRADO } from './PlanillaMetrado';
import { sugerirPrefijo, familiaDe, colorPrefijo } from '../../utils/prefijos';
import { obtenerSemana } from '../../utils/helpers';

const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });

// Tipo de planilla por defecto a partir de la unidad de la partida (m3→concreto, kg→acero…).
const tipoPorUnidad = (und) => {
  const u = String(und || '').toLowerCase();
  if (u.includes('kg')) return 'acero';
  if (u.includes('m2') || u.includes('m²')) return 'encofrado';
  if (u.includes('m3') || u.includes('m³')) return 'concreto';
  return 'concreto';
};

export default function MetradoSustentoModal({ actividad, familia, unidad, onClose, showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, fechaInicioProyecto } = useProyectoActivo();

  // Semana/quincena del proyecto en curso (LPS) → ubica el metrado en su quincena de
  // valorización aunque no se asocie una PQ explícita.
  const semanaActual = useMemo(
    () => (fechaInicioProyecto ? obtenerSemana(new Date(), fechaInicioProyecto) : null),
    [fechaInicioProyecto],
  );
  const quincenaActual = semanaActual ? Math.ceil(semanaActual / 2) : null;

  const [presuF07, setPresuF07] = useState([]);
  const [f07Map, setF07Map] = useState({});
  const [valorizaciones, setValorizaciones] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Prefijo sugerido para esta actividad del ISP (designado en OT o auto-sugerido por nombre).
  const prefijoSugerido = useMemo(
    () => sugerirPrefijo({ descripcion: actividad, familia }).prefijo || '',
    [actividad, familia],
  );

  const [form, setForm] = useState({
    prefijo: prefijoSugerido,
    codigoPartida: '',
    valorizacionRef: '',
    tipoMetrado: tipoPorUnidad(unidad),
    detalleMetrado: [],
    metaMetrado: {},
    metrado: 0,
    unidad: unidad || 'm3',
    descripcion: '',
    fotos: [],
  });

  useEffect(() => { setForm(f => ({ ...f, prefijo: prefijoSugerido })); }, [prefijoSugerido]);

  useEffect(() => {
    if (!proyectoActivoId) return;
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) =>
      setPresuF07(snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyectoActivoId).sort((a, b) => (a.orden || 0) - (b.orden || 0))));
    const u2 = onSnapshot(doc(db, 'Prefijos_Catalogo', proyectoActivoId), (d) => setF07Map(d.data()?.f07Map || {}));
    const u3 = onSnapshot(collection(db, 'ValorizacionesContractuales'), (snap) =>
      setValorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, [proyectoActivoId]);

  const partidasF07 = useMemo(() => presuF07
    .filter(p => p.esPartida && p.mkey)
    .map(p => ({
      mkey: p.mkey, item: p.item, descripcion: p.descripcion, und: p.und || '',
      prefijo: f07Map[p.mkey] || sugerirPrefijo({ codigo: p.item, descripcion: p.descripcion }).prefijo || '',
    })), [presuF07, f07Map]);

  const familias = useMemo(() => {
    const s = new Set(partidasF07.map(p => p.prefijo).filter(Boolean));
    if (prefijoSugerido) s.add(prefijoSugerido);
    return [...s].sort();
  }, [partidasF07, prefijoSugerido]);

  const partidasFiltradas = useMemo(
    () => (form.prefijo ? partidasF07.filter(p => p.prefijo === form.prefijo) : partidasF07),
    [partidasF07, form.prefijo],
  );

  const elegirPartida = (mkey) => {
    const p = partidasF07.find(x => x.mkey === mkey);
    if (!p) { setForm(f => ({ ...f, codigoPartida: '' })); return; }
    setForm(f => ({
      ...f,
      codigoPartida: p.item || '',
      prefijo: p.prefijo || f.prefijo || '',
      unidad: p.und || f.unidad,
      tipoMetrado: f.detalleMetrado.length ? f.tipoMetrado : tipoPorUnidad(p.und),
      descripcion: f.descripcion || `${actividad} — ${p.descripcion}`,
    }));
  };

  const guardar = async () => {
    if (!form.codigoPartida) { showToast?.('Elige la partida de la valorización donde cae el metrado.', 'error'); return; }
    if (!(Number(form.metrado) > 0)) { showToast?.('La planilla debe dar un metrado mayor que cero.', 'error'); return; }
    setGuardando(true);
    try {
      const partidaF07 = partidasF07.find(p => p.item === form.codigoPartida);
      await addDoc(collection(db, 'SustentoMetrados'), {
        proyectoId: proyectoActivoId || null,
        origen: 'ISP',                         // trazabilidad: nació metrando en el ISP
        actividadISP: actividad || '',
        partida: partidaF07?.descripcion || actividad || 'Metrado ISP',
        codigoPartida: form.codigoPartida,
        prefijo: form.prefijo || '',
        valorizacionRef: form.valorizacionRef || '',
        semana: semanaActual || null,         // ubica el avance en su quincena (LPS) para la valorización en vivo
        periodoMes: new Date().toISOString().slice(0, 7),
        tipoMetrado: form.tipoMetrado,
        detalleMetrado: form.detalleMetrado,
        metaMetrado: form.metaMetrado || {},
        metrado: Number(form.metrado) || 0,
        unidad: form.unidad,
        descripcion: form.descripcion || actividad || '',
        fotos: form.fotos || [],
        creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
        actualizadoEn: serverTimestamp(), actualizadoPor: user?.email || 'desconocido',
      });
      showToast?.('Metrado guardado en el Sustento. La valorización se actualiza sola.', 'success');
      onClose?.();
    } catch (e) {
      showToast?.('No se pudo guardar: ' + (e?.message || e), 'error');
    } finally {
      setGuardando(false);
    }
  };

  const sinF07 = !partidasF07.length;

  return (
    <Modal onClose={onClose} title="📐 Metrar con formato (ISP → Sustento)" maxW="760px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Actividad de origen */}
        <div style={{ background: BASE.navySoft, border: `1px solid ${BASE.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: BASE.muted, letterSpacing: 0.4 }}>ACTIVIDAD DEL ISP</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: BASE.navy }}>{actividad}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Familia (prefijo)">
            <select value={form.prefijo} onChange={(e) => setForm(f => ({ ...f, prefijo: e.target.value, codigoPartida: '' }))} style={inp()}>
              <option value="">— familia —</option>
              {familias.map(pf => <option key={pf} value={pf}>{pf} · {familiaDe(pf)}</option>)}
            </select>
          </Campo>
          <Campo label="Valorización (PQ-XX)">
            <select value={form.valorizacionRef} onChange={(e) => setForm(f => ({ ...f, valorizacionRef: e.target.value }))} style={inp()}>
              <option value="">Sin asociar</option>
              {valorizaciones.map(v => (
                <option key={v.id} value={`PQ-${String(v.numeroValorizacion || '').padStart(2, '0')}`}>
                  PQ-{String(v.numeroValorizacion || '').padStart(2, '0')} · {v.estado || 'borrador'}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>
            PARTIDA DE LA VALORIZACIÓN (el metrado cae exacto aquí)
          </label>
          {!sinF07 ? (
            <select value={partidasFiltradas.find(p => p.item === form.codigoPartida)?.mkey || ''} onChange={(e) => elegirPartida(e.target.value)} style={inp()}>
              <option value="">— elige la partida F07 —</option>
              {partidasFiltradas.map(p => <option key={p.mkey} value={p.mkey}>{p.item} · {p.descripcion} ({p.und})</option>)}
            </select>
          ) : (
            <p style={{ fontSize: 11, color: BASE.gold, fontWeight: 700 }}>Este proyecto aún no tiene Presupuesto F07 cargado — cárgalo para enlazar el metrado a su partida.</p>
          )}
          {form.codigoPartida && (
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {form.prefijo && <span style={{ fontSize: '9.5px', fontWeight: 800, fontFamily: 'monospace', color: '#fff', background: colorPrefijo(form.prefijo), padding: '1px 6px', borderRadius: 4 }}>{form.prefijo}</span>}
              <span>Cae en <b style={{ color: BASE.navy, fontFamily: 'monospace' }}>{form.codigoPartida}</b> · familia {form.prefijo ? familiaDe(form.prefijo) : '—'} para el RO.</span>
              {!form.valorizacionRef && quincenaActual && <span style={{ color: BASE.green, fontWeight: 700 }}>· quincena Q-{String(quincenaActual).padStart(2, '0')} (sem {semanaActual})</span>}
            </p>
          )}
        </div>

        {/* Planilla de cómputo — el formato que se guarda como sustento */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.5px', marginBottom: '8px' }}>
            📐 PLANILLA DE METRADOS · {TIPOS_METRADO[form.tipoMetrado]?.label}
          </p>
          <PlanillaMetrado
            tipo={form.tipoMetrado}
            unidad={form.unidad}
            detalle={form.detalleMetrado}
            meta={form.metaMetrado}
            onChange={({ tipo, unidad, detalle, total, meta }) =>
              setForm(f => ({ ...f, tipoMetrado: tipo, unidad, detalleMetrado: detalle, metaMetrado: meta || {}, metrado: total }))}
          />
        </div>

        <Campo label="Descripción del trabajo">
          <textarea rows={2} value={form.descripcion} onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
            style={{ ...inp(), resize: 'vertical' }} placeholder="Ej: Encofrado de zapatas Z-1 a Z-12, frente F1." />
        </Campo>

        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, marginBottom: '6px', letterSpacing: '0.4px' }}>
            FOTOS DE CAMPO ({form.fotos.length}) · opcional
          </p>
          <FotoUploader fotos={form.fotos} onChange={(fotos) => setForm(f => ({ ...f, fotos }))}
            ruta={`Sustento/ISP/${(form.prefijo || 'GEN')}/${new Date().toISOString().slice(0, 7)}`} max={20} showToast={showToast} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={guardando} style={btn(BASE.muted)}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={btn(BASE.navy)}>
            {guardando ? 'Guardando…' : 'Guardar metrado'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>{label}</label>
      {children}
    </div>
  );
}

const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
