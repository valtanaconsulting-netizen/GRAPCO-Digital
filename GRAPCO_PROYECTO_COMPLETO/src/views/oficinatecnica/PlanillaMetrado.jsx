// src/views/oficinatecnica/PlanillaMetrado.jsx
// Planilla de CÓMPUTO DE METRADOS por tipo, "tal cual" se hace en la carpeta de
// costos para el sustento de valorización. Reemplaza el "metrado a mano" por un
// desglose por elemento que calcula el total en vivo.
//
// Familias de cálculo:
//   • volumen (m³): parcial = nº × largo × ancho × alto   (concreto, excavación, relleno, genérico)
//   • area    (m²): parcial = nº × largo/perím × alto × caras (encofrado, tarrajeo/solaqueo)
//   • acero   (kg): parcial = nº elem × nº varillas × (long + empalme) × peso(Ø)
//
// onChange entrega { tipo, unidad, detalle, total } al padre, que lo persiste y
// usa el total como el metrado de la partida valorizada.
import React, { useMemo } from 'react';
import { BASE } from '../../utils/styles';

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

// tipo → { label, unidad, icon, familia }
export const TIPOS_METRADO = {
  concreto:   { label: 'Concreto',         unidad: 'm3', icon: '🧱', familia: 'volumen' },
  acero:      { label: 'Acero',            unidad: 'kg', icon: '🔩', familia: 'acero' },
  encofrado:  { label: 'Encofrado',        unidad: 'm2', icon: '🪵', familia: 'area' },
  excavacion: { label: 'Excavación',       unidad: 'm3', icon: '⛏️', familia: 'volumen' },
  relleno:    { label: 'Relleno',          unidad: 'm3', icon: '🚜', familia: 'volumen' },
  tarrajeo:   { label: 'Tarrajeo/Solaqueo', unidad: 'm2', icon: '🧽', familia: 'area' },
  generico:   { label: 'Genérico',         unidad: 'und', icon: '📐', familia: 'volumen' },
};
const familiaDe = (tipo) => TIPOS_METRADO[tipo]?.familia || 'volumen';

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
  return dim(r.nVeces) * dim(r.largo) * dim(r.ancho) * dim(r.alto); // volumen / genérico
}

const filaVacia = (tipo) => {
  const base = { id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, descripcion: '', nVeces: '' };
  const fam = familiaDe(tipo);
  if (fam === 'acero') return { ...base, diametro: '1/2"', nVarillas: '', largo: '', empalme: '' };
  if (fam === 'area')  return { ...base, largo: '', alto: '', caras: '1' };
  return { ...base, largo: '', ancho: '', alto: '' };
};

// Columnas por familia: [key, label, ancho, placeholder]
const COLS = {
  volumen: [['nVeces','Nº', 52,'1'], ['largo','Largo (m)', 78,'0.00'], ['ancho','Ancho (m)', 78,'0.00'], ['alto','Alto/Esp (m)', 84,'0.00']],
  area:    [['nVeces','Nº', 52,'1'], ['largo','Largo/Perím (m)', 96,'0.00'], ['alto','Alto (m)', 78,'0.00'], ['caras','Caras', 60,'1']],
};

export default function PlanillaMetrado({ tipo = 'concreto', unidad, detalle = [], onChange }) {
  const filas = detalle.length ? detalle : [];
  const fam = familiaDe(tipo);
  const total = useMemo(() => filas.reduce((s, r) => s + parcialFila(tipo, r), 0), [filas, tipo]);
  const un = unidad || TIPOS_METRADO[tipo]?.unidad || 'und';

  const emit = (nuevasFilas, nuevoTipo = tipo, nuevaUnidad = un) => {
    const t = nuevasFilas.reduce((s, r) => s + parcialFila(nuevoTipo, r), 0);
    onChange?.({ tipo: nuevoTipo, unidad: nuevaUnidad, detalle: nuevasFilas, total: Math.round(t * 1000) / 1000 });
  };

  const cambiarTipo = (nuevoTipo) => {
    emit([filaVacia(nuevoTipo)], nuevoTipo, TIPOS_METRADO[nuevoTipo]?.unidad || 'und');
  };
  const addFila = () => emit([...filas, filaVacia(tipo)]);
  const delFila = (id) => emit(filas.filter(r => r.id !== id));
  const setCampo = (id, k, v) => emit(filas.map(r => r.id === id ? { ...r, [k]: v } : r));

  const cols = fam === 'acero' ? null : (COLS[fam] || COLS.volumen);
  const nCols = fam === 'acero' ? 9 : (cols.length + 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Selector de tipo */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {Object.entries(TIPOS_METRADO).map(([k, t]) => (
          <button key={k} type="button" onClick={() => cambiarTipo(k)} style={{
            padding: '7px 11px', borderRadius: '9px', cursor: 'pointer',
            border: tipo === k ? `2px solid ${BASE.gold}` : `1.5px solid ${BASE.border}`,
            background: tipo === k ? BASE.navy : BASE.white,
            color: tipo === k ? '#fff' : BASE.navy,
            fontSize: '11px', fontWeight: 800,
          }}>{t.icon} {t.label} <span style={{ opacity: 0.7, fontWeight: 600 }}>({t.unidad})</span></button>
        ))}
        {tipo === 'generico' && (
          <input value={un} onChange={e => emit(filas, tipo, e.target.value)} placeholder="unidad"
            style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: 700, textAlign: 'center' }} />
        )}
      </div>

      {/* Tabla */}
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

      <button type="button" onClick={addFila} style={{
        alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '9px',
        border: `1.5px dashed ${BASE.gold}`, background: BASE.goldLight, color: BASE.navy,
        fontSize: '12px', fontWeight: 800, cursor: 'pointer',
      }}>+ Agregar elemento</button>
    </div>
  );
}

const thS = (extra = {}) => ({ padding: '8px 8px', textAlign: 'left', fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.3px', whiteSpace: 'nowrap', ...extra });
const tdS = (extra = {}) => ({ padding: '4px 6px', verticalAlign: 'middle', ...extra });
const inpCell = (extra = {}) => ({ width: '100%', padding: '6px 7px', border: `1px solid ${BASE.border}`, borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box', fontFamily: 'monospace', ...extra });
