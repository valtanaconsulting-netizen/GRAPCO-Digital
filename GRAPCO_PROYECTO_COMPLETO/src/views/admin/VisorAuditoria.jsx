// src/views/admin/VisorAuditoria.jsx — Visor del log Auditoria_Seguridad
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import StatusChip from '../../components/StatusChip';
import EmptyState from '../../components/EmptyState';

const ICONOS_ACCION = {
  login_exitoso:                      { ico: '✅', col: BASE.green,    sev: 'info'    },
  login_fallido:                      { ico: '❌', col: BASE.red,      sev: 'warning' },
  login_bloqueado_cuenta_inactiva:    { ico: '🚫', col: BASE.red,      sev: 'danger'  },
  logout:                             { ico: '🚪', col: BASE.muted,    sev: 'info'    },
  registro_usuario:                   { ico: '➕', col: BASE.gold,     sev: 'info'    },
  admin_crear_usuario:                { ico: '👤', col: BASE.gold,     sev: 'info'    },
  admin_cambiar_rol:                  { ico: '✏️', col: BASE.gold,     sev: 'warning' },
  admin_desactivar_usuario:           { ico: '🚫', col: BASE.red,      sev: 'warning' },
  admin_reactivar_usuario:            { ico: '✓',  col: BASE.green,    sev: 'info'    },
  admin_eliminar_usuario:             { ico: '🗑️', col: BASE.red,      sev: 'danger'  },
  subida_modelo_bim:                  { ico: '🏗️', col: BASE.navy,     sev: 'info'    },
  eliminacion_modelo_bim:             { ico: '🗑️', col: BASE.red,      sev: 'warning' },
  eliminacion_registro:               { ico: '🗑️', col: BASE.red,      sev: 'warning' },
  export_datos_masivo:                { ico: '📤', col: '#7c3aed',     sev: 'info'    },
};

const PAGE_SIZE = 30;

export default function VisorAuditoria({ showToast }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroAccion, setFiltroAccion] = useState('todos');
  const [filtroUid, setFiltroUid] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'Auditoria_Seguridad'),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE * 5),  // 150 últimos
      );
      const snap = await getDocs(q);
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[VisorAuditoria]', err);
      showToast?.('No se pudo cargar auditoría: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Acciones únicas para popular el filtro
  const accionesUnicas = useMemo(() => {
    const set = new Set(eventos.map(e => e.accion).filter(Boolean));
    return Array.from(set).sort();
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (filtroAccion !== 'todos' && e.accion !== filtroAccion) return false;
      if (filtroUid && !e.uid?.includes(filtroUid)) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const txt = `${e.accion} ${e.uid} ${JSON.stringify(e.detalles || {})}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [eventos, filtroAccion, filtroUid, busqueda]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toolbar */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '12px 16px',
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
      }}>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar en eventos..." aria-label="Buscar en eventos"
          style={{
            flex: 1, minWidth: '200px',
            padding: '9px 14px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px',
          }}
        />
        <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}
          style={{
            padding: '9px 14px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px',
            fontWeight: '700', background: '#fff', cursor: 'pointer', minWidth: '180px',
          }}>
          <option value="todos">Todas las acciones</option>
          {accionesUnicas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="text" value={filtroUid} onChange={e => setFiltroUid(e.target.value)}
          placeholder="UID parcial"
          style={{
            padding: '9px 14px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px', minWidth: '120px',
            fontFamily: 'monospace',
          }}
        />
        <button onClick={cargarEventos} className="btn-feedback" style={{
          padding: '9px 16px', background: BASE.bgSoft, color: BASE.navy,
          border: `1px solid ${BASE.border}`, borderRadius: '8px',
          fontSize: '11px', fontWeight: '800', cursor: 'pointer',
        }}>🔄 Actualizar</button>
      </div>

      {/* Lista de eventos */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
            ⏳ Cargando eventos de auditoría...
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <EmptyState icono="🕵️" titulo="Sin eventos" descripcion="No se encontraron eventos con esos filtros." />
        ) : (
          <div>
            {eventosFiltrados.map((ev, i) => {
              const cfg = ICONOS_ACCION[ev.accion] || { ico: '📌', col: BASE.muted, sev: 'neutral' };
              return (
                <details key={ev.id} style={{
                  borderBottom: i < eventosFiltrados.length - 1 ? `1px solid ${BASE.border}` : 'none',
                }}>
                  <summary style={{
                    padding: '12px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    listStyle: 'none',
                  }}>
                    <span style={{
                      fontSize: '20px', width: '36px', height: '36px',
                      background: `${cfg.col}22`, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>{cfg.ico}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: BASE.navy, marginBottom: '2px' }}>
                        {ev.accion}
                      </p>
                      <p style={{ fontSize: '10px', color: BASE.muted, fontFamily: 'monospace' }}>
                        UID: {ev.uid?.slice(0, 12) || 'anon'}{ev.uid?.length > 12 ? '...' : ''}
                      </p>
                    </div>
                    {ev.fuente === 'admin_panel' && (
                      <StatusChip variante="warning" tamano="sm" icono="🛡️">ADMIN</StatusChip>
                    )}
                    <span style={{
                      fontSize: '10px', color: BASE.muted, fontWeight: '600',
                      minWidth: '120px', textAlign: 'right',
                    }}>
                      {ev.timestamp?.toDate?.()?.toLocaleString('es-PE', {
                        day: '2-digit', month: 'short', year: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      }) || '—'}
                    </span>
                    <span style={{ color: BASE.muted, fontSize: '12px' }}>▾</span>
                  </summary>
                  <div style={{
                    padding: '0 18px 14px 66px',
                    fontSize: '11px', color: BASE.muted,
                  }}>
                    <pre style={{
                      background: BASE.bgSoft, padding: '10px 12px',
                      borderRadius: '6px', fontFamily: 'monospace', fontSize: '10.5px',
                      overflowX: 'auto', whiteSpace: 'pre-wrap',
                      color: BASE.text, margin: 0,
                    }}>{JSON.stringify({
                      uid: ev.uid,
                      accion: ev.accion,
                      detalles: ev.detalles || {},
                      userAgent: ev.userAgent?.slice(0, 80),
                      fuente: ev.fuente || 'cliente',
                    }, null, 2)}</pre>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: '10px', color: BASE.muted, fontStyle: 'italic', textAlign: 'right' }}>
        Mostrando {eventosFiltrados.length} de {eventos.length} eventos cargados (últimos {PAGE_SIZE * 5} en orden cronológico inverso)
      </p>
    </div>
  );
}
