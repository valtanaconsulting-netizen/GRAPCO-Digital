// src/views/Almacenero.jsx — Vista principal del rol Almacenero (B19)
// Mobile-first PWA: entradas, salidas, stock, requerimientos pendientes
// Espejo del UX del Capataz pero para almacen

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import { useAuth } from '../contexts/AuthContext';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import {
  calcularStockActual, stockGlobalPorMaterial, valorizarStock,
  alertasStockBajo, fmtSoles, fmtCantidad,
} from '../utils/materialesAnalytics';
import RoleGuard from '../components/RoleGuard';
import EntradaMaterial from './materiales/EntradaMaterial';
import SalidaMaterial from './materiales/SalidaMaterial';
import KardexView from './materiales/KardexView';

export default function Almacenero({ showToast }) {
  const { user } = useAuth();
  const { filtrarPorContexto } = useProyectoActivo();
  const [vista, setVista] = useState('inicio');
  const [almacenes, setAlmacenes] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const errorAvisado = useRef(false);

  useEffect(() => {
    // Si una lectura falla (sin señal / cache frío / permiso) avisamos UNA vez al
    // almacenero para que NO opere sobre stock incompleto, en vez de fallar en silencio.
    const avisar = (tag) => (e) => {
      console.error(`[${tag}]`, e);
      if (!errorAvisado.current) {
        errorAvisado.current = true;
        showToast?.('No se pudo cargar parte del almacén — revisa tu conexión antes de operar', 'error');
      }
    };
    const u1 = onSnapshot(query(collection(db, 'Almacenes')),
      (snap) => setAlmacenes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), avisar('Almacenes'));
    const u2 = onSnapshot(collection(db, 'Materiales'),
      (snap) => setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() }))), avisar('Materiales'));
    const u3 = onSnapshot(query(collection(db, 'Kardex_Movimientos'), orderBy('fecha', 'desc')),
      (snap) => setMovimientos(filtrarPorContexto(snap.docs.map(d => ({ id: d.id, ...d.data() })), { ignorarFrente: true })), avisar('Kardex'));
    return () => { u1(); u2(); u3(); };
  }, [filtrarPorContexto]);

  // Almacen del usuario (segun email del responsable)
  const miAlmacen = useMemo(() => {
    if (!user?.email) return null;
    return almacenes.find(a => a.responsableEmail?.toLowerCase() === user.email.toLowerCase());
  }, [almacenes, user]);

  const stockAlmacen = useMemo(() => {
    if (!miAlmacen) return new Map();
    const stock = calcularStockActual(movimientos);
    const filtered = new Map();
    for (const [k, v] of stock.entries()) {
      if (v.almacenId === miAlmacen.id) filtered.set(v.materialId, v);
    }
    return filtered;
  }, [movimientos, miAlmacen]);

  const stockGlobal = useMemo(() => stockGlobalPorMaterial(stockAlmacen), [stockAlmacen]);
  const valorMiAlmacen = useMemo(() => valorizarStock(stockAlmacen), [stockAlmacen]);
  const alertas = useMemo(() => alertasStockBajo(stockGlobal, materiales), [stockGlobal, materiales]);

  const movsHoy = useMemo(() => {
    const ahora = new Date();
    return movimientos.filter(m => {
      const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
      return f.toDateString() === ahora.toDateString() && m.almacenId === miAlmacen?.id;
    });
  }, [movimientos, miAlmacen]);

  return (
    <RoleGuard rolesPermitidos={['admin', 'almacenero', 'logistica']}>
      {vista === 'inicio' && (
        <Inicio
          user={user}
          miAlmacen={miAlmacen}
          almacenes={almacenes}
          valorMiAlmacen={valorMiAlmacen}
          stockGlobal={stockGlobal}
          alertas={alertas}
          movsHoy={movsHoy}
          setVista={setVista}
        />
      )}

      {vista === 'entrada' && (
        <ConBack onBack={() => setVista('inicio')}>
          <EntradaMaterial showToast={showToast} onSaved={() => setVista('inicio')} />
        </ConBack>
      )}

      {vista === 'salida' && (
        <ConBack onBack={() => setVista('inicio')}>
          <SalidaMaterial showToast={showToast} onSaved={() => setVista('inicio')} />
        </ConBack>
      )}

      {vista === 'kardex' && (
        <ConBack onBack={() => setVista('inicio')}>
          <KardexView />
        </ConBack>
      )}

      {vista === 'stock' && (
        <ConBack onBack={() => setVista('inicio')}>
          <StockDetalle stockGlobal={stockGlobal} materiales={materiales} miAlmacen={miAlmacen} />
        </ConBack>
      )}
    </RoleGuard>
  );
}

// ════════════════════════════════════════════════════════════════
// PANTALLA DE INICIO (mobile-first)
// ════════════════════════════════════════════════════════════════

function Inicio({ user, miAlmacen, almacenes, valorMiAlmacen, stockGlobal, alertas, movsHoy, setVista }) {
  const nombre = (user?.email || '').split('@')[0].toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header personalizado */}
      <div style={{
        background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
        color: '#fff', padding: '22px 24px', borderRadius: '16px',
        borderLeft: `5px solid ${BASE.gold}`,
        boxShadow: '0 8px 24px rgba(15,42,71,0.3)',
      }}>
        <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.5px' }}>
          PANEL DE ALMACENERO
        </p>
        <p style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>Hola, {nombre}</p>
        {miAlmacen ? (
          <>
            <p style={{ fontSize: '13.5px', opacity: 0.92, marginTop: '4px' }}>
              🏬 {miAlmacen.nombre}
            </p>
            <p style={{ fontSize: '11px', opacity: 0.75, marginTop: '4px', fontFamily: 'monospace' }}>
              {miAlmacen.codigo} · {miAlmacen.tipo === 'central' ? 'Almacen Central' : 'Almacen de Obra'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '6px', color: BASE.gold }}>
            ⚠️ No tienes almacen asignado. Contacta al admin.
          </p>
        )}
      </div>

      {/* Stats rapidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <StatCard
          label="VALOR INVENTARIO"
          valor={fmtSoles(valorMiAlmacen)}
          color={BASE.gold}
          icono="💰"
        />
        <StatCard
          label="MATERIALES EN STOCK"
          valor={stockGlobal.size}
          color={BASE.navy}
          icono="📦"
        />
        <StatCard
          label="MOVIMIENTOS HOY"
          valor={movsHoy.length}
          color={BASE.green}
          icono="📈"
        />
        <StatCard
          label="ALERTAS"
          valor={alertas.length}
          color={alertas.length > 0 ? BASE.red : BASE.green}
          icono="🚨"
        />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{
          background: BASE.red + '12',
          border: `1.5px solid ${BASE.red}55`,
          borderLeft: `5px solid ${BASE.red}`,
          borderRadius: '12px', padding: '14px 16px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.red, letterSpacing: '0.5px', marginBottom: '8px' }}>
            {alertas.length} ALERTAS DE STOCK
          </p>
          {alertas.slice(0, 3).map(a => (
            <div key={a.materialId} style={{
              padding: '6px 0', borderBottom: `1px solid ${BASE.red}22`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: BASE.navy }}>{a.material}</span>
              <span style={{ fontSize: '11px', color: BASE.red, fontWeight: '900' }}>{a.stockActual}/{a.stockMinimo}</span>
            </div>
          ))}
          {alertas.length > 3 && (
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '6px', textAlign: 'center', fontStyle: 'italic' }}>
              + {alertas.length - 3} alertas mas
            </p>
          )}
        </div>
      )}

      {/* Acciones principales (botones grandes mobile) */}
      <BigButton
        onClick={() => setVista('entrada')}
        gradient={`linear-gradient(135deg, ${BASE.green}, ${BASE.greenDark})`}
        icono="⬇️"
        titulo="REGISTRAR ENTRADA"
        desc="Recibir material de proveedor"
      />

      <BigButton
        onClick={() => setVista('salida')}
        gradient={`linear-gradient(135deg, ${BASE.red}, ${BASE.redDark})`}
        icono="⬆️"
        titulo="REGISTRAR SALIDA"
        desc="Vale digital con firma"
      />

      <BigButton
        onClick={() => setVista('stock')}
        gradient={`linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`}
        icono="📊"
        titulo="VER STOCK ACTUAL"
        desc="Inventario de mi almacen"
      />

      <BigButton
        onClick={() => setVista('kardex')}
        gradient={`linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`}
        icono="📈"
        titulo="HISTORIAL DE MOVIMIENTOS"
        desc="Kardex completo"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VISTA STOCK DETALLE (lista compacta)
// ════════════════════════════════════════════════════════════════

function StockDetalle({ stockGlobal, materiales, miAlmacen }) {
  const matMap = useMemo(() => new Map(materiales.map(m => [m.id, m])), [materiales]);
  const [filtro, setFiltro] = useState('');

  const lista = useMemo(() => {
    const arr = [];
    for (const [id, slot] of stockGlobal.entries()) {
      const m = matMap.get(id);
      if (!m) continue;
      arr.push({ ...slot, material: m });
    }
    return arr
      .filter(x => {
        if (!filtro) return true;
        const f = filtro.toLowerCase();
        return x.material.codigo?.toLowerCase().includes(f) ||
               x.material.nombre?.toLowerCase().includes(f);
      })
      .sort((a, b) => b.valorTotal - a.valorTotal);
  }, [stockGlobal, matMap, filtro]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '14px 16px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>
          STOCK · {miAlmacen?.nombre || 'TODOS'}
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
          {lista.length} materiales con stock
        </p>
        <input type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{
            width: '100%', marginTop: '10px',
            padding: '9px 14px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`,
            fontSize: '12.5px', fontWeight: '600', background: '#fff',
          }} />
      </div>

      {lista.map(x => (
        <div key={x.materialId} style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '12px', padding: '14px 16px',
          borderLeft: `4px solid ${x.material.stockMinimo > 0 && x.cantidad < x.material.stockMinimo ? BASE.red : BASE.green}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>{x.material.nombre}</p>
              <p style={{ fontSize: '10.5px', color: BASE.muted, fontFamily: 'monospace', marginTop: '2px' }}>
                {x.material.codigo} · {x.material.categoria}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                {fmtCantidad(x.cantidad, x.material.unidad)}
              </p>
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                {fmtSoles(x.valorTotal)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {lista.length === 0 && (
        <p style={{ textAlign: 'center', padding: '40px', color: BASE.muted, fontSize: '13px' }}>
          Sin materiales en stock
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════

function StatCard({ label, valor, color, icono }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '12px', padding: '14px 16px',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.7px' }}>{label}</p>
        <span style={{ fontSize: '14px', opacity: 0.5 }}>{icono}</span>
      </div>
      <p style={{ fontSize: '17px', fontWeight: '900', color, marginTop: '4px' }}>{valor}</p>
    </div>
  );
}

function BigButton({ onClick, gradient, icono, titulo, desc }) {
  return (
    <button onClick={onClick} style={{
      background: gradient, color: '#fff',
      border: 'none', borderRadius: '14px',
      padding: '20px 22px',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '14px',
      textAlign: 'left',
      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      transition: 'transform 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{ fontSize: '32px' }}>{icono}</span>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px' }}>{titulo}</p>
        <p style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '2px' }}>{desc}</p>
      </div>
    </button>
  );
}

function ConBack({ onBack, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button onClick={onBack} style={{
        padding: '10px 16px', borderRadius: '8px',
        background: BASE.white, color: BASE.navy,
        border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '900',
        cursor: 'pointer', alignSelf: 'flex-start',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>← VOLVER</button>
      {children}
    </div>
  );
}
