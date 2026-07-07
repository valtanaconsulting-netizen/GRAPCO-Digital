// src/views/oficinatecnica/PrefijosCodigos.jsx
// Sección "PREFIJOS / CÓDIGOS" — el panel donde se DESIGNA el prefijo de cada actividad
// para que la información CONVERSE y se lea automáticamente entre fuentes:
//   • ISP   (Catalogo_WBS)   → la producción, organizada por familia de trabajo.
//   • VAL   (PresupuestoF07) → la valorización/liquidación, por código de ítem.
// El prefijo es la LLAVE común: clasifica ambos lados por familia (CON, ENC, ACE…) y
// permite que el avance/HH del ISP alimente la valorización y el RO sin cruces frágiles.
//
// Persistencia: un único doc Prefijos_Catalogo/{proyectoId} con los mapas de asignación
// (ispMap por actividad, f07Map por mkey) + prefijos personalizados (extras). Cualquier
// consumidor (F07 en vivo, RO) lee este doc y une por prefijo.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import {
  PREFIJOS_DICT, normTxt, sugerirPrefijo, colorPrefijo, familiaDe,
} from '../../utils/prefijos';

const pctTxt = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0) + '%';

export default function PrefijosCodigos({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivo, proyectoActivoId } = useProyectoActivo();
  const proyId = proyectoActivoId || proyectoActivo?.id;

  const [presu, setPresu] = useState([]);     // PresupuestoF07 (valorización)
  const [catalogo, setCatalogo] = useState(null); // Catalogo_WBS (ISP)
  const [loading, setLoading] = useState(true);

  // Mapas de asignación (editables en memoria) + prefijos personalizados.
  const [ispMap, setIspMap] = useState({});
  const [f07Map, setF07Map] = useState({});
  const [extras, setExtras] = useState({});
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const marcarDirty = () => { dirtyRef.current = true; setDirty(true); };

  // UI
  const [origen, setOrigen] = useState('ambos'); // 'ambos' | 'isp' | 'val'
  const [vista, setVista] = useState('grupo');   // 'grupo' | 'lista'
  const [busca, setBusca] = useState('');
  const [filtroPref, setFiltroPref] = useState(null);
  const [verDicc, setVerDicc] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ codigo: '', nombre: '', familia: '' });

  // ── Suscripciones ──
  useEffect(() => {
    if (!proyId) { setPresu([]); setCatalogo(null); setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(collection(db, 'PresupuestoF07'), (snap) => {
      setPresu(snap.docs.map(d => d.data()).filter(p => p.proyectoId === proyId).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'Catalogo_WBS'), (snap) => {
      setCatalogo(snap.docs.map(d => d.data()).find(c => c.proyectoId === proyId) || null);
    });
    const u3 = onSnapshot(doc(db, 'Prefijos_Catalogo', proyId), (d) => {
      const data = d.data();
      if (!data) return;
      // Solo hidrata desde la nube si no hay cambios locales sin guardar.
      if (dirtyRef.current) return;
      setIspMap(data.ispMap || {}); setF07Map(data.f07Map || {}); setExtras(data.extras || {});
    });
    return () => { u1(); u2(); u3(); };
  }, [proyId]);

  // Diccionario de trabajo (base + personalizados).
  const dicc = useMemo(() => ({ ...PREFIJOS_DICT, ...extras }), [extras]);
  const opcionesPref = useMemo(
    () => Object.entries(dicc).filter(([, p]) => p.tipo === 'actividad').sort((a, b) => a[0].localeCompare(b[0])),
    [dicc],
  );

  // ── Filas ISP (deduplicadas por actividad) ──
  const ispRows = useMemo(() => {
    const map = new Map();
    (catalogo?.arbol || []).forEach((p) => {
      (p.subpartidas || []).forEach((s) => {
        (s.actividades || []).forEach((a) => {
          const nombre = a.nombre || '';
          const key = normTxt(nombre);
          if (!key) return;
          if (map.has(key)) { map.get(key).veces++; return; }
          map.set(key, {
            origen: 'isp', key, codigo: '', descripcion: nombre,
            und: a.un || a.unidad || '', familia: p.nombre || '', sub: s.nombre || '', veces: 1,
          });
        });
      });
    });
    return [...map.values()];
  }, [catalogo]);

  // ── Filas Valorización (F07, solo partidas valorizables) ──
  const valRows = useMemo(() => presu.filter(p => p.esPartida && p.mkey).map(p => ({
    origen: 'val', key: p.mkey, codigo: p.item, descripcion: p.descripcion,
    und: p.und || '', familia: '', veces: 1,
  })), [presu]);

  // Resuelve asignado + sugerido por fila.
  const resolver = (r) => {
    const asignado = (r.origen === 'isp' ? ispMap[r.key] : f07Map[r.key]) || '';
    const sug = sugerirPrefijo({ codigo: r.codigo, descripcion: r.descripcion, familia: r.familia });
    return { ...r, asignado, sugerido: sug.prefijo, via: sug.via };
  };

  const todas = useMemo(
    () => [...ispRows, ...valRows].map(resolver),
    [ispRows, valRows, ispMap, f07Map],
  );

  // Filtrado para la vista.
  const filtradas = useMemo(() => {
    const q = normTxt(busca);
    return todas.filter((r) => {
      if (origen !== 'ambos' && r.origen !== origen) return false;
      if (filtroPref && (r.asignado || '(sin)') !== filtroPref) return false;
      if (q && !(normTxt(r.descripcion).includes(q) || normTxt(r.codigo).includes(q) || normTxt(r.asignado).includes(q))) return false;
      return true;
    });
  }, [todas, origen, filtroPref, busca]);

  // KPIs de cobertura.
  const kpi = useMemo(() => {
    const isp = todas.filter(r => r.origen === 'isp');
    const val = todas.filter(r => r.origen === 'val');
    const ispOk = isp.filter(r => r.asignado).length;
    const valOk = val.filter(r => r.asignado).length;
    const sin = todas.filter(r => !r.asignado).length;
    return { ispN: isp.length, ispOk, valN: val.length, valOk, sin, prefDef: opcionesPref.length };
  }, [todas, opcionesPref]);

  // Conteo por prefijo (para chips del diccionario).
  const conteoPref = useMemo(() => {
    const m = {};
    todas.forEach(r => { if (r.asignado) m[r.asignado] = (m[r.asignado] || 0) + 1; });
    return m;
  }, [todas]);

  // ── Acciones ──
  const asignar = (r, pref) => {
    if (r.origen === 'isp') setIspMap(m => ({ ...m, [r.key]: pref }));
    else setF07Map(m => ({ ...m, [r.key]: pref }));
    marcarDirty();
  };

  const autoAsignar = () => {
    const nextIsp = { ...ispMap }, nextF07 = { ...f07Map };
    let n = 0;
    filtradas.forEach((r) => {
      if (r.asignado || !r.sugerido) return;
      if (r.origen === 'isp') nextIsp[r.key] = r.sugerido; else nextF07[r.key] = r.sugerido;
      n++;
    });
    setIspMap(nextIsp); setF07Map(nextF07); setDirty(true);
    showToast?.(n ? `${n} actividad(es) auto-asignadas con el prefijo sugerido.` : 'No hay sugerencias pendientes en la vista actual.', n ? 'success' : 'info');
  };

  const guardar = async () => {
    if (!proyId) return;
    try {
      await setDoc(doc(db, 'Prefijos_Catalogo', proyId), {
        proyectoId: proyId, ispMap, f07Map, extras,
        actualizadoEn: serverTimestamp(), actualizadoPor: user?.email || '',
      }, { merge: true });
      dirtyRef.current = false; setDirty(false);
      showToast?.('Prefijos guardados. La información ya conversa entre ISP y Valorización.', 'success');
    } catch (e) {
      showToast?.('No se pudo guardar: ' + (e?.message || e), 'error');
    }
  };

  const crearPrefijo = () => {
    const codigo = nuevo.codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!codigo) { showToast?.('El código del prefijo es obligatorio.', 'error'); return; }
    if (dicc[codigo]) { showToast?.(`El prefijo ${codigo} ya existe.`, 'error'); return; }
    setExtras(e => ({ ...e, [codigo]: { tipo: 'actividad', nombre: nuevo.nombre.trim() || codigo, familia: nuevo.familia.trim().toUpperCase() || codigo } }));
    marcarDirty();
    setModalNuevo(false); setNuevo({ codigo: '', nombre: '', familia: '' });
    showToast?.(`Prefijo ${codigo} creado.`, 'success');
  };

  if (!proyId) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>Selecciona un proyecto activo.</p>;
  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando ISP y Valorización…</p>;
  if (!presu.length && !ispRows.length) {
    return <EmptyState icono="🔑" titulo="Sin datos para mapear" descripcion="Este proyecto no tiene ISP (Catalogo_WBS) ni Presupuesto F07 cargados todavía." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* INTRO */}
      <div style={{ background: BASE.navySoft, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: '10px 14px' }}>
        <p style={{ fontSize: 12, color: BASE.navy, fontWeight: 700 }}>
          🔑 El <b>prefijo</b> es la llave que une la información. Designa el mismo prefijo a la actividad del <b>ISP</b> (producción) y a la(s) partida(s) de la <b>Valorización</b> (F07): así el avance, las HH y la valorización se leen automáticamente por familia (CON, ENC, ACE…).
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8 }}>
        <Kpi label="Prefijos definidos" v={kpi.prefDef} c={BASE.navy} />
        <Kpi label="ISP asignado" v={`${kpi.ispOk}/${kpi.ispN}`} sub={pctTxt(kpi.ispOk, kpi.ispN)} c={BASE.gold} />
        <Kpi label="Valorización asignada" v={`${kpi.valOk}/${kpi.valN}`} sub={pctTxt(kpi.valOk, kpi.valN)} c={BASE.green} />
        <Kpi label="Sin asignar" v={kpi.sin} c={kpi.sin ? BASE.red : BASE.green} />
      </div>

      {/* TOOLBAR */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segment value={origen} onChange={setOrigen} opts={[['ambos', 'Ambos'], ['isp', `ISP (${kpi.ispN})`], ['val', `Valorización (${kpi.valN})`]]} />
        <Segment value={vista} onChange={setVista} opts={[['grupo', '🧩 Por prefijo'], ['lista', '📋 Lista']]} />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar descripción / código…"
          style={{ flex: '1 1 200px', minWidth: 160, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 13 }} />
        <button onClick={autoAsignar} style={btn(BASE.navy)}>✨ Auto-asignar sugeridos</button>
        <button onClick={() => setModalNuevo(true)} style={btn(BASE.white, BASE.navy)}>＋ Prefijo</button>
        <button onClick={guardar} disabled={!dirty} style={btn(dirty ? BASE.green : BASE.muted)}>{dirty ? '💾 Guardar' : '✓ Guardado'}</button>
      </div>

      {/* DICCIONARIO (chips) */}
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: verDicc ? 10 : 0 }}>
          <button onClick={() => setVerDicc(v => !v)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: BASE.navy, letterSpacing: 0.4 }}>
            {verDicc ? '▾' : '▸'} DICCIONARIO DE PREFIJOS ({opcionesPref.length})
          </button>
          {filtroPref && <button onClick={() => setFiltroPref(null)} style={{ border: 'none', background: BASE.bgSoft, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: BASE.navy, cursor: 'pointer' }}>✕ Filtro: {filtroPref}</button>}
        </div>
        {verDicc && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {opcionesPref.map(([cod, p]) => {
              const activo = filtroPref === cod;
              return (
                <button key={cod} onClick={() => setFiltroPref(activo ? null : cod)} title={p.familia}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, cursor: 'pointer',
                    border: `1.5px solid ${activo ? colorPrefijo(cod) : BASE.border}`, background: activo ? colorPrefijo(cod) : BASE.white }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: colorPrefijo(cod) }} />
                  <b style={{ fontSize: 11, color: activo ? '#fff' : BASE.navy, fontFamily: 'monospace' }}>{cod}</b>
                  <span style={{ fontSize: 10.5, color: activo ? '#fff' : BASE.muted }}>{p.nombre}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: activo ? '#fff' : colorPrefijo(cod) }}>· {conteoPref[cod] || 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      {vista === 'lista'
        ? <TablaLista rows={filtradas} opcionesPref={opcionesPref} asignar={asignar} />
        : <VistaAgrupada rows={filtradas} dicc={dicc} opcionesPref={opcionesPref} asignar={asignar} />}

      {/* MODAL NUEVO PREFIJO */}
      {modalNuevo && (
        <Modal onClose={() => setModalNuevo(false)} title="Nuevo prefijo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 4, minWidth: 280 }}>
            <Campo label="Código (ej. CTP, EMT)" value={nuevo.codigo} onChange={v => setNuevo(n => ({ ...n, codigo: v }))} />
            <Campo label="Nombre" value={nuevo.nombre} onChange={v => setNuevo(n => ({ ...n, nombre: v }))} />
            <Campo label="Familia" value={nuevo.familia} onChange={v => setNuevo(n => ({ ...n, familia: v }))} />
            <button onClick={crearPrefijo} style={{ ...btn(BASE.navy), marginTop: 4 }}>Crear prefijo</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Vista LISTA (tabla plana) ──
function TablaLista({ rows, opcionesPref, asignar }) {
  return (
    <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'auto', maxHeight: '64vh' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12, minWidth: 760 }}>
        <thead>
          <tr>
            {['ORIGEN', 'CÓDIGO', 'DESCRIPCIÓN', 'UND', 'FAMILIA / PARTIDA', 'PREFIJO'].map((h, i) => (
              <th key={h} style={{ position: 'sticky', top: 0, zIndex: 2, background: BASE.navy, color: '#fff', fontSize: 9.5, fontWeight: 900, letterSpacing: 0.4, padding: '8px 10px', textAlign: i === 5 ? 'center' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.origen + r.key} style={{ background: i % 2 ? BASE.bgSoft : BASE.white }}>
              <td style={tdS}><OrigenBadge origen={r.origen} /></td>
              <td style={{ ...tdS, fontFamily: 'monospace', color: BASE.navy, fontWeight: 700 }}>{r.codigo || (r.veces > 1 ? `×${r.veces}` : '—')}</td>
              <td style={{ ...tdS, whiteSpace: 'normal' }}>{r.descripcion}</td>
              <td style={{ ...tdS, color: BASE.muted }}>{r.und}</td>
              <td style={{ ...tdS, color: BASE.muted, whiteSpace: 'normal' }}>{r.familia}{r.sub ? ` · ${r.sub}` : ''}</td>
              <td style={{ ...tdS, textAlign: 'center' }}><SelectorPref r={r} opcionesPref={opcionesPref} asignar={asignar} /></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: BASE.muted }}>Sin resultados con el filtro actual.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Vista AGRUPADA por prefijo (ISP y Valorización conviven bajo cada prefijo) ──
function VistaAgrupada({ rows, dicc, opcionesPref, asignar }) {
  const grupos = useMemo(() => {
    const g = {};
    rows.forEach((r) => { const k = r.asignado || '(sin asignar)'; (g[k] = g[k] || []).push(r); });
    return Object.entries(g).sort((a, b) => (a[0] === '(sin asignar)' ? 1 : b[0] === '(sin asignar)' ? -1 : a[0].localeCompare(b[0])));
  }, [rows]);

  if (!rows.length) return <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, padding: 24, textAlign: 'center', color: BASE.muted }}>Sin resultados con el filtro actual.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {grupos.map(([cod, items]) => {
        const sinAsignar = cod === '(sin asignar)';
        const color = sinAsignar ? BASE.red : colorPrefijo(cod);
        const nIsp = items.filter(r => r.origen === 'isp').length;
        const nVal = items.filter(r => r.origen === 'val').length;
        return (
          <div key={cod} style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: color + (sinAsignar ? '14' : '12'), borderLeft: `4px solid ${color}` }}>
              <b style={{ fontFamily: 'monospace', fontSize: 14, color }}>{cod}</b>
              <span style={{ fontSize: 12, fontWeight: 700, color: BASE.navy }}>{sinAsignar ? 'Pendientes de designar' : (dicc[cod]?.nombre || '')}</span>
              <span style={{ fontSize: 11, color: BASE.muted }}>{dicc[cod]?.familia || ''}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: BASE.muted }}>ISP {nIsp} · VAL {nVal}</span>
            </div>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12 }}>
              <tbody>
                {items.map((r, i) => (
                  <tr key={r.origen + r.key} style={{ background: i % 2 ? BASE.bgSoft : BASE.white }}>
                    <td style={{ ...tdS, width: 64 }}><OrigenBadge origen={r.origen} /></td>
                    <td style={{ ...tdS, fontFamily: 'monospace', color: BASE.navy, fontWeight: 700, width: 78 }}>{r.codigo || '—'}</td>
                    <td style={{ ...tdS, whiteSpace: 'normal' }}>{r.descripcion}
                      <span style={{ color: BASE.muted }}>{r.familia ? ` · ${r.familia}` : ''}{r.und ? ` · ${r.und}` : ''}</span>
                    </td>
                    <td style={{ ...tdS, textAlign: 'right', width: 200 }}><SelectorPref r={r} opcionesPref={opcionesPref} asignar={asignar} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Selector de prefijo por fila (con badge de sugerencia) ──
function SelectorPref({ r, opcionesPref, asignar }) {
  const sug = r.sugerido && !r.asignado;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {sug && (
        <button onClick={() => asignar(r, r.sugerido)} title={`Sugerido por ${r.via}`}
          style={{ border: `1px dashed ${colorPrefijo(r.sugerido)}`, background: BASE.white, borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, color: colorPrefijo(r.sugerido) }}>
          ✨ {r.sugerido}
        </button>
      )}
      <select value={r.asignado || ''} onChange={e => asignar(r, e.target.value)}
        style={{ padding: '5px 8px', borderRadius: 7, fontSize: 12, fontWeight: 700,
          border: `1.5px solid ${r.asignado ? colorPrefijo(r.asignado) : (sug ? BASE.gold : BASE.border)}`,
          color: r.asignado ? colorPrefijo(r.asignado) : BASE.muted, background: BASE.white, minWidth: 90 }}>
        <option value="">— sin —</option>
        {opcionesPref.map(([cod, p]) => <option key={cod} value={cod}>{cod} · {p.nombre}</option>)}
      </select>
    </span>
  );
}

function OrigenBadge({ origen }) {
  const isIsp = origen === 'isp';
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 6, fontSize: 9.5, fontWeight: 900, letterSpacing: 0.4,
      background: isIsp ? BASE.navy : BASE.gold, color: '#fff' }}>{isIsp ? 'ISP' : 'VAL'}</span>
  );
}

function Kpi({ label, v, sub, c }) {
  return (
    <div style={{ background: c + '12', border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`, borderRadius: 10, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: BASE.muted, letterSpacing: 0.4 }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 16, fontWeight: 900, color: c, marginTop: 2, fontFamily: 'monospace' }}>{v}{sub && <span style={{ fontSize: 11, marginLeft: 6, color: BASE.muted }}>{sub}</span>}</p>
    </div>
  );
}

function Segment({ value, onChange, opts }) {
  return (
    <div style={{ display: 'inline-flex', border: `1.5px solid ${BASE.border}`, borderRadius: 9, overflow: 'hidden' }}>
      {opts.map(([v, lbl]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{ padding: '7px 11px', fontSize: 11.5, fontWeight: 800, border: 'none', cursor: 'pointer',
            background: value === v ? BASE.navy : BASE.white, color: value === v ? '#fff' : BASE.muted }}>{lbl}</button>
      ))}
    </div>
  );
}

function Campo({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 700, color: BASE.navy }}>
      {label}
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${BASE.border}`, fontSize: 13, fontWeight: 500 }} />
    </label>
  );
}

const tdS = { padding: '6px 10px', borderBottom: `1px solid ${BASE.border}`, color: BASE.text, verticalAlign: 'middle' };
const btn = (bg, color = '#fff') => ({ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${bg === BASE.white ? BASE.border : bg}`, background: bg, color, fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' });
