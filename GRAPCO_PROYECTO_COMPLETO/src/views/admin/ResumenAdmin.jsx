// src/views/admin/ResumenAdmin.jsx — Resumen de admin con KPIs del sistema
import React, { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE, CHART_PALETTE } from '../../utils/styles';
import { SkeletonKPIs } from '../../components/SkeletonLoader';

export default function ResumenAdmin() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actividadReciente, setActividadReciente] = useState([]);

  useEffect(() => {
    cargarKpis();
  }, []);

  const cargarKpis = async () => {
    setLoading(true);
    setError('');
    try {
      // getCountFromServer es eficiente: no descarga documentos, solo cuenta
      const [
        usuarios, usuariosActivos,
        registros, cuadrillas, personal,
        cartasBalance, modelosBIM, vinculosBIM,
        auditoria,
      ] = await Promise.all([
        getCountFromServer(collection(db, 'Usuarios')),
        getCountFromServer(query(collection(db, 'Usuarios'), where('activo', '==', true))),
        getCountFromServer(collection(db, 'Registros_Campo')),
        getCountFromServer(collection(db, 'Cuadrillas')),
        getCountFromServer(collection(db, 'Personal')),
        getCountFromServer(collection(db, 'Cartas_Balance')),
        getCountFromServer(collection(db, 'BIM_Modelos')),
        getCountFromServer(collection(db, 'BIM_Vinculos')),
        getCountFromServer(collection(db, 'Auditoria_Seguridad')),
      ]);

      setKpis({
        usuariosTotal: usuarios.data().count,
        usuariosActivos: usuariosActivos.data().count,
        registrosTotal: registros.data().count,
        cuadrillasTotal: cuadrillas.data().count,
        personalTotal: personal.data().count,
        cartasBalance: cartasBalance.data().count,
        modelosBIM: modelosBIM.data().count,
        vinculosBIM: vinculosBIM.data().count,
        eventosAuditoria: auditoria.data().count,
      });

      // Actividad reciente: últimos 8 eventos de Auditoria_Seguridad
      const recientes = await getDocs(
        query(collection(db, 'Auditoria_Seguridad'), orderBy('timestamp', 'desc'), limit(8))
      );
      setActividadReciente(recientes.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[ResumenAdmin]', err);
      setError(err.message || 'Error cargando KPIs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <SkeletonKPIs cantidad={9} />;
  if (error) return (
    <div style={{ padding: '20px', background: BASE.redLight, borderRadius: '10px', color: BASE.red }}>
      ⚠️ {error}
    </div>
  );

  const tarjetas = [
    { l: 'USUARIOS TOTAL',     v: kpis.usuariosTotal,      sub: `${kpis.usuariosActivos} activos`, c: BASE.navy, ico: '👥' },
    { l: 'REGISTROS DE CAMPO', v: kpis.registrosTotal,     sub: 'reportes históricos',             c: BASE.green, ico: '📋' },
    { l: 'CUADRILLAS',         v: kpis.cuadrillasTotal,    sub: 'maestro de equipos',              c: BASE.gold, ico: '👷' },
    { l: 'PERSONAL',           v: kpis.personalTotal,      sub: 'personas en el sistema',          c: BASE.navy, ico: '🧑' },
    { l: 'CARTAS BALANCE',     v: kpis.cartasBalance,      sub: 'mediciones realizadas',           c: CHART_PALETTE[3], ico: '⚖️' },
    { l: 'MODELOS BIM',        v: kpis.modelosBIM,         sub: 'subidos a APS',                   c: BASE.gold, ico: '🏗️' },
    { l: 'VÍNCULOS WBS↔BIM',   v: kpis.vinculosBIM,        sub: 'actividades vinculadas',          c: BASE.green, ico: '🔗' },
    { l: 'EVENTOS AUDITORÍA',  v: kpis.eventosAuditoria,   sub: 'operaciones registradas',         c: BASE.red, ico: '🕵️' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.4px' }}>
          ESTADÍSTICAS DEL SISTEMA
        </h3>
        <button onClick={cargarKpis} className="btn-feedback" style={{
          padding: '7px 14px', background: BASE.bgSoft, color: BASE.navy,
          border: `1px solid ${BASE.border}`, borderRadius: '8px',
          fontSize: '11px', fontWeight: '800', cursor: 'pointer',
        }}>🔄 Refrescar</button>
      </div>

      <div style={{
        display: 'grid', gap: '10px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))',
      }}>
        {tarjetas.map((t, i) => (
          <KPI key={i} icono={t.ico} color={t.c} label={t.l}
            valor={t.v.toLocaleString('es-PE')} sub={t.sub} />
        ))}
      </div>

      {/* Actividad reciente */}
      <Seccion titulo="ACTIVIDAD RECIENTE (últimos 8 eventos)">
        {actividadReciente.length === 0 ? (
          <p style={{ padding: '12px 0', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
            Sin eventos registrados aún.
          </p>
        ) : (
          <div>
            {actividadReciente.map((ev, i) => (
              <div key={ev.id} style={{
                padding: '10px 0',
                borderBottom: i < actividadReciente.length - 1 ? `1px solid ${BASE.border}` : 'none',
                display: 'flex', alignItems: 'center', gap: '12px',
                fontSize: '12px',
              }}>
                <span style={{ fontSize: '14px', width: '20px' }}>
                  {ev.accion?.includes('login') ? '🔑' : ev.accion?.includes('crear') ? '➕'
                    : ev.accion?.includes('eliminar') ? '🗑️' : ev.accion?.includes('cambiar') ? '✏️' : '📌'}
                </span>
                <span style={{ flex: 1, fontWeight: '700', color: BASE.text }}>
                  {ev.accion}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: BASE.muted }}>
                  {ev.uid?.slice(0, 8)}...
                </span>
                <span style={{ fontSize: '10px', color: BASE.muted, minWidth: '90px', textAlign: 'right' }}>
                  {ev.timestamp?.toDate?.()?.toLocaleString('es-PE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  }) || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Seccion>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────

function KPI({ label, valor, color, sub, icono }) {
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
        <p style={{ fontSize: '18px', fontWeight: '900', color: BASE.navy, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {valor}
        </p>
        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '1px' }}>{sub}</p>
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
