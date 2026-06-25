// src/components/SelectorProyectoFrente.jsx — Selector global top-bar (B23)

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BASE } from '../utils/styles';
import { useProyectoActivo, FRENTE_TODOS } from '../contexts/ProyectoActivoContext';
import { useAuth } from '../contexts/AuthContext';
import { asegurarProyectoDefault } from '../utils/inicializadorMultiProyecto';

export default function SelectorProyectoFrente({ onCrearProyecto, onAdminProyectos }) {
  const {
    proyectos, frentesDelProyecto,
    proyectoActivoId, setProyectoActivoId,
    frenteActivoId, setFrenteActivoId,
    proyectoActivo, frenteActivo, modoTodosFrentes,
    loadingProyectos,
  } = useProyectoActivo();

  const { user, rol } = useAuth();

  // Solo el ADMIN (gerente general) puede cambiar libremente entre proyectos.
  // Cualquier otro rol queda anclado a SU proyecto asignado (campo proyectoIdAsignado en /Usuarios/{uid}).
  // Si no tiene asignado, ve TODOS (compatibilidad para usuarios sin migrar). Frentes siempre libre.
  const [proyectoIdAsignado, setProyectoIdAsignado] = useState(null);
  const esGerenteGeneral = rol === 'admin';
  const proyectoBloqueado = !esGerenteGeneral && !!proyectoIdAsignado;

  useEffect(() => {
    if (!user?.uid) { setProyectoIdAsignado(null); return; }
    if (esGerenteGeneral) { setProyectoIdAsignado(null); return; }
    getDoc(doc(db, 'Usuarios', user.uid))
      .then(snap => {
        const data = snap.exists() ? snap.data() : null;
        setProyectoIdAsignado(data?.proyectoIdAsignado || null);
      })
      .catch(() => setProyectoIdAsignado(null));
  }, [user?.uid, esGerenteGeneral]);

  // Forzar el proyecto activo al asignado cuando el capataz entra
  useEffect(() => {
    if (proyectoBloqueado && proyectoIdAsignado && proyectoActivoId !== proyectoIdAsignado) {
      setProyectoActivoId(proyectoIdAsignado);
    }
  }, [proyectoBloqueado, proyectoIdAsignado, proyectoActivoId, setProyectoActivoId]);

  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!loadingProyectos && proyectos.length === 0 && !bootstrapped) {
      setBootstrapped(true);
      asegurarProyectoDefault();
    }
  }, [loadingProyectos, proyectos.length, bootstrapped]);

  if (loadingProyectos) {
    return (
      <div style={containerS}>
        <span style={{ fontSize: '11px', color: BASE.muted }}>⏳ Cargando proyectos...</span>
      </div>
    );
  }

  return (
    <div style={containerS}>
      <div style={groupS}>
        <span style={lblS}>🏗️ PROYECTO {proyectoBloqueado && <span style={{ color: BASE.muted, fontWeight: 600 }}>· asignado</span>}</span>
        <select value={proyectoActivoId} onChange={e => setProyectoActivoId(e.target.value)}
          disabled={proyectoBloqueado}
          title={proyectoBloqueado ? 'Estás asignado a este proyecto. Para cambiarlo, contacta al administrador.' : ''}
          style={{
            ...selS,
            background: proyectoActivo?.color ? proyectoActivo.color + '22' : '#fff',
            borderColor: proyectoActivo?.color || BASE.border,
            color: proyectoActivo?.color || BASE.navy,
            cursor: proyectoBloqueado ? 'not-allowed' : 'pointer',
            opacity: proyectoBloqueado ? 0.85 : 1,
          }}>
          {proyectos.length === 0 && <option value="">— sin proyectos —</option>}
          {proyectos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre}{p.ubicacion?.ciudad ? ' · ' + p.ubicacion.ciudad : ''}
            </option>
          ))}
        </select>
      </div>

      <span style={{ fontSize: '16px', color: BASE.gold, fontWeight: '900' }}>›</span>

      <div style={groupS}>
        <span style={lblS}>📍 FRENTE</span>
        <select value={frenteActivoId} onChange={e => setFrenteActivoId(e.target.value)} style={{
          ...selS,
          background: modoTodosFrentes ? '#fef3c7' : (frenteActivo?.color ? frenteActivo.color + '22' : '#fff'),
          borderColor: modoTodosFrentes ? BASE.gold : (frenteActivo?.color || BASE.border),
          color: modoTodosFrentes ? BASE.goldDark : (frenteActivo?.color || BASE.navy),
        }}>
          <option value={FRENTE_TODOS}>🌐 TODOS LOS FRENTES (vista agregada)</option>
          {frentesDelProyecto.length === 0 && <option value="" disabled>— sin frentes —</option>}
          {frentesDelProyecto.map(f => (
            <option key={f.id} value={f.id}>
              {f.codigo} · {f.nombre}
            </option>
          ))}
        </select>
      </div>

      {proyectoActivo && (
        <div style={{
          padding: '5px 12px',
          background: 'linear-gradient(135deg, #1e3a5f, #0f1a2e)',
          color: '#fff', borderRadius: '6px',
          fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px',
        }}>
          {modoTodosFrentes ? '📊 VISTA AGREGADA' : '📍 VISTA DE FRENTE'}
        </div>
      )}

      <div style={{ flex: 1 }}></div>

      {onAdminProyectos && (
        <button onClick={onAdminProyectos} style={btnSecS}>
          🌎 Gestionar
        </button>
      )}
      {onCrearProyecto && (
        <button onClick={onCrearProyecto} style={btnNuevoS}>
          ➕ Nuevo Proyecto
        </button>
      )}
    </div>
  );
}

const containerS = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '10px 16px', background: BASE.white,
  border: `1px solid ${BASE.border}`, borderRadius: '12px',
  flexWrap: 'wrap',
  boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
};

const groupS = { display: 'flex', flexDirection: 'column', gap: '3px' };
const lblS = { fontSize: '8.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px' };
const selS = {
  padding: '7px 10px', borderRadius: '6px',
  border: `1.5px solid ${BASE.border}`,
  fontSize: '11.5px', fontWeight: '800',
  cursor: 'pointer', minWidth: '200px', outline: 'none',
};
const btnNuevoS = {
  padding: '8px 14px', borderRadius: '8px',
  background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
  color: '#fff', border: 'none',
  fontSize: '11px', fontWeight: '900', cursor: 'pointer',
  letterSpacing: '0.4px',
  boxShadow: `0 3px 10px ${BASE.gold}55`,
};
const btnSecS = {
  padding: '8px 14px', borderRadius: '8px',
  background: BASE.white, color: BASE.navy,
  border: `1.5px solid ${BASE.border}`,
  fontSize: '11px', fontWeight: '900', cursor: 'pointer',
  letterSpacing: '0.4px',
};
