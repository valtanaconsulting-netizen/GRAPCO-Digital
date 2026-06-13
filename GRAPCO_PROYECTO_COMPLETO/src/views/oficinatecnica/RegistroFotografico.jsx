// src/views/oficinatecnica/RegistroFotografico.jsx
// Galería de todas las fotos subidas por los capataces en los registros de campo.
// Filtros: Partida → Subpartida → Actividad (cascada), Semana, Capataz.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { FECHA_INICIO_PROYECTO } from '../../utils/constants';
import { obtenerSemana, fmtFechaCorta } from '../../utils/helpers';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import Modal from '../../components/Modal';

const card = {
  background: BASE.white,
  borderRadius: '12px',
  border: `1px solid ${BASE.border}`,
  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
};

const selectStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: `1px solid ${BASE.border}`, fontSize: '12px',
  background: BASE.bgSoft, boxSizing: 'border-box',
};

export default function RegistroFotografico() {
  const { filtrarPorContexto } = useProyectoActivo();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [fPartida, setFPartida]       = useState('');
  const [fSubpartida, setFSubpartida] = useState('');
  const [fActividad, setFActividad]   = useState('');
  const [fSemana, setFSemana]         = useState('');
  const [fCapataz, setFCapataz]       = useState('');
  const [preview, setPreview]         = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Registros_Campo'),
      snap => {
        setRegistros(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true }));
        setLoading(false);
      },
      err => { console.error('[RegistroFotografico]', err); setLoading(false); }
    );
    return () => unsub();
  }, [filtrarPorContexto]);

  // ── Aplanar: una entrada por foto ──────────────────────────────
  const fotos = useMemo(() => {
    const out = [];
    (registros || []).forEach(r => {
      if (!r || !Array.isArray(r.fotos) || r.fotos.length === 0) return;
      const semana = r.semana || obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO);
      r.fotos.forEach((f, idx) => {
        const url = f?.url || (typeof f === 'string' ? f : null);
        if (!url) return;
        out.push({
          id: `${r.id}_${idx}`,
          url,
          fecha:      r.fecha,
          semana,
          partida:    (r.partida || '').toUpperCase().trim(),
          subpartida: (r.subpartida || '').toUpperCase().trim(),
          actividad:  (r.actividad || '').trim(),
          capataz:    r.capataz || 'SIN CAPATAZ',
          observacion: r.observacion || '',
          subidaEn:   f?.subidaEn || null,
        });
      });
    });
    return out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [registros]);

  // ── Opciones derivadas de la data en cascada ──────────────────
  const partidas = useMemo(() => {
    return Array.from(new Set(fotos.map(f => f.partida).filter(Boolean))).sort();
  }, [fotos]);

  const subpartidas = useMemo(() => {
    const base = fPartida ? fotos.filter(f => f.partida === fPartida) : fotos;
    return Array.from(new Set(base.map(f => f.subpartida).filter(Boolean))).sort();
  }, [fotos, fPartida]);

  const actividades = useMemo(() => {
    let base = fotos;
    if (fPartida) base = base.filter(f => f.partida === fPartida);
    if (fSubpartida) base = base.filter(f => f.subpartida === fSubpartida);
    return Array.from(new Set(base.map(f => f.actividad).filter(Boolean))).sort();
  }, [fotos, fPartida, fSubpartida]);

  const semanas = useMemo(() => {
    return Array.from(new Set(fotos.map(f => f.semana).filter(Boolean))).sort((a, b) => a - b);
  }, [fotos]);

  const capataces = useMemo(() => {
    return Array.from(new Set(fotos.map(f => f.capataz).filter(Boolean))).sort();
  }, [fotos]);

  // ── Filtrado ───────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const semNum = fSemana ? parseInt(fSemana) : null;
    return fotos.filter(f =>
      (!fPartida    || f.partida    === fPartida) &&
      (!fSubpartida || f.subpartida === fSubpartida) &&
      (!fActividad  || f.actividad  === fActividad) &&
      (!semNum      || f.semana     === semNum) &&
      (!fCapataz    || f.capataz    === fCapataz)
    );
  }, [fotos, fPartida, fSubpartida, fActividad, fSemana, fCapataz]);

  const filtrosActivos = !!(fPartida || fSubpartida || fActividad || fSemana || fCapataz);
  const limpiar = () => { setFPartida(''); setFSubpartida(''); setFActividad(''); setFSemana(''); setFCapataz(''); };

  if (loading) {
    return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando registro fotográfico…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* FILTROS */}
      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', color: BASE.navy }}>REGISTRO FOTOGRÁFICO · Filtros</p>
          <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '700' }}>
            {filtradas.length} de {fotos.length} foto{fotos.length === 1 ? '' : 's'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>PARTIDA</label>
            <select value={fPartida} onChange={e => { setFPartida(e.target.value); setFSubpartida(''); setFActividad(''); }}
              style={selectStyle}>
              <option value="">Todas</option>
              {partidas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>SUBPARTIDA</label>
            <select value={fSubpartida} onChange={e => { setFSubpartida(e.target.value); setFActividad(''); }}
              style={selectStyle} disabled={subpartidas.length === 0}>
              <option value="">Todas</option>
              {subpartidas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>ACTIVIDAD</label>
            <select value={fActividad} onChange={e => setFActividad(e.target.value)}
              style={selectStyle} disabled={actividades.length === 0}>
              <option value="">Todas</option>
              {actividades.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>SEMANA</label>
            <select value={fSemana} onChange={e => setFSemana(e.target.value)} style={selectStyle}>
              <option value="">Todas</option>
              {semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>CAPATAZ</label>
            <select value={fCapataz} onChange={e => setFCapataz(e.target.value)} style={selectStyle}>
              <option value="">Todos</option>
              {capataces.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {filtrosActivos && (
          <button onClick={limpiar}
            style={{
              marginTop: '12px', padding: '7px 14px', background: BASE.redLight, color: BASE.red,
              border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* GALERÍA */}
      {filtradas.length === 0 ? (
        <div style={{ ...card, padding: '50px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', marginBottom: '10px' }}>📭</p>
          <p style={{ fontSize: '13px', color: BASE.muted, fontWeight: '600' }}>
            {fotos.length === 0
              ? 'Aún no se han subido fotos en los registros de campo.'
              : 'No hay fotos para los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {filtradas.map(f => (
            <button key={f.id} onClick={() => setPreview(f)}
              style={{
                ...card, padding: 0, overflow: 'hidden',
                cursor: 'pointer', border: `1px solid ${BASE.border}`,
                display: 'flex', flexDirection: 'column',
                textAlign: 'left',
              }}>
              <div style={{
                width: '100%', aspectRatio: '4 / 3',
                background: BASE.bgSoft,
                backgroundImage: `url(${f.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                    {fmtFechaCorta(f.fecha)}
                  </span>
                  <span style={{
                    fontSize: '9.5px', fontWeight: '800', color: BASE.goldDark,
                    background: `${BASE.gold}20`, padding: '1px 6px', borderRadius: '4px',
                  }}>S{f.semana}</span>
                </div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.actividad || '—'}
                </p>
                <p style={{ fontSize: '10px', color: BASE.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.partida}{f.subpartida ? ` · ${f.subpartida}` : ''}
                </p>
                <p style={{ fontSize: '10px', color: BASE.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  👷‍♂️ {f.capataz}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* MODAL DE PREVIEW */}
      {preview && (
        <Modal title={`${fmtFechaCorta(preview.fecha)} · Semana ${preview.semana}`} onClose={() => setPreview(null)} maxW="900px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <img src={preview.url} alt=""
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '10px', background: BASE.bgSoft }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {[
                ['Fecha',      fmtFechaCorta(preview.fecha)],
                ['Semana',     `S${preview.semana}`],
                ['Partida',    preview.partida || '—'],
                ['Subpartida', preview.subpartida || '—'],
                ['Actividad',  preview.actividad || '—'],
                ['Capataz',    preview.capataz],
              ].map(([l, v]) => (
                <div key={l} style={{ background: BASE.bgSoft, padding: '8px 10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.5px' }}>{l.toUpperCase()}</p>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: BASE.text, marginTop: '2px' }}>{v}</p>
                </div>
              ))}
            </div>
            {preview.observacion && (
              <div style={{ background: `${BASE.gold}10`, border: `1px solid ${BASE.gold}55`, borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '9.5px', fontWeight: '800', color: BASE.goldDark, letterSpacing: '0.5px' }}>OBSERVACIÓN</p>
                <p style={{ fontSize: '12px', color: BASE.text, marginTop: '4px', lineHeight: 1.5 }}>{preview.observacion}</p>
              </div>
            )}
            <a href={preview.url} target="_blank" rel="noopener noreferrer"
              style={{
                alignSelf: 'flex-start', padding: '8px 14px', background: BASE.navy, color: '#fff',
                borderRadius: '8px', fontSize: '12px', fontWeight: '700', textDecoration: 'none',
              }}>
              🔗 Abrir original
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
