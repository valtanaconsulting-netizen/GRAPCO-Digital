// src/views/oficinatecnica/PlanillaMetrado.jsx
// Planilla de CÓMPUTO DE METRADOS por tipo, "tal cual" se hace en la carpeta de
// costos para el sustento de valorización. Cada tipo elige su FORMATO:
//
//   • volumen (m³):   parcial = nº × largo × ancho × alto   (concreto, excavación, relleno, genérico)
//   • area    (m²):   parcial = nº × largo/perím × alto × caras (encofrado, tarrajeo/solaqueo)
//   • acero   (kg):   parcial = nº elem × nº varillas × (long + empalme) × peso(Ø)
//   • volquetes (m³): planilla de salida de volquetes (N° guía · fecha · placa ·
//                     interna/externa · volumen). Total eliminado = Σ volumen;
//                     excavado masivo = eliminado ÷ (1 + factor esponjamiento).
//   • demolicion (m²): planilla de demolición de losa/elemento por área. Total
//                      partida = Σ área (m²). Volumen demolido = Σ nº × área × esp;
//                      eliminado = demolido × (1 + factor esponjamiento).
//
// onChange entrega { tipo, unidad, detalle, total, meta } al padre, que lo
// persiste y usa el total como metrado de la partida valorizada.
import React, { useMemo } from 'react';
import { BASE } from '../../utils/styles';
import { obtenerSemana } from '../../utils/helpers';
import { FECHA_INICIO_PROYECTO } from '../../utils/constants';
import DatePickerPremium from '../../components/DatePickerPremium';

// Semana del proyecto (LPS) de una fecha ISO. Semana 1 = lunes de FECHA_INICIO_PROYECTO.
export const semanaDe = (fechaStr) => {
  if (!fechaStr) return null;
  try { const n = obtenerSemana(fechaStr, FECHA_INICIO_PROYECTO); return Number.isFinite(n) ? n : null; } catch { return null; }
};
// FECHA_INICIO_PROYECTO puede ser un Date o un string 'YYYY-MM-DD' → se normaliza
// a un lunes UTC. Tomamos los componentes locales del Date para no desfasar el día.
const lunesSemana = (n) => {
  const base = FECHA_INICIO_PROYECTO instanceof Date ? FECHA_INICIO_PROYECTO : new Date(String(FECHA_INICIO_PROYECTO));
  if (isNaN(base)) return null;
  const dt = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  if (Number.isFinite(n)) dt.setUTCDate(dt.getUTCDate() + (n - 1) * 7);
  return dt;
};
const fmtDM = (dt) => `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
export const rangoSemana = (n) => {
  const ini = lunesSemana(n);
  if (!ini || isNaN(ini)) return { iniISO: '', label: '' };   // nunca revienta el render
  const fin = new Date(ini); fin.setUTCDate(ini.getUTCDate() + 6);
  return { iniISO: ini.toISOString().slice(0, 10), label: `${fmtDM(ini)} – ${fmtDM(fin)}` };
};

// Peso nominal del acero corrugado por diámetro (kg/m) — estándar Perú/ASTM.
export const ACERO_PESOS = [
  { id: '1/4"',   kgm: 0.250 },
  { id: '8mm',    kgm: 0.395 },
  { id: '3/8"',   kgm: 0.560 },
  { id: '12mm',   kgm: 0.888 },
  { id: '1/2"',   kgm: 0.994 },
  { id: '5/8"',   kgm: 1.552 },
  { id: '3/4"',   kgm: 2.235 },
  { id: '1"',     kgm: 3.973 },
  { id: '1 3/8"', kgm: 7.907 },
];
const pesoDe = (d) => (ACERO_PESOS.find(p => p.id === d)?.kgm) || 0;

// Capacidades típicas de volquete (m³) — atajo para llenar rápido.
export const CAPACIDADES_VOLQUETE = [15, 22, 24, 25];

// tipo → { label, unidad, icon, familia }
export const TIPOS_METRADO = {
  concreto:    { label: 'Concreto',          unidad: 'm3', icon: '🧱', familia: 'volumen' },
  acero:       { label: 'Acero',             unidad: 'kg', icon: '🔩', familia: 'acero' },
  encofrado:   { label: 'Encofrado',         unidad: 'm2', icon: '🪵', familia: 'area' },
  excavacion:  { label: 'Excavación',        unidad: 'm3', icon: '⛏️', familia: 'volumen' },
  eliminacion: { label: 'Eliminación/Volquetes', unidad: 'm3', icon: '🚛', familia: 'volquetes' },
  demolicion:  { label: 'Demolición',        unidad: 'm2', icon: '🏚️', familia: 'demolicion' },
  relleno:     { label: 'Relleno',           unidad: 'm3', icon: '🚜', familia: 'volumen' },
  tarrajeo:    { label: 'Tarrajeo/Solaqueo', unidad: 'm2', icon: '🧽', familia: 'area' },
  generico:    { label: 'Genérico',          unidad: 'und', icon: '📐', familia: 'volumen' },
};
export const familiaDe = (tipo) => TIPOS_METRADO[tipo]?.familia || 'volumen';

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
// Para dimensiones: en blanco = 1 (así un conteo simple no se anula al multiplicar).
const dim = (v) => { if (v === '' || v === null || v === undefined) return 1; const n = parseFloat(v); return Number.isFinite(n) ? n : 1; };

// Calcula el parcial de una fila según la familia del tipo.
export function parcialFila(tipo, r) {
  const fam = familiaDe(tipo);
  if (fam === 'acero') {
    const long = num(r.largo) + num(r.empalme);
    return dim(r.nVeces) * dim(r.nVarillas) * long * pesoDe(r.diametro);
  }
  if (fam === 'area') {
    return dim(r.nVeces) * num(r.largo) * num(r.alto) * dim(r.caras);
  }
  if (fam === 'volquetes') {
    return num(r.volumen); // cada viaje aporta su volumen
  }
  if (fam === 'demolicion') {
    return num(r.area); // el metrado de la partida es el área (m²); el nº solo alimenta el volumen demolido
  }
  return dim(r.nVeces) * dim(r.largo) * dim(r.ancho) * dim(r.alto); // volumen / genérico
}

const filaVacia = (tipo) => {
  const base = { id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  const fam = familiaDe(tipo);
  if (fam === 'acero')     return { ...base, descripcion: '', nVeces: '', diametro: '1/2"', nVarillas: '', largo: '', empalme: '' };
  if (fam === 'area')      return { ...base, descripcion: '', nVeces: '', largo: '', alto: '', caras: '1' };
  if (fam === 'volquetes') return { ...base, nGuia: '', fecha: '', placa: '', clase: 'Externa', volumen: '' };
  if (fam === 'demolicion') return { ...base, descripcion: '', area: '', espesor: '', nVeces: '1' };
  return { ...base, descripcion: '', nVeces: '', largo: '', ancho: '', alto: '' };
};

// Columnas por familia dimensional: [key, label, ancho, placeholder]
const COLS = {
  volumen: [['nVeces','Nº', 52,'1'], ['largo','Largo (m)', 78,'0.00'], ['ancho','Ancho (m)', 78,'0.00'], ['alto','Alto/Esp (m)', 84,'0.00']],
  area:    [['nVeces','Nº', 52,'1'], ['largo','Largo/Perím (m)', 96,'0.00'], ['alto','Alto (m)', 78,'0.00'], ['caras','Caras', 60,'1']],
};

export default function PlanillaMetrado({ tipo = 'concreto', unidad, detalle = [], meta = {}, onChange }) {
  const filas = detalle.length ? detalle : [];
  const fam = familiaDe(tipo);
  const total = useMemo(() => filas.reduce((s, r) => s + parcialFila(tipo, r), 0), [filas, tipo]);
  const un = unidad || TIPOS_METRADO[tipo]?.unidad || 'und';
  const factorEspon = meta?.factorEsponjamiento != null ? meta.factorEsponjamiento : 0.30;

  const emit = (nuevasFilas, nuevoTipo = tipo, nuevaUnidad = un, nuevaMeta = meta) => {
    const t = nuevasFilas.reduce((s, r) => s + parcialFila(nuevoTipo, r), 0);
    onChange?.({ tipo: nuevoTipo, unidad: nuevaUnidad, detalle: nuevasFilas, total: Math.round(t * 1000) / 1000, meta: nuevaMeta || {} });
  };

  const cambiarTipo = (nuevoTipo) => {
    const f = familiaDe(nuevoTipo);
    const m = f === 'volquetes' ? { factorEsponjamiento: 0.30 }
            : f === 'demolicion' ? { factorEsponjamiento: 0.20 }
            : {};
    emit([filaVacia(nuevoTipo)], nuevoTipo, TIPOS_METRADO[nuevoTipo]?.unidad || 'und', m);
  };
  const addFila = () => emit([...filas, filaVacia(tipo)]);
  const delFila = (id) => emit(filas.filter(r => r.id !== id));
  const setCampo = (id, k, v) => emit(filas.map(r => r.id === id ? { ...r, [k]: v } : r));
  const setFactor = (v) => emit(filas, tipo, un, { ...meta, factorEsponjamiento: (parseFloat(v) || 0) });

  // Selector de tipo (común a todos) — grid con botones grandes y aireados.
  const Selector = (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.muted, letterSpacing: '0.7px', marginBottom: '8px' }}>
        TIPO DE METRADO — ELIGE EL FORMATO
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: '8px' }}>
        {Object.entries(TIPOS_METRADO).map(([k, t]) => {
          const activo = tipo === k;
          return (
            <button key={k} type="button" onClick={() => cambiarTipo(k)} style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '11px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
              border: activo ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
              background: activo ? BASE.navy : BASE.white,
              color: activo ? '#fff' : BASE.navy,
              boxShadow: activo ? `0 4px 12px ${BASE.navy}33` : 'none',
              transition: 'all 0.12s',
            }}>
              <span style={{ fontSize: '19px', flexShrink: 0 }}>{t.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                <span style={{ fontSize: '9.5px', opacity: 0.7, fontWeight: 700, letterSpacing: '0.3px' }}>{t.unidad}</span>
              </span>
            </button>
          );
        })}
      </div>
      {tipo === 'generico' && (
        <input value={un} onChange={e => emit(filas, tipo, e.target.value)} placeholder="unidad"
          style={{ marginTop: '8px', width: '90px', padding: '7px 9px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: 700, textAlign: 'center' }} />
      )}
    </div>
  );

  // ─────────── FAMILIA VOLQUETES (eliminación / salida de material) ───────────
  if (fam === 'volquetes') {
    const eliminado = total;                                  // Σ volumen de viajes
    const viajes = filas.filter(r => num(r.volumen) > 0).length;
    const excavado = (1 + factorEspon) > 0 ? eliminado / (1 + factorEspon) : 0;

    // Agrupa los viajes por SEMANA del proyecto (las sin fecha caen en un grupo aparte).
    const grupos = (() => {
      const map = new Map();
      filas.forEach(r => { const s = semanaDe(r.fecha); const k = s == null ? 'sin' : s; if (!map.has(k)) map.set(k, []); map.get(k).push(r); });
      return [...map.entries()].sort((a, b) => a[0] === 'sin' ? 1 : b[0] === 'sin' ? -1 : a[0] - b[0]);
    })();
    const semanasNum = grupos.map(g => g[0]).filter(k => k !== 'sin');
    const ultimaSem = semanasNum.length ? semanasNum[semanasNum.length - 1] : null;
    const addViajeSemana = (semNum, vol = '') => {
      const f = semNum == null ? '' : rangoSemana(semNum).iniISO;
      emit([...filas, { ...filaVacia('eliminacion'), fecha: f, volumen: vol ? String(vol) : '' }]);
    };

    const filaViaje = (r, i) => (
      <tr key={r.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
        <td style={tdS()}><input value={r.nGuia} onChange={e => setCampo(r.id, 'nGuia', e.target.value)} placeholder="000202" style={inpCell({ textAlign: 'left' })} /></td>
        <td style={tdS()}><DatePickerPremium value={r.fecha || ''} onChange={iso => setCampo(r.id, 'fecha', iso)} /></td>
        <td style={tdS()}><input value={r.placa} onChange={e => setCampo(r.id, 'placa', e.target.value)} placeholder="ANJ-776" style={inpCell({ textAlign: 'left' })} /></td>
        <td style={tdS()}>
          <select value={r.clase} onChange={e => setCampo(r.id, 'clase', e.target.value)} style={inpCell({ padding: '6px 4px' })}>
            <option>Externa</option><option>Interna</option>
          </select>
        </td>
        <td style={tdS()}><input value={r.volumen} onChange={e => setCampo(r.id, 'volumen', e.target.value)} placeholder="22" inputMode="decimal" style={inpCell({ textAlign: 'right', fontWeight: 800, color: BASE.green })} /></td>
        <td style={tdS({ textAlign: 'center' })}>
          <button type="button" onClick={() => delFila(r.id)} title="Quitar viaje" style={{ border: 'none', background: BASE.redLight, color: BASE.red, borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>✕</button>
        </td>
      </tr>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Selector}

        {/* Factor de esponjamiento + resúmenes derivados (totales del sustento) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Factor esponjamiento
            <input value={Math.round(factorEspon * 100)} inputMode="decimal"
              onChange={e => setFactor((parseFloat(e.target.value) || 0) / 100)}
              style={{ width: 54, padding: '5px 7px', borderRadius: 7, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 800, textAlign: 'right', fontFamily: 'monospace' }} />
            <span style={{ color: BASE.muted }}>%</span>
          </label>
          <span style={chipDeriv}>Eliminado: <b style={{ color: BASE.goldDark }}>{eliminado.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</b></span>
          <span style={chipDeriv}>Excavado masivo: <b style={{ color: BASE.navy }}>{excavado.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</b></span>
          <span style={chipDeriv}>Viajes: <b>{viajes}</b></span>
        </div>

        {/* Atajos: agregan a la ÚLTIMA semana (o sin fecha si no hay) */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: BASE.muted, fontWeight: 700 }}>
            Agregar viaje{ultimaSem ? ` a la Semana ${ultimaSem}` : ''} de:
          </span>
          {CAPACIDADES_VOLQUETE.map(c => (
            <button key={c} type="button" onClick={() => addViajeSemana(ultimaSem, c)}
              style={{ padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, background: BASE.bgSoft, color: BASE.navy, fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
              {c} m³
            </button>
          ))}
        </div>

        {filas.length === 0 && (
          <p style={{ padding: '14px', textAlign: 'center', color: BASE.muted, fontSize: '12px', fontStyle: 'italic', border: `1px dashed ${BASE.border}`, borderRadius: '10px' }}>
            Sin viajes aún. Agrega uno con los botones de capacidad o “+ Nueva semana”.
          </p>
        )}

        {/* Un bloque por SEMANA con subtotal (clave para valorizar al detalle) */}
        {grupos.map(([k, rows]) => {
          const semNum = k === 'sin' ? null : k;
          const rango = semNum ? rangoSemana(semNum) : null;
          const vSem = rows.filter(r => num(r.volumen) > 0).length;
          const m3Sem = rows.reduce((s, r) => s + num(r.volumen), 0);
          return (
            <div key={k} style={{ border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '9px 14px', background: BASE.navySoft, borderBottom: `1px solid ${BASE.border}` }}>
                <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.navy }}>
                  📅 {semNum ? `SEMANA ${semNum}` : 'SIN FECHA'} {rango && <span style={{ fontWeight: 600, color: BASE.muted }}>· {rango.label}</span>}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={chipDeriv}>Viajes: <b>{vSem}</b></span>
                  <span style={chipDeriv}>m³: <b style={{ color: BASE.goldDark }}>{m3Sem.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b></span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: BASE.navy, color: '#fff' }}>
                      <th style={thS({ width: 92 })}>N° guía</th>
                      <th style={thS({ width: 124 })}>Fecha</th>
                      <th style={thS({ width: 96 })}>Placa</th>
                      <th style={thS({ width: 96 })}>Clase</th>
                      <th style={thS({ width: 90, textAlign: 'right' })}>Vol. (m³)</th>
                      <th style={thS({ width: 34 })}></th>
                    </tr>
                  </thead>
                  <tbody>{rows.map((r, i) => filaViaje(r, i))}</tbody>
                  <tfoot>
                    <tr style={{ background: BASE.goldSoft }}>
                      <td colSpan={4} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, color: BASE.navy, fontSize: '11px' }}>SUBTOTAL SEMANA ({vSem} viajes)</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.goldDark }}>{m3Sem.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ padding: '8px 12px', borderTop: `1px solid ${BASE.border}` }}>
                <button type="button" onClick={() => addViajeSemana(semNum)} style={{ ...addBtn, padding: '6px 12px', fontSize: '11.5px' }}>+ viaje a {semNum ? `Semana ${semNum}` : 'sin fecha'}</button>
              </div>
            </div>
          );
        })}

        {/* Total general + nueva semana */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '10px 14px', background: BASE.navy, borderRadius: '12px' }}>
          <button type="button" onClick={() => addViajeSemana(ultimaSem ? ultimaSem + 1 : null)}
            style={{ padding: '8px 14px', borderRadius: '9px', border: `1.5px dashed ${BASE.gold}`, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
            + Nueva semana
          </button>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 900 }}>
            TOTAL ELIMINADO: <span style={{ color: BASE.gold, fontFamily: 'monospace' }}>{eliminado.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</span>
            <span style={{ fontWeight: 600, opacity: 0.8, marginLeft: 8 }}>· {viajes} viajes</span>
          </span>
        </div>
      </div>
    );
  }

  // ─────────── FAMILIA DEMOLICIÓN (losa/elemento por área + espesor) ───────────
  if (fam === 'demolicion') {
    const areaTotal = total;                                              // Σ área (m²) = metrado de la partida
    const demolido = filas.reduce((s, r) => s + dim(r.nVeces) * num(r.area) * num(r.espesor), 0);
    const eliminado = demolido * (1 + factorEspon);                      // c/ esponjamiento
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Selector}

        {/* Factor de esponjamiento + resúmenes derivados */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: BASE.navy, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Factor esponjamiento
            <input value={Math.round(factorEspon * 100)} inputMode="decimal"
              onChange={e => setFactor((parseFloat(e.target.value) || 0) / 100)}
              style={{ width: 54, padding: '5px 7px', borderRadius: 7, border: `1.5px solid ${BASE.border}`, fontSize: 12, fontWeight: 800, textAlign: 'right', fontFamily: 'monospace' }} />
            <span style={{ color: BASE.muted }}>%</span>
          </label>
          <span style={chipDeriv}>Área demolida: <b style={{ color: BASE.goldDark }}>{areaTotal.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m²</b></span>
          <span style={chipDeriv}>Volumen demolido: <b style={{ color: BASE.navy }}>{demolido.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</b></span>
          <span style={chipDeriv}>Eliminado (c/ esponj.): <b style={{ color: BASE.green }}>{eliminado.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³</b></span>
        </div>

        <div style={{ border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: 560 }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={thS({ minWidth: 150 })}>Elemento / Losa</th>
                  <th style={thS({ width: 92, textAlign: 'right' })}>Área (m²)</th>
                  <th style={thS({ width: 88, textAlign: 'right' })}>Espesor (m)</th>
                  <th style={thS({ width: 52 })}>Nº</th>
                  <th style={thS({ width: 92, textAlign: 'right' })}>Demolido (m³)</th>
                  <th style={thS({ width: 34 })}></th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: BASE.muted, fontSize: '11.5px', fontStyle: 'italic' }}>
                    Sin elementos — agrega la primera losa ↓
                  </td></tr>
                )}
                {filas.map((r, i) => {
                  const vol = dim(r.nVeces) * num(r.area) * num(r.espesor);
                  return (
                    <tr key={r.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={tdS()}><input value={r.descripcion} onChange={e => setCampo(r.id, 'descripcion', e.target.value)} placeholder="Ej. Losa N. 0.00" style={inpCell({ textAlign: 'left' })} /></td>
                      <td style={tdS()}><input value={r.area} onChange={e => setCampo(r.id, 'area', e.target.value)} placeholder="0.00" inputMode="decimal" style={inpCell({ textAlign: 'right', fontWeight: 800, color: BASE.green })} /></td>
                      <td style={tdS()}><input value={r.espesor} onChange={e => setCampo(r.id, 'espesor', e.target.value)} placeholder="0.20" inputMode="decimal" style={inpCell({ textAlign: 'right' })} /></td>
                      <td style={tdS()}><input value={r.nVeces} onChange={e => setCampo(r.id, 'nVeces', e.target.value)} placeholder="1" inputMode="decimal" style={inpCell()} /></td>
                      <td style={tdS({ textAlign: 'right', color: BASE.muted, fontFamily: 'monospace', fontWeight: 700 })}>{vol.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                      <td style={tdS({ textAlign: 'center' })}>
                        <button type="button" onClick={() => delFila(r.id)} title="Quitar fila" style={{ border: 'none', background: BASE.redLight, color: BASE.red, borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: BASE.goldSoft }}>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: BASE.navy }}>TOTAL ÁREA DEMOLIDA</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.goldDark, fontSize: '14px' }}>{areaTotal.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                  <td colSpan={2} style={{ padding: '9px 6px', fontWeight: 800, color: BASE.muted, fontSize: '11px' }}>m²</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.navy }}>{demolido.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <button type="button" onClick={addFila} style={addBtn}>+ Agregar elemento</button>
      </div>
    );
  }

  // ─────────── FAMILIAS DIMENSIONALES (volumen / área / acero) ───────────
  const cols = fam === 'acero' ? null : (COLS[fam] || COLS.volumen);
  const nCols = fam === 'acero' ? 9 : (cols.length + 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Selector}
      <div style={{ border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: fam === 'acero' ? 640 : 480 }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={thS({ minWidth: 150 })}>Descripción / Elemento</th>
                {fam === 'acero' ? (
                  <>
                    <th style={thS({ width: 56 })}>Nº elem</th>
                    <th style={thS({ width: 78 })}>Ø</th>
                    <th style={thS({ width: 64 })}>Nº var.</th>
                    <th style={thS({ width: 82 })}>Long (m)</th>
                    <th style={thS({ width: 72 })}>Empalme (m)</th>
                    <th style={thS({ width: 60, textAlign: 'right' })}>kg/m</th>
                  </>
                ) : (
                  cols.map(([k, label, w]) => <th key={k} style={thS({ width: w })}>{label}</th>)
                )}
                <th style={thS({ width: 86, textAlign: 'right' })}>Parcial</th>
                <th style={thS({ width: 34 })}></th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr><td colSpan={nCols} style={{ padding: '14px', textAlign: 'center', color: BASE.muted, fontSize: '11.5px', fontStyle: 'italic' }}>
                  Sin filas — agrega el primer elemento ↓
                </td></tr>
              )}
              {filas.map((r, i) => {
                const parc = parcialFila(tipo, r);
                return (
                  <tr key={r.id} style={{ background: i % 2 ? BASE.bgSoft : BASE.white, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={tdS()}><input value={r.descripcion} onChange={e => setCampo(r.id, 'descripcion', e.target.value)} placeholder="Ej. Zapata Z-1" style={inpCell({ textAlign: 'left' })} /></td>
                    {fam === 'acero' ? (
                      <>
                        <td style={tdS()}><input value={r.nVeces} onChange={e => setCampo(r.id, 'nVeces', e.target.value)} placeholder="1" inputMode="decimal" style={inpCell()} /></td>
                        <td style={tdS()}>
                          <select value={r.diametro} onChange={e => setCampo(r.id, 'diametro', e.target.value)} style={inpCell({ padding: '6px 4px' })}>
                            {ACERO_PESOS.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                          </select>
                        </td>
                        <td style={tdS()}><input value={r.nVarillas} onChange={e => setCampo(r.id, 'nVarillas', e.target.value)} placeholder="1" inputMode="decimal" style={inpCell()} /></td>
                        <td style={tdS()}><input value={r.largo} onChange={e => setCampo(r.id, 'largo', e.target.value)} placeholder="0.00" inputMode="decimal" style={inpCell()} /></td>
                        <td style={tdS()}><input value={r.empalme} onChange={e => setCampo(r.id, 'empalme', e.target.value)} placeholder="0.00" inputMode="decimal" style={inpCell()} /></td>
                        <td style={tdS({ textAlign: 'right', color: BASE.muted, fontFamily: 'monospace' })}>{pesoDe(r.diametro).toFixed(3)}</td>
                      </>
                    ) : (
                      cols.map(([k, , , ph]) => (
                        <td key={k} style={tdS()}><input value={r[k] ?? ''} onChange={e => setCampo(r.id, k, e.target.value)} placeholder={ph} inputMode="decimal" style={inpCell()} /></td>
                      ))
                    )}
                    <td style={tdS({ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: parc > 0 ? BASE.green : BASE.muted })}>{parc.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                    <td style={tdS({ textAlign: 'center' })}>
                      <button type="button" onClick={() => delFila(r.id)} title="Quitar fila" style={{ border: 'none', background: BASE.redLight, color: BASE.red, borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: BASE.goldSoft }}>
                <td colSpan={fam === 'acero' ? 7 : (cols.length + 1)} style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: BASE.navy, fontSize: '12px' }}>
                  TOTAL METRADO
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: BASE.goldDark, fontSize: '14px' }}>
                  {total.toLocaleString('es-PE', { maximumFractionDigits: 3 })}
                </td>
                <td style={{ padding: '9px 6px', fontWeight: 800, color: BASE.muted, fontSize: '11px' }}>{un}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <button type="button" onClick={addFila} style={addBtn}>+ Agregar elemento</button>
    </div>
  );
}

const thS = (extra = {}) => ({ padding: '8px 8px', textAlign: 'left', fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.3px', whiteSpace: 'nowrap', ...extra });
const tdS = (extra = {}) => ({ padding: '4px 6px', verticalAlign: 'middle', ...extra });
const inpCell = (extra = {}) => ({ width: '100%', padding: '6px 7px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'monospace', ...extra });
const chipDeriv = { fontSize: '11px', color: BASE.muted, background: BASE.bgSoft, border: `1px solid ${BASE.border}`, borderRadius: '999px', padding: '5px 11px', fontWeight: 600 };
const addBtn = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '9px', border: `1.5px dashed ${BASE.gold}`, background: BASE.goldLight, color: BASE.navy, fontSize: '12px', fontWeight: 800, cursor: 'pointer' };
