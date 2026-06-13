// src/views/admin/ConfigSistema.jsx — Editor de Configuracion/global
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import { useAuth } from '../contexts/AuthContext';
import { COSTO_HORA_DEFAULT } from '../utils/helpers';

// Cargos del sistema (orden de la pirámide laboral típica de construcción Perú)
const CARGOS_ORDEN = ['Capataz', 'Operario', 'Oficial', 'Ayudante'];

export default function ConfigSistema({ showToast }) {
  const { user } = useAuth();
  const [config, setConfig] = useState({
    monedaSimbolo: 'S/',
    monedaCodigo: 'PEN',
    metaCPI: 1.0,
    metaPPC: 0.8,
    horasPorJornada: 8.5,       // legado — sigue usándose como default agregado
    horasJornadaLV: 8.5,        // Lunes a Viernes
    horasJornadaSabado: 5.5,    // Sábado (7:30 - 13:00 = 5.5 horas)
    inicioJornadaSabado: '07:30',
    finJornadaSabado: '13:00',
    diasPorSemana: 6,
    proyecto: 'PTARI',
    // Factores de recargo sobre tarifa del cargo (Perú: 1.60 las 2 primeras HE, 2.00 desde la 3ra)
    factorHE_1_2: 1.60,
    factorHE_3plus: 2.00,
    // Costos por cargo (mapa {cargo: S/h}). Si no existe en Firestore, usa defaults.
    tarifas: { ...COSTO_HORA_DEFAULT },
    // Lista de feriados pagados — cada item: { fecha:'YYYY-MM-DD', descripcion:string, pagado:bool }
    feriados: [],
  });
  // Inputs temporales para añadir nuevo feriado
  const [nuevoFeriado, setNuevoFeriado] = useState({ fecha: '', descripcion: '', pagado: true });
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'Configuracion', 'global'));
      if (snap.exists()) {
        const data = snap.data();
        // Mergeo profundo para tarifas: defaults + lo que ya esté guardado
        const tarifasMerged = { ...COSTO_HORA_DEFAULT, ...(data.tarifas || {}) };
        const merged = { ...config, ...data, tarifas: tarifasMerged };
        setConfig(merged);
        setOriginal(merged);
      } else {
        setOriginal(config);
      }
    } catch (err) {
      console.error('[ConfigSistema]', err);
      showToast?.('Error cargando config: ' + err.message, 'error');
    } finally { setLoading(false); }
  };

  const haCambiado = original && JSON.stringify(config) !== JSON.stringify(original);

  const guardar = async () => {
    setGuardando(true);
    try {
      await setDoc(doc(db, 'Configuracion', 'global'), {
        ...config,
        modificadoEn: serverTimestamp(),
        modificadoPor: user?.uid,
      }, { merge: true });
      setOriginal(config);
      showToast?.('✅ Configuración guardada', 'success');
    } catch (err) {
      showToast?.('❌ ' + err.message, 'error');
    } finally { setGuardando(false); }
  };

  const resetear = () => {
    if (window.confirm('¿Descartar todos los cambios?')) setConfig(original);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: BASE.muted }}>⏳ Cargando configuración...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: '#fef3c7', border: `1px solid ${BASE.gold}`,
        borderRadius: '10px', padding: '12px 16px',
        fontSize: '12px', color: BASE.goldDark, fontWeight: '700',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <span>Estos valores afectan a TODA la organización. Cambiar tarifas o factores recalcula automáticamente todos los costos del dashboard.</span>
      </div>

      {/* Sección: Costos por Cargo — tarifas individuales por categoría laboral */}
      <Seccion
        titulo={`COSTOS POR CARGO (${config.monedaSimbolo}/hora)`}
        descripcion="Tarifa horaria por categoría. Estos valores se usan para calcular el costo real de HH (Hora Normal + HE) y el valor gastado total por trabajador."
      >
        {CARGOS_ORDEN.map(cargo => (
          <Campo
            key={cargo}
            label={cargo}
            tipo="number"
            step="0.5"
            value={config.tarifas?.[cargo] ?? COSTO_HORA_DEFAULT[cargo] ?? 0}
            onChange={v => setConfig({
              ...config,
              tarifas: { ...config.tarifas, [cargo]: parseFloat(v) || 0 },
            })}
            sufijo={`${config.monedaSimbolo}/h`}
            ayuda={`Default sugerido: ${config.monedaSimbolo}${COSTO_HORA_DEFAULT[cargo]}/h`}
          />
        ))}
      </Seccion>

      {/* Sección: Recargos de Horas Extras (regla Perú escalonada) */}
      <Seccion
        titulo="RECARGOS DE HORAS EXTRAS"
        descripcion="El costo de cada HE se calcula sobre la tarifa del CARGO (no un valor único). Regla Perú: las primeras 2 horas extras pagan 60% más, desde la 3ra se paga el 100% más.">
        <Campo label="Factor HE 1ra y 2da" tipo="number" step="0.05"
          value={config.factorHE_1_2}
          onChange={v => setConfig({ ...config, factorHE_1_2: parseFloat(v) || 1.6 })}
          sufijo="×" ayuda="Las 2 primeras HE del día → tarifa(cargo) × 1.60 (recargo 60%)" />
        <Campo label="Factor HE desde la 3ra" tipo="number" step="0.05"
          value={config.factorHE_3plus}
          onChange={v => setConfig({ ...config, factorHE_3plus: parseFloat(v) || 2.0 })}
          sufijo="×" ayuda="HE desde la 3ra hora → tarifa(cargo) × 2.00 (recargo 100%)" />
        <Campo label="Símbolo monetario" value={config.monedaSimbolo}
          onChange={v => setConfig({ ...config, monedaSimbolo: v })}
          ayuda="ej. S/, US$, € — para mostrar en la app" />

        {/* Ejemplo visual del cálculo */}
        <div style={{
          gridColumn: '1/-1',
          background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
          borderRadius: '10px', padding: '12px 14px',
          fontSize: '11px', lineHeight: 1.6, color: BASE.text,
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '6px' }}>
            EJEMPLO PARA UN OPERARIO (tarifa {config.monedaSimbolo}{(config.tarifas?.Operario ?? COSTO_HORA_DEFAULT.Operario).toFixed(2)}/h)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
            <div>
              <span style={{ color: BASE.muted, fontWeight: '700' }}>Hora normal (HN):</span><br/>
              <strong style={{ color: BASE.navy, fontFamily: 'var(--grapco-font-mono, monospace)' }}>
                1 h × {config.monedaSimbolo}{(config.tarifas?.Operario ?? COSTO_HORA_DEFAULT.Operario).toFixed(2)} = {config.monedaSimbolo}{(config.tarifas?.Operario ?? COSTO_HORA_DEFAULT.Operario).toFixed(2)}
              </strong>
            </div>
            <div>
              <span style={{ color: BASE.muted, fontWeight: '700' }}>HE 1ra/2da ({config.factorHE_1_2}×):</span><br/>
              <strong style={{ color: '#b45309', fontFamily: 'var(--grapco-font-mono, monospace)' }}>
                1 h × {config.monedaSimbolo}{((config.tarifas?.Operario ?? COSTO_HORA_DEFAULT.Operario) * config.factorHE_1_2).toFixed(2)}
              </strong>
            </div>
            <div>
              <span style={{ color: BASE.muted, fontWeight: '700' }}>HE 3ra+ ({config.factorHE_3plus}×):</span><br/>
              <strong style={{ color: '#b91c1c', fontFamily: 'var(--grapco-font-mono, monospace)' }}>
                1 h × {config.monedaSimbolo}{((config.tarifas?.Operario ?? COSTO_HORA_DEFAULT.Operario) * config.factorHE_3plus).toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </Seccion>

      {/* Sección: Metas */}
      <Seccion titulo="METAS DE PRODUCTIVIDAD" descripcion="Umbrales para alertas y semáforos del dashboard.">
        <Campo label="Meta CPI" tipo="number" step="0.01"
          value={config.metaCPI} onChange={v => setConfig({ ...config, metaCPI: parseFloat(v) || 1 })}
          ayuda="Cost Performance Index objetivo (1.0 = bajo presupuesto)" />
        <Campo label="Meta PPC" tipo="number" step="0.01"
          value={config.metaPPC} onChange={v => setConfig({ ...config, metaPPC: parseFloat(v) || 0.8 })}
          ayuda="Percent Plan Complete del LPS (0.8 = 80% de compromisos cumplidos)" />
      </Seccion>

      {/* Sección: Jornada — diferenciada L-V y Sábado */}
      <Seccion
        titulo="JORNADA LABORAL"
        descripcion="Horas trabajadas según el día. En Perú típicamente 8.5h L-V + 5.5h sábado (jornada corta 7:30-13:00).">
        <Campo label="Horas jornada Lun-Vie" tipo="number" step="0.5"
          value={config.horasJornadaLV}
          onChange={v => setConfig({ ...config, horasJornadaLV: parseFloat(v) || 0, horasPorJornada: parseFloat(v) || 0 })}
          sufijo="horas" ayuda="Jornada estándar de lunes a viernes (Perú = 8.5h)" />
        <Campo label="Horas jornada Sábado" tipo="number" step="0.5"
          value={config.horasJornadaSabado}
          onChange={v => setConfig({ ...config, horasJornadaSabado: parseFloat(v) || 0 })}
          sufijo="horas" ayuda="Jornada corta del sábado. Típica obra: 7:30-13:00 = 5.5h" />
        <Campo label="Inicio sábado" tipo="time"
          value={config.inicioJornadaSabado}
          onChange={v => setConfig({ ...config, inicioJornadaSabado: v })}
          ayuda="Hora de entrada el sábado (formato 24h)" />
        <Campo label="Fin sábado" tipo="time"
          value={config.finJornadaSabado}
          onChange={v => setConfig({ ...config, finJornadaSabado: v })}
          ayuda="Hora de salida el sábado (formato 24h)" />
        <Campo label="Días por semana" tipo="number" step="1"
          value={config.diasPorSemana}
          onChange={v => setConfig({ ...config, diasPorSemana: parseInt(v) || 6 })}
          sufijo="días" ayuda="Construcción típicamente 6 días (lunes-sábado)" />
      </Seccion>

      {/* Sección: Feriados pagados */}
      <Seccion
        titulo="FERIADOS PAGADOS"
        descripcion="Feriados nacionales o de obra que se pagan aunque no se trabaje. Se contabilizan como HH efectivas en el cálculo de costo total.">
        {/* Form para añadir uno nuevo */}
        <div style={{
          gridColumn: '1/-1',
          background: BASE.bgSoft, border: `1px dashed ${BASE.border}`,
          borderRadius: '10px', padding: '12px',
          display: 'grid', gap: '10px',
          gridTemplateColumns: '160px 1fr 130px 100px',
          alignItems: 'end',
        }}>
          <Campo label="Fecha" tipo="date"
            value={nuevoFeriado.fecha}
            onChange={v => setNuevoFeriado({ ...nuevoFeriado, fecha: v })}
          />
          <Campo label="Descripción"
            value={nuevoFeriado.descripcion}
            onChange={v => setNuevoFeriado({ ...nuevoFeriado, descripcion: v })}
            ayuda="ej. Año Nuevo, Fiestas Patrias, Aniversario obra"
          />
          <Campo label="¿Pagado?" tipo="select"
            value={nuevoFeriado.pagado ? 'si' : 'no'}
            onChange={v => setNuevoFeriado({ ...nuevoFeriado, pagado: v === 'si' })}
            options={[{value:'si',label:'Sí, pagado'},{value:'no',label:'No pagado'}]}
          />
          <button
            onClick={() => {
              if (!nuevoFeriado.fecha) { showToast?.('Falta la fecha', 'warning'); return; }
              if (config.feriados?.some(f => f.fecha === nuevoFeriado.fecha)) {
                showToast?.('Esa fecha ya está en la lista', 'warning'); return;
              }
              setConfig({
                ...config,
                feriados: [...(config.feriados || []), nuevoFeriado].sort((a,b)=>a.fecha.localeCompare(b.fecha)),
              });
              setNuevoFeriado({ fecha:'', descripcion:'', pagado:true });
            }}
            style={{
              padding: '10px 14px',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '11px', fontWeight: '900', cursor: 'pointer',
              letterSpacing: '0.4px', height: '40px',
            }}
          >+ AGREGAR</button>
        </div>

        {/* Lista de feriados ya configurados */}
        <div style={{ gridColumn: '1/-1' }}>
          {(!config.feriados || config.feriados.length === 0) ? (
            <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic', padding: '8px 0' }}>
              Aún no hay feriados configurados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {config.feriados.map((f, idx) => (
                <div key={f.fecha + idx} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: BASE.white, border: `1px solid ${BASE.border}`,
                  borderLeft: `3px solid ${f.pagado ? BASE.green : BASE.muted}`,
                  borderRadius: '8px', padding: '8px 12px',
                }}>
                  <span style={{
                    fontSize: '11px', fontWeight: '800', color: BASE.navy,
                    fontFamily: 'var(--grapco-font-mono, monospace)', minWidth: '110px',
                  }}>{f.fecha}</span>
                  <span style={{ fontSize: '11px', color: BASE.text, flex: 1, fontWeight: '600' }}>
                    {f.descripcion || '(sin descripción)'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: f.pagado ? `${BASE.green}15` : '#f1f5f9',
                    color: f.pagado ? BASE.greenDark : BASE.muted,
                    padding: '3px 9px', borderRadius: '999px',
                    fontSize: '9.5px', fontWeight: '800', letterSpacing: '0.3px',
                    border: `1px solid ${f.pagado ? `${BASE.green}55` : BASE.border}`,
                  }}>
                    {f.pagado ? '✓ PAGADO' : '○ NO PAGADO'}
                  </span>
                  <button
                    onClick={() => setConfig({
                      ...config,
                      feriados: config.feriados.filter((_, i) => i !== idx),
                    })}
                    title="Eliminar feriado"
                    style={{
                      padding: '4px 9px', background: '#fee2e2', color: '#b91c1c',
                      border: 'none', borderRadius: '6px',
                      fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                    }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Seccion>

      {/* Sección: Proyecto */}
      <Seccion titulo="PROYECTO ACTIVO" descripcion="Identificación del proyecto en curso.">
        <Campo label="Nombre del proyecto" value={config.proyecto}
          onChange={v => setConfig({ ...config, proyecto: v })}
          ayuda="Aparece en reportes y exports (ej. PTARI, PTAR-Norte, etc.)" />
      </Seccion>

      {/* Footer con guardar */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', bottom: '16px',
        boxShadow: haCambiado ? `0 8px 24px ${BASE.gold}40` : '0 2px 8px rgba(15,23,42,0.05)',
        borderColor: haCambiado ? BASE.gold : BASE.border,
        transition: 'all 0.25s',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: '800',
          color: haCambiado ? BASE.gold : BASE.muted,
        }}>
          {haCambiado ? '⚠️ Hay cambios sin guardar' : '✓ Sin cambios pendientes'}
        </span>
        <div style={{ flex: 1 }} />
        {haCambiado && (
          <button onClick={resetear} style={{
            padding: '9px 16px', background: BASE.bgSoft, color: BASE.muted,
            border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '11px', fontWeight: '800', cursor: 'pointer',
          }}>↶ Descartar</button>
        )}
        <button onClick={guardar} disabled={!haCambiado || guardando} className="btn-feedback" style={{
          padding: '10px 20px',
          background: !haCambiado ? '#cbd5e1' :
                      guardando ? '#94a3b8' :
                      `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '12px', fontWeight: '900',
          cursor: (!haCambiado || guardando) ? 'not-allowed' : 'pointer',
          letterSpacing: '0.4px',
          boxShadow: haCambiado && !guardando ? `0 4px 12px ${BASE.gold}55` : 'none',
        }}>{guardando ? 'GUARDANDO...' : '💾 GUARDAR CAMBIOS'}</button>
      </div>
    </div>
  );
}

function Seccion({ titulo, descripcion, children }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '16px 18px',
    }}>
      <h4 style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
        {titulo}
      </h4>
      {descripcion && (
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '4px', marginBottom: '14px' }}>
          {descripcion}
        </p>
      )}
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, tipo = 'text', value, onChange, sufijo, ayuda, step, options }) {
  const baseInputStyle = {
    width: '100%', padding: sufijo ? '10px 60px 10px 12px' : '10px 12px',
    borderRadius: '8px',
    border: `1.5px solid ${BASE.border}`, fontSize: '13px',
    fontWeight: '700', color: BASE.navy,
    background: BASE.white,
    boxSizing: 'border-box',
  };
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: 'relative' }}>
        {tipo === 'select' ? (
          <select value={value} onChange={e => onChange(e.target.value)} style={baseInputStyle}>
            {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={tipo} step={step} value={value} onChange={e => onChange(e.target.value)}
            style={baseInputStyle}/>
        )}
        {sufijo && (
          <span style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '11px', color: BASE.muted, fontWeight: '800',
            pointerEvents: 'none',
          }}>{sufijo}</span>
        )}
      </div>
      {ayuda && (
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
          {ayuda}
        </p>
      )}
    </div>
  );
}
