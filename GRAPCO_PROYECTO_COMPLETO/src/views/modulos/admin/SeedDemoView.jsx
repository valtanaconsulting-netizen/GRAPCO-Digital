// src/views/modulos/admin/SeedDemoView.jsx — Cargar datos demo PTARI (B25)

import React, { useEffect, useState } from 'react';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import { cargarSeedPTARI, limpiarSeed } from '../../../data/seed/seedPTARI';
import { diagnosticarMigracionProyectoId, migrarProyectoId } from '../../../utils/migracionProyectoId';
import RoleGuard from '../../../components/RoleGuard';

export default function SeedDemoView({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, proyectoActivo, frenteActivoId, frenteActivo, modoTodosFrentes, FRENTE_DEFAULT_ID } = useProyectoActivo();
  const [cargando, setCargando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [migrando, setMigrando] = useState(false);
  const [progresoMig, setProgresoMig] = useState('');

  useEffect(() => {
    diagnosticarMigracionProyectoId().then(setDiagnostico).catch(() => {});
  }, []);

  const ejecutarMigracion = async () => {
    if (!proyectoActivoId) return showToast?.('Selecciona un proyecto activo primero', 'error');
    const frenteIdDestino = modoTodosFrentes ? FRENTE_DEFAULT_ID : (frenteActivoId || FRENTE_DEFAULT_ID);
    const frenteLabel = modoTodosFrentes ? '(default)' : (frenteActivo?.nombre || frenteIdDestino);
    if (!confirm(`¿Migrar TODOS los docs sin proyectoId al proyecto "${proyectoActivo?.nombre || proyectoActivoId}"?\n\nIncluye: Almacenes, Kardex_Movimientos y Registros_Campo.\nLos Registros_Campo además se asignan al frente: ${frenteLabel}.\n\nEsto es idempotente: solo toca documentos sin proyectoId.`)) return;
    setMigrando(true);
    setProgresoMig('Iniciando...');
    try {
      const res = await migrarProyectoId(proyectoActivoId, ({ coleccion, procesados, totalAMigrar }) => {
        setProgresoMig(`${coleccion}: ${procesados}/${totalAMigrar}`);
      }, frenteIdDestino);
      setProgresoMig('');
      const msg = `✅ Migrados: ${res.almacenes} almacenes · ${res.kardex} movimientos · ${res.registrosCampo} registros campo`;
      showToast?.(msg, 'success');
      const nuevo = await diagnosticarMigracionProyectoId();
      setDiagnostico(nuevo);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setMigrando(false);
    }
  };

  const cargar = async () => {
    if (!confirm('¿Cargar datos demo de PTARI?\n\nEsto creará:\n• 1 proyecto · 3 frentes\n• ~30 actividades del Plan Maestro\n• 5 APUs empresariales\n• 3 hitos de Pull Planning con tareas\n\nSi ya existían datos seed, se reemplazarán.')) return;
    setCargando(true);
    const r = await cargarSeedPTARI({ user, showToast });
    setCargando(false);
    if (r.ok) {
      setTimeout(() => {
        if (confirm('Demo PTARI cargado exitosamente. ¿Recargar la página para ver los cambios?')) {
          window.location.reload();
        }
      }, 800);
    }
  };

  const limpiar = async () => {
    if (!confirm('⚠️ ATENCIÓN: ¿Eliminar TODOS los datos seed PTARI?\n\nEsta acción es IRREVERSIBLE. Solo afecta documentos marcados como demo.')) return;
    setLimpiando(true);
    try {
      await limpiarSeed();
      showToast?.('🗑️ Datos seed eliminados', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
    setLimpiando(false);
  };

  return (
    <RoleGuard rolesPermitidos={['admin']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f1a2e, #1e3a5f)',
          borderRadius: '14px', padding: '22px 28px', color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            🛠️ HERRAMIENTAS DE ADMINISTRACIÓN
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Datos Demo · PTARI Lima Sur
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '6px' }}>
            Carga un proyecto completo de demostración para tu sustentación de tesis. Incluye Plan Maestro, frentes, APUs y Pull Planning.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <Card icono="📦" titulo="1 Proyecto" valor="PTARI Lima Sur" color="#0d9488" />
          <Card icono="📍" titulo="3 Frentes" valor="Norte · Sur · Central" color="#7c3aed" />
          <Card icono="📐" titulo="~30 Actividades" valor="Plantilla hidráulica" color="#1e3a5f" />
          <Card icono="💰" titulo="5 APUs" valor="Empresariales" color="#f59e0b" />
          <Card icono="🎯" titulo="3 Hitos" valor="Pull Planning" color="#5b21b6" />
          <Card icono="📋" titulo="14 Tareas Pull" valor="Reverse scheduling" color="#15803d" />
        </div>

        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', padding: '22px 26px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '900', color: BASE.navy, marginBottom: '8px' }}>
            🚀 Acciones disponibles
          </h3>
          <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '16px' }}>
            La carga de seed es <strong>idempotente</strong>: limpia los datos demo previos antes de cargar nuevos. No afecta tus proyectos reales.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={cargar} disabled={cargando} style={{
              padding: '14px 24px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
              boxShadow: '0 6px 16px rgba(22,163,74,0.4)',
              opacity: cargando ? 0.6 : 1,
            }}>
              {cargando ? '⏳ Cargando seed...' : '🚀 CARGAR DATOS DEMO PTARI'}
            </button>

            <button onClick={limpiar} disabled={limpiando} style={{
              padding: '14px 24px', borderRadius: '10px',
              background: BASE.white, color: BASE.red,
              border: `2px solid ${BASE.red}`,
              fontSize: '13px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
              opacity: limpiando ? 0.6 : 1,
            }}>
              {limpiando ? '⏳ Limpiando...' : '🗑️ Limpiar datos demo'}
            </button>
          </div>
        </div>

        <div style={{
          background: '#fef3c7', borderLeft: `4px solid ${BASE.gold}`,
          borderRadius: '10px', padding: '14px 18px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: '900', color: BASE.goldDark }}>
            💡 Tip para sustentación
          </p>
          <p style={{ fontSize: '11.5px', color: BASE.goldDark, marginTop: '4px', lineHeight: 1.5 }}>
            Antes de tu sustentación, carga el seed PTARI para tener un proyecto demostrable con todas las funcionalidades. Después de la sustentación, puedes limpiar los datos seed para empezar con un proyecto real.
          </p>
        </div>

        {/* MIGRACION FASE 1 */}
        <div style={{
          background: BASE.white, border: `2px solid #2563eb`,
          borderRadius: '14px', padding: '22px 26px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e40af', marginBottom: '8px' }}>
            🔧 Migración Fase 1: proyectoId en Almacenes y Kardex
          </h3>
          <p style={{ fontSize: '12px', color: BASE.muted, marginBottom: '12px' }}>
            Asigna <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>proyectoId</code> a documentos antiguos
            que se crearon antes de la jerarquía Gerencia &gt; Proyecto &gt; Obra &gt; Almacén.
            Idempotente: solo toca documentos sin proyectoId.
          </p>

          {diagnostico ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <DiagCard label="Almacenes" total={diagnostico.almacenes.total} sin={diagnostico.almacenes.sinProyecto} />
              <DiagCard label="Movimientos Kardex" total={diagnostico.kardex.total} sin={diagnostico.kardex.sinProyecto} />
              <DiagCard label="Registros Campo" total={diagnostico.registrosCampo.total} sin={diagnostico.registrosCampo.sinProyecto} />
            </div>
          ) : (
            <p style={{ fontSize: '11px', color: BASE.muted, fontStyle: 'italic' }}>⏳ Diagnosticando...</p>
          )}

          {progresoMig && (
            <p style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700', margin: '8px 0' }}>
              ⏳ {progresoMig}
            </p>
          )}

          <button onClick={ejecutarMigracion} disabled={migrando || !diagnostico || (diagnostico.almacenes.sinProyecto + diagnostico.kardex.sinProyecto + diagnostico.registrosCampo.sinProyecto === 0)}
            style={{
              padding: '12px 22px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none',
              fontSize: '12px', fontWeight: '900', cursor: migrando ? 'not-allowed' : 'pointer',
              opacity: migrando ? 0.5 : 1, letterSpacing: '0.4px',
            }}>
            {migrando ? '⏳ Migrando...' :
             (diagnostico?.almacenes.sinProyecto + diagnostico?.kardex.sinProyecto + diagnostico?.registrosCampo.sinProyecto === 0)
               ? '✅ Todo migrado'
               : `🔧 EJECUTAR MIGRACION (${(diagnostico?.almacenes.sinProyecto || 0) + (diagnostico?.kardex.sinProyecto || 0) + (diagnostico?.registrosCampo.sinProyecto || 0)} docs)`}
          </button>
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '8px' }}>
            Asignará al proyecto activo: <strong>{proyectoActivo?.nombre || proyectoActivoId}</strong>
            {' · '}Registros_Campo al frente: <strong>{modoTodosFrentes ? '(default)' : (frenteActivo?.nombre || frenteActivoId)}</strong>
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}

function DiagCard({ label, total, sin }) {
  const ok = sin === 0;
  return (
    <div style={{
      background: ok ? '#d1fae5' : '#fef3c7',
      border: `1px solid ${ok ? '#86efac' : '#fcd34d'}`,
      borderRadius: '10px', padding: '12px 16px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '18px', fontWeight: '900', color: ok ? '#065f46' : '#92400e', marginTop: '2px' }}>
        {ok ? '✅ OK' : `⚠️ ${sin} sin proyecto`}
      </p>
      <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>De {total} totales</p>
    </div>
  );
}

function Card({ icono, titulo, valor, color }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '20px' }}>{icono}</span>
        <span style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{titulo.toUpperCase()}</span>
      </div>
      <p style={{ fontSize: '14px', fontWeight: '900', color, marginTop: '4px' }}>{valor}</p>
    </div>
  );
}
