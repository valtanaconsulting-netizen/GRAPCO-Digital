// src/views/modulos/petsWBS/PETsView.jsx — Procedimientos Escritos de Trabajo vinculados al WBS (B22)
//
// Cada PET se vincula a una o más actividades del Plan Maestro (por código WBS).
// El operario debe firmar el PET ANTES de poder registrar avance en esa actividad.

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import RoleGuard from '../../../components/RoleGuard';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';
import PETEditor from './PETEditor';
import PETPdfPreview from './PETPdfPreview';
import { PETS_BASE_GRAPCO } from '../../../data/seed/petsBaseGRAPCO';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';

const FORM_INICIAL = {
  codigo: '', titulo: '', version: 1,
  alcance: '', riesgosClave: '', epp: '', secuenciaTrabajo: '',
  responsablesNombres: '',
  aplicaActividadesWBS: [],
  estado: 'vigente',
};

export default function PETsView({ showToast }) {
  const { user, rol } = useAuth();
  const [pets, setPets] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verFirmas, setVerFirmas] = useState(null);
  const [verPdf, setVerPdf] = useState(null);

  // PETs son patrimonio comun (sirven para cualquier proyecto), NO se filtran.
  // PlanMaestro (actividades WBS donde se vincula cada PET) SI se filtra por proyecto activo.
  const { filtrarPorContexto } = useProyectoActivo();
  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'PETs'), orderBy('codigo')),
        (snap) => { setPets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (e) => { console.error(e); setLoading(false); }),
      onSnapshot(query(collection(db, 'PlanMaestro'), orderBy('codigo')),
        (snap) => {
          const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setActividades(filtrarPorContexto(todos));
        },
        (e) => console.warn('[PM]', e)),
    ];
    return () => unsubs.forEach(u => u());
  }, [filtrarPorContexto]);

  const actividadesConCodigoMap = useMemo(() => {
    const m = new Map();
    actividades.forEach(a => { if (a.codigo) m.set(a.codigo, a); });
    return m;
  }, [actividades]);

  const filtrados = useMemo(() => pets.filter(p => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return (p.codigo || '').toLowerCase().includes(b) ||
           (p.titulo || '').toLowerCase().includes(b);
  }), [pets, busqueda]);

  const guardar = async () => {
    if (!form.codigo || !form.titulo) {
      showToast?.('Código y título obligatorios', 'error');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        codigo: form.codigo.trim().toUpperCase(),
        titulo: form.titulo.trim(),
        version: parseInt(form.version) || 1,
        alcance: form.alcance?.trim() || null,
        riesgosClave: form.riesgosClave?.trim() || null,
        epp: form.epp?.trim() || null,
        secuenciaTrabajo: form.secuenciaTrabajo?.trim() || null,
        responsablesNombres: form.responsablesNombres?.trim() || null,
        aplicaActividadesWBS: Array.isArray(form.aplicaActividadesWBS) ? form.aplicaActividadesWBS : [],
        estado: form.estado,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando === 'NUEVO') {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        data.firmasOperarios = [];
        await addDoc(collection(db, 'PETs'), data);
        showToast?.(`✅ PET ${form.codigo} v${form.version} creado`, 'success');
      } else {
        await updateDoc(doc(db, 'PETs', editando), data);
        showToast?.('✅ PET actualizado', 'success');
      }
      setEditando(null); setForm(FORM_INICIAL);
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const eliminar = async (id, codigo) => {
    if (!confirm(`¿Eliminar PET ${codigo}?`)) return;
    try {
      await deleteDoc(doc(db, 'PETs', id));
      showToast?.('🗑️ PET eliminado', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  // Importar PETs base GRAPCO (idempotente por codigo)
  const [importando, setImportando] = useState(false);
  const importarPETsBase = async () => {
    if (!(rol === 'admin' || rol === 'ingeniero' || rol === 'calidad')) {
      showToast?.('Solo admin / ingeniero / calidad pueden importar PETs base', 'error');
      return;
    }
    const yaExisten = new Set(pets.map(p => (p.codigo || '').toUpperCase()));
    const pendientes = PETS_BASE_GRAPCO.filter(p => !yaExisten.has(p.codigo.toUpperCase()));
    if (pendientes.length === 0) {
      showToast?.('Todos los PETs base ya están cargados', 'info');
      return;
    }
    if (!confirm(`Se importarán ${pendientes.length} PETs base GRAPCO. ¿Continuar?`)) return;
    setImportando(true);
    let ok = 0, errores = 0;
    for (const pet of pendientes) {
      try {
        await addDoc(collection(db, 'PETs'), {
          ...pet,
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'desconocido',
          actualizadoEn: serverTimestamp(),
          actualizadoPor: user?.email || 'desconocido',
          firmasOperarios: [],
        });
        ok++;
      } catch (e) {
        console.error('[importarPETsBase]', pet.codigo, e);
        errores++;
      }
    }
    setImportando(false);
    showToast?.(`✅ Importados ${ok} PETs${errores ? ` (${errores} fallaron — ver consola)` : ''}`, ok > 0 ? 'success' : 'error');
  };

  // Operario firma PET (de leído y entendido)
  const firmarPET = async (petId) => {
    if (rol === 'admin' || rol === 'ingeniero' || rol === 'capataz') {
      try {
        await updateDoc(doc(db, 'PETs', petId), {
          firmasOperarios: arrayUnion({
            uid: user?.uid || 'desconocido',
            email: user?.email || 'desconocido',
            nombre: user?.displayName || user?.email || 'desconocido',
            fecha: new Date(),
          }),
        });
        showToast?.('✅ Firma de PET registrada', 'success');
      } catch (e) {
        showToast?.('Error: ' + e.message, 'error');
      }
    } else {
      showToast?.('Solo capataces/operarios firman PETs', 'error');
    }
  };

  const toggleActividad = (codigo) => {
    const actuales = form.aplicaActividadesWBS || [];
    if (actuales.includes(codigo)) {
      setForm({ ...form, aplicaActividadesWBS: actuales.filter(c => c !== codigo) });
    } else {
      setForm({ ...form, aplicaActividadesWBS: [...actuales, codigo] });
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando PETs...</p>;

  return (
    <RoleGuard rolesPermitidos={['admin', 'ingeniero', 'calidad', 'capataz']}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* HEADER */}
        <div style={{
          background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
          borderRadius: '14px', padding: '20px 26px', color: '#fff',
          borderLeft: `5px solid ${BASE.gold}`,
          boxShadow: BASE.shadowLg,
        }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.6px' }}>
            PETs · PROCEDIMIENTOS ESCRITOS DE TRABAJO SEGURO · VINCULADOS AL WBS
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '900', marginTop: '4px' }}>
            Cada actividad WBS tiene su PET asociado
          </h2>
          <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Operarios firman digitalmente que leyeron y entendieron el PET. Sin firma → no se puede registrar avance en esa actividad.
          </p>
        </div>

        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>PETs registrados</p>
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
                {pets.length} PETs · {pets.reduce((s, p) => s + (p.firmasOperarios?.length || 0), 0)} firmas totales
              </p>
            </div>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar..." aria-label="Buscar PET" style={{ ...inpS, minWidth: '200px' }} />
            {(rol === 'admin' || rol === 'ingeniero' || rol === 'calidad') && (
              <>
                <button onClick={importarPETsBase} disabled={importando} style={{
                  padding: '10px 18px', borderRadius: '8px',
                  background: importando ? BASE.mutedSoft : BASE.gold,
                  color: BASE.navy, border: 'none', fontSize: '12px', fontWeight: '900',
                  cursor: importando ? 'wait' : 'pointer', letterSpacing: '0.5px',
                  boxShadow: '0 3px 10px rgba(245,158,11,0.45)',
                }}
                title="Crea los 6 PETs base de GRAPCO (Trazo, Excavación, Nivelación, Calzaduras, Andamios, Demolición). Idempotente.">
                  {importando ? '⏳ Importando…' : '📥 Importar PETs base'}
                </button>
                <button onClick={() => setEditando('NUEVO')} style={{
                  padding: '10px 20px', borderRadius: '8px',
                  background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
                  color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
                  cursor: 'pointer', letterSpacing: '0.5px',
                  boxShadow: BASE.shadowMd,
                }}>➕ NUEVO PET</button>
              </>
            )}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <EmptyState icono="📜" titulo="Sin PETs registrados"
            descripcion="Crea procedimientos escritos de trabajo seguro vinculados a las actividades del Plan Maestro WBS." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
            {filtrados.map(p => {
              const actividadesAplica = (p.aplicaActividadesWBS || []).map(c => actividadesConCodigoMap.get(c)).filter(Boolean);
              const firmas = p.firmasOperarios?.length || 0;
              const yaFirmado = (p.firmasOperarios || []).some(f => f.uid === user?.uid);

              return (
                <div key={p.id} style={{
                  background: BASE.white, border: `1px solid ${BASE.border}`,
                  borderLeft: `5px solid ${BASE.navy}`,
                  borderRadius: '14px', padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
                        {p.codigo} · v{p.version || 1}
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: '900', color: BASE.navy, marginTop: '4px', lineHeight: 1.3 }}>
                        {p.titulo}
                      </p>
                    </div>
                    <span style={{
                      background: p.estado === 'vigente' ? '#dcfce7' : '#fee2e2',
                      color: p.estado === 'vigente' ? '#15803d' : '#991b1b',
                      padding: '3px 9px', borderRadius: '10px',
                      fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                    }}>{(p.estado || 'vigente').toUpperCase()}</span>
                  </div>

                  {/* Actividades vinculadas */}
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
                      APLICA A {actividadesAplica.length} ACTIVIDAD(ES) WBS
                    </p>
                    {actividadesAplica.length === 0 ? (
                      <p style={{ fontSize: '11px', color: BASE.red, marginTop: '4px', fontStyle: 'italic' }}>
                        ⚠️ Sin actividades WBS vinculadas
                      </p>
                    ) : (
                      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {actividadesAplica.slice(0, 4).map(a => (
                          <span key={a.codigo} style={{
                            background: BASE.bgSoft, color: BASE.navy,
                            padding: '3px 8px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '700', fontFamily: 'monospace',
                            border: `1px solid ${BASE.border}`,
                          }}>{a.codigo}</span>
                        ))}
                        {actividadesAplica.length > 4 && (
                          <span style={{ fontSize: '10px', color: BASE.muted, fontWeight: '700' }}>
                            +{actividadesAplica.length - 4} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      background: BASE.navySoft, color: BASE.navy,
                      padding: '5px 10px', borderRadius: '8px',
                      fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                    }}>✍️ {firmas} firmas</span>

                    <button onClick={() => setVerPdf(p)} style={btnAct(BASE.gold)}>
                      📄 PDF
                    </button>

                    {!yaFirmado && (rol === 'capataz' || rol === 'ingeniero' || rol === 'admin') && (
                      <button onClick={() => firmarPET(p.id)} style={btnAct(BASE.green)}>
                        ✍️ Firmar
                      </button>
                    )}
                    {yaFirmado && (
                      <span style={{
                        background: '#dcfce7', color: '#15803d',
                        padding: '5px 10px', borderRadius: '8px',
                        fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
                      }}>✅ Firmado por ti</span>
                    )}

                    {(rol === 'admin' || rol === 'ingeniero' || rol === 'calidad') && (
                      <>
                        <button onClick={() => setEditando(p.id)} style={btnAct(BASE.navy)}>EDITAR</button>
                        <button onClick={() => eliminar(p.id, p.codigo)} style={btnAct(BASE.red)}>×</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Editor estructurado de PET — 10 secciones del molde GRAPCO */}
        {editando && (
          <PETEditor
            petId={editando === 'NUEVO' ? null : editando}
            onClose={() => setEditando(null)}
            showToast={showToast}
          />
        )}

        {/* Vista PDF imprimible (A4 con formato del SGC) */}
        {verPdf && <PETPdfPreview pet={verPdf} onClose={() => setVerPdf(null)} />}

        {/* Modal de firmas */}
        {verFirmas && (
          <Modal onClose={() => setVerFirmas(null)} maxWidth="600px">
            <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
              {verFirmas.codigo} · {verFirmas.titulo}
            </h3>

            {verFirmas.alcance && <Detail label="Alcance" texto={verFirmas.alcance} />}
            {verFirmas.riesgosClave && <Detail label="Riesgos clave" texto={verFirmas.riesgosClave} />}
            {verFirmas.epp && <Detail label="EPP requerido" texto={verFirmas.epp} />}
            {verFirmas.secuenciaTrabajo && <Detail label="Secuencia" texto={verFirmas.secuenciaTrabajo} mono />}

            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>
                FIRMAS DE OPERARIOS ({verFirmas.firmasOperarios?.length || 0})
              </p>
              {(verFirmas.firmasOperarios || []).length === 0 ? (
                <p style={{ fontSize: '11.5px', color: BASE.muted, fontStyle: 'italic', marginTop: '6px' }}>
                  Sin firmas todavía.
                </p>
              ) : (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {verFirmas.firmasOperarios.map((f, idx) => {
                    const fecha = f.fecha?.toDate ? f.fecha.toDate() : (f.fecha ? new Date(f.fecha) : null);
                    return (
                      <div key={idx} style={{
                        background: '#dcfce7', border: '1px solid #16a34a55',
                        borderRadius: '8px', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
                          ✓ {f.nombre || f.email}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#15803d', fontFamily: 'monospace' }}>
                          {fecha?.toLocaleString('es-PE') || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setVerFirmas(null)} style={btnCancel}>Cerrar</button>
            </div>
          </Modal>
        )}
      </div>
    </RoleGuard>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

function Detail({ label, texto, mono }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{
        fontSize: '12px', color: BASE.text, marginTop: '3px',
        whiteSpace: 'pre-wrap', lineHeight: 1.5,
        ...(mono ? { fontFamily: 'monospace', background: BASE.bgSoft, padding: '8px 10px', borderRadius: '6px' } : {}),
      }}>{texto}</p>
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnSave = { padding: '11px 22px', borderRadius: '8px', background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`, color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px', boxShadow: BASE.shadowMd };
const btnAct = (color) => ({
  padding: '5px 11px', borderRadius: '6px', background: color, color: '#fff',
  border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
});
