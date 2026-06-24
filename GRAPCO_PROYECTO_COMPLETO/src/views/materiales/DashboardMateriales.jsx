// src/views/materiales/DashboardMateriales.jsx — Vista resumen del modulo (B19)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import {
  calcularStockActual, stockGlobalPorMaterial, valorizarStock,
  alertasStockBajo, analizarABC, flujoMensual,
  fmtSoles, fmtCantidad, claseABCColor, severidadColor,
} from '../../utils/materialesAnalytics';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';

export default function DashboardMateriales() {
  const { filtrarPorContexto } = useProyectoActivo();
  const [movs, setMovs] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [];
    unsubs.push(onSnapshot(query(collection(db, 'Kardex_Movimientos'), orderBy('fecha', 'desc')),
      (snap) => setMovs(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })),
      (e) => console.error('[Mov]', e)));
    unsubs.push(onSnapshot(collection(db, 'Materiales'),
      (snap) => { setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error('[Mat]', e); setLoading(false); }));
    unsubs.push(onSnapshot(collection(db, 'Almacenes'),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (e) => console.error('[Alm]', e)));
    return () => unsubs.forEach(u => u());
  }, [filtrarPorContexto]);

  const stock = useMemo(() => calcularStockActual(movs), [movs]);
  const global = useMemo(() => stockGlobalPorMaterial(stock), [stock]);
  const valorTotal = useMemo(() => valorizarStock(stock), [stock]);
  const alertas = useMemo(() => alertasStockBajo(global, materiales), [global, materiales]);
  const abc = useMemo(() => analizarABC(global, materiales).slice(0, 10), [global, materiales]);
  const flujo = useMemo(() => flujoMensual(movs, 6), [movs]);

  const totalMateriales = materiales.length;
  const totalAlmacenes = almacenes.length;
  const movsMes = movs.filter(m => {
    if (!m.fecha) return false;
    const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
    const ahora = new Date();
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
  }).length;

  if (loading) return <SinDatos icon="⏳" titulo="Cargando datos del modulo..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 216px), 1fr))', gap: '10px' }}>
        <KPI label="VALOR INVENTARIO" valor={fmtSoles(valorTotal)} color={BASE.gold} desc="Total stock actual" icono="💰" />
        <KPI label="MATERIALES EN CATALOGO" valor={totalMateriales} color={BASE.navy} desc={`${materiales.filter(m => m.activo !== false).length} activos`} icono="📋" />
        <KPI label="ALMACENES" valor={totalAlmacenes} color={BASE.navy} desc="Almacenes registrados" icono="🏬" />
        <KPI label="MOVIMIENTOS DEL MES" valor={movsMes} color={BASE.navyLight} desc="Entradas + salidas + ajustes" icono="📈" />
        <KPI label="ALERTAS STOCK BAJO" valor={alertas.length} color={alertas.length > 0 ? BASE.red : BASE.green} desc={alertas.length > 0 ? 'Requieren atencion' : 'Todo OK'} icono="🚨" />
      </div>

      {/* ALERTAS */}
      {alertas.length > 0 && (
        <Seccion titulo="ALERTAS DE STOCK">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {alertas.slice(0, 8).map(a => (
              <div key={a.materialId} style={{
                background: severidadColor(a.severidad) + '12',
                border: `1px solid ${severidadColor(a.severidad)}55`,
                borderRadius: '8px', padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>{a.icono}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>{a.material}</p>
                  <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
                    Codigo: {a.codigo} · Stock: {a.stockActual} · Minimo: {a.stockMinimo}
                  </p>
                </div>
                <span style={{
                  background: severidadColor(a.severidad), color: '#fff',
                  padding: '2px 8px', borderRadius: '10px',
                  fontSize: '9px', fontWeight: '900', letterSpacing: '0.5px',
                }}>
                  {a.severidad.toUpperCase()}
                </span>
              </div>
            ))}
            {alertas.length > 8 && (
              <p style={{ textAlign: 'center', fontSize: '11px', color: BASE.muted, padding: '6px' }}>
                + {alertas.length - 8} alertas mas...
              </p>
            )}
          </div>
        </Seccion>
      )}

      {/* ANALISIS ABC */}
      {abc.length > 0 && (
        <Seccion titulo="TOP 10 MATERIALES POR VALOR (ABC)">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>#</th>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Material</th>
                  <th style={th()}>Categoria</th>
                  <th style={{ ...th(), textAlign: 'right' }}>Cantidad</th>
                  <th style={{ ...th(), textAlign: 'right' }}>Valor</th>
                  <th style={{ ...th(), textAlign: 'right' }}>% Valor</th>
                  <th style={{ ...th(), textAlign: 'center' }}>Clase</th>
                </tr>
              </thead>
              <tbody>
                {abc.map((a, i) => (
                  <tr key={a.materialId} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={td()}>{i + 1}</td>
                    <td style={{ ...td(), fontFamily: 'monospace', fontSize: '11px', color: BASE.muted }}>{a.codigo}</td>
                    <td style={{ ...td(), fontWeight: '700', color: BASE.navy }}>{a.material}</td>
                    <td style={td()}>
                      <span style={{
                        background: BASE.bgSoft, padding: '2px 8px', borderRadius: '10px',
                        fontSize: '10px', fontWeight: '800', color: BASE.muted, letterSpacing: '0.4px',
                      }}>{a.categoria}</span>
                    </td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtCantidad(a.cantidad)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: BASE.navy }}>{fmtSoles(a.valor)}</td>
                    <td style={{ ...td(), textAlign: 'right', color: BASE.muted, fontSize: '11px' }}>{a.pctIndividual}%</td>
                    <td style={{ ...td(), textAlign: 'center' }}>
                      <span style={{
                        background: claseABCColor(a.claseABC), color: '#fff',
                        padding: '3px 10px', borderRadius: '10px',
                        fontSize: '10px', fontWeight: '900',
                      }}>{a.claseABC}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '8px', fontStyle: 'italic' }}>
            Clase A: top 80% del valor (controlar muy de cerca) · Clase B: siguiente 15% · Clase C: resto.
          </p>
        </Seccion>
      )}

      {/* FLUJO MENSUAL */}
      <Seccion titulo="FLUJO MENSUAL (ULTIMOS 6 MESES)">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={th()}>Mes</th>
                <th style={{ ...th(), textAlign: 'right' }}># Entradas</th>
                <th style={{ ...th(), textAlign: 'right' }}>Valor Entradas</th>
                <th style={{ ...th(), textAlign: 'right' }}># Salidas</th>
                <th style={{ ...th(), textAlign: 'right' }}>Valor Salidas</th>
                <th style={{ ...th(), textAlign: 'right' }}>Δ Neto</th>
              </tr>
            </thead>
            <tbody>
              {flujo.map((m, i) => {
                const neto = m.valorEntradas - m.valorSalidas;
                return (
                  <tr key={m.key} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft }}>
                    <td style={{ ...td(), fontWeight: '800', color: BASE.navy }}>{m.label}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{m.entradas}</td>
                    <td style={{ ...td(), textAlign: 'right', color: BASE.greenDark, fontWeight: '700' }}>{fmtSoles(m.valorEntradas)}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{m.salidas}</td>
                    <td style={{ ...td(), textAlign: 'right', color: BASE.red, fontWeight: '700' }}>{fmtSoles(m.valorSalidas)}</td>
                    <td style={{
                      ...td(), textAlign: 'right', fontWeight: '900',
                      color: neto >= 0 ? BASE.greenDark : BASE.red,
                    }}>
                      {neto >= 0 ? '+' : ''}{fmtSoles(neto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Seccion>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════

function KPI({ label, valor, color, desc, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '10px', padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>{icono}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.8px' }}>{label}</p>
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{valor}</p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{desc}</p>
      </div>
    </div>
  );
}

function Seccion({ titulo, icono, extra, children }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: '8px', marginBottom: '12px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
          {icono ? `${icono} ` : ''}{titulo}
        </p>
        {extra && (
          <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>{extra}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function SinDatos({ icon, titulo }) {
  return (
    <div style={{
      background: BASE.white, borderRadius: '14px', border: `2px dashed ${BASE.border}`,
      padding: '60px 24px', textAlign: 'center',
    }}>
      <p style={{ fontSize: '36px', marginBottom: '10px' }}>{icon}</p>
      <p style={{ fontSize: '14px', fontWeight: '700', color: BASE.navy }}>{titulo}</p>
    </div>
  );
}

const th = () => ({ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px' });
const td = () => ({ padding: '8px 10px', fontSize: '11.5px' });
