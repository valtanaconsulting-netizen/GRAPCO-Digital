// src/views/ValidacionOptimizador.jsx — Comparador retrospectivo (Bloque 18)
//
// Valida el modelo del optimizador con cross-validation leave-one-out:
//   1. Para cada Carta Balance histórica N, simula qué hubiera predicho
//      el optimizador usando solo las cartas previas a N.
//   2. Compara la predicción con la realidad (LUF y composición de personas).
//   3. Agrega métricas globales: precisión, sesgo, desviación.
//
// Es la "prueba académica" de que el modelo funciona.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import EmptyState from '../components/EmptyState';
import {
  validarModeloOptimizador,
  clasificarPrecision,
  clasificarLUF,
} from '../utils/cartaBalanceAnalytics';

export default function ValidacionOptimizador() {
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroActividad, setFiltroActividad] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'Cartas_Balance'), orderBy('fecha', 'asc')),
      (snap) => {
        setCartas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error('[Validacion]', err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Filtrar
  const cartasFiltradas = useMemo(() => {
    if (!filtroActividad) return cartas;
    return cartas.filter(c =>
      (c.actividad || '').toLowerCase().includes(filtroActividad.toLowerCase())
    );
  }, [cartas, filtroActividad]);

  // Validar
  const resultado = useMemo(
    () => validarModeloOptimizador(cartasFiltradas),
    [cartasFiltradas]
  );

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted }}>
      ⏳ Validando modelo...
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        color: '#fff', borderRadius: '14px', padding: '20px 24px',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
          VALIDACIÓN ACADÉMICA DEL MODELO
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
          ¿Qué tan preciso es el optimizador?
        </h2>
        <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px', lineHeight: 1.55 }}>
          Cross-validation leave-one-out sobre el histórico de Cartas Balance: para cada medición, se compara la predicción que hubiera hecho el modelo (usando solo datos previos) con la realidad observada.
        </p>
      </div>

      {/* Filtro */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '10px', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
          FILTRAR POR ACTIVIDAD:
        </span>
        <input
          type="text"
          value={filtroActividad}
          onChange={e => setFiltroActividad(e.target.value)}
          placeholder="Ej: encofrado, vaciado..."
          style={{
            flex: 1, minWidth: '180px',
            padding: '8px 12px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px',
          }}
        />
        <span style={{ fontSize: '11px', color: BASE.muted }}>
          {cartasFiltradas.length} cartas analizadas
        </span>
      </div>

      {/* SIN DATOS */}
      {!resultado.metricas && (
        <EmptyState
          icono="🧪"
          titulo="Sin suficientes datos para validar"
          descripcion={resultado.mensaje || 'Se necesitan al menos 3 Cartas Balance del mismo conjunto de actividades.'}
        />
      )}

      {/* MÉTRICAS GLOBALES */}
      {resultado.metricas && (
        <>
          <MetricaPrincipal metricas={resultado.metricas} />

          <MetricasDetalladas metricas={resultado.metricas} />

          {/* TABLA DE VALIDACIONES */}
          <TablaValidaciones validaciones={resultado.validaciones} />

          {/* INTERPRETACIÓN */}
          <Interpretacion metricas={resultado.metricas} />
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════

function MetricaPrincipal({ metricas }) {
  const cls = clasificarPrecision(metricas.precisionLUF);
  return (
    <div style={{
      background: BASE.white, border: `2px solid ${cls.color}`,
      borderRadius: '14px', padding: '24px 28px',
      display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
      borderLeft: `8px solid ${cls.color}`,
    }}>
      <div style={{
        width: '120px', height: '120px',
        background: cls.color + '22',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', flexShrink: 0,
      }}>
        <p style={{ fontSize: '32px', fontWeight: '900', color: cls.color, lineHeight: 1 }}>
          {metricas.precisionLUF}<span style={{ fontSize: '18px' }}>%</span>
        </p>
        <p style={{ fontSize: '10px', fontWeight: '900', color: cls.color, letterSpacing: '0.6px', marginTop: '4px' }}>
          PRECISIÓN
        </p>
      </div>
      <div style={{ flex: 1, minWidth: '240px' }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '1.2px' }}>
          PRECISIÓN GLOBAL DEL MODELO
        </p>
        <p style={{ fontSize: '24px', fontWeight: '900', color: cls.color, marginTop: '4px' }}>
          {cls.emoji} {cls.label}
        </p>
        <p style={{ fontSize: '13px', color: BASE.text, marginTop: '8px', lineHeight: 1.55 }}>
          Basado en <strong>{metricas.n} validación{metricas.n > 1 ? 'es' : ''}</strong> retrospectiva{metricas.n > 1 ? 's' : ''} con cross-validation leave-one-out.
          El modelo predice el LUF de la cuadrilla con un error promedio de <strong>±{metricas.deltaLufPromedio} puntos</strong>.
        </p>
      </div>
    </div>
  );
}

function MetricasDetalladas({ metricas }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      <KPIBox
        label="Validaciones"
        valor={metricas.n}
        color={BASE.navy}
        desc="Casos analizados"
      />
      <KPIBox
        label="Δ LUF promedio"
        valor={`±${metricas.deltaLufPromedio} pts`}
        color={metricas.deltaLufPromedio < 5 ? BASE.green : metricas.deltaLufPromedio < 10 ? BASE.gold : BASE.red}
        desc="Diferencia predicción vs real"
      />
      <KPIBox
        label="Acierto personas"
        valor={`${metricas.aciertoPersonasPromedio}%`}
        color={metricas.aciertoPersonasPromedio > 70 ? BASE.green : BASE.gold}
        desc="% de coincidencia con cuadrilla real"
      />
      <KPIBox
        label="Sesgo"
        valor={`${metricas.sesgo > 0 ? '+' : ''}${metricas.sesgo}`}
        color={Math.abs(metricas.sesgo) < 2 ? BASE.green : BASE.gold}
        desc={metricas.sesgoTipo === 'sobre-estima' ? '↑ Optimista' : metricas.sesgoTipo === 'sub-estima' ? '↓ Conservador' : '⇄ Neutral'}
      />
      <KPIBox
        label="Desv. estándar"
        valor={`±${metricas.desviacionEstandar}`}
        color={BASE.muted}
        desc="Variabilidad del error"
      />
    </div>
  );
}

function TablaValidaciones({ validaciones }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', background: BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
          DETALLE DE VALIDACIONES
        </h3>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
          Cada fila representa un experimento de "leave-one-out": se sacó esa carta, se predijo con el resto, se comparó con su valor real.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: BASE.navy, color: '#fff' }}>
              <th style={th()}>Fecha</th>
              <th style={th()}>Actividad</th>
              <th style={th()}>LUF Real</th>
              <th style={th()}>LUF Predicho</th>
              <th style={th()}>Δ</th>
              <th style={th()}>Personas Reales</th>
              <th style={th()}>Personas Predichas</th>
              <th style={th()}>Acierto</th>
            </tr>
          </thead>
          <tbody>
            {validaciones.map((v, i) => {
              const acierto = v.aciertoPersonas;
              const aciertoColor = acierto >= 70 ? BASE.green : acierto >= 50 ? BASE.gold : BASE.red;
              const deltaColor = v.deltaLuf < 5 ? BASE.green : v.deltaLuf < 10 ? BASE.gold : BASE.red;
              return (
                <tr key={v.cbId} style={{
                  background: i % 2 === 0 ? BASE.white : BASE.bgSoft,
                  borderBottom: `1px solid ${BASE.border}`,
                }}>
                  <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px' }}>{v.fecha}</td>
                  <td style={{ ...td(), fontWeight: '700', color: BASE.navy }}>{v.actividad}</td>
                  <td style={{ ...td(), color: clasificarLUF(v.lufReal).color, fontWeight: '900' }}>
                    {v.lufReal}%
                  </td>
                  <td style={{ ...td(), color: clasificarLUF(v.lufPredicho).color, fontWeight: '900' }}>
                    {v.lufPredicho}%
                  </td>
                  <td style={{ ...td(), color: deltaColor, fontWeight: '900', fontFamily: 'monospace' }}>
                    ±{v.deltaLuf}
                  </td>
                  <td style={{ ...td(), fontSize: '11px' }}>{v.personasReales.join(', ')}</td>
                  <td style={{ ...td(), fontSize: '11px', color: BASE.muted }}>{v.personasPredichas.join(', ')}</td>
                  <td style={{ ...td(), color: aciertoColor, fontWeight: '900' }}>
                    {acierto}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Interpretacion({ metricas }) {
  const cls = clasificarPrecision(metricas.precisionLUF);

  // Texto interpretativo según el resultado
  let mensaje = '';
  let recomendaciones = [];
  if (metricas.precisionLUF >= 85) {
    mensaje = 'El modelo está bien calibrado. Las recomendaciones son confiables y se pueden usar como base de decisión.';
  } else if (metricas.precisionLUF >= 70) {
    mensaje = 'El modelo es razonablemente preciso. Las recomendaciones son útiles pero el residente debe validar con su criterio.';
  } else if (metricas.precisionLUF >= 55) {
    mensaje = 'El modelo tiene precisión aceptable pero limitada. Se recomienda más data histórica antes de delegar decisiones.';
    recomendaciones.push('Aumentar el número de Cartas Balance por actividad (objetivo: 5+ por actividad).');
  } else {
    mensaje = 'La precisión actual es baja. Esto suele ocurrir cuando hay pocos datos o mucha variabilidad entre cuadrillas.';
    recomendaciones.push('Estandarizar la forma de medir (mismo intervalo, misma duración).');
    recomendaciones.push('Acumular más historial antes de tomar decisiones automáticas.');
  }

  if (Math.abs(metricas.sesgo) > 5) {
    if (metricas.sesgo > 0) {
      recomendaciones.push(`El modelo SOBRE-ESTIMA el LUF en promedio +${metricas.sesgo} pts. Se puede aplicar un factor de corrección a las predicciones.`);
    } else {
      recomendaciones.push(`El modelo SUB-ESTIMA el LUF en promedio ${metricas.sesgo} pts. Las cuadrillas reales rinden mejor que la predicción — bueno para gestión de expectativas.`);
    }
  }

  if (metricas.aciertoPersonasPromedio < 60) {
    recomendaciones.push('La coincidencia de personas es baja: las cuadrillas reales no respetan las recomendaciones, o hay alta rotación de personal en cada actividad.');
  }

  return (
    <div style={{
      background: cls.color + '15',
      border: `2px solid ${cls.color}`,
      borderRadius: '14px',
      padding: '20px 24px',
    }}>
      <p style={{ fontSize: '13px', fontWeight: '900', color: cls.color, letterSpacing: '0.4px', marginBottom: '8px' }}>
        INTERPRETACIÓN ACADÉMICA
      </p>
      <p style={{ fontSize: '14px', color: BASE.text, lineHeight: 1.6, marginBottom: '14px' }}>
        {mensaje}
      </p>
      {recomendaciones.length > 0 && (
        <div style={{ background: BASE.white, borderRadius: '10px', padding: '12px 16px' }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.4px', marginBottom: '8px' }}>
            RECOMENDACIONES PARA MEJORAR EL MODELO:
          </p>
          <ul style={{ marginLeft: '20px' }}>
            {recomendaciones.map((r, i) => (
              <li key={i} style={{ fontSize: '12.5px', color: BASE.text, marginBottom: '4px', lineHeight: 1.5 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cita académica útil para sustentación */}
      <div style={{
        marginTop: '14px', background: BASE.white, padding: '14px 18px',
        borderRadius: '10px', borderLeft: `3px solid ${cls.color}`,
        fontSize: '12px', color: BASE.text, fontStyle: 'italic', lineHeight: 1.55,
      }}>
        💡 <strong>Para tu tesis:</strong> "Se validó el modelo del optimizador mediante cross-validation
        leave-one-out (Stone, 1974) sobre {metricas.n} mediciones independientes.
        El modelo alcanza una precisión del <strong>{metricas.precisionLUF}%</strong> en la predicción de LUF
        con un error promedio de ±{metricas.deltaLufPromedio} puntos y un sesgo de {metricas.sesgo} pts."
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function KPIBox({ label, valor, color, desc }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 18px',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '1.2px' }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: '22px', fontWeight: '900', color, marginTop: '2px', lineHeight: 1.1 }}>
        {valor}
      </p>
      <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px', lineHeight: 1.4 }}>
        {desc}
      </p>
    </div>
  );
}

const th = () => ({ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px' });
const td = () => ({ padding: '9px 12px', fontSize: '12px', color: BASE.text });
