// src/views/OptimizadorCuadrillas.jsx — Generador de cuadrillas óptimas (Bloque 16)
//
// Permite al ingeniero:
//   1. Indicar actividad objetivo + tamaño de cuadrilla
//   2. Ver recomendación basada en histórico de Cartas Balance
//   3. Comparar con alternativas
//   4. Detectar parejas productivas
//   5. Identificar drag performers

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import {
  optimizarCuadrilla, parejasProductivas, rankingHistorico,
  clasificarLUF,
} from '../utils/cartaBalanceAnalytics';

export default function OptimizadorCuadrillas({ showToast, actividadInicial = '', tamanoInicial = 4, onCuadrillaSeleccionada = null }) {
  const { proyectoActivoId, filtrarPorContexto } = useProyectoActivo();
  const [cartas, setCartas] = useState([]);
  const [personalDB, setPersonalDB] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actividad, setActividad] = useState(actividadInicial);
  const [tamano, setTamano] = useState(tamanoInicial);
  const [resultado, setResultado] = useState(null);

  // Auto-ejecutar si viene con actividad pre-llenada (desde LPS)
  useEffect(() => {
    if (actividadInicial && cartas.length > 0) {
      const r = optimizarCuadrilla(actividadInicial, tamanoInicial, cartas, personalDB);
      setResultado(r);
    }
  }, [actividadInicial, cartas.length]);  // eslint-disable-line

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'desc')),
      (snap) => {
        // Aislamiento: solo las Cartas Balance del proyecto activo. Usamos filtrarPorContexto
        // (no === estricto) para no perder las cartas legacy sin proyectoId en el proyecto default.
        setCartas(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true }));
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(
      collection(db, 'Personal'),
      // Solo personal del proyecto activo (legacy sin proyectoId visible solo en el default).
      (snap) => setPersonalDB(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true }))
    );
    return () => { unsub1(); unsub2(); };
  }, [proyectoActivoId, filtrarPorContexto]);

  // Actividades únicas detectadas en el historial
  const actividadesDetectadas = useMemo(() => {
    const set = new Set();
    cartas.forEach(cb => {
      if (cb.actividad) set.add(cb.actividad);
    });
    return Array.from(set).sort();
  }, [cartas]);

  // Ranking general (para mostrar parejas)
  const rankingGlobal = useMemo(() => rankingHistorico(cartas), [cartas]);
  const parejas = useMemo(() => parejasProductivas(cartas, rankingGlobal), [cartas, rankingGlobal]);

  const ejecutarOptimizacion = () => {
    if (!actividad) {
      showToast?.('Indica una actividad', 'error');
      return;
    }
    const r = optimizarCuadrilla(actividad, tamano, cartas, personalDB);
    setResultado(r);
    if (r.datosInsuficientes) {
      showToast?.('Datos insuficientes para esta actividad', 'warning');
    } else {
      showToast?.(`Cuadrilla recomendada: LUF estimado ${r.lufEstimado}%`, 'success');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted }}>⏳ Cargando datos...</div>;

  // Sin historial de Cartas Balance no hay de dónde aprender → estado guía (no un form muerto).
  if (!cartas.length) return (
    <EmptyState
      icono="🤖"
      titulo="Optimizador de Cuadrillas"
      descripcion="Aún no hay Cartas Balance registradas en este proyecto. El optimizador aprende de la productividad real (LUF) de tus cuadrillas: registra al menos una Carta Balance en Producción › Carta Balance y vuelve aquí para generar la cuadrilla óptima."
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
        color: '#fff', borderRadius: '14px', padding: '20px 24px',
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1.6px', opacity: 0.9 }}>
          🤖 OPTIMIZADOR DE CUADRILLAS
        </p>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>
          Genera la cuadrilla óptima para una actividad
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
          Algoritmo greedy con boost por parejas productivas. Basado en datos históricos de Cartas Balance.
        </p>
      </div>

      {/* Input */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '2 1 240px' }}>
          <label style={lblStyle}>ACTIVIDAD OBJETIVO</label>
          <input
            type="text"
            list="actividades-list"
            value={actividad}
            onChange={e => setActividad(e.target.value)}
            placeholder="Ej. Encofrado de muros"
            style={inputStyle}
          />
          <datalist id="actividades-list">
            {actividadesDetectadas.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label style={lblStyle}>TAMAÑO</label>
          <input
            type="number"
            min="2" max="20"
            value={tamano}
            onChange={e => setTamano(parseInt(e.target.value) || 2)}
            style={inputStyle}
          />
        </div>
        <button onClick={ejecutarOptimizacion} style={{
          padding: '11px 24px',
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          letterSpacing: '0.5px',
        }}>🤖 GENERAR CUADRILLA</button>
      </div>

      {/* Resultado */}
      {resultado && !resultado.datosInsuficientes && (
        <ResultadoOptimizacion
          resultado={resultado}
          actividad={actividad}
          onSeleccionar={onCuadrillaSeleccionada}
        />
      )}

      {resultado && resultado.datosInsuficientes && (
        <div style={{
          background: '#fef3c7', border: `2px solid ${BASE.gold}`,
          borderRadius: '12px', padding: '20px',
        }}>
          <p style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>📊</p>
          <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.goldDark, textAlign: 'center', marginBottom: '6px' }}>
            Datos insuficientes
          </p>
          <p style={{ fontSize: '12px', color: BASE.text, textAlign: 'center' }}>
            {resultado.justificacion}
          </p>
        </div>
      )}

      {/* Parejas productivas detectadas (siempre visible si hay) */}
      {parejas.length > 0 && (
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 18px', background: BASE.bgSoft,
            borderBottom: `1px solid ${BASE.border}`,
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
              👥 PAREJAS PRODUCTIVAS DETECTADAS
            </h3>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px' }}>
              Combinaciones de personas que históricamente trabajan mejor juntas que por separado.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>#</th>
                  <th style={th()}>Pareja</th>
                  <th style={th()}>Sesiones juntos</th>
                  <th style={th()}>LUF juntos</th>
                  <th style={th()}>LUF individual prom.</th>
                  <th style={th()}>Sinergia</th>
                </tr>
              </thead>
              <tbody>
                {parejas.slice(0, 8).map((p, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? BASE.white : BASE.bgSoft,
                    borderBottom: `1px solid ${BASE.border}`,
                  }}>
                    <td style={td()}>{i + 1}</td>
                    <td style={{ ...td(), fontWeight: '800', color: BASE.navy }}>
                      🤝 {p.personaA} + {p.personaB}
                    </td>
                    <td style={td()}>{p.sesiones}</td>
                    <td style={{ ...td(), fontWeight: '900', color: BASE.green }}>{p.lufJuntos}%</td>
                    <td style={td()}>{p.lufIndividualPromedio}%</td>
                    <td style={{
                      ...td(), fontWeight: '900',
                      color: p.sinergia > 5 ? BASE.green : p.sinergia > 0 ? BASE.gold : BASE.red,
                    }}>
                      {p.sinergia >= 0 ? '+' : ''}{p.sinergia.toFixed(1)} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Si no hay datos */}
      {cartas.length === 0 && (
        <EmptyState
          icono="🤖"
          titulo="Sin datos para optimizar"
          descripcion="El optimizador necesita Cartas Balance previas. Cuando los capataces hayan registrado al menos 2-3 mediciones por actividad, podré generar recomendaciones."
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE: RESULTADO DE OPTIMIZACIÓN
// ════════════════════════════════════════════════════════════════
function ResultadoOptimizacion({ resultado, actividad, onSeleccionar }) {
  const cls = resultado.clasificacionEstimada;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* LUF estimado destacado */}
      <div style={{
        background: BASE.white, border: `2px solid ${cls.color}`,
        borderRadius: '14px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
      }}>
        <div style={{
          width: '90px', height: '90px',
          background: cls.color + '22',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <p style={{ fontSize: '24px', fontWeight: '900', color: cls.color }}>{resultado.lufEstimado}%</p>
          <p style={{ fontSize: '9px', fontWeight: '800', color: cls.color, letterSpacing: '0.5px' }}>LUF EST.</p>
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <p style={{ fontSize: '11px', color: BASE.muted, fontWeight: '700', letterSpacing: '0.5px' }}>
            {cls.emoji} CLASIFICACIÓN
          </p>
          <p style={{ fontSize: '20px', fontWeight: '900', color: cls.color, marginTop: '2px' }}>
            {cls.label}
          </p>
          <p style={{ fontSize: '12px', color: BASE.muted, marginTop: '6px', lineHeight: 1.5 }}>
            {resultado.justificacion}
          </p>
        </div>
      </div>

      {/* Cuadrilla recomendada */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
          color: '#fff',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.4px' }}>
            ✅ CUADRILLA RECOMENDADA · {actividad.toUpperCase()}
          </h3>
        </div>
        <div style={{ padding: '6px 0' }}>
          {resultado.recomendados.map((r, i) => (
            <div key={r.personaId} style={{
              padding: '14px 22px',
              borderBottom: i < resultado.recomendados.length - 1 ? `1px solid ${BASE.border}` : 'none',
              display: 'flex', gap: '14px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '34px', height: '34px',
                background: BASE.navy,
                color: '#fff',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '900',
                flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy }}>
                    {r.nombre}
                  </p>
                  <span style={{
                    fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                    padding: '3px 10px', borderRadius: '12px',
                    background: r.rol === 'líder' ? BASE.gold + '22' : BASE.bgSoft,
                    color: r.rol === 'líder' ? BASE.goldDark : BASE.muted,
                    whiteSpace: 'nowrap',
                  }}>
                    {r.rol === 'líder' ? '👑 LÍDER' : r.rol === 'pareja productiva' ? '🤝 PAREJA' : '⭐ TOP'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: BASE.muted, lineHeight: 1.5 }}>
                  {r.razon}
                </p>
                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '11px', fontWeight: '700' }}>
                  <span style={{ color: clasificarLUF(r.luf).color }}>LUF {r.luf}%</span>
                  <span style={{ color: BASE.muted }}>Confianza: {r.confianza}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advertencias */}
      {resultado.advertencias.length > 0 && (
        <div style={{
          background: '#fef3c7', border: `1px solid ${BASE.gold}`,
          borderRadius: '10px', padding: '12px 16px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.goldDark, marginBottom: '6px', letterSpacing: '0.4px' }}>
            ⚠️ ADVERTENCIAS
          </p>
          <ul style={{ marginLeft: '20px' }}>
            {resultado.advertencias.map((a, i) => (
              <li key={i} style={{ fontSize: '11.5px', color: BASE.text, marginBottom: '2px' }}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA: Aceptar y enviar al LPS si hay callback */}
      {onSeleccionar && resultado.recomendados.length > 0 && (
        <button onClick={() => onSeleccionar(resultado.recomendados, resultado.lufEstimado)} style={{
          padding: '14px 24px',
          background: `linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`,
          color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '13px', fontWeight: '900', cursor: 'pointer',
          letterSpacing: '0.5px',
          boxShadow: `0 6px 20px ${BASE.green}55`,
        }}>
          ✅ ACEPTAR ESTA CUADRILLA Y ASIGNAR AL PLAN
        </button>
      )}

      {/* Alternativas */}
      {resultado.alternativas.length > 0 && (
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '10px', padding: '14px 18px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, marginBottom: '10px', letterSpacing: '0.4px' }}>
            🔄 ALTERNATIVAS DISPONIBLES (siguientes en ranking)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {resultado.alternativas.map(a => (
              <div key={a.personaId} style={{
                background: BASE.bgSoft, padding: '6px 12px', borderRadius: '8px',
                fontSize: '11px',
              }}>
                <strong style={{ color: BASE.navy }}>{a.nombre}</strong>
                <span style={{ color: BASE.muted, marginLeft: '6px' }}>· LUF {a.luf}% ({a.sesiones} ses.)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos compartidos
const lblStyle = { fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '13px' };
const th = () => ({ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px' });
const td = () => ({ padding: '10px 12px', fontSize: '12px', color: BASE.text });
