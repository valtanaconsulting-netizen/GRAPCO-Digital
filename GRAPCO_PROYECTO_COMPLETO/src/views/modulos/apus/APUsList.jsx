// src/views/modulos/apus/APUsList.jsx — Lista de APUs con scope empresa/proyecto (B25)
//
// REGLAS DE NEGOCIO:
// - APUs scope "empresa" → reutilizables entre TODOS los proyectos
// - APUs scope "proyecto" → específicos de un proyecto (custom)
// - Filtros visuales por scope, búsqueda, y proyecto activo
// - Botón "📋 Copiar a este proyecto" → clona un APU empresarial al proyecto activo
// - Botón "🌎 Promover a empresa" → vuelve un APU específico en empresarial

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { calcularCostoAPU, fmtSoles, fmtPct } from '../../../utils/planMaestroAnalytics';
import { APUS_CREDITEX_RAW, transformarAPU, clasificarAPU, CATEGORIAS_APU } from '../../../data/seed/apusCreditex';
import { LEGACY_CREDITEX_IDS } from '../../../hooks/useCatalogoWBS';
import EmptyState from '../../../components/EmptyState';

const CAT_BY_ID = Object.fromEntries(CATEGORIAS_APU.map(c => [c.id, c]));

const SCOPE_EMPRESA = 'empresa';
const SCOPE_PROYECTO = 'proyecto';

export default function APUsList({ showToast, onEdit, onNuevo }) {
  const { user, rol } = useAuth();
  const { proyectoActivo, proyectoActivoId } = useProyectoActivo();
  const [apus, setApus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroScope, setFiltroScope] = useState('todos');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [colapsadas, setColapsadas] = useState({}); // { [catId]: true }

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'APUs'), orderBy('codigo')),
      (snap) => { setApus(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error(e); setLoading(false); });
    return () => unsub();
  }, []);

  // Categoría efectiva: la guardada, o inferida de la descripción (APUs viejos sin categoría)
  const catDe = (a) => a.categoria || clasificarAPU(a.descripcion);

  // Aislamiento multi-proyecto: los APUs "empresa" (catálogo CREDITEX) solo se
  // muestran en proyectos legacy CREDITEX. Un proyecto nuevo (TEXTIL) ve SOLO
  // los APUs creados con su propio proyectoId — no hereda los de CREDITEX.
  const esLegacy = LEGACY_CREDITEX_IDS.includes(proyectoActivoId);
  const filtrados = useMemo(() => {
    return apus.filter(a => {
      const scope = a.scope || (a.proyectoId ? SCOPE_PROYECTO : SCOPE_EMPRESA);
      if (scope === SCOPE_EMPRESA && !esLegacy) return false; // empresa solo en CREDITEX
      if (filtroScope === SCOPE_EMPRESA && scope !== SCOPE_EMPRESA) return false;
      if (filtroScope === SCOPE_PROYECTO && scope !== SCOPE_PROYECTO) return false;
      if (scope === SCOPE_PROYECTO && a.proyectoId !== proyectoActivoId) return false;
      if (filtroCat !== 'todas' && catDe(a) !== filtroCat) return false;
      if (!filtro) return true;
      const f = filtro.toLowerCase();
      return (a.codigo || '').toLowerCase().includes(f) ||
             (a.descripcion || '').toLowerCase().includes(f);
    });
  }, [apus, filtro, filtroScope, filtroCat, proyectoActivoId, esLegacy]);

  // Agrupado por categoría, respetando el orden de CATEGORIAS_APU
  const grupos = useMemo(() => {
    const map = {};
    filtrados.forEach(a => {
      const c = catDe(a);
      (map[c] = map[c] || []).push(a);
    });
    return CATEGORIAS_APU
      .filter(cat => map[cat.id]?.length)
      .map(cat => ({
        ...cat,
        apus: map[cat.id].sort((x, y) => (x.codigo || '').localeCompare(y.codigo || '')),
      }));
  }, [filtrados]);

  // Conteo por categoría (sobre el universo visible por scope, ignorando filtro de cat/texto)
  const conteoCats = useMemo(() => {
    const base = apus.filter(a => {
      const scope = a.scope || (a.proyectoId ? SCOPE_PROYECTO : SCOPE_EMPRESA);
      if (filtroScope === SCOPE_EMPRESA && scope !== SCOPE_EMPRESA) return false;
      if (filtroScope === SCOPE_PROYECTO && scope !== SCOPE_PROYECTO) return false;
      if (scope === SCOPE_PROYECTO && a.proyectoId !== proyectoActivoId) return false;
      return true;
    });
    const m = {};
    base.forEach(a => { const c = catDe(a); m[c] = (m[c] || 0) + 1; });
    return m;
  }, [apus, filtroScope, proyectoActivoId]);

  const conteoEmpresa = useMemo(() =>
    apus.filter(a => (a.scope || SCOPE_EMPRESA) === SCOPE_EMPRESA).length,
    [apus]);
  const conteoProyecto = useMemo(() =>
    apus.filter(a => a.scope === SCOPE_PROYECTO && a.proyectoId === proyectoActivoId).length,
    [apus, proyectoActivoId]);

  const copiarAlProyecto = async (apu) => {
    if (!proyectoActivoId) { showToast?.('Selecciona un proyecto activo primero', 'error'); return; }
    if (!confirm(`Copiar APU "${apu.codigo}" al proyecto "${proyectoActivo?.nombre}"?\n\nSe creará una copia con scope=proyecto que podrás modificar.`)) return;
    try {
      const { id, creadoEn, creadoPor, ...payload } = apu;
      await addDoc(collection(db, 'APUs'), {
        ...payload,
        codigo: apu.codigo + '-COPY',
        descripcion: '[Copia] ' + apu.descripcion,
        scope: SCOPE_PROYECTO,
        proyectoId: proyectoActivoId,
        copiadoDeApuId: apu.id,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'desconocido',
      });
      showToast?.(`✅ APU "${apu.codigo}" copiado al proyecto`, 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const promoverAEmpresa = async (apu) => {
    if (!confirm(`Promover APU "${apu.codigo}" al catálogo empresarial?\n\nQuedará disponible para TODOS los proyectos.`)) return;
    try {
      await updateDoc(doc(db, 'APUs', apu.id), {
        scope: SCOPE_EMPRESA,
        proyectoId: null,
        promovidoEn: serverTimestamp(),
        promovidoPor: user?.email || 'desconocido',
      });
      showToast?.(`🌎 APU "${apu.codigo}" promovido a empresarial`, 'success');
    } catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const eliminar = async (apu) => {
    if (!confirm(`¿Eliminar APU "${apu.codigo}"?`)) return;
    try { await deleteDoc(doc(db, 'APUs', apu.id)); showToast?.('🗑️ APU eliminado', 'success'); }
    catch (e) { showToast?.('Error: ' + e.message, 'error'); }
  };

  const [importando, setImportando] = useState(false);
  const importarCreditex = async () => {
    const total = APUS_CREDITEX_RAW.length;
    if (!confirm(
      `Importar ${total} APUs del presupuesto CREDITEX PTARI al catálogo EMPRESARIAL.\n\n` +
      `Se omiten los que ya existan (por código CRX-XXX). ¿Continuar?`
    )) return;
    setImportando(true);
    try {
      // Códigos ya existentes para no duplicar
      const snap = await getDocs(collection(db, 'APUs'));
      const existentes = new Set(snap.docs.map(d => d.data()?.codigo).filter(Boolean));

      let creados = 0, omitidos = 0;
      // Firestore batch: máx 500 ops; aquí son ~43, una sola tanda
      const batch = writeBatch(db);
      APUS_CREDITEX_RAW.forEach((raw, i) => {
        const base = transformarAPU(raw, i);
        if (existentes.has(base.codigo)) { omitidos++; return; }
        const costo = calcularCostoAPU(base);
        const ref = doc(collection(db, 'APUs'));
        batch.set(ref, {
          ...base,
          costoUnitarioTotal: costo?.costoUnitarioTotal ?? 0,
          subtotalMO:  costo?.subtotalMO ?? 0,
          subtotalMat: costo?.subtotalMat ?? 0,
          subtotalEq:  costo?.subtotalEq ?? 0,
          subtotalSC:  costo?.subtotalSC ?? 0,
          scope: SCOPE_EMPRESA,
          proyectoId: null,
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'import-creditex',
        });
        creados++;
      });
      if (creados > 0) await batch.commit();
      showToast?.(`✅ Importación CREDITEX: ${creados} creados · ${omitidos} omitidos (ya existían)`, 'success');
    } catch (e) {
      console.error('[importarCreditex]', e);
      showToast?.('Error importando: ' + e.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  const toggleCat = (id) => setColapsadas(p => ({ ...p, [id]: !p[id] }));

  const renderCard = (a) => {
    const costo = calcularCostoAPU(a);
    const scope = a.scope || (a.proyectoId ? SCOPE_PROYECTO : SCOPE_EMPRESA);
    const esEmpresa = scope === SCOPE_EMPRESA;
    const cScope = esEmpresa ? BASE.gold : CHART_PALETTE[3];
    return (
      <div key={a.id} style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderLeft: `4px solid ${cScope}`,
        borderRadius: '10px', padding: '12px 14px',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            background: cScope, color: '#fff',
            padding: '1px 7px', borderRadius: '5px',
            fontSize: '9px', fontWeight: '900', letterSpacing: '0.3px',
          }}>{esEmpresa ? '🌎 EMPRESA' : '🏗️ PROYECTO'}</span>
          <span style={{ fontSize: '10.5px', fontWeight: '900', color: cScope, fontFamily: 'monospace' }}>{a.codigo}</span>
        </div>
        <p style={{ fontSize: '12.5px', fontWeight: '800', color: BASE.navy, marginTop: '5px', lineHeight: 1.25 }}>
          {a.descripcion}
        </p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '3px' }}>
          Unidad: <strong>{a.unidad || '—'}</strong> · Rend.: <strong>{a.rendimientoBase || '—'}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '9px' }}>
          <Mini label="Costo unit." valor={fmtSoles(costo.costoUnitarioTotal)} color={cScope} chico />
          <Mini label="MO" valor={fmtPct(costo.incidenciaMO)} color="#16a34a" />
          <Mini label="Materiales" valor={fmtPct(costo.incidenciaMat)} color="#dc2626" />
        </div>

        {a.precioUnitarioReferencia > 0 && (() => {
          const calc = costo.costoUnitarioTotal || 0;
          const ref  = a.precioUnitarioReferencia;
          const desvPct = ref > 0 ? ((calc - ref) / ref) * 100 : 0;
          const abs = Math.abs(desvPct);
          const col = abs <= 2 ? '#16a34a' : abs <= 10 ? '#d97706' : '#dc2626';
          const ico = abs <= 2 ? '✓' : abs <= 10 ? '⚠' : '✕';
          return (
            <div style={{
              marginTop: '7px', padding: '6px 9px',
              background: `${col}10`, border: `1px solid ${col}40`,
              borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '8px', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '9.5px', fontWeight: '700', color: BASE.muted }}>
                S10: <strong style={{ color: BASE.navy }}>{fmtSoles(ref)}</strong>
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: col, fontFamily: 'monospace' }}>
                {ico} {desvPct >= 0 ? '+' : ''}{Math.round(desvPct)}%
              </span>
            </div>
          );
        })()}

        <div style={{ display: 'flex', gap: '5px', marginTop: '9px', flexWrap: 'wrap' }}>
          {(rol === 'admin' || rol === 'ingeniero') && (
            <button onClick={() => onEdit?.(a)} style={btnAct(BASE.navy)}>✏️ Editar</button>
          )}
          {esEmpresa && proyectoActivoId && (
            <button onClick={() => copiarAlProyecto(a)} style={btnAct(CHART_PALETTE[3])}>📋 Copiar</button>
          )}
          {!esEmpresa && rol === 'admin' && (
            <button onClick={() => promoverAEmpresa(a)} style={btnAct(BASE.gold)}>🌎 Promover</button>
          )}
          {rol === 'admin' && (
            <button onClick={() => eliminar(a)} style={btnAct(BASE.red)}>×</button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando APUs...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '10px', padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.navy }}>Catálogo APUs</p>
            <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>
              <span style={{ color: BASE.gold, fontWeight: '900' }}>🌎 {conteoEmpresa} empresa</span> ·
              <span style={{ color: CHART_PALETTE[3], fontWeight: '900', marginLeft: '5px' }}>🏗️ {conteoProyecto} proyecto</span>
              {proyectoActivo && <span style={{ color: BASE.muted, marginLeft: '5px' }}>· {proyectoActivo.nombre}</span>}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '4px', background: BASE.bgSoft, padding: '4px', borderRadius: '8px' }}>
            {[
              { id: 'todos',         l: 'Todos',         c: BASE.navy },
              { id: SCOPE_EMPRESA,   l: '🌎 Empresa',    c: BASE.gold },
              { id: SCOPE_PROYECTO,  l: '🏗️ Proyecto',   c: CHART_PALETTE[3] },
            ].map(t => {
              const activo = filtroScope === t.id;
              return (
                <button key={t.id} onClick={() => setFiltroScope(t.id)} style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: activo ? t.c : 'transparent',
                  color: activo ? '#fff' : BASE.muted,
                  border: 'none',
                  fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                  letterSpacing: '0.3px',
                }}>{t.l}</button>
              );
            })}
          </div>

          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
            style={{ ...inpS, minWidth: '190px', cursor: 'pointer' }}>
            <option value="todas">📂 Todas las categorías</option>
            {CATEGORIAS_APU.map(c => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.label}{conteoCats[c.id] ? ` (${conteoCats[c.id]})` : ''}
              </option>
            ))}
          </select>

          <input type="text" value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="🔍 Buscar..." style={{ ...inpS, minWidth: '200px' }} />

          {(rol === 'admin' || rol === 'ingeniero') && (
            <>
              <button onClick={importarCreditex} disabled={importando}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: importando ? BASE.muted : BASE.gold, color: '#fff',
                  fontSize: '12px', fontWeight: '900', cursor: importando ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                {importando ? '⏳ Importando…' : `📥 Importar CREDITEX (${APUS_CREDITEX_RAW.length})`}
              </button>
              <button onClick={() => onNuevo?.()} style={btnNuevo}>➕ NUEVO APU</button>
            </>
          )}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icono="💰" titulo="Sin APUs en este filtro"
          descripcion={filtroScope === SCOPE_EMPRESA
            ? 'No hay APUs en el catálogo empresarial. Crea APUs reutilizables.'
            : filtroScope === SCOPE_PROYECTO
              ? 'No hay APUs específicos del proyecto. Copia desde el catálogo empresarial o crea nuevos.'
              : 'Crea tu primer APU.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {grupos.map(g => {
            const colapsada = !!colapsadas[g.id];
            return (
              <div key={g.id}>
                {/* Cabecera de categoría */}
                <button onClick={() => toggleCat(g.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                  background: `${g.color}12`, border: `1px solid ${g.color}40`,
                  borderLeft: `4px solid ${g.color}`,
                  borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                  marginBottom: colapsada ? 0 : '8px',
                }}>
                  <span style={{ fontSize: '11px', color: g.color }}>{colapsada ? '▶' : '▼'}</span>
                  <span style={{ fontSize: '14px' }}>{g.icono}</span>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: g.color, letterSpacing: '0.4px', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
                    {g.label}
                  </span>
                  <span style={{
                    background: g.color, color: '#fff', borderRadius: '999px',
                    padding: '1px 9px', fontSize: '10.5px', fontWeight: '900', fontFamily: 'monospace',
                  }}>{g.apus.length}</span>
                </button>

                {!colapsada && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '10px' }}>
                    {g.apus.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, valor, color, chico }) {
  return (
    <div style={{
      background: color + '12', border: `1px solid ${color}33`,
      borderRadius: '7px', padding: '6px 8px',
    }}>
      <p style={{ fontSize: '8px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: chico ? '11.5px' : '13px', fontWeight: '900', color, marginTop: '1px', fontFamily: 'monospace' }}>{valor}</p>
    </div>
  );
}

const inpS = { padding: '7px 10px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '600', background: '#fff' };
const btnNuevo = {
  padding: '8px 14px', borderRadius: '8px',
  background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
  color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
  cursor: 'pointer', letterSpacing: '0.3px', whiteSpace: 'nowrap',
  boxShadow: BASE.shadowSm,
};
const btnAct = (color) => ({
  padding: '5px 10px', borderRadius: '6px', background: color, color: '#fff',
  border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.3px',
});
