// src/views/calidad/ArchivoProtocolosView.jsx
// Bitácora navegable de protocolos firmados: árbol Tipo → Frente → Semana → PDFs.
// Equivalente al "Excel de control" del PDF original (paso 8 del workflow).
//
// Lee de Firestore (Protocolos donde `archivado.storage` esté presente).
// Exporta a XLSX con un click para auditoría externa.

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { loadXLSX } from '../../utils/xlsxLazy';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { TIPOS_PROTOCOLO, ESTADOS_PROTOCOLO } from '../../utils/calidadOTAnalytics';
import EmptyState from '../../components/EmptyState';

export default function ArchivoProtocolosView({ onEdit }) {
  const { filtrarPorContexto, proyectoActivo } = useProyectoActivo();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tipoSel, setTipoSel] = useState('prevaciado');
  const [frenteAbierto, setFrenteAbierto] = useState(null);
  const [semanaAbierta, setSemanaAbierta] = useState(null);

  useEffect(() => {
    // Lee todos los protocolos con PDF firmado archivado en Storage.
    // Sin orderBy en la query para NO requerir indice compuesto (tipo + fechaCreacion).
    const q = query(
      collection(db, 'Protocolos'),
      where('tipo', '==', tipoSel),
    );
    const unsub = onSnapshot(q,
      (snap) => {
        const todos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => !!p.archivado?.storage?.url)
          .sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
        setItems(filtrarPorContexto(todos));
        setLoading(false);
      },
      (e) => {
        console.warn('[Archivo]', e.message);
        setLoading(false);
      });
    return () => unsub();
  }, [tipoSel, filtrarPorContexto]);

  // Agrupar items: frente → semana → []
  const arbol = useMemo(() => {
    const m = new Map();
    for (const p of items) {
      const f = p.frenteCodigo || '—';
      const s = p.semanaISO    || '—';
      if (!m.has(f)) m.set(f, new Map());
      const sem = m.get(f);
      if (!sem.has(s)) sem.set(s, []);
      sem.get(s).push(p);
    }
    // Convertir a estructura ordenada
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([frente, semanas]) => ({
        frente,
        semanas: Array.from(semanas.entries())
          .sort(([a], [b]) => b.localeCompare(a))      // semana desc
          .map(([semana, lista]) => ({ semana, lista })),
        total: Array.from(semanas.values()).reduce((acc, l) => acc + l.length, 0),
      }));
  }, [items]);

  const exportarXLSX = async () => {
    if (items.length === 0) return;
    const XLSX = await loadXLSX();
    const rows = items.map(p => ({
      'N° Registro':    p.numeroRegistro || p.codigo || '',
      'Tipo':           TIPOS_PROTOCOLO[p.tipo]?.label || p.tipo,
      'Frente':         p.frenteCodigo || '',
      'Semana ISO':     p.semanaISO || '',
      'Elemento':       p.estructuraElemento || '',
      'Ejes':           p.ejes || '',
      'Nivel':          p.nivel || '',
      'Sector':         p.sectorSubSector || '',
      "f'c":            p.fc || '',
      'Volumen':        p.volumen || '',
      'Fecha vaciado':  p.fechaVaciado || '',
      'Estado':         ESTADOS_PROTOCOLO[p.estado]?.label || p.estado,
      'PDF Firmado':    p.archivado?.storage?.url || '',
      'Google Drive':   p.archivado?.drive?.url   || '',
      'Cargado en':     p.archivado?.storage?.fechaCargado || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Protocolos firmados');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Control_Protocolos_${stamp}.xlsx`);
  };

  if (loading) {
    return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando archivo de protocolos firmados...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Toolbar ── */}
      <div style={toolbarStyle}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 900, color: BASE.gold, letterSpacing: 1.4 }}>
            ARCHIVO DE PROTOCOLOS FIRMADOS
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, marginTop: 2 }}>
            {proyectoActivo?.nombre || 'Proyecto'} · {items.length} archivado{items.length !== 1 ? 's' : ''}
          </h2>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            Tipo → Frente → Semana · Sincronizados con Storage (Drive y Sheets vendrán via Cloud Function)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={tipoSel} onChange={e => setTipoSel(e.target.value)} style={selStyle}>
            {Object.entries(TIPOS_PROTOCOLO).map(([k, t]) => (
              <option key={k} value={k}>{t.icono} {t.label}</option>
            ))}
          </select>
          <button onClick={exportarXLSX} disabled={items.length === 0} style={btnGold}>
            📊 EXPORTAR EXCEL
          </button>
        </div>
      </div>

      {/* ── Ruta jerárquica visual ── */}
      <div style={breadcrumbStyle}>
        <Crumb label={TIPOS_PROTOCOLO[tipoSel]?.label || tipoSel} icon="📁" activo />
        {frenteAbierto && (
          <>
            <span style={breadSep}>›</span>
            <Crumb label={frenteAbierto} icon="📍" activo onClick={() => setSemanaAbierta(null)} />
          </>
        )}
        {semanaAbierta && (
          <>
            <span style={breadSep}>›</span>
            <Crumb label={semanaAbierta} icon="📅" activo />
          </>
        )}
      </div>

      {/* ── Cuerpo ── */}
      {arbol.length === 0 ? (
        <EmptyState
          icono="📁"
          titulo="Sin PDFs archivados todavía"
          descripcion="Cuando subas el escaneado de un protocolo firmado, aparecerá aquí, clasificado automáticamente por frente y semana."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {arbol.map(grupo => {
            const expandido = frenteAbierto === grupo.frente;
            return (
              <div key={grupo.frente} style={{ ...cardStyle, borderLeft: `5px solid ${BASE.navy}` }}>
                <button
                  onClick={() => {
                    setFrenteAbierto(expandido ? null : grupo.frente);
                    setSemanaAbierta(null);
                  }}
                  style={frenteHeader}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: BASE.navy }}>
                      📍 {grupo.frente}
                    </p>
                    <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 2 }}>
                      {grupo.semanas.length} semana{grupo.semanas.length !== 1 ? 's' : ''} · {grupo.total} protocolo{grupo.total !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 16, color: BASE.muted }}>{expandido ? '▼' : '▶'}</span>
                </button>

                {expandido && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grupo.semanas.map(sg => {
                      const semExp = semanaAbierta === sg.semana;
                      return (
                        <div key={sg.semana}>
                          <button
                            onClick={() => setSemanaAbierta(semExp ? null : sg.semana)}
                            style={semanaHeader}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: BASE.text }}>
                              📅 {sg.semana}
                            </span>
                            <span style={{ fontSize: 11, color: BASE.muted }}>
                              {sg.lista.length}
                            </span>
                          </button>
                          {semExp && (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {sg.lista.map(p => (
                                <ProtocoloTile key={p.id} p={p} onEdit={onEdit} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

// Pieza visual: una tarjeta compacta por protocolo firmado.
function ProtocoloTile({ p, onEdit }) {
  const arch = p.archivado || {};
  return (
    <div style={tileStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: BASE.navy, fontFamily: 'monospace' }}>
            {p.numeroRegistro || p.codigo}
          </p>
          <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 2 }}>
            {p.estructuraElemento || '—'} · {p.fc || '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {arch.storage?.url && (
            <a href={arch.storage.url} target="_blank" rel="noopener noreferrer" style={pillBtn} title="Abrir PDF firmado">
              📄
            </a>
          )}
          {arch.drive?.url && (
            <a href={arch.drive.url} target="_blank" rel="noopener noreferrer" style={pillBtn} title="Abrir en Google Drive">
              🔗
            </a>
          )}
          <button onClick={() => onEdit?.(p.id)} style={pillBtn} title="Ver protocolo">✏️</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <SyncDot ok={!!arch.storage?.url} title="Firebase Storage" />
        <SyncDot ok={!!arch.drive?.url}   title="Google Drive (pendiente Cloud Function)" />
        <SyncDot ok={!!arch.sheet?.row}   title="Google Sheets (pendiente Cloud Function)" />
      </div>
    </div>
  );
}

function SyncDot({ ok, title }) {
  return (
    <span title={title} style={{
      width: 7, height: 7, borderRadius: '50%',
      background: ok ? '#22c55e' : '#cbd5e1',
    }} />
  );
}
function Crumb({ label, icon, activo, onClick }) {
  return (
    <span onClick={onClick} style={{
      ...crumbStyle,
      cursor: onClick ? 'pointer' : 'default',
      color: activo ? BASE.navy : BASE.muted,
      fontWeight: activo ? 900 : 600,
    }}>
      {icon} {label}
    </span>
  );
}

const toolbarStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 14, padding: '14px 18px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const breadcrumbStyle = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
  borderRadius: 10, padding: '8px 14px',
  fontSize: 11.5,
};
const breadSep = { color: BASE.mutedSoft, fontSize: 14 };
const crumbStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11.5, letterSpacing: 0.3,
};
const cardStyle = {
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 12, padding: '12px 14px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const frenteHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  width: '100%', padding: 0, background: 'transparent', border: 'none',
  cursor: 'pointer', textAlign: 'left',
};
const semanaHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  width: '100%', padding: '6px 10px',
  background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
  borderRadius: 8, cursor: 'pointer', textAlign: 'left',
};
const tileStyle = {
  background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
  borderRadius: 8, padding: '8px 10px',
};
const pillBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 6,
  background: BASE.white, border: `1px solid ${BASE.border}`,
  fontSize: 12, cursor: 'pointer', textDecoration: 'none',
  color: BASE.text,
};
const selStyle = {
  padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`,
  fontSize: 12, fontWeight: 700, background: '#fff', cursor: 'pointer',
};
const btnGold = {
  padding: '10px 18px', borderRadius: 8,
  background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
  color: '#fff', border: 'none', fontSize: 12, fontWeight: 900,
  cursor: 'pointer', letterSpacing: 0.4, whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(229,168,47,0.35)',
};
