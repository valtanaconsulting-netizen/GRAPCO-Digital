// src/views/ControlGerencial.jsx — REDISEÑADO (Bloque 19)
// Replica las 3 vistas maestras del Excel original GRAPCO con UX pulido:
// 1. Reporte de Tareos (costos jerarquicos por partida)
// 2. Control HH Variaciones (planilla vs campo + heatmap partida x semana)
// 3. Control de IP (matriz actividad x semana)
//
// Mejoras visuales sobre la version anterior:
//   - Sub-pestañas con indicador activo claro (sombra + barra inferior)
//   - Tablas con mas aire (padding generoso, evita choque de numeros)
//   - Heatmap con colores 30% mas suaves (evita fatiga visual)
//   - Chip "APU" pequeño y elegante (antes ocupaba toda la celda)
//   - Filas Control IP mas compactas pero legibles
//   - Bordes redondeados consistentes en toda la jerarquia

import React, { useState, useMemo } from 'react';
import { BASE } from '../utils/styles';
import {
  calcularReporteTareos, calcularControlHHVariaciones, calcularMatrizIP,
  fmtMoney, fmt1, fmtCPIPct, COSTO_HORA_DEFAULT, COSTO_HORA_PROMEDIO, codigoCortoPartida,
} from '../utils/helpers';
import CostoRealOficial from './modulos/resultadoOperativo/CostoRealOficial';

export default function ControlGerencial({ historialEnriquecido, personalDB, configuracion, isMobile, asistencia }) {
  const [tab, setTab] = useState('tareos');
  const [partidaExpandida, setPartidaExpandida] = useState(null);

  // Tarifa MO única de la plataforma (S/25.50/h) — fijada por el usuario para todo el costeo.
  const tarifaPromedio = COSTO_HORA_PROMEDIO;

  const numTrabajadores = useMemo(() => (personalDB || []).length, [personalDB]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* HEADER compacto */}
      <div style={{
        background: BASE.white,
        borderRadius: '10px',
        border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${BASE.gold}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: BASE.navy, letterSpacing: '0.2px' }}>
          Control Gerencial · Reportes Maestros
        </span>
        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '600' }}>
          Tarifa MO promedio <strong style={{ color: BASE.navy, fontFamily: 'var(--grapco-font-mono, monospace)' }}>{fmtMoney(tarifaPromedio)}/h</strong>
          {' · '}{numTrabajadores} trabajadores en planilla
        </span>
      </div>

      {/* SUB-PESTAÑAS — REDISEÑADAS con indicador activo claro */}
      <div style={{
        background: BASE.white,
        border: `1px solid ${BASE.border}`,
        borderRadius: '12px',
        padding: '5px',
        display: 'flex', gap: '5px', flexWrap: 'wrap',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        {[
          { id: 'tareos',       l: 'Reporte de Tareos',     desc: 'Costos jerarquicos por partida', emoji: '💵' },
          { id: 'crOficial',    l: 'CR Oficial (Excel)',    desc: 'Costo Real del ISP · S/25.50/h',  emoji: '🧾' },
          { id: 'variaciones',  l: 'Control HH Variaciones', desc: 'Real vs meta + heatmap',         emoji: '📊' },
          { id: 'ip',           l: 'Control de IP',          desc: 'IP por actividad y semana',      emoji: '🎯' },
        ].map(t => {
          const activo = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', flex: '1 1 auto', minWidth: '160px',
              background: activo
                ? `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`
                : 'transparent',
              color: activo ? '#fff' : BASE.muted,
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px', fontWeight: '800', cursor: 'pointer',
              letterSpacing: '0.3px',
              boxShadow: activo
                ? `0 6px 16px ${BASE.gold}66, inset 0 -3px 0 rgba(0,0,0,0.15)`
                : 'none',
              transform: activo ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'all 0.18s ease',
              textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: '3px',
              position: 'relative',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{t.emoji}</span>
                {t.l}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: '600',
                opacity: activo ? 0.92 : 0.7,
              }}>{t.desc}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO */}
      {tab === 'tareos' && (
        <ReporteTareos
          historial={historialEnriquecido}
          tarifaPromedio={tarifaPromedio}
          partidaExpandida={partidaExpandida}
          setPartidaExpandida={setPartidaExpandida}
          isMobile={isMobile}
        />
      )}
      {tab === 'crOficial' && <CostoRealOficial />}
      {tab === 'variaciones' && (
        <ControlVariaciones
          historial={historialEnriquecido}
          numTrabajadores={numTrabajadores}
          asistencia={asistencia}
          isMobile={isMobile}
        />
      )}
      {tab === 'ip' && (
        <MatrizIP historial={historialEnriquecido} isMobile={isMobile} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REPORTE 1 · REPORTE DE TAREOS (rediseñado)
// ════════════════════════════════════════════════════════════════

function ReporteTareos({ historial, tarifaPromedio, partidaExpandida, setPartidaExpandida, isMobile }) {
  const reporte = useMemo(
    () => calcularReporteTareos(historial, tarifaPromedio),
    [historial, tarifaPromedio]
  );

  // Estado UI de esta vista
  const [orden,    setOrden]    = useState('costo-desc');  // costo-desc | hh-desc | codigo
  const [buscar,   setBuscar]   = useState('');

  // Aplica búsqueda + orden sobre la lista de partidas. El ranking por costo se
  // calcula SIEMPRE sobre todas (no sobre las filtradas) para que el #1, #2, #3
  // del ranking sea consistente aunque el usuario filtre.
  const rankingPorCosto = useMemo(() => {
    const idx = {};
    [...(reporte.partidas || [])]
      .sort((a, b) => b.costo - a.costo)
      .forEach((p, i) => { idx[p.nombre] = i + 1; });
    return idx;
  }, [reporte.partidas]);

  const partidasMostradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    let lista = (reporte.partidas || []).filter(p =>
      !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)
    );
    if (orden === 'costo-desc') lista = lista.sort((a, b) => b.costo - a.costo);
    else if (orden === 'hh-desc') lista = lista.sort((a, b) => b.hh - a.hh);
    else /* codigo */ lista = lista.sort((a, b) => a.indice - b.indice);
    return lista;
  }, [reporte.partidas, orden, buscar]);

  // Exportar a Excel — partida + subpartidas con HH, costo, %.
  const exportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const aoa = [
        ['REPORTE DE TAREOS · COSTOS POR PARTIDA'],
        [`Tarifa MO promedio: ${fmtMoney(tarifaPromedio)}/h · Total: ${fmtMoney(reporte.totalCosto)}`],
        [],
        ['#', 'Frente', 'Partida', 'Descripción', 'HH', 'Costo S/.', '% del total'],
      ];
      (reporte.partidas || []).forEach((p, i) => {
        const pct = reporte.totalCosto > 0 ? (p.costo / reporte.totalCosto) * 100 : 0;
        aoa.push([rankingPorCosto[p.nombre], p.codigo, String(p.indice).padStart(2, '0'), p.nombre, p.hh.toFixed(1), p.costo.toFixed(2), pct.toFixed(1) + '%']);
        (p.subpartidas || []).forEach((sp, j) => {
          const spPct = p.costo > 0 ? (sp.costo / p.costo) * 100 : 0;
          aoa.push(['', p.codigo, String(p.indice).padStart(2, '0') + '.' + String(j + 1).padStart(2, '0'), '  → ' + sp.nombre, sp.hh.toFixed(1), sp.costo.toFixed(2), spPct.toFixed(1) + '% (de partida)']);
        });
      });
      aoa.push([]);
      aoa.push(['', '', '', 'TOTAL', reporte.totalHH.toFixed(1), reporte.totalCosto.toFixed(2), '100%']);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 5 }, { wch: 7 }, { wch: 9 }, { wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tareos');
      XLSX.writeFile(wb, `Reporte_Tareos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error('[export tareos]', e); }
  };

  if (reporte.partidas.length === 0) {
    return <SinDatos icon="💵" titulo="Sin datos para el reporte de tareos" />;
  }

  return (
    <div style={{
      background: BASE.white,
      borderRadius: '16px',
      border: `1px solid ${BASE.border}`,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
    }}>
      {/* Cabecera total proyecto — compacta */}
      <div style={{
        background: `linear-gradient(90deg, ${BASE.gold}, ${BASE.goldDark})`,
        padding: '8px 16px', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '14px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: '800', opacity: 0.85, letterSpacing: '0.6px' }}>TOTAL COSTO DE OBRA</span>
          <span style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '-0.2px', fontFamily: 'var(--grapco-font-mono, monospace)' }}>{fmtMoney(reporte.totalCosto)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '9.5px', opacity: 0.85, fontWeight: '700' }}>HH TOTAL</span>
          <span style={{ fontSize: '14px', fontWeight: '900', fontFamily: 'var(--grapco-font-mono, monospace)' }}>{fmt1(reporte.totalHH)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '9.5px', opacity: 0.85, fontWeight: '700' }}>COSTO MO PROMEDIO</span>
          <span style={{ fontSize: '13px', fontWeight: '900', fontFamily: 'var(--grapco-font-mono, monospace)' }}>{fmtMoney(tarifaPromedio)}/h</span>
        </div>
      </div>

      {/* Toolbar: buscar + ordenar + exportar */}
      <div style={{
        background: BASE.bgSoft,
        borderBottom: `1px solid ${BASE.border}`,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <input
          type="text" value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="🔍 Buscar partida…"
          style={{
            flex: '1 1 200px', minWidth: '180px',
            padding: '8px 12px', borderRadius: '8px',
            border: `1.5px solid ${buscar ? '#93c5fd' : BASE.border}`,
            background: buscar ? '#eff6ff' : '#fff',
            fontSize: '12px', fontWeight: '600', outline: 'none',
          }}
        />
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{
          padding: '8px 12px', borderRadius: '8px',
          border: `1.5px solid ${BASE.border}`, background: '#fff',
          fontSize: '12px', fontWeight: '700', color: BASE.navy, cursor: 'pointer', outline: 'none',
        }}>
          <option value="costo-desc">Orden: Costo (mayor → menor)</option>
          <option value="hh-desc">Orden: HH (mayor → menor)</option>
          <option value="codigo">Orden: Código (catálogo)</option>
        </select>
        <button onClick={exportarExcel} style={{
          padding: '8px 14px', borderRadius: '8px',
          background: BASE.navy, color: '#fff', border: 'none',
          fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          letterSpacing: '0.3px',
        }}>📥 Exportar Excel</button>
        {buscar && (
          <span style={{
            fontSize: '11px', fontWeight: '700', color: '#1e40af',
            background: '#dbeafe', padding: '4px 10px', borderRadius: '999px',
            border: '1px solid #93c5fd',
          }}>{partidasMostradas.length} de {reporte.partidas.length}</span>
        )}
      </div>

      {/* Tabla jerarquica con padding generoso */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '820px' }}>
          <thead>
            <tr>
              <th style={thStyle({ width: '60px', textAlign: 'center' })}>FRENTE</th>
              <th style={thStyle({ width: '80px', textAlign: 'center' })}>PARTIDA</th>
              <th style={thStyle({ width: '34%', textAlign: 'left', paddingLeft: '20px' })}>DESCRIPCION</th>
              <th style={thStyle({ width: '110px', textAlign: 'right', paddingRight: '20px' })}>HH</th>
              <th style={thStyle({ width: '150px', textAlign: 'right', background: BASE.gold, color: '#fff', paddingRight: '22px' })}>COSTO</th>
              <th style={thStyle({ textAlign: 'left', paddingLeft: '16px', paddingRight: '20px' })}>% DEL TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {partidasMostradas.map((p, i) => {
              const expandida = partidaExpandida === p.nombre;
              const pctTotal = reporte.totalCosto > 0 ? (p.costo / reporte.totalCosto) * 100 : 0;
              const rank = rankingPorCosto[p.nombre];
              const esTop3 = rank <= 3;
              return (
                <React.Fragment key={p.nombre}>
                  <tr
                    onClick={() => setPartidaExpandida(expandida ? null : p.nombre)}
                    style={{
                      background: BASE.navy + 'dd',
                      cursor: 'pointer', borderTop: `2px solid ${BASE.gold}`,
                      transition: 'background 0.15s',
                    }}>
                    <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: '10.5px', fontWeight: '800', color: BASE.gold })}>
                      {p.codigo}
                    </td>
                    <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: '800', color: '#fff' })}>
                      {String(p.indice).padStart(2, '0')}
                    </td>
                    <td style={tdStyle({ fontWeight: '800', paddingLeft: '20px', color: '#fff' })}>
                      <span style={{
                        marginRight: '8px', display: 'inline-block', width: '14px',
                        transition: 'transform 0.2s',
                        transform: expandida ? 'rotate(0deg)' : 'rotate(-90deg)',
                      }}>▼</span>
                      {esTop3 && (
                        <span title={`#${rank} partida más cara`} style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px',
                          background: rank === 1 ? BASE.gold : rank === 2 ? '#cbd5e1' : '#d97706',
                          color: rank === 1 ? BASE.navy : '#0f172a',
                          borderRadius: '50%', fontSize: '10px', fontWeight: '900',
                          marginRight: '8px', verticalAlign: 'middle',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}>{rank}</span>
                      )}
                      {p.nombre}
                    </td>
                    <td style={tdStyle({ textAlign: 'right', fontWeight: '800', paddingRight: '20px', color: '#fff' })}>{fmt1(p.hh)}</td>
                    <td style={tdStyle({ textAlign: 'right', fontWeight: '900', color: BASE.gold, paddingRight: '22px', fontSize: '13px' })}>
                      {fmtMoney(p.costo)}
                    </td>
                    <td style={tdStyle({ paddingLeft: '12px', paddingRight: '12px' })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          flex: 1, height: '14px', borderRadius: '7px',
                          background: 'rgba(255,255,255,0.10)',
                          overflow: 'hidden', position: 'relative',
                        }}>
                          <div style={{
                            width: `${Math.min(100, pctTotal)}%`, height: '100%',
                            background: `linear-gradient(90deg, ${BASE.gold}, #fcd34d)`,
                            borderRadius: '7px', transition: 'width 0.3s',
                          }}/>
                        </div>
                        <span style={{
                          color: '#fff', fontWeight: '900', fontSize: '11.5px',
                          fontFamily: 'var(--grapco-font-mono, monospace)',
                          minWidth: '42px', textAlign: 'right',
                        }}>{pctTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>

                  {/* Subpartidas (con indentacion clara + % dentro de la partida) */}
                  {expandida && p.subpartidas.map((sp, j) => {
                    const spPctDePartida = p.costo > 0 ? (sp.costo / p.costo) * 100 : 0;
                    return (
                      <tr key={p.nombre + sp.nombre} style={{ background: j % 2 === 0 ? BASE.bgSoft : BASE.white }}>
                        <td style={tdStyle({ textAlign: 'center', color: BASE.muted, fontSize: '10px' })}>{p.codigo}</td>
                        <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: BASE.muted })}>
                          {String(p.indice).padStart(2, '0')}.{String(j + 1).padStart(2, '0')}
                        </td>
                        <td style={tdStyle({ paddingLeft: '40px', color: BASE.text })}>
                          <span style={{ color: BASE.gold, marginRight: '8px', fontWeight: '900' }}>›</span>
                          {sp.nombre}
                        </td>
                        <td style={tdStyle({ textAlign: 'right', paddingRight: '20px' })}>{fmt1(sp.hh)}</td>
                        <td style={tdStyle({ textAlign: 'right', color: BASE.green, fontWeight: '700', paddingRight: '22px' })}>
                          {fmtMoney(sp.costo)}
                        </td>
                        <td style={tdStyle({ paddingLeft: '12px', paddingRight: '12px' })}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              flex: 1, height: '6px', borderRadius: '3px',
                              background: BASE.bgSoft, overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.min(100, spPctDePartida)}%`, height: '100%',
                                background: BASE.green, opacity: 0.55,
                                borderRadius: '3px',
                              }}/>
                            </div>
                            <span title="% del costo de la partida" style={{
                              color: BASE.muted, fontWeight: '700', fontSize: '10.5px',
                              fontFamily: 'var(--grapco-font-mono, monospace)',
                              minWidth: '42px', textAlign: 'right',
                            }}>{spPctDePartida.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {partidasMostradas.length === 0 && (
              <tr>
                <td colSpan={6} style={tdStyle({ textAlign: 'center', padding: '30px', color: BASE.muted, fontStyle: 'italic' })}>
                  Sin coincidencias para "{buscar}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REPORTE 2 · CONTROL HH VARIACIONES + HEATMAP (rediseñado)
// ════════════════════════════════════════════════════════════════

function ControlVariaciones({ historial, numTrabajadores, isMobile, asistencia }) {
  const data = useMemo(
    () => calcularControlHHVariaciones(historial, numTrabajadores, 8.5, asistencia?.porSemana || null),
    [historial, numTrabajadores, asistencia]
  );

  if (data.semanas.length === 0) {
    return <SinDatos icon="📊" titulo="Sin datos de variaciones HH" />;
  }

  // Color para celdas del heatmap — REBAJADO 30% (antes 0.08+0.32, ahora 0.06+0.22)
  // Esto reduce la fatiga visual al ver muchos rojos seguidos
  const colorCelda = (delta) => {
    if (delta === 0 || delta == null) return { bg: BASE.bgSoft, color: BASE.muted };
    if (delta > 0) {
      const intensidad = Math.min(1, Math.abs(delta) / 150);
      return {
        bg: `rgba(220, 38, 38, ${0.06 + intensidad * 0.22})`,
        color: intensidad > 0.7 ? '#fff' : '#991b1b',
      };
    } else {
      const intensidad = Math.min(1, Math.abs(delta) / 150);
      return {
        bg: `rgba(37, 99, 235, ${0.06 + intensidad * 0.22})`,
        color: intensidad > 0.7 ? '#fff' : '#1e3a8a',
      };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* KPIs cards compactos (caben más por fila) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
        {[
          { l: 'HH CAMPO TOTAL', v: fmt1(data.totales.hhCampo), c: BASE.navy, sub: 'Acumulado proyecto' },
          { l: 'HH META TOTAL', v: fmt1(data.totales.hhMeta), c: BASE.green, sub: 'Esperado ideal' },
          { l: 'DELTA HH', v: `${data.totales.deltaTotal >= 0 ? '+' : ''}${data.totales.deltaTotal}`, c: data.totales.deltaTotal >= 0 ? BASE.red : '#2563eb', sub: data.totales.deltaTotal >= 0 ? 'Sobrecosto' : 'Ahorro' },
          { l: 'CPI GLOBAL', v: fmtCPIPct(data.totales.cpiGlobal), c: data.totales.cpiGlobal >= 1 ? BASE.green : data.totales.cpiGlobal >= 0.85 ? BASE.gold : BASE.red, sub: 'Eficiencia HH' },
        ].map(k => (
          <div key={k.l} style={{
            background: BASE.white, borderRadius: '9px',
            border: `1px solid ${BASE.border}`, padding: '6px 10px',
            boxShadow: '0 1px 4px rgba(15,23,42,0.03)',
          }}>
            <p style={{ fontSize: '8.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px' }}>{k.l}</p>
            <p style={{ fontSize: '15px', fontWeight: '900', color: k.c, marginTop: '1px', letterSpacing: '-0.3px', lineHeight: 1.15 }}>{k.v}</p>
            <p style={{ fontSize: '9px', color: BASE.muted }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla principal con heatmap — encabezado fijo (título + 2 filas) al hacer scroll.
          overflow:visible para que el sticky se ancle al contenedor de scroll de Ingeniero. */}
      <div style={{
        background: BASE.white, borderRadius: '12px',
        border: `1px solid ${BASE.border}`, overflow: 'visible',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      }}>
        <div style={{
          background: BASE.navy,
          padding: '0 14px', height: '30px', boxSizing: 'border-box', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderRadius: '12px 12px 0 0',
          borderBottom: `2px solid ${BASE.gold}`,
          position: 'sticky', top: 0, zIndex: 13,
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px' }}>
            Control HH Variaciones · Semana × Partida
          </span>
        </div>

        <div style={{ overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', minWidth: '900px' }}>
            <thead>
              <tr>
                <th rowSpan="2" style={thStyle({ width: '60px', padding: '4px 8px', fontSize: '10px', position: 'sticky', left: 0, top: 30, zIndex: 14, background: '#e2e8f0', color: BASE.navy, height: '50px', boxSizing: 'border-box' })}>SEM</th>
                <th colSpan="2" style={thStyle({ background: '#fcd34d', color: '#713f12', textAlign: 'center', borderBottom: `2px solid #b45309`, padding: '4px 8px', fontSize: '10px', position: 'sticky', top: 30, zIndex: 12, height: '26px', boxSizing: 'border-box' })}>ADMIN</th>
                <th colSpan="2" style={thStyle({ background: '#93c5fd', color: '#1e3a8a', textAlign: 'center', borderBottom: '2px solid #1d4ed8', padding: '4px 8px', fontSize: '10px', position: 'sticky', top: 30, zIndex: 12, height: '26px', boxSizing: 'border-box' })}>CAMPO</th>
                <th colSpan="3" style={thStyle({ background: '#86efac', color: '#14532d', textAlign: 'center', borderBottom: `2px solid #15803d`, padding: '4px 8px', fontSize: '10px', position: 'sticky', top: 30, zIndex: 12, height: '26px', boxSizing: 'border-box' })}>ACTUAL</th>
                <th colSpan={data.codigosPartida.length} style={thStyle({
                  background: BASE.navy, color: BASE.gold, textAlign: 'center', borderBottom: `2px solid ${BASE.gold}`, padding: '4px 8px', fontSize: '10px', position: 'sticky', top: 30, zIndex: 12, height: '26px', boxSizing: 'border-box',
                })}>
                  HEATMAP DELTA HH POR PARTIDA
                </th>
              </tr>
              <tr>
                <th style={thMiniStk}>HH PLA.</th>
                <th style={thMiniStk}>HH PLA. ACUM</th>
                <th style={thMiniStk}>HH CAM.</th>
                <th style={thMiniStk}>HH CAM. ACUM</th>
                <th style={thMiniStk}>HH META ACUM</th>
                <th style={{ ...thMiniStk, color: BASE.red }}>VAR HH</th>
                <th style={{ ...thMiniStk, color: BASE.gold, fontWeight: '900' }}>CPI</th>
                {data.codigosPartida.map(cod => (
                  <th key={cod} style={{ ...thMiniStk, background: BASE.navy, color: '#fff', fontWeight: '900' }}>{cod}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.semanas.map((s, idx) => {
                const hhPlaAcum = data.semanas.slice(0, idx + 1).reduce((sum, x) => sum + x.hhPlanilla, 0);
                const variacion = Math.round(s.hhCampoAcum - s.hhMetaAcum);
                return (
                  <tr key={s.semana} style={{ background: idx % 2 === 0 ? BASE.white : BASE.bgSoft }}>
                    <td style={{
                      ...tdStyle({
                        fontWeight: '800', color: BASE.navy,
                        position: 'sticky', left: 0,
                        background: idx % 2 === 0 ? BASE.white : BASE.bgSoft,
                        zIndex: 1, borderRight: `1px solid ${BASE.border}`,
                      }),
                    }}>
                      S{s.semana}
                    </td>
                    {/* ADMIN — HH Planilla y Acum se ocultan: el dato 552.5 no está validado. */}
                    <td style={tdStyle({ textAlign: 'right', fontWeight: '700', paddingRight: '18px', color: BASE.muted })}>—</td>
                    <td style={tdStyle({ textAlign: 'right', color: BASE.muted, paddingRight: '18px' })}>—</td>
                    <td style={tdStyle({ textAlign: 'right', fontWeight: '700', paddingRight: '18px' })}>{fmt1(s.hhCampo)}</td>
                    <td style={tdStyle({ textAlign: 'right', color: '#1e40af', fontWeight: '700', paddingRight: '18px' })}>{fmt1(s.hhCampoAcum)}</td>
                    <td style={tdStyle({ textAlign: 'right', color: BASE.greenDark, fontWeight: '700', paddingRight: '18px' })}>{fmt1(s.hhMetaAcum)}</td>
                    <td style={tdStyle({
                      textAlign: 'right', fontWeight: '900', paddingRight: '18px',
                      color: variacion >= 0 ? BASE.red : '#2563eb',
                      background: variacion >= 0 ? '#fee2e220' : '#dbeafe40',
                    })}>
                      {variacion >= 0 ? '+' : ''}{variacion}
                    </td>
                    <td style={tdStyle({
                      textAlign: 'center', fontWeight: '900',
                      color: s.cpi >= 1 ? BASE.greenDark : s.cpi >= 0.85 ? BASE.gold : BASE.red,
                      background: s.cpi >= 1 ? '#dcfce780' : s.cpi >= 0.85 ? '#fef3c780' : '#fee2e280',
                    })}>
                      {fmtCPIPct(s.cpi)}
                    </td>
                    {data.codigosPartida.map(cod => {
                      const delta = s.partidas[cod]?.delta ?? 0;
                      const style = colorCelda(delta);
                      return (
                        <td key={cod} style={{
                          padding: '4px 4px', textAlign: 'center', fontSize: '9.5px', fontWeight: '800',
                          background: style.bg, color: style.color,
                          borderRight: `1px solid ${BASE.border}33`,
                        }}>
                          {delta === 0 ? '0' : (delta > 0 ? '+' : '') + delta}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Fila TOTAL */}
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <td style={tdStyle({ fontWeight: '900', position: 'sticky', left: 0, background: BASE.navy, color: BASE.gold, borderRight: `1px solid ${BASE.gold}` })}>
                  TOTAL
                </td>
                <td colSpan="6" style={tdStyle({ textAlign: 'right', color: '#fff', opacity: 0.85, fontStyle: 'italic', fontSize: '10.5px', paddingRight: '20px' })}>
                  Acumulado proyecto · {data.semanas.length} semanas registradas
                </td>
                <td style={tdStyle({ textAlign: 'center', fontWeight: '900', color: BASE.gold })}>
                  {fmtCPIPct(data.totales.cpiGlobal)}
                </td>
                {data.codigosPartida.map(cod => {
                  const delta = data.partidasAcum[cod]?.delta ?? 0;
                  // Aun en el TOTAL, suavizamos un poco para no saturar
                  return (
                    <td key={cod} style={{
                      padding: '4px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '900',
                      background: delta >= 0 ? 'rgba(220, 38, 38, 0.78)' : 'rgba(37, 99, 235, 0.78)',
                      color: '#fff',
                    }}>
                      {delta === 0 ? '0' : (delta > 0 ? '+' : '') + delta}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Leyenda más explicativa */}
        <div style={{
          padding: '12px 22px', background: BASE.bgSoft,
          borderTop: `1px solid ${BASE.border}`,
          display: 'flex', gap: '24px', flexWrap: 'wrap',
          fontSize: '11.5px', color: BASE.muted,
          alignItems: 'center',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'rgba(220, 38, 38, 0.28)', borderRadius: '3px' }} />
            <strong style={{ color: BASE.red }}>Rojo:</strong> sobrecosto (real &gt; meta)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'rgba(37, 99, 235, 0.28)', borderRadius: '3px' }} />
            <strong style={{ color: '#2563eb' }}>Azul:</strong> ahorro (real &lt; meta)
          </span>
          <span style={{ opacity: 0.7 }}>· La intensidad refleja la magnitud del delta</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REPORTE 3 · MATRIZ DE IP POR SEMANA (rediseñado con CHIP APU compacto)
// ════════════════════════════════════════════════════════════════

function MatrizIP({ historial, isMobile }) {
  const data = useMemo(() => calcularMatrizIP(historial), [historial]);
  const [filtroSoloAlerta, setFiltroSoloAlerta] = useState(false);

  if (data.filas.length === 0) {
    return <SinDatos icon="🎯" titulo="Sin datos de IP por actividad" />;
  }

  const filasFiltradas = filtroSoloAlerta
    ? data.filas.filter(f => f.necesitaActualizar)
    : data.filas;

  const semanasMostrar = data.semanas.slice(-6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Filtros - card más amigable */}
      <div style={{
        background: BASE.white, borderRadius: '14px',
        border: `1px solid ${BASE.border}`, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <span style={{ fontSize: '12.5px', fontWeight: '700', color: BASE.navy }}>
          {data.filas.length} actividades · {data.semanas.length} semanas
        </span>
        <button onClick={() => setFiltroSoloAlerta(!filtroSoloAlerta)} style={{
          padding: '8px 16px',
          background: filtroSoloAlerta ? BASE.red : '#fff',
          color: filtroSoloAlerta ? '#fff' : BASE.red,
          border: `1.5px solid ${BASE.red}`,
          borderRadius: '10px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
          transition: 'all 0.15s',
          boxShadow: filtroSoloAlerta ? `0 2px 8px ${BASE.red}55` : 'none',
        }}>
          <span style={{ fontSize: '13px' }}>{filtroSoloAlerta ? '✓' : '○'}</span>
          Solo con alerta de IP
        </button>
        <span style={{ fontSize: '11.5px', color: BASE.muted, marginLeft: 'auto' }}>
          Mostrando {filasFiltradas.length} de {data.filas.length}
        </span>
      </div>

      {/* Tabla de IPs */}
      <div style={{
        background: BASE.white, borderRadius: '16px',
        border: `1px solid ${BASE.border}`, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          padding: '14px 22px', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '17px' }}>🎯</span>
          <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px' }}>
            CONTROL DE IP — IP Contractual vs Meta vs Real Acumulado por Semana
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: BASE.bgSoft }}>
                <th style={thStyle({ position: 'sticky', left: 0, zIndex: 2, background: BASE.bgSoft, color: BASE.navy, textAlign: 'left', minWidth: '300px', paddingLeft: '20px' })}>
                  ACTIVIDAD
                </th>
                <th style={thStyle({ background: '#fef3c7', color: '#92400e', textAlign: 'right', width: '100px', paddingRight: '14px' })}>IP Contract.</th>
                <th style={thStyle({ background: '#dcfce7', color: '#15803d', textAlign: 'right', width: '100px', paddingRight: '14px' })}>IP Meta</th>
                {semanasMostrar.map(s => (
                  <th key={s} style={thStyle({ background: '#dbeafe', color: '#1e40af', textAlign: 'right', width: '90px', paddingRight: '14px' })}>
                    SEM{s}
                  </th>
                ))}
                <th style={thStyle({ background: BASE.red, color: '#fff', textAlign: 'right', width: '100px', paddingRight: '14px' })}>DELTA %</th>
                {/* Columna ALERTA estrecha — solo necesita ancho del chip pequeño */}
                <th style={thStyle({ width: '56px', textAlign: 'center' })}>ALERTA</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4 + semanasMostrar.length + 1} style={{ padding: '50px', textAlign: 'center', color: BASE.muted, fontSize: '13px' }}>
                    Sin actividades que coincidan con el filtro
                  </td>
                </tr>
              ) : (
                (() => {
                  let lastPartida = null;
                  return filasFiltradas.map((f, idx) => {
                    const newPartida = f.partida !== lastPartida;
                    lastPartida = f.partida;
                    return (
                      <React.Fragment key={f.actividad + idx}>
                        {newPartida && (
                          <tr style={{ background: BASE.navy + 'ee', color: '#fff' }}>
                            <td colSpan={4 + semanasMostrar.length + 1} style={{
                              padding: '10px 20px', fontSize: '10.5px', fontWeight: '900',
                              letterSpacing: '0.8px', color: BASE.gold,
                            }}>
                              [{codigoCortoPartida(f.partida)}] {f.partida}
                            </td>
                          </tr>
                        )}
                        <tr style={{
                          background: idx % 2 === 0 ? BASE.white : BASE.bgSoft,
                          transition: 'background 0.12s',
                        }}>
                          <td style={{
                            ...tdStyle({
                              position: 'sticky', left: 0, zIndex: 1,
                              background: idx % 2 === 0 ? BASE.white : BASE.bgSoft,
                              borderRight: `1px solid ${BASE.border}`,
                              fontSize: '11.5px', color: BASE.text,
                              paddingLeft: '24px',
                              paddingTop: '11px', paddingBottom: '11px',
                            }),
                          }}>
                            {f.actividad}
                          </td>
                          <td style={tdStyle({ textAlign: 'right', fontFamily: 'monospace', color: '#92400e', paddingRight: '14px' })}>
                            {f.ipContractual != null ? f.ipContractual.toFixed(4) : '—'}
                          </td>
                          <td style={tdStyle({ textAlign: 'right', fontFamily: 'monospace', color: BASE.greenDark, fontWeight: '700', paddingRight: '14px' })}>
                            {f.ipMeta != null ? f.ipMeta.toFixed(4) : '—'}
                          </td>
                          {semanasMostrar.map(s => {
                            const ip = f.ipAcumPorSemana[s];
                            return (
                              <td key={s} style={tdStyle({
                                textAlign: 'right', fontFamily: 'monospace',
                                color: ip ? '#1e40af' : '#cbd5e1',
                                fontWeight: ip ? '600' : '400',
                                paddingRight: '14px',
                              })}>
                                {ip != null ? ip.toFixed(3) : '—'}
                              </td>
                            );
                          })}
                          {(() => {
                            const pct = (f.delta == null || !f.ipMeta) ? null : -(f.delta / f.ipMeta) * 100;
                            const esBueno = pct != null && pct <= 0;
                            return (
                              <td style={tdStyle({
                                textAlign: 'right', fontFamily: 'monospace', fontWeight: '800',
                                color: pct == null ? BASE.muted : esBueno ? BASE.greenDark : BASE.red,
                                background: pct == null ? 'transparent' : esBueno ? '#dcfce740' : '#fee2e240',
                                paddingRight: '14px',
                              })}>
                                {pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                              </td>
                            );
                          })()}
                          {/* CHIP APU — pequeño, elegante, con tooltip al hover */}
                          <td style={tdStyle({ textAlign: 'center', padding: '8px 6px' })}>
                            {f.necesitaActualizar && (
                              <span
                                title="El IP real supera consistentemente al IP meta. Considera actualizar el APU (Analisis de Precios Unitarios)."
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                  color: BASE.red,
                                  border: `1.5px solid ${BASE.red}55`,
                                  padding: '4px 9px',
                                  borderRadius: '999px',
                                  fontWeight: '900',
                                  fontSize: '9.5px',
                                  letterSpacing: '0.4px',
                                  whiteSpace: 'nowrap',
                                  cursor: 'help',
                                  boxShadow: `0 1px 3px ${BASE.red}33`,
                                }}>
                                <span style={{ fontSize: '11px', lineHeight: 1 }}>!</span>
                                APU
                              </span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Leyenda explicando el chip */}
        <div style={{
          padding: '12px 22px', background: BASE.bgSoft,
          borderTop: `1px solid ${BASE.border}`,
          fontSize: '11.5px', color: BASE.muted, lineHeight: 1.55,
        }}>
          <strong style={{ color: BASE.navy }}>📖 Lectura:</strong> IP = HH/Metrado.
          <strong style={{ color: BASE.greenDark }}> Bajo es mejor.</strong> Si el IP real
          supera al IP meta consistentemente en varias semanas, considera actualizar el APU
          (Analisis de Precios Unitarios) por si la meta era irreal.
          <span style={{ marginLeft: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              color: BASE.red, border: `1.5px solid ${BASE.red}55`,
              padding: '2px 7px', borderRadius: '999px',
              fontWeight: '900', fontSize: '9px', verticalAlign: 'middle',
            }}>
              <span>!</span> APU
            </span>
            {' '}= alerta para revisar la meta de esa actividad
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS de estilos — REDISEÑADOS con padding generoso
// ════════════════════════════════════════════════════════════════

const thStyle = (extra = {}) => ({
  padding: '7px 10px', background: BASE.navy, color: '#fff',
  fontSize: '10px', fontWeight: '800', letterSpacing: '0.4px',
  whiteSpace: 'nowrap', borderBottom: `1px solid ${BASE.border}`,
  ...extra,
});

const thMini = {
  padding: '11px 12px', background: BASE.bgSoft, color: BASE.muted,
  fontSize: '9.5px', fontWeight: '800', letterSpacing: '0.3px',
  textAlign: 'right', whiteSpace: 'nowrap',
};

// Sub-encabezado (2ª fila) STICKY, compacto y más oscuro. top:56 = título(30) + fila grupo(26).
const thMiniStk = {
  padding: '4px 7px', background: '#e2e8f0', color: '#475569',
  fontSize: '9px', fontWeight: '800', letterSpacing: '0.2px',
  textAlign: 'right', whiteSpace: 'nowrap',
  position: 'sticky', top: 56, zIndex: 12,
  height: '24px', boxSizing: 'border-box',
};

const tdStyle = (extra = {}) => ({
  padding: '5px 10px', borderBottom: `1px solid ${BASE.border}`,
  fontSize: '11px', color: BASE.text,
  ...extra,
});

function SinDatos({ icon, titulo }) {
  return (
    <div style={{
      background: BASE.white, borderRadius: '12px',
      border: `2px dashed ${BASE.border}`, padding: '40px 24px', textAlign: 'center',
    }}>
      <p style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</p>
      <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>{titulo}</p>
      <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '6px' }}>
        Necesitas registros con metrado, IP meta y horas para ver este reporte.
      </p>
    </div>
  );
}
