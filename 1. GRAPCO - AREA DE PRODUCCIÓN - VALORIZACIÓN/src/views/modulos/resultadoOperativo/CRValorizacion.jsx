// src/views/modulos/resultadoOperativo/CRValorizacion.jsx
// CR · VALORIZACIÓN — "Vendido vs Costo Real (MO)" por FAMILIA (prefijo). Vive en el RO,
// al lado del CR de HH, para que el Resultado Operativo muestre los DOS costos reales:
//   • CR de HH (Costo Real CR · por partida)  ← CostoRealCR.jsx
//   • CR de Valorización (este: lo VENDIDO de la val vs el CR de MO, margen por familia)
//
// Reusa la MISMA lógica que el resumen por familia de la Valorización F07 (sin tocarla):
//   • Vendido (acum S/) = PresupuestoF07 × acumulado de ValorizacionF07_Avance (último periodo).
//   • CR MO = HH × S/25.5 por familia, desde useAvanceF07Vivo (cobertura.crPorPrefijo) —
//     las MISMAS HH de los tareos que usa el CR de HH; aquí solo se reagrupan por prefijo.
//   • Margen = (Vendido − CR) / Vendido. Prefijo = el designado en OT o el auto-sugerido.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import useAvanceF07Vivo from '../../../hooks/useAvanceF07Vivo';
import { sugerirPrefijo, familiaDe, colorPrefijo } from '../../../utils/prefijos';

const NAVY = '#0F2A47', NAVY2 = '#15314F', GOLD = BASE.gold;
const MONO = 'var(--grapco-font-mono, monospace)';

const soles = (n) => 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
const pctTxt = (n) => (Number.isFinite(n) ? Math.round(n * 100) : 0) + '%';

const thGrp = { padding: '5px 10px', background: NAVY, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' };
const thCol = { padding: '5px 10px', background: NAVY2, color: '#cbd5e1', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `2px solid ${GOLD}` };
const num = { padding: '5px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, whiteSpace: 'nowrap' };

export default function CRValorizacion() {
  const { proyectoActivo, proyectoActivoId } = useProyectoActivo();
  const proyId = proyectoActivoId || proyectoActivo?.id;
  const [presu, setPresu] = useState([]);
  const [avancesOficial, setAvancesOficial] = useState([]);
  const [f07Map, setF07Map] = useState({});
  const [loading, setLoading] = useState(true);

  // Avance + CR (HH×S/25.5) por familia EN VIVO desde la producción — mismo hook del ISP.
  const { cobertura } = useAvanceF07Vivo({ proyId, presu });

  useEffect(() => {
    if (!proyId) { setPresu([]); setAvancesOficial([]); setF07Map({}); setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) => {
      setPresu(snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyId).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'ValorizacionF07_Avance'), (snap) => {
      setAvancesOficial(snap.docs.map(d => d.data()).filter(a => a.proyectoId === proyId).sort((a, b) => (a.valN || 0) - (b.valN || 0)));
    });
    const u3 = onSnapshot(doc(db, 'Prefijos_Catalogo', proyId), (d) => setF07Map(d.data()?.f07Map || {}));
    return () => { u1(); u2(); u3(); };
  }, [proyId]);

  // Resumen por familia: Vendido (acum S/) vs CR MO + margen. Misma fórmula que la Val F07.
  const { filas, tot } = useMemo(() => {
    // Acumulado (cantidad) por ítem del ÚLTIMO periodo valorizado (V-01..V-09 / LIQ).
    const docSel = avancesOficial.length ? avancesOficial[avancesOficial.length - 1] : null;
    const acumItem = {};
    (docSel?.avances || []).forEach(x => { const k = x.key || x.item; acumItem[k] = (acumItem[k] || 0) + (Number(x.acum) || 0); });

    const fam = {};
    presu.forEach(p => {
      if (!p.esPartida || p.pu == null) return;
      const pref = (f07Map[p.mkey] || sugerirPrefijo({ codigo: p.item, descripcion: p.descripcion }).prefijo) || '(sin)';
      const f = (fam[pref] = fam[pref] || { pref, parcial: 0, acum: 0, items: 0 });
      f.parcial += (p.cant || 0) * p.pu;
      f.acum += (acumItem[p.mkey] || 0) * p.pu;
      f.items += 1;
    });
    // Familias que solo tienen CR (HH) aunque no tengan partida valorizable (p.ej. indirectos).
    const cr = cobertura?.crPorPrefijo || {};
    Object.keys(cr).forEach(pref => { if (!fam[pref]) fam[pref] = { pref, parcial: 0, acum: 0, items: 0 }; });

    const filas = Object.values(fam)
      .map(f => {
        const crVal = cr[f.pref]?.cr || 0;
        return { ...f, hh: cr[f.pref]?.hh || 0, cr: crVal, pct: f.parcial > 0 ? f.acum / f.parcial : 0, margen: f.acum > 0 ? (f.acum - crVal) / f.acum : 0 };
      })
      .filter(f => f.parcial > 0 || f.cr > 0)
      .sort((a, b) => b.acum - a.acum);

    const tot = filas.reduce((s, f) => ({
      parcial: s.parcial + f.parcial, acum: s.acum + f.acum, cr: s.cr + f.cr,
    }), { parcial: 0, acum: 0, cr: 0 });
    tot.margen = tot.acum > 0 ? (tot.acum - tot.cr) / tot.acum : 0;
    return { filas, tot };
  }, [presu, avancesOficial, f07Map, cobertura]);

  if (!proyId) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando valorización…</p>;

  if (!filas.length) {
    return (
      <div style={{ background: BASE.white, border: `1px dashed ${BASE.border}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', boxShadow: BASE.shadowMd }}>
        <p style={{ fontSize: 36, marginBottom: 4 }}>💰</p>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: BASE.navy }}>El CR de Valorización cruza lo vendido con el costo real</h3>
        <p style={{ fontSize: 12, color: BASE.muted, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.55 }}>
          Compara lo VENDIDO en la Valorización F07 (por familia/prefijo) contra el Costo Real de MO (HH × S/25.5). Se llena al cargar el presupuesto F07, valorizar y registrar tareos. Afina las familias en OT → Prefijos / Códigos.
        </p>
      </div>
    );
  }

  const sinPrefijo = !Object.keys(f07Map).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: BASE.white, border: `1px solid ${BASE.border}`, borderLeft: `4px solid ${GOLD}`, borderRadius: 10, padding: '8px 14px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: BASE.navy, letterSpacing: 0.3 }}>CR · Valorización</span>
        <span style={{ fontSize: 11, color: BASE.muted, fontWeight: 600 }}>
          {proyectoActivo?.nombre || 'Proyecto'} · Vendido (F07) vs Costo Real de MO por familia
        </span>
        {sinPrefijo && <span style={{ marginLeft: 'auto', fontSize: 10, color: BASE.gold, fontWeight: 800 }}>⚠ Prefijos auto-sugeridos — afínalos en OT → Prefijos / Códigos.</span>}
      </div>

      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 20px -10px rgba(15,23,42,0.18)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640, fontSize: 11.5 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thGrp, textAlign: 'left', paddingLeft: 14, minWidth: 220, borderBottom: `2px solid ${GOLD}` }}>FAMILIA (PREFIJO)</th>
                <th colSpan={2} style={{ ...thGrp, borderBottom: `3px solid ${GOLD}` }}>VENDIDO (VALORIZADO)</th>
                <th rowSpan={2} style={thCol}>CR MO (S/)</th>
                <th rowSpan={2} style={{ ...thCol, minWidth: 90 }}>MARGEN</th>
              </tr>
              <tr>
                <th style={thCol}>ACUM (S/)</th>
                <th style={thCol}>% PPTO</th>
              </tr>
            </thead>
            <tbody>
              {/* Σ TOTAL */}
              <tr style={{ background: NAVY2, borderTop: `2px solid ${GOLD}`, borderBottom: `2px solid ${GOLD}` }}>
                <td style={{ padding: '7px 14px', color: '#fff', fontWeight: 900, fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>Σ TOTAL</td>
                <td style={{ ...num, color: GOLD, fontWeight: 900 }}>{soles(tot.acum)}</td>
                <td style={{ ...num, color: '#cbd5e1', fontWeight: 800 }}>{tot.parcial > 0 ? pctTxt(tot.acum / tot.parcial) : '—'}</td>
                <td style={{ ...num, color: '#fff', fontWeight: 800 }}>{soles(tot.cr)}</td>
                <td style={{ ...num, color: tot.margen >= 0 ? '#86efac' : '#fca5a5', fontWeight: 900 }}>{tot.acum > 0 ? pctTxt(tot.margen) : '—'}</td>
              </tr>

              {filas.map((f, idx) => {
                const c = f.pref === '(sin)' ? '#94a3b8' : colorPrefijo(f.pref);
                return (
                  <tr key={f.pref} style={{ background: idx % 2 ? '#f3f6fa' : '#eef2f7', borderTop: `1px solid ${BASE.border}` }}>
                    <td style={{ padding: '6px 12px', borderLeft: `4px solid ${c}` }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: c, borderRadius: 4, padding: '1px 6px', fontFamily: MONO, marginRight: 7 }}>{f.pref}</span>
                      <span style={{ fontWeight: 700, fontSize: 11, color: BASE.navy }}>{f.pref === '(sin)' ? 'Sin familia' : familiaDe(f.pref)}</span>
                      <span style={{ fontSize: 9, color: BASE.muted, marginLeft: 6 }}>· {f.items} ítem(s)</span>
                    </td>
                    <td style={{ ...num, fontWeight: 900, color: BASE.green }}>{soles(f.acum)}</td>
                    <td style={{ padding: '4px 10px', minWidth: 90 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#dde5ef', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.round(f.pct * 100))}%`, height: '100%', background: c }} />
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: BASE.navy, minWidth: 26, textAlign: 'right', fontFamily: MONO }}>{Math.round(f.pct * 100)}%</span>
                      </div>
                    </td>
                    <td style={{ ...num, fontWeight: 800, color: BASE.navy }}>{soles(f.cr)}</td>
                    <td style={{ ...num, fontWeight: 900, color: f.acum <= 0 ? BASE.mutedSoft : f.margen >= 0 ? BASE.green : BASE.red }}>
                      {f.acum > 0 ? pctTxt(f.margen) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 10, color: BASE.mutedSoft, lineHeight: 1.45 }}>
        Vendido = acumulado de la Valorización F07 (último periodo) por familia · CR MO = HH × S/25.5 de los tareos (misma data del CR de HH, reagrupada por prefijo) · Margen = (Vendido − CR) / Vendido.
      </p>
    </div>
  );
}
