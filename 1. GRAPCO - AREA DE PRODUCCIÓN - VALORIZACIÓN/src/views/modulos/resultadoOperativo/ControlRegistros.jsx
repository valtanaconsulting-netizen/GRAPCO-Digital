// src/views/modulos/resultadoOperativo/ControlRegistros.jsx
// CR · Control de Registros (hoja CR del F06) — AHORA EN VIVO desde useRO.
// Cruza el Costo Real (AC) de cada partida contra sus 4 patas (Tareos · Almacén ·
// Facturas · Subcontratos) + Gastos Generales (sección aparte). Permite IMPORTAR
// Facturas y GG con un botón in-app; el RO se recalcula solo al cargarlas.

import React, { useMemo, useState } from 'react';
import { BASE } from '../../../utils/styles';
import EmptyState from '../../../components/EmptyState';
import useRO from './useRO';
import ImportadorRegistros from './ImportadorRegistros';

const fmt = (n) => `S/ ${Math.round(Number(n) || 0).toLocaleString('es-PE')}`;
const esDeEstaPartida = (x, cod) => x?.partida === cod || x?.codigoWBS === cod || x?.actividad === cod;

// Esquemas de columnas (reusables por el importador genérico).
export const CAMPOS_FACTURAS = [
  { campo: 'partida', etiquetas: ['partida', 'codigo', 'codigowbs', 'item', 'cuenta'], tipo: 'texto', requerido: true },
  { campo: 'proveedor', etiquetas: ['proveedor', 'razonsocial', 'acreedor', 'razon'], tipo: 'texto' },
  { campo: 'documento', etiquetas: ['documento', 'comprobante', 'factura', 'serie', 'numero', 'nrodoc'], tipo: 'texto' },
  { campo: 'fecha', etiquetas: ['fecha', 'femision', 'fechaemision'], tipo: 'texto' },
  { campo: 'glosa', etiquetas: ['glosa', 'descripcion', 'concepto', 'detalle'], tipo: 'texto' },
  { campo: 'montoSinIGV', etiquetas: ['montosinigv', 'sinigv', 'subtotal', 'base', 'valorventa', 'importe', 'monto', 'costodirecto'], tipo: 'numero', requerido: true },
];
export const CAMPOS_GG = [
  { campo: 'concepto', etiquetas: ['concepto', 'descripcion', 'detalle', 'rubro', 'glosa', 'partida', 'cuenta'], tipo: 'texto', requerido: true },
  { campo: 'categoria', etiquetas: ['categoria', 'tipo', 'clase', 'grupo'], tipo: 'texto' },
  { campo: 'fecha', etiquetas: ['fecha'], tipo: 'texto' },
  { campo: 'monto', etiquetas: ['monto', 'importe', 'costo', 'total', 'valor', 'soles'], tipo: 'numero', requerido: true },
];
export const CAMPOS_SUBCONTRATOS = [
  { campo: 'partida', etiquetas: ['partida', 'codigo', 'codigowbs', 'item', 'cuenta'], tipo: 'texto', requerido: true },
  { campo: 'subcontratista', etiquetas: ['subcontratista', 'proveedor', 'razonsocial', 'empresa', 'razon'], tipo: 'texto' },
  { campo: 'valorizacion', etiquetas: ['valorizacion', 'numero', 'nro', 'val', 'periodo'], tipo: 'texto' },
  { campo: 'cdValorizado', etiquetas: ['cdvalorizado', 'valorizado', 'montosinigv', 'sinigv', 'monto', 'importe', 'costodirecto'], tipo: 'numero', requerido: true },
];

export default function ControlRegistros({ showToast }) {
  const { ro, loading, facturas, valorizacionesSC, gastosGenerales } = useRO();
  const [vista, setVista] = useState('cruce'); // cruce | facturas | gg

  const filas = useMemo(() => {
    if (!ro?.detallePartidas) return [];
    return ro.detallePartidas
      .map((p) => {
        const cod = p.codigo;
        const tareos = p.costoMORealAct || 0;
        const almacen = p.costoMatRealAct || 0;
        const fact = (facturas || []).filter(f => f.estado !== 'anulado' && esDeEstaPartida(f, cod))
          .reduce((s, f) => s + (Number(f.montoSinIGV ?? f.costoDirecto ?? f.monto ?? 0) || 0), 0);
        const sc = (valorizacionesSC || []).filter(v => v.estado !== 'anulado' && esDeEstaPartida(v, cod))
          .reduce((s, v) => s + (Number(v.cdValorizado ?? v.montoSinIGV ?? v.monto ?? 0) || 0), 0);
        const real = p.costoReal || 0;
        return { codigo: cod, descripcion: p.descripcion, tareos, almacen, fact, sc, real };
      })
      .filter(f => Math.abs(f.real) > 0.005)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true }));
  }, [ro, facturas, valorizacionesSC]);

  const tot = useMemo(() => filas.reduce((a, f) => ({
    tareos: a.tareos + f.tareos, almacen: a.almacen + f.almacen, fact: a.fact + f.fact, sc: a.sc + f.sc, real: a.real + f.real,
  }), { tareos: 0, almacen: 0, fact: 0, sc: 0, real: 0 }), [filas]);

  const ggTotal = ro?.gastosGenerales?.total || 0;
  const nFacturas = (facturas || []).filter(f => f.estado !== 'anulado').length;
  const nGG = (gastosGenerales || []).filter(g => g.estado !== 'anulado').length;
  const nSC = (valorizacionesSC || []).filter(v => v.estado !== 'anulado').length;

  // Sub-vistas de importación
  if (vista === 'facturas') {
    return (
      <Wrapper onBack={() => setVista('cruce')}>
        <ImportadorRegistros
          titulo="Registro de Facturas (proveedores / subcontratos)"
          subtitulo="Cada factura se imputa a una PARTIDA (código WBS). Suma al Costo Real (AC) de esa partida. Monto SIN IGV."
          coleccion="Registro_Facturas"
          campos={CAMPOS_FACTURAS}
          showToast={showToast}
          onDone={() => setVista('cruce')}
        />
      </Wrapper>
    );
  }
  if (vista === 'gg') {
    return (
      <Wrapper onBack={() => setVista('cruce')}>
        <ImportadorRegistros
          titulo="Gastos Generales de Oficina (GG)"
          subtitulo="Costos de obra que NO se imputan a una partida (administración, seguros, financieros…). Suman al Total Costo de Obra."
          coleccion="GG_Oficina"
          campos={CAMPOS_GG}
          showToast={showToast}
          onDone={() => setVista('cruce')}
        />
      </Wrapper>
    );
  }
  if (vista === 'subcontratos') {
    return (
      <Wrapper onBack={() => setVista('cruce')}>
        <ImportadorRegistros
          titulo="Valorizaciones a Subcontratistas (F10)"
          subtitulo="Lo valorizado a cada subcontratista, imputado a una PARTIDA. Suma al Costo Real (AC) de esa partida. Monto SIN IGV (costo directo)."
          coleccion="ValorizacionesSubcontratistas"
          campos={CAMPOS_SUBCONTRATOS}
          showToast={showToast}
          onDone={() => setVista('cruce')}
        />
      </Wrapper>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Encabezado + acciones de import */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: '1 1 280px' }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: BASE.navy, letterSpacing: 0.5 }}>🧾 CONTROL DE REGISTROS — CR (en vivo)</p>
          <p style={{ fontSize: 11, color: BASE.muted, lineHeight: 1.5, marginTop: 4 }}>
            El <b>Costo Real (AC)</b> de cada partida descompuesto en sus 4 patas. <b>Facturas</b> y <b>GG</b> se cargan aquí y el RO se recalcula solo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setVista('facturas')} style={btnImp}>📑 Importar Facturas <span style={pill}>{nFacturas}</span></button>
          <button onClick={() => setVista('subcontratos')} style={btnImp}>🤝 Importar Subcontratos <span style={pill}>{nSC}</span></button>
          <button onClick={() => setVista('gg')} style={btnImp}>🏢 Importar GG <span style={pill}>{nGG}</span></button>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 24, textAlign: 'center', color: BASE.muted }}>⏳ Cargando registros…</p>
      ) : !filas.length ? (
        <EmptyState
          icono="🧾"
          variante="bim"
          titulo="Sin costo real aún para cruzar"
          descripcion="En cuanto haya tareos, salidas de almacén, facturas o subcontratos imputados a partidas, este control mostrará el desglose del AC por fuente. Usa los botones de arriba para importar Facturas o GG."
        />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'auto', boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 980 }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th style={{ ...th, textAlign: 'left' }}>Partida</th>
                <th style={{ ...th, textAlign: 'left' }}>Descripción</th>
                <th style={{ ...th, background: '#5b21b6' }}>Tareos (MO)</th>
                <th style={{ ...th, background: '#b45309' }}>Almacén</th>
                <th style={{ ...th, background: '#1d4ed8' }}>Facturas</th>
                <th style={{ ...th, background: '#be123c' }}>Subcontr.</th>
                <th style={{ ...th, background: '#065f46' }}>Costo Real (AC)</th>
                <th style={th}>% MO</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const pctMO = f.real > 0 ? Math.round((f.tareos / f.real) * 100) : 0;
                return (
                  <tr key={f.codigo + i} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td, fontWeight: 800, color: BASE.navy, fontFamily: 'monospace' }}>{f.codigo}</td>
                    <td style={td}>{f.descripcion}</td>
                    <td style={{ ...tdN, background: '#f5f3ff' }}>{fmt(f.tareos)}</td>
                    <td style={{ ...tdN, background: '#fffbeb' }}>{fmt(f.almacen)}</td>
                    <td style={{ ...tdN, background: '#eff6ff' }}>{fmt(f.fact)}</td>
                    <td style={{ ...tdN, background: '#fff1f2' }}>{fmt(f.sc)}</td>
                    <td style={{ ...tdN, background: '#ecfdf5', fontWeight: 900 }}>{fmt(f.real)}</td>
                    <td style={{ ...tdN }}>{pctMO}%</td>
                  </tr>
                );
              })}
              <tr style={{ background: BASE.navy, color: '#fff', fontWeight: 900 }}>
                <td colSpan={2} style={{ padding: '10px 10px' }}>COSTO DIRECTO (partidas)</td>
                <td style={{ ...tdN, color: '#fff' }}>{fmt(tot.tareos)}</td>
                <td style={{ ...tdN, color: '#fff' }}>{fmt(tot.almacen)}</td>
                <td style={{ ...tdN, color: '#fff' }}>{fmt(tot.fact)}</td>
                <td style={{ ...tdN, color: '#fff' }}>{fmt(tot.sc)}</td>
                <td style={{ ...tdN, color: BASE.gold }}>{fmt(tot.real)}</td>
                <td style={{ ...tdN, color: '#fff' }}>{tot.real > 0 ? Math.round((tot.tareos / tot.real) * 100) : 0}%</td>
              </tr>
              {ggTotal > 0 && (
                <>
                  <tr style={{ background: '#fffaf0', fontWeight: 800, color: BASE.navy }}>
                    <td colSpan={6} style={{ padding: '9px 10px' }}>🏢 GASTOS GENERALES (oficina · sección aparte)</td>
                    <td style={{ ...tdN, color: BASE.goldDark }}>{fmt(ggTotal)}</td>
                    <td style={td}></td>
                  </tr>
                  <tr style={{ background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', fontWeight: 900, borderTop: `3px solid ${BASE.gold}` }}>
                    <td colSpan={6} style={{ padding: '11px 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Costo de Obra (Directo + GG)</td>
                    <td style={{ ...tdN, color: BASE.gold, fontSize: 13 }}>{fmt(tot.real + ggTotal)}</td>
                    <td style={td}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Wrapper({ children, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, background: BASE.white, color: BASE.navy, fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>← Volver al control</button>
      {children}
    </div>
  );
}

const th = { padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: 10.5, letterSpacing: 0.4, borderBottom: `2px solid ${BASE.gold}`, whiteSpace: 'nowrap' };
const td = { padding: '8px', verticalAlign: 'top' };
const tdN = { padding: '8px', textAlign: 'right', fontFamily: 'var(--grapco-font-mono, monospace)', whiteSpace: 'nowrap' };
const btnImp = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${BASE.navy}`, background: BASE.navy, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' };
const pill = { background: BASE.gold, color: BASE.navy, borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 900 };
