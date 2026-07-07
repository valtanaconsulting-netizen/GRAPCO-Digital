// src/views/oficinatecnica/PlantillaCalzadura.jsx
// Generador de SUSTENTO DE CALZADURA desde la geometría de los anillos.
// Replica la hoja "2. Sustento de campo" del Excel PRO-GCE-FOR-F03: una sola
// tabla de elementos (anillo · ubicación · largo · altura · prof · perímetro)
// alimenta TODAS las partidas a la vez, igual que el sustento de costos:
//
//   • Excavación localizada (m³) = largo × altura × prof
//   • Concreto ciclópeo    (m³)  = largo × altura × prof   (mismo volumen)
//   • Encofrado            (m²)  = perímetro × altura
//   • Acarreo / Eliminación      = excavación × (1 + esponjamiento)
//
// Cada partida se crea como un doc de SustentoMetrados con su PlanillaMetrado ya
// cuadrada, lista para fotos y guías. Precargado con la Calzadura de PTAR-VAL 01
// para que la próxima sea "clonar y cambiar números".

import React, { useMemo, useState } from 'react';
import { BASE } from '../../utils/styles';

// Geometría real de la Calzadura · PTAR PLANTA 5 · VAL 01 (los 2 anillos).
const ELEMENTOS_VAL01 = [
  { anillo: '1er anillo', ubicacion: 'Tienda de telas',  largo: '19.3', altura: '1.6', prof: '0.8', perimetro: '41.8' },
  { anillo: '1er anillo', ubicacion: 'Calle tejedores',  largo: '15.4', altura: '1.4', prof: '0.6', perimetro: '33.6' },
  { anillo: '2do anillo', ubicacion: 'Tienda de telas',  largo: '19.3', altura: '1.7', prof: '1.2', perimetro: '42.0' },
  { anillo: '2do anillo', ubicacion: 'Calle tejedores',  largo: '15.4', altura: '1.7', prof: '1.0', perimetro: '34.2' },
];

const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const uid = () => `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// Partidas que el generador puede emitir, con el código de ítem del F03.
const PARTIDAS = [
  { key: 'excavacion',  on: true,  partida: '4.1.1 Excavación localizada',     tipo: 'excavacion', unidad: 'm3',
    descripcion: 'Excavación localizada para calzadura de muros vecinos, por anillos y tramos según geometría de sustento.' },
  { key: 'concreto',    on: true,  partida: '4.1.5 Concreto ciclópeo 1:10',    tipo: 'concreto',   unidad: 'm3',
    descripcion: 'Concreto ciclópeo 1:10 + 30% PG en calzaduras, vaciado por anillos según guías de concreto premezclado f’c=100 kg/cm².' },
  { key: 'encofrado',   on: true,  partida: '4.1.4 Encofrado y desencofrado',  tipo: 'encofrado',  unidad: 'm2',
    descripcion: 'Encofrado y desencofrado de cara expuesta de calzaduras por anillos y tramos.' },
  { key: 'eliminacion', on: false, partida: '4.1.3 Eliminación de desmonte',   tipo: 'eliminacion', unidad: 'm3',
    descripcion: 'Eliminación de material excedente de excavación de calzaduras (volquetes). Se completa con el registro de guías de salida.' },
];

export default function PlantillaCalzadura({ valorizaciones = [], onGenerar, onClose }) {
  const [elementos, setElementos] = useState(ELEMENTOS_VAL01);
  const [periodoMes, setPeriodoMes] = useState(new Date().toISOString().slice(0, 7));
  const [valorizacionRef, setValorizacionRef] = useState('');
  const [ubicacion, setUbicacion] = useState('Calle Los Hornos 185 - PTAR Planta 5');
  const [factorEspon, setFactorEspon] = useState(0.30);
  const [sel, setSel] = useState(() => Object.fromEntries(PARTIDAS.map(p => [p.key, p.on])));

  const setCampo = (i, k, v) => setElementos(els => els.map((e, j) => j === i ? { ...e, [k]: v } : e));
  const addElem = () => setElementos(els => [...els, { anillo: '', ubicacion: '', largo: '', altura: '', prof: '', perimetro: '' }]);
  const delElem = (i) => setElementos(els => els.filter((_, j) => j !== i));

  // Totales en vivo (mismo cálculo que PlanillaMetrado).
  const tot = useMemo(() => {
    let exc = 0, enc = 0;
    elementos.forEach(e => {
      exc += n(e.largo) * n(e.altura) * n(e.prof);
      enc += n(e.perimetro) * n(e.altura);
    });
    return { excavacion: r3(exc), concreto: r3(exc), encofrado: r3(enc), acarreo: r3(exc * (1 + factorEspon)) };
  }, [elementos, factorEspon]);

  // Construye las filas de PlanillaMetrado para cada tipo desde la geometría.
  const filasDe = (tipo) => elementos
    .filter(e => n(e.largo) > 0 && n(e.altura) > 0)
    .map(e => {
      const desc = `${e.anillo}${e.ubicacion ? ' · ' + e.ubicacion : ''}`.trim() || 'Elemento';
      if (tipo === 'encofrado') return { id: uid(), descripcion: desc, nVeces: '1', largo: e.perimetro, alto: e.altura, caras: '1' };
      if (tipo === 'concreto')  return { id: uid(), descripcion: desc, nVeces: '1', largo: e.largo, ancho: e.prof, alto: e.altura };
      // excavacion (volumen): ancho = altura, alto = prof
      return { id: uid(), descripcion: desc, nVeces: '1', largo: e.largo, ancho: e.altura, alto: e.prof };
    });

  const generar = () => {
    const elige = PARTIDAS.filter(p => sel[p.key]);
    if (!elige.length) return;
    const payloads = elige.map(p => {
      const esVolquetes = p.tipo === 'eliminacion';
      const detalle = esVolquetes ? [] : filasDe(p.tipo);
      const metrado = esVolquetes
        ? 0
        : r3(detalle.reduce((s, f) => s + (p.tipo === 'encofrado'
            ? n(f.largo) * n(f.alto) * (n(f.caras) || 1)
            : n(f.largo) * n(f.ancho) * n(f.alto)), 0));
      return {
        partida: p.partida,
        codigoPartida: '',
        valorizacionRef,
        periodoMes,
        tipoMetrado: p.tipo,
        detalleMetrado: detalle,
        metaMetrado: esVolquetes ? { factorEsponjamiento: factorEspon } : {},
        metrado,
        unidad: p.unidad,
        descripcion: p.descripcion,
        ubicacion,
        fotos: [],
      };
    });
    onGenerar?.(payloads);
  };

  const nSel = PARTIDAS.filter(p => sel[p.key]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.5 }}>
        Llena la <b style={{ color: BASE.navy }}>geometría de los anillos</b> una sola vez. El generador crea las partidas
        seleccionadas con su planilla de cómputo ya cuadrada — igual que la hoja de sustento de costos.
        Viene precargado con la Calzadura de PTAR-VAL 01.
      </p>

      {/* Datos generales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <Campo label="Periodo (mes)">
          <input type="month" value={periodoMes} onChange={e => setPeriodoMes(e.target.value)} style={inp()} />
        </Campo>
        <Campo label="Valorización (PQ-XX)">
          <select value={valorizacionRef} onChange={e => setValorizacionRef(e.target.value)} style={inp()}>
            <option value="">Sin asociar</option>
            {valorizaciones.map(v => (
              <option key={v.id} value={`PQ-${String(v.numeroValorizacion || '').padStart(2, '0')}`}>
                PQ-{String(v.numeroValorizacion || '').padStart(2, '0')} · {v.estado || 'borrador'}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Ubicación / Obra">
          <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} style={inp()} />
        </Campo>
      </div>

      {/* Tabla de geometría por elemento */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.gold, letterSpacing: '0.5px', marginBottom: '6px' }}>
          📐 GEOMETRÍA POR ELEMENTO (anillos)
        </p>
        <div style={{ border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: 620 }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th({ minWidth: 96 })}>Anillo</th>
                  <th style={th({ minWidth: 130 })}>Ubicación</th>
                  <th style={th({ width: 84, textAlign: 'right' })}>Largo (m)</th>
                  <th style={th({ width: 84, textAlign: 'right' })}>Altura (m)</th>
                  <th style={th({ width: 84, textAlign: 'right' })}>Prof. (m)</th>
                  <th style={th({ width: 96, textAlign: 'right' })}>Perím. enc. (m)</th>
                  <th style={th({ width: 34 })}></th>
                </tr>
              </thead>
              <tbody>
                {elementos.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={td()}><input value={e.anillo} onChange={ev => setCampo(i, 'anillo', ev.target.value)} placeholder="1er anillo" style={cell({ textAlign: 'left' })} /></td>
                    <td style={td()}><input value={e.ubicacion} onChange={ev => setCampo(i, 'ubicacion', ev.target.value)} placeholder="Tienda de telas" style={cell({ textAlign: 'left' })} /></td>
                    <td style={td()}><input value={e.largo} onChange={ev => setCampo(i, 'largo', ev.target.value)} placeholder="0.00" inputMode="decimal" style={cell({ textAlign: 'right' })} /></td>
                    <td style={td()}><input value={e.altura} onChange={ev => setCampo(i, 'altura', ev.target.value)} placeholder="0.00" inputMode="decimal" style={cell({ textAlign: 'right' })} /></td>
                    <td style={td()}><input value={e.prof} onChange={ev => setCampo(i, 'prof', ev.target.value)} placeholder="0.00" inputMode="decimal" style={cell({ textAlign: 'right' })} /></td>
                    <td style={td()}><input value={e.perimetro} onChange={ev => setCampo(i, 'perimetro', ev.target.value)} placeholder="0.00" inputMode="decimal" style={cell({ textAlign: 'right' })} /></td>
                    <td style={td({ textAlign: 'center' })}>
                      <button type="button" onClick={() => delElem(i)} title="Quitar elemento" style={{ border: 'none', background: BASE.redLight, color: BASE.red, borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <button type="button" onClick={addElem} style={addBtn}>+ Agregar elemento</button>
      </div>

      {/* Esponjamiento (para acarreo / eliminación) */}
      <label style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        Factor esponjamiento (acarreo)
        <input value={Math.round(factorEspon * 100)} inputMode="decimal"
          onChange={e => setFactorEspon((parseFloat(e.target.value) || 0) / 100)}
          style={{ width: 54, padding: '5px 7px', borderRadius: 7, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 800, textAlign: 'right', fontFamily: 'monospace' }} />
        <span style={{ color: BASE.muted }}>%</span>
      </label>

      {/* Partidas a generar + totales en vivo */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>
          PARTIDAS A GENERAR
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {PARTIDAS.map(p => {
            const val = p.key === 'eliminacion' ? tot.acarreo : tot[p.key];
            return (
              <label key={p.key} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                border: `1px solid ${sel[p.key] ? BASE.gold : BASE.border}`, borderRadius: '9px',
                background: sel[p.key] ? BASE.goldLight : BASE.white, cursor: 'pointer',
              }}>
                <input type="checkbox" checked={!!sel[p.key]} onChange={e => setSel(s => ({ ...s, [p.key]: e.target.checked }))} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: BASE.navy, flex: 1 }}>{p.partida}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: BASE.goldDark, fontSize: '12.5px' }}>
                  {p.key === 'eliminacion'
                    ? <span style={{ color: BASE.muted, fontWeight: 700 }}>se completa con guías</span>
                    : `${val.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${p.unidad}`}
                </span>
              </label>
            );
          })}
        </div>
        <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '6px', lineHeight: 1.5 }}>
          Acarreo manual (excavación × {Math.round(factorEspon * 100)}%) ≈ <b>{tot.acarreo.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</b>.
          La eliminación real se cuadra con el registro de guías de volquetes.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
        <button onClick={onClose} style={btn(BASE.muted)}>Cancelar</button>
        <button onClick={generar} disabled={!nSel} style={{ ...btn(BASE.navy), opacity: nSel ? 1 : 0.5 }}>
          Generar {nSel} {nSel === 1 ? 'sustento' : 'sustentos'}
        </button>
      </div>
    </div>
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

const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const th = (extra = {}) => ({ padding: '8px 8px', textAlign: 'left', fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.3px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '4px 6px', verticalAlign: 'middle', ...extra });
const cell = (extra = {}) => ({ width: '100%', padding: '6px 7px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'monospace', ...extra });
const addBtn = { alignSelf: 'flex-start', marginTop: '8px', padding: '8px 14px', borderRadius: '9px', border: `1.5px dashed ${BASE.gold}`, background: BASE.goldLight, color: BASE.navy, fontSize: '12px', fontWeight: 800, cursor: 'pointer' };
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
