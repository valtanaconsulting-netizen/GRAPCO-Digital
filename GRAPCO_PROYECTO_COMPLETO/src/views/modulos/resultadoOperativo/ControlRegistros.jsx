// src/views/modulos/resultadoOperativo/ControlRegistros.jsx
// Hoja "CR" del formato GP-GCE-FOR-F06 (RO_CREDITEX): cruza el costo real
// contra cada fuente de registro (facturas, almacen, tareos, gastos generales)
// para detectar partidas mal-imputadas o sin sustento.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import EmptyState from '../../../components/EmptyState';

const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Estado de cuadre por fila: ok si la diferencia entre real y suma de registros es ≤ 1%
const cuadreEstado = (real, registrado) => {
  const r = Number(real) || 0;
  const t = Number(registrado) || 0;
  if (r === 0 && t === 0) return { color: BASE.muted, text: '—' };
  const diff = Math.abs(r - t);
  const tol = Math.max(Math.abs(r) * 0.01, 1);
  if (diff <= tol)            return { color: BASE.green,    text: 'OK' };
  if (diff <= Math.abs(r)*0.05) return { color: BASE.gold,    text: 'Revisar' };
  return { color: BASE.red, text: 'Descuadre' };
};

export default function ControlRegistros({ showToast }) {
  const [partidas, setPartidas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'PartidasContractuales'),
        (snap) => { setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'Historial'),
        (snap) => setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'Kardex_Movimientos'),
        (snap) => setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Agrupa los costos por partida desde cada fuente (placeholder de cálculo
  // hasta que existan datos reales en Firestore). Cuando haya datos, esta
  // función se ajusta para mapear los movimientos de almacén/facturas/tareos
  // hacia la partida correspondiente.
  const filas = useMemo(() => {
    return partidas.map(p => {
      const real = Number(p.costoReal || 0);
      const registroFacturas = Number(p.acumFacturas || 0);
      const registroAlmacen  = Number(p.acumAlmacen  || 0);
      const controlTareos    = Number(p.acumTareos   || 0);
      const gastosGenerales  = Number(p.acumGG       || 0);
      const totalRegistro = registroFacturas + registroAlmacen + controlTareos + gastosGenerales;
      return {
        codigo: p.codigo || p.id,
        descripcion: p.descripcion || '—',
        real,
        registroFacturas,
        registroAlmacen,
        controlTareos,
        gastosGenerales,
        totalRegistro,
        cuadre: cuadreEstado(real, totalRegistro),
      };
    });
  }, [partidas]);

  const totales = useMemo(() => {
    const acc = filas.reduce((a, f) => ({
      real: a.real + f.real,
      facturas: a.facturas + f.registroFacturas,
      almacen: a.almacen + f.registroAlmacen,
      tareos: a.tareos + f.controlTareos,
      gg: a.gg + f.gastosGenerales,
      total: a.total + f.totalRegistro,
    }), { real: 0, facturas: 0, almacen: 0, tareos: 0, gg: 0, total: 0 });
    return acc;
  }, [filas]);

  if (loading) {
    return <p style={{ color: BASE.muted, fontSize: '12px', padding: '20px' }}>Cargando registros…</p>;
  }

  if (!filas.length) {
    return (
      <EmptyState
        icono="🧾"
        titulo="Sin partidas para cruzar"
        descripcion="Carga las partidas contractuales y los costos reales (facturas, almacén, tareos, GG) para ver el control."
      />
    );
  }

  const HEADERS = [
    { id: 'codigo',   l: 'Partida', w: '90px',  align: 'left' },
    { id: 'desc',     l: 'Descripción', w: 'auto', align: 'left' },
    { id: 'real',     l: 'Costo Real (AC)', w: '130px', align: 'right', highlight: '#fef3c7' },
    { id: 'fact',     l: 'Reg. Facturas',   w: '120px', align: 'right', highlight: '#ede9fe' },
    { id: 'alm',      l: 'Reg. Almacén',    w: '120px', align: 'right', highlight: '#dcfce7' },
    { id: 'tar',      l: 'Control Tareos',  w: '120px', align: 'right', highlight: '#fef3c7' },
    { id: 'gg',       l: 'Gastos Grales',   w: '120px', align: 'right', highlight: '#fee2e2' },
    { id: 'total',    l: 'Total Registro',  w: '130px', align: 'right', highlight: '#dbeafe' },
    { id: 'estado',   l: 'Cuadre',          w: '110px', align: 'center' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px', boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '4px' }}>
          🧾 CONTROL DE REGISTROS — CR
        </p>
        <p style={{ fontSize: '11px', color: BASE.muted, lineHeight: 1.5 }}>
          Cada fila cruza el <b>costo real (AC)</b> de la partida con la suma de las cuatro fuentes
          de registro contable. Si el cuadre es <b style={{ color: BASE.green }}>OK</b>, el RO está
          sustentado. Si es <b style={{ color: BASE.red }}>Descuadre</b>, hay imputaciones cruzadas
          o gastos sin asignar a partida.
        </p>
      </div>

      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', overflow: 'auto', boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '1100px' }}>
          <thead>
            <tr style={{ background: BASE.navy, color: '#fff' }}>
              {HEADERS.map(h => (
                <th key={h.id} style={{
                  padding: '10px 8px', textAlign: h.align, fontWeight: 800,
                  fontSize: '10.5px', letterSpacing: '0.4px',
                  borderBottom: `2px solid ${BASE.gold}`,
                  width: h.w,
                }}>{h.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.codigo + i} style={{
                background: i % 2 === 0 ? '#fff' : '#f8fafc',
                borderBottom: `1px solid ${BASE.border}`,
              }}>
                <td style={{ padding: '8px', fontWeight: 700, color: BASE.navy }}>{f.codigo}</td>
                <td style={{ padding: '8px' }}>{f.descripcion}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#fef3c7', fontWeight: 700 }}>{fmt(f.real)}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#ede9fe' }}>{fmt(f.registroFacturas)}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#dcfce7' }}>{fmt(f.registroAlmacen)}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#fef3c7' }}>{fmt(f.controlTareos)}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#fee2e2' }}>{fmt(f.gastosGenerales)}</td>
                <td style={{ padding: '8px', textAlign: 'right', background: '#dbeafe', fontWeight: 700 }}>{fmt(f.totalRegistro)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <span style={{
                    background: f.cuadre.color, color: '#fff',
                    padding: '3px 10px', borderRadius: '999px',
                    fontSize: '10px', fontWeight: 800, letterSpacing: '0.4px',
                  }}>{f.cuadre.text}</span>
                </td>
              </tr>
            ))}
            <tr style={{ background: BASE.navySoft, fontWeight: 900, color: BASE.navy }}>
              <td colSpan={2} style={{ padding: '10px 8px' }}>TOTAL COSTO DE OBRA</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.real)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.facturas)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.almacen)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.tareos)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.gg)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totales.total)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                {(() => {
                  const c = cuadreEstado(totales.real, totales.total);
                  return <span style={{ background: c.color, color: '#fff', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 800 }}>{c.text}</span>;
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
