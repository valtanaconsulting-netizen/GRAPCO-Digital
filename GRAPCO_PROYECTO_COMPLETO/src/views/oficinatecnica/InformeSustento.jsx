// src/views/oficinatecnica/InformeSustento.jsx
// Genera el Informe de Sustento (PDF imprimible) para una valorización:
// portada GRAPCO, resumen de partidas y galería de fotos por partida.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE, LOGO } from '../../utils/styles';
import EmptyState from '../../components/EmptyState';
import { parcialFila, TIPOS_METRADO, familiaDe, semanaDe, rangoSemana } from './PlanillaMetrado';

const fmtSoles = (n) => {
  const v = Number(n) || 0;
  return 'S/. ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function InformeSustento() {
  const [valorizaciones, setValorizaciones] = useState([]);
  const [sustento, setSustento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [valSel, setValSel] = useState('');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'ValorizacionesContractuales'), orderBy('numeroValorizacion', 'desc')),
        (snap) => { setValorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        () => setLoading(false)),
      onSnapshot(collection(db, 'SustentoMetrados'),
        (snap) => setSustento(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const valorizacion = useMemo(() => valorizaciones.find(v => v.id === valSel), [valorizaciones, valSel]);
  const valRef = valorizacion ? `PQ-${String(valorizacion.numeroValorizacion || '').padStart(2, '0')}` : '';

  const sustentoFiltrado = useMemo(() => {
    if (!valRef) return sustento;
    return sustento.filter(s => s.valorizacionRef === valRef);
  }, [sustento, valRef]);

  const sustentoPorPartida = useMemo(() => {
    const map = new Map();
    sustentoFiltrado.forEach(s => {
      const k = s.partida || 'Sin clasificar';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sustentoFiltrado]);

  const totalFotos = sustentoFiltrado.reduce((a, s) => a + (s.fotos?.length || 0), 0);

  const imprimir = () => window.print();

  if (loading) return <p style={{ padding: 30, color: BASE.muted }}>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="informe-sustento">
      {/* CSS print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .informe-sustento, .informe-sustento * { visibility: visible; }
          .informe-sustento { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .pagina-corte { page-break-after: always; }
        }
      `}</style>

      {/* Selector (no se imprime) */}
      <div className="no-print" style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            INFORME DE SUSTENTO
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
            Genera el documento de respaldo (PDF/print) para una valorización. Incluye portada GRAPCO,
            resumen y galería de fotos por partida.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={valSel} onChange={(e) => setValSel(e.target.value)} style={{
            padding: '8px 12px', border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', minWidth: '220px',
          }}>
            <option value="">— Todas las valorizaciones —</option>
            {valorizaciones.map(v => (
              <option key={v.id} value={v.id}>
                PQ-{String(v.numeroValorizacion || '').padStart(2, '0')} · {v.estado || 'borrador'}
              </option>
            ))}
          </select>
          <button onClick={imprimir} style={{
            background: BASE.navy, color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 4px 12px ${BASE.navy}55`,
          }}>🖨️ Imprimir / PDF</button>
        </div>
      </div>

      {/* PORTADA */}
      <div style={{
        background: '#fff', border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '40px 48px',
        textAlign: 'center', minHeight: '300px',
      }} className="pagina-corte">
        <img src={LOGO} alt="GRAPCO" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '12px' }} />
        <p style={{ fontSize: '12px', fontWeight: 900, color: BASE.gold, letterSpacing: '1.6px', marginTop: '8px' }}>
          GRAPCO S.A.C · GERENCIA DE OPERACIONES
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: BASE.navy, marginTop: '20px', letterSpacing: '0.6px' }}>
          INFORME DE SUSTENTO
        </h1>
        <p style={{ fontSize: '14px', color: BASE.muted, marginTop: '6px' }}>
          Respaldo gráfico de metrados valorizados
        </p>
        <div style={{ marginTop: '32px', borderTop: `1px solid ${BASE.border}`, paddingTop: '24px', display: 'inline-block', textAlign: 'left' }}>
          <Linea label="Valorización" value={valRef || 'Todas'} />
          <Linea label="Periodo" value={valorizacion?.periodo?.hasta?.toDate ? valorizacion.periodo.hasta.toDate().toLocaleDateString('es-PE') : '—'} />
          <Linea label="Estado" value={(valorizacion?.estado || 'borrador').toUpperCase()} />
          <Linea label="Partidas con sustento" value={sustentoPorPartida.length} />
          <Linea label="Fotos totales" value={totalFotos} />
        </div>
        <p style={{ marginTop: '40px', fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>
          Documento generado el {new Date().toLocaleString('es-PE')} desde la plataforma GRAPCO.
        </p>
      </div>

      {/* RESUMEN POR PARTIDA */}
      <div style={{
        background: '#fff', border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.4px', marginBottom: '14px', borderBottom: `2px solid ${BASE.gold}`, paddingBottom: '8px' }}>
          1. RESUMEN POR PARTIDA
        </h2>
        {!sustentoPorPartida.length ? (
          <EmptyState icono="📂" titulo="Sin sustento" descripcion="No hay registros de sustento para esta selección." altura="180px" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Partida</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}># Registros</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Metrado total</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Fotos</th>
              </tr>
            </thead>
            <tbody>
              {sustentoPorPartida.map(([part, regs], i) => {
                const metradoTotal = regs.reduce((a, r) => a + (Number(r.metrado) || 0), 0);
                const unidades = [...new Set(regs.map(r => r.unidad).filter(Boolean))].join(' / ');
                const fotos = regs.reduce((a, r) => a + (r.fotos?.length || 0), 0);
                return (
                  <tr key={part} style={{ background: i % 2 === 0 ? '#fff' : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: BASE.navy }}>{part}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{regs.length}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{metradoTotal.toLocaleString('es-PE')} {unidades}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fotos}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* GALERÍA POR PARTIDA */}
      {sustentoPorPartida.map(([part, regs]) => (
        <div key={part} style={{
          background: '#fff', border: `1px solid ${BASE.border}`,
          borderRadius: '12px', padding: '22px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.4px', marginBottom: '12px', borderBottom: `2px solid ${BASE.gold}`, paddingBottom: '8px' }}>
            {part}
          </h2>
          {regs.map((r, i) => (
            <div key={r.id} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px', marginBottom: '8px' }}>
                <Bloque label="Periodo" value={r.periodoMes || '—'} />
                <Bloque label="Valorización" value={r.valorizacionRef || '—'} />
                <Bloque label="Metrado" value={`${Number(r.metrado).toLocaleString('es-PE')} ${r.unidad || ''}`} />
                <Bloque label="Ubicación" value={r.ubicacion || '—'} />
              </div>
              <p style={{ fontSize: '11.5px', color: BASE.muted, lineHeight: 1.5, marginBottom: '10px', background: BASE.bgSoft, padding: '8px 10px', borderRadius: '6px' }}>
                {r.descripcion || 'Sin descripción.'}
              </p>

              {/* Planilla de metrados (desglose por elemento). Para volquetes va
                  ORDENADO POR SEMANA con subtotales, como en el sustento original. */}
              {Array.isArray(r.detalleMetrado) && r.detalleMetrado.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.navy, letterSpacing: '0.4px', marginBottom: '4px' }}>
                    PLANILLA DE METRADOS · {TIPOS_METRADO[r.tipoMetrado || 'concreto']?.label?.toUpperCase()} ({r.unidad})
                  </p>

                  {familiaDe(r.tipoMetrado) === 'volquetes' ? (
                    (() => {
                      // Agrupa los viajes por semana del proyecto.
                      const grupos = new Map();
                      r.detalleMetrado.forEach(row => { const s = semanaDe(row.fecha); const k = s == null ? 'sin' : s; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(row); });
                      const ordenados = [...grupos.entries()].sort((a, b) => a[0] === 'sin' ? 1 : b[0] === 'sin' ? -1 : a[0] - b[0]);
                      return ordenados.map(([k, rows]) => {
                        const semNum = k === 'sin' ? null : k;
                        const rango = semNum ? rangoSemana(semNum) : null;
                        const vSem = rows.filter(x => (parseFloat(x.volumen) || 0) > 0).length;
                        const m3Sem = rows.reduce((s, x) => s + (parseFloat(x.volumen) || 0), 0);
                        return (
                          <div key={k} style={{ marginBottom: '8px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: BASE.gold, letterSpacing: '0.3px', margin: '6px 0 3px' }}>
                              {semNum ? `SEMANA ${semNum}` : 'SIN FECHA'}{rango ? ` · ${rango.label}` : ''} — {vSem} viajes · {m3Sem.toLocaleString('es-PE', { maximumFractionDigits: 2 })} m³
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: `1px solid ${BASE.border}` }}>
                              <thead><tr style={{ background: BASE.bgSoft }}>
                                <th style={cellTh('left')}>N° guía</th><th style={cellTh('left')}>Fecha</th>
                                <th style={cellTh('left')}>Placa</th><th style={cellTh('left')}>Clase</th>
                                <th style={cellTh('right', 70)}>Vol. (m³)</th>
                              </tr></thead>
                              <tbody>
                                {rows.map((row, k2) => (
                                  <tr key={row.id || k2} style={{ borderTop: `1px solid ${BASE.border}` }}>
                                    <td style={cellTd()}>{row.nGuia || '—'}</td>
                                    <td style={cellTd()}>{row.fecha || '—'}</td>
                                    <td style={cellTd()}>{row.placa || '—'}</td>
                                    <td style={cellTd()}>{row.clase || '—'}</td>
                                    <td style={cellTd('right')}>{(parseFloat(row.volumen) || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', border: `1px solid ${BASE.border}` }}>
                      <thead><tr style={{ background: BASE.bgSoft }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 900, color: BASE.muted }}>Elemento</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 900, color: BASE.muted, width: 90 }}>Parcial</th>
                      </tr></thead>
                      <tbody>
                        {r.detalleMetrado.map((row, k) => (
                          <tr key={row.id || k} style={{ borderTop: `1px solid ${BASE.border}` }}>
                            <td style={{ padding: '4px 8px', color: BASE.navy }}>{row.descripcion || `Ítem ${k + 1}`}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                              {parcialFila(r.tipoMetrado || 'concreto', row).toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.goldDark, textAlign: 'right', marginTop: '4px' }}>
                    TOTAL: {Number(r.metrado).toLocaleString('es-PE', { maximumFractionDigits: 3 })} {r.unidad}
                  </p>
                </div>
              )}

              {r.fotos?.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                  gap: '6px',
                }}>
                  {r.fotos.map((f, j) => (
                    <div key={j} style={{
                      aspectRatio: '4/3',
                      borderRadius: '6px', overflow: 'hidden',
                      border: `1px solid ${BASE.border}`,
                      position: 'relative',
                    }}>
                      <img src={f.url} alt={`Foto ${j+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {f.subidaEn && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                          color: '#fff', padding: '12px 6px 4px',
                          fontSize: '9px', fontWeight: 700,
                        }}>{new Date(f.subidaEn).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {i < regs.length - 1 && <div style={{ borderTop: `1px dashed ${BASE.border}`, margin: '14px 0' }} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Linea({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '6px 0', minWidth: '300px' }}>
      <span style={{ fontSize: '11px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.3px', minWidth: '160px' }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: BASE.navy }}>{value}</span>
    </div>
  );
}

const cellTh = (align = 'left', w) => ({ padding: '4px 7px', textAlign: align, fontWeight: 900, color: BASE.muted, fontSize: '9px', ...(w ? { width: w } : {}) });
const cellTd = (align = 'left') => ({ padding: '3px 7px', textAlign: align, color: BASE.navy, fontFamily: align === 'right' ? 'monospace' : 'inherit', fontWeight: align === 'right' ? 700 : 500 });

function Bloque({ label, value }) {
  return (
    <div style={{ background: BASE.bgSoft, padding: '8px 10px', borderRadius: '6px' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '12px', fontWeight: 700, color: BASE.navy, marginTop: '2px' }}>{value}</p>
    </div>
  );
}
