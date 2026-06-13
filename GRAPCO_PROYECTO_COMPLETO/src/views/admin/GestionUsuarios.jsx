// src/views/admin/GestionUsuarios.jsx — CRUD de usuarios para admin
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { BASE, CHART_PALETTE } from '../../utils/styles';
import {
  crearUsuarioAdmin, cambiarRolUsuario, actualizarUsuarioAdmin,
  desactivarUsuario, eliminarUsuarioAdmin, sincronizarUsuariosAuth,
} from '../../utils/adminClient';
import StatusChip from '../../components/StatusChip';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const ROLES_INFO = {
  admin:              { label: 'Admin / Gerente General',  color: BASE.red,    icon: '🛡️', desc: 'Acceso TOTAL, todos los proyectos, crea proyectos' },
  ingeniero:          { label: 'Ingeniero',                color: BASE.gold,   icon: '📊', desc: 'Producción (Auditoría + CPI/EAC + Control Gerencial), residente, admin de obra' },
  oficina_tecnica:    { label: 'Oficina Técnica',          color: CHART_PALETTE[5],  icon: '📐', desc: 'RDO, valorizaciones, partidas contractuales' },
  calidad:            { label: 'Gestión de Calidad',      color: '#ec4899',   icon: '🦺', desc: 'Protocolos, PETs, NCs, ensayos' },
  seguridad:          { label: 'SSOMA / Seguridad',        color: BASE.red,    icon: '⚠️', desc: 'PETs, ATS, inspecciones, incidencias' },
  almacenero:         { label: 'Almacenero',               color: CHART_PALETTE[3],  icon: '📦', desc: 'Almacén, kardex, vales, recepciones' },
  logistica:          { label: 'Logística / Compras',      color: CHART_PALETTE[5],  icon: '🚛', desc: 'OCs, OSs, proveedores' },
  capataz:            { label: 'Capataz',                  color: BASE.green,  icon: '👷', desc: 'Tareo, registro de producción, fotos' },
  carta_balance:      { label: 'Carta Balance',            color: CHART_PALETTE[3],  icon: '⚖️', desc: 'Solo muestreos de Carta Balance' },
  supervisor_cliente: { label: 'Supervisor Cliente',       color: CHART_PALETTE[11], icon: '🔍', desc: 'Inspección externa, lectura + firma' },
  subcontratista:     { label: 'Subcontratista',           color: BASE.muted,  icon: '🤝', desc: 'Contratista externo limitado a su frente' },
};

// Roles que quedan anclados a UN proyecto. Solo `admin` ve todos.
const ROLES_QUE_VEN_TODO = new Set(['admin']);

export default function GestionUsuarios({ showToast }) {
  const { user: adminActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [showEditar, setShowEditar] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'Usuarios'), orderBy('creadoEn', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => {
        setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[GestionUsuarios]', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Proyectos'),
      (snap) => setProyectos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('[GestionUsuarios.Proyectos]', err)
    );
    return () => unsub();
  }, []);

  const proyectoNombrePor = (id) => proyectos.find(p => p.id === id)?.nombre || id;

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (u.email?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toolbar */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', padding: '12px 16px',
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
      }}>
        <input
          type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre o email..."
          style={{
            flex: 1, minWidth: '200px',
            padding: '9px 14px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px',
          }}
        />
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
          style={{
            padding: '9px 14px', borderRadius: '8px',
            border: `1.5px solid ${BASE.border}`, fontSize: '12px',
            fontWeight: '700', background: '#fff', cursor: 'pointer',
          }}>
          <option value="todos">Todos los roles</option>
          {Object.entries(ROLES_INFO).map(([id, info]) => (
            <option key={id} value={id}>{info.icon} {info.label}</option>
          ))}
        </select>
        <button onClick={async () => {
          if (!window.confirm('Esto creará el perfil en /Usuarios para CADA correo creado en Firebase Auth que aún no lo tenga (rol inicial: ingeniero, activo).\n\n¿Continuar?')) return;
          try {
            const r = await sincronizarUsuariosAuth();
            showToast?.(`✅ ${r.mensaje}`, 'success');
          } catch (e) {
            showToast?.('❌ ' + (e.message || e), 'error');
          }
        }} style={{
          padding: '9px 18px',
          background: BASE.navy,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '11.5px', fontWeight: '800', cursor: 'pointer',
          letterSpacing: '0.4px',
        }} title="Crear /Usuarios/{uid} para cada correo en Auth que aún no lo tenga">
          SINCRONIZAR AUTH
        </button>
        <button onClick={() => setShowCrear(true)} className="btn-feedback" style={{
          padding: '9px 18px',
          background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          boxShadow: `0 4px 12px ${BASE.gold}55`, letterSpacing: '0.4px',
        }}>NUEVO USUARIO</button>
      </div>

      {/* Tabla */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: BASE.muted, fontSize: '12px' }}>
            ⏳ Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <EmptyState icono="👥" titulo="Sin usuarios" descripcion="No se encontraron usuarios con esos filtros." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy }}>
                  {['Usuario', 'Rol', 'Proyecto asignado', 'Estado', 'Último login', 'Acciones'].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 14px', color: '#fff', fontSize: '10px',
                      fontWeight: '900', textAlign: 'left', letterSpacing: '0.4px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u, idx) => {
                  const rolInfo = ROLES_INFO[u.rol] || ROLES_INFO.capataz;
                  const esYo = u.id === adminActual?.uid;
                  const veTodo = ROLES_QUE_VEN_TODO.has(u.rol);
                  return (
                    <tr key={u.id} style={{
                      background: idx % 2 === 0 ? BASE.white : BASE.bgSoft,
                      borderBottom: `1px solid ${BASE.border}`,
                      opacity: u.activo === false ? 0.55 : 1,
                    }}>
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ fontWeight: '800', color: BASE.navy, fontSize: '12px' }}>
                          {u.nombre || '—'} {esYo && <span style={{
                            fontSize: '9px', background: BASE.gold, color: '#fff',
                            padding: '2px 7px', borderRadius: '10px', marginLeft: '6px', letterSpacing: '0.3px',
                          }}>TÚ</span>}
                        </p>
                        <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '2px' }}>{u.email}</p>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: rolInfo.color + '22', color: rolInfo.color,
                          padding: '4px 10px', borderRadius: '10px',
                          fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.3px',
                          border: `1px solid ${rolInfo.color}55`,
                        }}>
                          <span>{rolInfo.icon}</span>{rolInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '11px' }}>
                        {veTodo ? (
                          <span style={{ color: BASE.muted, fontStyle: 'italic' }}>— ve todos —</span>
                        ) : u.proyectoIdAsignado ? (
                          <span style={{
                            background: BASE.bgSoft, color: BASE.navy,
                            padding: '3px 9px', borderRadius: '8px',
                            fontWeight: '700', border: `1px solid ${BASE.border}`,
                          }}>{proyectoNombrePor(u.proyectoIdAsignado)}</span>
                        ) : (
                          <span style={{ color: BASE.red, fontStyle: 'italic', fontSize: '10.5px' }}>
                            ⚠️ sin asignar
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {u.activo === false ? (
                          <StatusChip variante="neutral" icono="🚫">Inactivo</StatusChip>
                        ) : (
                          <StatusChip variante="success" icono="●">Activo</StatusChip>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '10px', color: BASE.muted, fontWeight: '600' }}>
                        {u.ultimoLogin?.toDate?.()?.toLocaleString('es-PE', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        }) || 'Nunca'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {!esYo && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setShowEditar(u)} className="btn-feedback" style={{
                              padding: '5px 10px', background: BASE.bgSoft, color: BASE.navy,
                              border: 'none', borderRadius: '6px',
                              fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                            }} title="Editar rol">✏️</button>
                            <button onClick={async () => {
                              if (!u.email) { showToast?.('❌ Usuario sin correo', 'error'); return; }
                              if (!window.confirm(`Enviar enlace de restablecimiento de contraseña a:\n\n${u.email}\n\nEl usuario recibirá un correo para crear una nueva contraseña. ¿Continuar?`)) return;
                              try {
                                await sendPasswordResetEmail(auth, u.email);
                                showToast?.(`📧 Enlace de restablecimiento enviado a ${u.email}`, 'success');
                              } catch (err) {
                                showToast?.('❌ ' + (err?.message || 'No se pudo enviar el correo'), 'error');
                              }
                            }} className="btn-feedback" style={{
                              padding: '5px 10px', background: BASE.navySoft, color: BASE.navy,
                              border: 'none', borderRadius: '6px',
                              fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                            }} title="Enviar correo para restablecer contraseña">🔑</button>
                            <button onClick={async () => {
                              if (!window.confirm(`¿${u.activo === false ? 'Reactivar' : 'Desactivar'} a ${u.email}?`)) return;
                              try {
                                await desactivarUsuario(u.id, u.activo === false);
                                showToast?.(u.activo === false ? '✅ Usuario reactivado' : '🚫 Usuario desactivado', 'success');
                              } catch (err) { showToast?.('❌ ' + err.message, 'error'); }
                            }} className="btn-feedback" style={{
                              padding: '5px 10px',
                              background: u.activo === false ? BASE.greenLight : BASE.goldLight,
                              color: u.activo === false ? BASE.greenDark : BASE.goldDark,
                              border: 'none', borderRadius: '6px',
                              fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                            }} title={u.activo === false ? 'Reactivar' : 'Desactivar'}>
                              {u.activo === false ? '✓' : '🚫'}
                            </button>
                            <button onClick={async () => {
                              if (!window.confirm(`⚠️ ELIMINAR PERMANENTEMENTE a ${u.email}?\n\nEsto borra:\n- Cuenta de autenticación\n- Perfil en Firestore\n\nNO se puede deshacer.`)) return;
                              try {
                                // 1) Intento completo vía Cloud Function (Auth + Firestore).
                                await eliminarUsuarioAdmin(u.id);
                                showToast?.('🗑️ Usuario eliminado (cuenta + perfil)', 'success');
                              } catch (err) {
                                // 2) Fallback: si las Cloud Functions no están disponibles,
                                //    al menos borramos el PERFIL en Firestore (sale de la lista).
                                const quiereParche = window.confirm(
                                  `No se pudo eliminar la cuenta de autenticación:\n"${err.message}"\n\n` +
                                  `¿Quieres al menos quitar el PERFIL de la lista? ` +
                                  `(La cuenta de login seguirá existiendo hasta arreglar las Cloud Functions.)`
                                );
                                if (!quiereParche) return;
                                try {
                                  await deleteDoc(doc(db, 'Usuarios', u.id));
                                  showToast?.('🗑️ Perfil eliminado de la lista (cuenta Auth pendiente)', 'success');
                                } catch (e2) {
                                  showToast?.('❌ Tampoco se pudo borrar el perfil: ' + e2.message, 'error');
                                }
                              }
                            }} className="btn-feedback" style={{
                              padding: '5px 10px', background: BASE.redLight, color: BASE.red,
                              border: 'none', borderRadius: '6px',
                              fontSize: '10px', fontWeight: '800', cursor: 'pointer',
                            }} title="Eliminar definitivamente">🗑️</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: '10px', color: BASE.muted, fontStyle: 'italic', textAlign: 'right' }}>
        {usuariosFiltrados.length} de {usuarios.length} usuarios
      </p>

      {/* Modal crear */}
      {showCrear && <ModalCrearUsuario proyectos={proyectos} onClose={() => setShowCrear(false)} showToast={showToast} />}

      {/* Modal editar rol + proyecto */}
      {showEditar && (
        <ModalEditarRol
          usuario={showEditar}
          proyectos={proyectos}
          onClose={() => setShowEditar(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL: Crear usuario nuevo
// ════════════════════════════════════════════════════════════════
function ModalCrearUsuario({ proyectos, onClose, showToast }) {
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'capataz', proyectoIdAsignado: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const veTodo = ROLES_QUE_VEN_TODO.has(form.rol);

  const generarPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, password: pw });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || form.password.length < 8) {
      setError('Email + password (mín 8 caracteres) requeridos');
      return;
    }
    if (!veTodo && !form.proyectoIdAsignado) {
      setError('Este rol requiere un proyecto asignado');
      return;
    }
    setLoading(true);
    try {
      // El proyecto asignado lo guarda la propia Cloud Function (Admin SDK),
      // así no dependemos de una escritura del cliente sujeta a reglas.
      const proyAsignado = (!veTodo && form.proyectoIdAsignado) ? form.proyectoIdAsignado : '';
      await crearUsuarioAdmin(form.email, form.password, form.nombre, form.rol, proyAsignado);
      showToast?.(`✅ Usuario ${form.email} creado`, 'success');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Modal abierto onClose={onClose} titulo="Crear nuevo usuario">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Campo label="Email" tipo="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="usuario@grapco.pe" />
        <Campo label="Nombre" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Juan Pérez (opcional)" />

        <div>
          <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
            CONTRASEÑA TEMPORAL
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '8px',
                border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontFamily: 'monospace',
              }}
            />
            <button type="button" onClick={generarPassword} style={{
              padding: '10px 14px', background: BASE.bgSoft, color: BASE.navy,
              border: `1px solid ${BASE.border}`, borderRadius: '8px',
              fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>🎲 Generar</button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
            ROL
          </label>
          <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: `1.5px solid ${BASE.border}`, fontSize: '12px',
              fontWeight: '700', background: '#fff', cursor: 'pointer',
            }}>
            {Object.entries(ROLES_INFO).map(([id, info]) => (
              <option key={id} value={id}>{info.icon} {info.label}</option>
            ))}
          </select>
          <p style={{ fontSize: '10px', color: BASE.muted, marginTop: '4px', fontStyle: 'italic' }}>
            {ROLES_INFO[form.rol]?.desc}
          </p>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
            PROYECTO ASIGNADO {veTodo ? '— no aplica' : '(obligatorio)'}
          </label>
          {veTodo ? (
            <p style={{
              padding: '10px 12px', background: BASE.goldLight, borderRadius: '8px',
              fontSize: '11px', color: BASE.goldDark, fontWeight: '700',
            }}>
              🛡️ Admin / Gerente General ve TODOS los proyectos.
            </p>
          ) : (
            <select value={form.proyectoIdAsignado}
              onChange={e => setForm({ ...form, proyectoIdAsignado: e.target.value })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: `1.5px solid ${BASE.border}`, fontSize: '12px',
                fontWeight: '700', background: '#fff', cursor: 'pointer',
              }}>
              <option value="">— Selecciona proyecto —</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {error && <div style={{ padding: '10px', background: BASE.redLight, color: BASE.red, borderRadius: '8px', fontSize: '12px' }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" disabled={loading} style={{
            flex: 1, padding: '12px', background: loading ? BASE.mutedSoft : BASE.navy,
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '900', cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.4px',
          }}>{loading ? 'CREANDO...' : 'CREAR USUARIO'}</button>
          <button type="button" onClick={onClose} style={{
            padding: '12px 18px', background: BASE.bgSoft, color: BASE.muted,
            border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          }}>Cancelar</button>
        </div>

        <p style={{ fontSize: '10px', color: BASE.muted, fontStyle: 'italic', textAlign: 'center' }}>
          💡 Comparte la contraseña con el usuario por canal seguro. Recomienda que la cambie en el primer login.
        </p>
      </form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL: Cambiar rol + proyecto asignado
// ════════════════════════════════════════════════════════════════
function ModalEditarRol({ usuario, proyectos, onClose, showToast }) {
  const [nuevoRol, setNuevoRol] = useState(usuario.rol || 'ingeniero');
  const [nuevoProy, setNuevoProy] = useState(usuario.proyectoIdAsignado || '');
  const [loading, setLoading] = useState(false);

  const veTodo = ROLES_QUE_VEN_TODO.has(nuevoRol);

  const submit = async () => {
    const cambioRol = nuevoRol !== usuario.rol;
    const cambioProy = (nuevoProy || '') !== (usuario.proyectoIdAsignado || '');
    if (!cambioRol && !cambioProy) { onClose(); return; }

    // Validación: si NO es admin, debe tener proyecto asignado
    if (!veTodo && !nuevoProy) {
      showToast?.('⚠️ Este rol requiere un proyecto asignado', 'error');
      return;
    }

    setLoading(true);
    try {
      // Rol y proyecto se actualizan en una sola llamada a la Cloud Function
      // (Admin SDK, no depende de reglas de Firestore del cliente).
      await actualizarUsuarioAdmin(usuario.id, {
        nuevoRol: cambioRol ? nuevoRol : undefined,
        proyectoIdAsignado: veTodo ? '' : nuevoProy,
      });
      showToast?.(`✅ Usuario ${usuario.email} actualizado`, 'success');
      onClose();
    } catch (err) {
      showToast?.('❌ ' + err.message, 'error');
      setLoading(false);
    }
  };

  return (
    <Modal abierto onClose={onClose} titulo={`Editar ${usuario.nombre || usuario.email}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
        <p style={{ fontSize: '12px', color: BASE.muted }}>
          Email: <strong style={{ color: BASE.navy }}>{usuario.email}</strong>
        </p>

        {/* SELECTOR DE ROL */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>
            ROL DEL SISTEMA
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(ROLES_INFO).map(([id, info]) => (
              <button key={id} onClick={() => setNuevoRol(id)} style={{
                padding: '10px 12px',
                background: nuevoRol === id ? `${info.color}1a` : '#fff',
                color: nuevoRol === id ? info.color : BASE.text,
                border: nuevoRol === id ? `2px solid ${info.color}` : `1px solid ${BASE.border}`,
                borderRadius: '8px',
                display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '10px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                textAlign: 'left', alignItems: 'center',
              }}>
                <span style={{ fontSize: '17px' }}>{info.icon}</span>
                <span>
                  <strong style={{ display: 'block', fontWeight: '900' }}>{info.label}</strong>
                  <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8 }}>{info.desc}</span>
                </span>
                {nuevoRol === id && <span style={{ color: info.color, fontSize: '16px' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* SELECTOR DE PROYECTO */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>
            PROYECTO ASIGNADO
          </p>
          {veTodo ? (
            <div style={{
              padding: '12px', background: BASE.goldLight, border: `1.5px solid ${BASE.gold}`,
              borderRadius: '8px', fontSize: '11.5px', color: BASE.goldDark, fontWeight: '700',
            }}>
              🛡️ Este rol (admin / gerente general) ve <strong>TODOS</strong> los proyectos.
              No requiere asignación.
            </div>
          ) : (
            <select value={nuevoProy} onChange={e => setNuevoProy(e.target.value)} style={{
              width: '100%', padding: '11px 14px', borderRadius: '8px',
              border: `1.5px solid ${BASE.border}`, fontSize: '12.5px',
              fontWeight: '700', background: '#fff', cursor: 'pointer',
            }}>
              <option value="">— Selecciona proyecto (obligatorio) —</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.ubicacion?.ciudad ? ' · ' + p.ubicacion.ciudad : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button onClick={submit} disabled={loading} style={{
            flex: 1, padding: '12px',
            background: loading ? BASE.mutedSoft : BASE.navy,
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '900', cursor: 'pointer',
          }}>{loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>
          <button onClick={onClose} style={{
            padding: '12px 18px', background: BASE.bgSoft, color: BASE.muted,
            border: `1px solid ${BASE.border}`, borderRadius: '8px',
            fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          }}>Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

// ────── Helper: Campo de formulario ──────
function Campo({ label, tipo = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      <input type={tipo} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '8px',
          border: `1.5px solid ${BASE.border}`, fontSize: '12px',
        }}
      />
    </div>
  );
}
