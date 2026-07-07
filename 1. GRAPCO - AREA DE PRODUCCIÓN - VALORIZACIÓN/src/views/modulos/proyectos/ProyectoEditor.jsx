// src/views/modulos/proyectos/ProyectoEditor.jsx — Wizard creación proyecto (B23)

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebaseConfig';
import { BASE } from '../../../utils/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';
import ConfirmModal from '../../../components/ConfirmModal';
import DatePickerPremium from '../../../components/DatePickerPremium';

const TIPOS_OBRA = [
  { id: 'edificacion', label: '🏢 Edificación',  color: '#7c3aed', desc: 'Edificios, viviendas, oficinas' },
  { id: 'hidraulica',  label: '💧 Hidráulica',   color: '#0d9488', desc: 'PTAR, PTAP, canales, presas' },
  { id: 'vial',        label: '🛣️ Vial',         color: '#f59e0b', desc: 'Carreteras, puentes, pavimentos' },
  { id: 'mineria',     label: '⛏️ Minería',      color: '#dc2626', desc: 'Tajo abierto, subterránea, plantas' },
  { id: 'industrial',  label: '🏭 Industrial',   color: '#6366f1', desc: 'Plantas, naves, infraestructura' },
  { id: 'otro',        label: '🔧 Otro',          color: '#64748b', desc: 'Otro tipo de obra' },
];

const COLORES_PROYECTO = ['#1e3a5f', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#6366f1', '#ec4899', '#0f766e'];
const COLORES_FRENTE = ['#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#6366f1', '#ec4899'];

const REGIONES_PE = [
  'Lima', 'Arequipa', 'La Libertad', 'Piura', 'Lambayeque', 'Cusco', 'Junín',
  'Áncash', 'Ica', 'Cajamarca', 'Huancavelica', 'Apurímac', 'Ayacucho',
  'Huánuco', 'Loreto', 'San Martín', 'Madre de Dios', 'Pasco', 'Puno',
  'Tacna', 'Tumbes', 'Ucayali', 'Amazonas', 'Moquegua', 'Callao',
];

export default function ProyectoEditor({ proyecto, onClose, showToast }) {
  const { user } = useAuth();
  const { proyectos } = useProyectoActivo();
  const esNuevo = proyecto === 'NUEVO' || !proyecto;
  // Proyecto TERMINADO (estado completado) → edición bloqueada por defecto para
  // proteger los reportes históricos; el admin puede reabrir explícitamente.
  const esTerminado = !esNuevo && proyecto && typeof proyecto === 'object' && proyecto.estado === 'completado';
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);
  // Pide confirmación (modal centrado) antes de marcar el proyecto como TERMINADO.
  const [confirmarTerminado, setConfirmarTerminado] = useState(false);
  // Desbloqueo explícito de edición para un proyecto ya TERMINADO.
  const [desbloqueado, setDesbloqueado] = useState(false);

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcionCorta: '',
    cliente: '',
    logoCliente: '',
    tipoObra: 'edificacion',
    ubicacion: { lat: '', lng: '', ciudad: '', region: 'Lima', direccion: '' },
    presupuestoContractual: 0,
    moneda: 'PEN',
    fechaInicioContractual: '',
    fechaFinContractual: '',
    plazoDias: 0,
    margenMetaPct: 15,
    estado: 'planificado',
    color: COLORES_PROYECTO[0],
    frentesIniciales: [
      { codigo: 'F-01', nombre: 'Frente principal', responsable: '', color: COLORES_FRENTE[0] },
    ],
  });

  useEffect(() => {
    if (!esNuevo && proyecto && typeof proyecto === 'object') {
      const ini = proyecto.fechaInicioContractual?.toDate
        ? proyecto.fechaInicioContractual.toDate().toISOString().split('T')[0]
        : (proyecto.fechaInicioContractual || '');
      const fin = proyecto.fechaFinContractual?.toDate
        ? proyecto.fechaFinContractual.toDate().toISOString().split('T')[0]
        : (proyecto.fechaFinContractual || '');

      setForm({
        ...form,
        ...proyecto,
        ubicacion: { ...form.ubicacion, ...(proyecto.ubicacion || {}) },
        fechaInicioContractual: ini,
        fechaFinContractual: fin,
        frentesIniciales: form.frentesIniciales,
      });
    }
  }, [proyecto, esNuevo]);

  // Calcular plazo automáticamente
  useEffect(() => {
    if (form.fechaInicioContractual && form.fechaFinContractual) {
      const ini = new Date(form.fechaInicioContractual);
      const fin = new Date(form.fechaFinContractual);
      const dias = Math.round((fin - ini) / (1000 * 60 * 60 * 24));
      if (dias > 0 && dias !== form.plazoDias) {
        setForm(f => ({ ...f, plazoDias: dias }));
      }
    }
  }, [form.fechaInicioContractual, form.fechaFinContractual]);

  const updField = (k, v) => setForm({ ...form, [k]: v });
  const updUbic = (k, v) => setForm({ ...form, ubicacion: { ...form.ubicacion, [k]: v } });

  // Subir el logo del cliente a Storage → guardar su URL en el proyecto. El logo
  // se muestra como marca del cliente en el hub de la plataforma al elegirlo.
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const subirLogoCliente = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) { showToast?.('El logo debe ser una imagen (PNG, JPG o SVG)', 'warning'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast?.('El logo no debe superar 2 MB', 'warning'); return; }
    setSubiendoLogo(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const slug = (form.cliente || form.codigo || 'cliente').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente';
      const r = storageRef(storage, `clientes/logos/${slug}-${Date.now()}.${ext}`);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      setForm(f => ({ ...f, logoCliente: url }));
      showToast?.('✅ Logo del cliente cargado', 'success');
    } catch (e) {
      showToast?.('Error subiendo el logo: ' + e.message, 'error');
    } finally {
      setSubiendoLogo(false);
    }
  };

  const addFrente = () => {
    const idx = form.frentesIniciales.length + 1;
    const nuevoF = {
      codigo: `F-${String(idx).padStart(2, '0')}`,
      nombre: '',
      responsable: '',
      color: COLORES_FRENTE[(idx - 1) % COLORES_FRENTE.length],
    };
    setForm({ ...form, frentesIniciales: [...form.frentesIniciales, nuevoF] });
  };
  const updFrente = (idx, k, v) => {
    const nf = [...form.frentesIniciales];
    nf[idx] = { ...nf[idx], [k]: v };
    setForm({ ...form, frentesIniciales: nf });
  };
  const delFrente = (idx) => {
    setForm({ ...form, frentesIniciales: form.frentesIniciales.filter((_, i) => i !== idx) });
  };

  const validarPaso = () => {
    if (paso === 1) {
      if (!form.codigo) return 'Código del proyecto obligatorio';
      if (!form.nombre) return 'Nombre del proyecto obligatorio';
      if (esNuevo) {
        const codigoEnUso = proyectos.find(p => p.codigo === form.codigo.trim().toUpperCase());
        if (codigoEnUso) return `Código ${form.codigo} ya está en uso por otro proyecto`;
      }
    }
    if (paso === 2) {
      if (!form.ubicacion.ciudad) return 'Ciudad obligatoria';
    }
    if (paso === 3) {
      if (!form.presupuestoContractual || parseFloat(form.presupuestoContractual) <= 0) return 'Presupuesto debe ser mayor a 0';
      if (!form.fechaInicioContractual) return 'Fecha de inicio obligatoria';
      if (!form.fechaFinContractual) return 'Fecha de fin obligatoria';
    }
    if (paso === 4) {
      if (esNuevo && form.frentesIniciales.length === 0) return 'Debes crear al menos un frente';
      if (esNuevo) {
        for (const f of form.frentesIniciales) {
          if (!f.codigo || !f.nombre) return 'Todos los frentes deben tener código y nombre';
        }
      }
    }
    return null;
  };

  // Pasos visibles: en EDICIÓN se oculta el 4 (Frentes), así que navegamos por la
  // SECUENCIA visible (no por num+1) para no caer en un paso 4 en blanco ni numerar 1,2,3,5.
  const pasosVis = () => (esNuevo ? PASOS : PASOS.filter(p => p.num !== 4));

  const siguiente = () => {
    const err = validarPaso();
    if (err) { showToast?.(err, 'error'); return; }
    const vis = pasosVis();
    const i = vis.findIndex(p => p.num === paso);
    if (i >= 0 && i < vis.length - 1) setPaso(vis[i + 1].num);
  };

  const anterior = () => {
    const vis = pasosVis();
    const i = vis.findIndex(p => p.num === paso);
    if (i > 0) setPaso(vis[i - 1].num);
  };

  const guardar = async () => {
    if (esTerminado && !desbloqueado) { showToast?.('Proyecto TERMINADO: usa «Reabrir para editar» antes de guardar.', 'error'); return; }
    const err = validarPaso();
    if (err) { showToast?.(err, 'error'); return; }

    setGuardando(true);
    try {
      const proyData = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        descripcionCorta: form.descripcionCorta?.trim() || '',
        cliente: form.cliente?.trim() || '',
        logoCliente: form.logoCliente || '',
        tipoObra: form.tipoObra,
        ubicacion: {
          lat: parseFloat(form.ubicacion.lat) || null,
          lng: parseFloat(form.ubicacion.lng) || null,
          ciudad: form.ubicacion.ciudad?.trim() || '',
          region: form.ubicacion.region || 'Lima',
          direccion: form.ubicacion.direccion?.trim() || '',
        },
        presupuestoContractual: parseFloat(form.presupuestoContractual) || 0,
        moneda: form.moneda || 'PEN',
        fechaInicioContractual: form.fechaInicioContractual ? new Date(form.fechaInicioContractual) : null,
        fechaFinContractual: form.fechaFinContractual ? new Date(form.fechaFinContractual) : null,
        plazoDias: parseInt(form.plazoDias) || 0,
        margenMetaPct: parseFloat(form.margenMetaPct) || 15,
        estado: form.estado || 'planificado',
        color: form.color || COLORES_PROYECTO[0],
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };

      // Trazabilidad de cierre: al pasar a 'completado' (Terminado) graba quién/cuándo;
      // al reabrir (salir de 'completado') limpia esos campos.
      const eraCompletado = proyecto && typeof proyecto === 'object' && proyecto.estado === 'completado';
      if (proyData.estado === 'completado' && !eraCompletado) {
        proyData.completadoEn = serverTimestamp();
        proyData.completadoPor = user?.email || 'desconocido';
      } else if (proyData.estado !== 'completado' && eraCompletado) {
        proyData.completadoEn = null;
        proyData.completadoPor = null;
      }

      if (esNuevo) {
        proyData.creadoEn = serverTimestamp();
        proyData.creadoPor = user?.email || 'desconocido';
        proyData.avancePctActual = 0;
        proyData.cpiActual = 1.0;
        proyData.spiActual = 1.0;

        // Crear proyecto
        const proyRef = await addDoc(collection(db, 'Proyectos'), proyData);

        // Crear frentes en batch
        const batch = writeBatch(db);
        form.frentesIniciales.forEach((f, idx) => {
          const fRef = doc(collection(db, 'Frentes'));
          batch.set(fRef, {
            codigo: f.codigo.trim().toUpperCase(),
            nombre: f.nombre.trim(),
            descripcion: f.descripcion || '',
            proyectoId: proyRef.id,
            responsable: f.responsable?.trim() || 'Sin asignar',
            presupuestoFrente: 0,
            avancePctActual: 0,
            color: f.color || COLORES_FRENTE[0],
            orden: idx + 1,
            activo: true,
            creadoEn: serverTimestamp(),
            creadoPor: user?.email || 'desconocido',
          });
        });
        await batch.commit();

        showToast?.(`✅ Proyecto "${form.nombre}" creado con ${form.frentesIniciales.length} frente(s)`, 'success');
      } else {
        await updateDoc(doc(db, 'Proyectos', proyecto.id), proyData);
        showToast?.('✅ Proyecto actualizado', 'success');
      }

      onClose?.();
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const PASOS = [
    { num: 1, l: 'Identificación', icono: '📋' },
    { num: 2, l: 'Ubicación',      icono: '📍' },
    { num: 3, l: 'Contrato',       icono: '💰' },
    { num: 4, l: 'Frentes',        icono: '🏗️' },
    { num: 5, l: 'Confirmación',   icono: '✅' },
  ];

  // Si es edición, ocultar paso 4 (frentes ya creados se gestionan aparte)
  const pasosVisibles = esNuevo ? PASOS : PASOS.filter(p => p.num !== 4);

  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderRadius: '14px', padding: '22px 26px',
      borderLeft: `5px solid ${form.color}`,
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '1px' }}>
            🌎 GESTIÓN DE PROYECTOS · WIZARD
          </p>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
            {esNuevo ? '➕ Nuevo Proyecto' : `✏️ ${form.nombre}`}
          </h3>
        </div>
        <button onClick={onClose} style={btnGhost}>✕ Cerrar</button>
      </div>

      {/* Banner de proyecto TERMINADO (solo lectura, con reapertura explícita) */}
      {esTerminado && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          background: desbloqueado ? '#fffbeb' : BASE.goldSoft,
          border: `1px solid ${BASE.gold}`, borderRadius: '12px',
          padding: '11px 14px', marginBottom: '18px',
        }}>
          <span style={{ fontSize: '18px' }}>{desbloqueado ? '🔓' : '🏁'}</span>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 900, color: BASE.navy }}>
              {desbloqueado ? 'Edición habilitada' : 'Proyecto TERMINADO · solo lectura'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: BASE.muted }}>
              {desbloqueado
                ? 'Cambiar datos de un proyecto cerrado afecta reportes históricos. Procede con cuidado.'
                : 'Este proyecto está cerrado. Para proteger los reportes, la edición está bloqueada.'}
            </p>
          </div>
          {!desbloqueado && (
            <button type="button" onClick={() => setDesbloqueado(true)}
              style={{ ...btnGhost, borderColor: BASE.gold, color: BASE.navy, whiteSpace: 'nowrap' }}>
              🔓 Reabrir para editar
            </button>
          )}
        </div>
      )}

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(() => { const idxAct = pasosVisibles.findIndex(p => p.num === paso); return pasosVisibles.map((p, i) => {
          const activo = paso === p.num;
          const completo = idxAct > i;   // completado = está antes del paso actual (por posición visible)
          return (
            <div key={p.num} style={{
              flex: '1 1 120px',
              padding: '10px 12px',
              background: activo ? `linear-gradient(135deg, ${form.color}, ${form.color}dd)`
                       : completo ? '#dcfce7' : BASE.bgSoft,
              color: activo ? '#fff' : completo ? '#15803d' : BASE.muted,
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '11px', fontWeight: '900',
              border: activo ? 'none' : `1px solid ${BASE.border}`,
              transition: 'all 0.2s',
            }}>
              <p style={{ fontSize: '14px', marginBottom: '2px' }}>{completo ? '✓' : p.icono}</p>
              <p style={{ fontSize: '10px', letterSpacing: '0.4px' }}>PASO {i + 1}</p>
              <p style={{ fontSize: '11px' }}>{p.l}</p>
            </div>
          );
        }); })()}
      </div>

      {/* PASO 1 - IDENTIFICACIÓN */}
      {paso === 1 && (
        <div className="anim-fade-in">
          <Sec titulo="📋 IDENTIFICACIÓN" color={form.color}>
            <Grid cols="1fr 2fr">
              <Field label="Código del proyecto *" hint="Único en GRAPCO. Ej: PTARI-2026">
                <input type="text" value={form.codigo}
                  onChange={e => updField('codigo', e.target.value.toUpperCase())}
                  placeholder="PTARI-2026" style={inpS} />
              </Field>
              <Field label="Nombre completo *">
                <input type="text" value={form.nombre}
                  onChange={e => updField('nombre', e.target.value)}
                  placeholder="Planta de Tratamiento PTARI" style={inpS} />
              </Field>
            </Grid>

            <Field label="Descripción corta">
              <input type="text" value={form.descripcionCorta}
                onChange={e => updField('descripcionCorta', e.target.value)}
                placeholder="PTARI Lima Sur, capacidad 200 lps" style={inpS} />
            </Field>

            <Field label="Cliente">
              <input type="text" value={form.cliente}
                onChange={e => updField('cliente', e.target.value)}
                placeholder="SEDAPAL" style={inpS} />
            </Field>

            <Field label="Logo del cliente" hint="Se muestra como marca del cliente en el inicio de la plataforma. PNG, JPG o SVG · máx 2 MB.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '12px', background: '#fff',
                  border: `1px solid ${BASE.border}`, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px',
                }}>
                  {form.logoCliente
                    ? <img src={form.logoCliente} alt="Logo del cliente" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: '22px', opacity: 0.35 }}>🏢</span>}
                </div>
                <label style={{
                  padding: '10px 18px', borderRadius: '9px',
                  background: subiendoLogo ? BASE.muted : `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
                  color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px',
                  cursor: subiendoLogo ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px',
                }}>
                  {subiendoLogo ? '⏳ Subiendo…' : (form.logoCliente ? '🔄 Cambiar logo' : '⬆ Subir logo')}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }}
                    disabled={subiendoLogo}
                    onChange={e => { subirLogoCliente(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {form.logoCliente && !subiendoLogo && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, logoCliente: '' }))} style={{
                    padding: '10px 14px', borderRadius: '9px', background: 'transparent',
                    border: `1px solid ${BASE.border}`, color: BASE.muted, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  }}>Quitar</button>
                )}
              </div>
            </Field>

            <Field label="Tipo de obra">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '8px' }}>
                {TIPOS_OBRA.map(t => {
                  const sel = form.tipoObra === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => updField('tipoObra', t.id)} style={{
                      padding: '12px 14px', borderRadius: '10px',
                      background: sel ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)` : BASE.bgSoft,
                      color: sel ? '#fff' : BASE.text,
                      border: sel ? 'none' : `1.5px solid ${BASE.border}`,
                      fontSize: '12px', fontWeight: '900', cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: sel ? `0 4px 12px ${t.color}55` : 'none',
                    }}>
                      <p>{t.label}</p>
                      <p style={{ fontSize: '10px', fontWeight: '600', marginTop: '3px', opacity: sel ? 0.92 : 0.7 }}>
                        {t.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Color del proyecto" hint="Para identificarlo visualmente en la app">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORES_PROYECTO.map(c => (
                  <button key={c} type="button" onClick={() => updField('color', c)} style={{
                    width: '38px', height: '38px',
                    background: c, borderRadius: '50%',
                    border: form.color === c ? `3px solid ${BASE.gold}` : '2px solid #fff',
                    boxShadow: form.color === c ? `0 0 0 2px ${c}` : '0 1px 4px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }} />
                ))}
              </div>
            </Field>
          </Sec>
        </div>
      )}

      {/* PASO 2 - UBICACIÓN */}
      {paso === 2 && (
        <div className="anim-fade-in">
          <Sec titulo="📍 UBICACIÓN GEOGRÁFICA" color={form.color}>
            <Grid cols="1fr 1fr">
              <Field label="Ciudad *">
                <input type="text" value={form.ubicacion.ciudad}
                  onChange={e => updUbic('ciudad', e.target.value)}
                  placeholder="Lima" style={inpS} />
              </Field>
              <Field label="Región / Departamento">
                <select value={form.ubicacion.region}
                  onChange={e => updUbic('region', e.target.value)} style={selS}>
                  {REGIONES_PE.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </Grid>

            <Field label="Dirección de obra">
              <input type="text" value={form.ubicacion.direccion}
                onChange={e => updUbic('direccion', e.target.value)}
                placeholder="Av. Los Constructores 100, Villa El Salvador" style={inpS} />
            </Field>

            <Grid cols="1fr 1fr">
              <Field label="Latitud" hint="Opcional · para mapa">
                <input type="number" step="0.000001" value={form.ubicacion.lat}
                  onChange={e => updUbic('lat', e.target.value)}
                  placeholder="-12.0464" style={inpS} />
              </Field>
              <Field label="Longitud" hint="Opcional · para mapa">
                <input type="number" step="0.000001" value={form.ubicacion.lng}
                  onChange={e => updUbic('lng', e.target.value)}
                  placeholder="-77.0428" style={inpS} />
              </Field>
            </Grid>

            <div style={{
              background: '#dbeafe', border: '1px solid #2563eb33',
              borderLeft: `4px solid #2563eb`,
              borderRadius: '10px', padding: '12px 16px',
              fontSize: '12px', color: '#1e3a5f',
            }}>
              💡 <strong>Tip:</strong> Las coordenadas (lat, lng) se usan para mostrar el proyecto en el mapa de portfolio (Bloque 24). Puedes obtenerlas en Google Maps haciendo click derecho sobre la ubicación.
            </div>
          </Sec>
        </div>
      )}

      {/* PASO 3 - CONTRATO */}
      {paso === 3 && (
        <div className="anim-fade-in">
          <Sec titulo="💰 CONTRATO Y PRESUPUESTO" color={form.color}>
            <Grid cols="2fr 1fr">
              <Field label="Presupuesto contractual *">
                <input type="number" step="0.01" value={form.presupuestoContractual}
                  onChange={e => updField('presupuestoContractual', e.target.value)}
                  placeholder="12000000" style={inpS} />
              </Field>
              <Field label="Moneda">
                <select value={form.moneda} onChange={e => updField('moneda', e.target.value)} style={selS}>
                  <option value="PEN">PEN · Soles (S/.)</option>
                  <option value="USD">USD · Dólares ($)</option>
                </select>
              </Field>
            </Grid>

            <Grid cols="1fr 1fr 1fr">
              <Field label="Fecha de inicio *">
                <DatePickerPremium value={form.fechaInicioContractual || ''}
                  onChange={iso => updField('fechaInicioContractual', iso)} />
              </Field>
              <Field label="Fecha de fin contractual *">
                <DatePickerPremium value={form.fechaFinContractual || ''}
                  onChange={iso => updField('fechaFinContractual', iso)} />
              </Field>
              <Field label="Plazo (días)" hint="Calculado">
                <input type="text" readOnly value={form.plazoDias}
                  style={{ ...inpS, background: '#dcfce7', color: '#15803d', fontWeight: '900' }} />
              </Field>
            </Grid>

            <Grid cols="1fr 1fr">
              <Field label="Margen meta (%)">
                <input type="number" step="0.1" value={form.margenMetaPct}
                  onChange={e => updField('margenMetaPct', e.target.value)} style={inpS} />
              </Field>
              <Field label="Estado del proyecto">
                <select value={form.estado} onChange={e => {
                  const nuevo = e.target.value;
                  // Marcar TERMINADO pide confirmación; el resto aplica directo.
                  if (nuevo === 'completado' && form.estado !== 'completado') setConfirmarTerminado(true);
                  else updField('estado', nuevo);
                }} style={selS}>
                  <option value="planificado">📅 Planificado</option>
                  <option value="en_ejecucion">🟡 En ejecución</option>
                  <option value="suspendido">⏸️ Suspendido</option>
                  <option value="completado">✅ Terminado</option>
                </select>
              </Field>
            </Grid>
          </Sec>
        </div>
      )}

      {/* PASO 4 - FRENTES INICIALES */}
      {paso === 4 && esNuevo && (
        <div className="anim-fade-in">
          <Sec titulo="🏗️ FRENTES DE TRABAJO INICIALES" color={form.color}>
            <p style={{ fontSize: '12.5px', color: BASE.muted, marginBottom: '14px', lineHeight: 1.6 }}>
              Define los frentes en los que se va a dividir el proyecto. Un frente es una zona física o lógica de trabajo (ej: "Frente Norte – Tanque", "Frente Sur – Edificio"). Puedes agregar más frentes después.
            </p>

            {form.frentesIniciales.map((f, idx) => (
              <div key={idx} style={{
                background: BASE.bgSoft, padding: '12px 14px',
                borderRadius: '10px', marginBottom: '10px',
                borderLeft: `4px solid ${f.color}`,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 50px 40px', gap: '8px', alignItems: 'center' }}>
                  <input type="text" value={f.codigo} placeholder="F-01"
                    onChange={e => updFrente(idx, 'codigo', e.target.value.toUpperCase())} style={inpS} />
                  <input type="text" value={f.nombre} placeholder="Tanque sedimentación"
                    onChange={e => updFrente(idx, 'nombre', e.target.value)} style={inpS} />
                  <input type="text" value={f.responsable} placeholder="Ing. Pérez (opcional)"
                    onChange={e => updFrente(idx, 'responsable', e.target.value)} style={inpS} />
                  <select value={f.color} onChange={e => updFrente(idx, 'color', e.target.value)}
                    style={{ ...selS, padding: '5px', minWidth: 'auto' }}>
                    {COLORES_FRENTE.map(c => <option key={c} value={c} style={{ background: c }}>{c}</option>)}
                  </select>
                  {form.frentesIniciales.length > 1 && (
                    <button onClick={() => delFrente(idx)} style={btnDel}>×</button>
                  )}
                </div>
              </div>
            ))}

            <button onClick={addFrente} style={{
              width: '100%', padding: '12px',
              background: form.color + '15',
              color: form.color,
              border: `2px dashed ${form.color}`,
              borderRadius: '10px',
              fontSize: '12px', fontWeight: '900',
              cursor: 'pointer', letterSpacing: '0.4px',
            }}>
              ➕ Agregar otro frente
            </button>
          </Sec>
        </div>
      )}

      {/* PASO 5 - CONFIRMACIÓN */}
      {paso === 5 && (
        <div className="anim-fade-in">
          <div style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff', borderRadius: '14px',
            padding: '24px 28px',
            borderLeft: `5px solid ${BASE.gold}`,
          }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.gold, letterSpacing: '1.4px' }}>
              ✅ TODO LISTO
            </p>
            <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '6px' }}>
              Revisa y crea el proyecto
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px', marginTop: '14px' }}>
            <ResumenCard label="Identificación" datos={[
              ['Código', form.codigo],
              ['Nombre', form.nombre],
              ['Cliente', form.cliente || '—'],
              ['Tipo', TIPOS_OBRA.find(t => t.id === form.tipoObra)?.label || form.tipoObra],
            ]} />
            <ResumenCard label="Ubicación" datos={[
              ['Ciudad', form.ubicacion.ciudad],
              ['Región', form.ubicacion.region],
              ['Coords', form.ubicacion.lat ? `${form.ubicacion.lat}, ${form.ubicacion.lng}` : '—'],
            ]} />
            <ResumenCard label="Contrato" datos={[
              ['Presupuesto', `${form.moneda === 'USD' ? '$' : 'S/.'} ${Number(form.presupuestoContractual).toLocaleString('es-PE')}`],
              ['Plazo', `${form.plazoDias} días`],
              ['Margen meta', `${form.margenMetaPct}%`],
            ]} />
            {esNuevo && (
              <ResumenCard label={`Frentes (${form.frentesIniciales.length})`} datos={
                form.frentesIniciales.map(f => [f.codigo, f.nombre])
              } />
            )}
          </div>
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '18px', borderTop: `1px solid ${BASE.border}` }}>
        <button onClick={anterior} disabled={paso === 1 || guardando} style={{
          ...btnSec,
          opacity: paso === 1 ? 0.4 : 1,
          cursor: paso === 1 ? 'not-allowed' : 'pointer',
        }}>← Anterior</button>

        <span style={{ fontSize: '11px', color: BASE.muted, fontWeight: '700' }}>
          Paso {pasosVisibles.findIndex(p => p.num === paso) + 1} de {pasosVisibles.length}
        </span>

        {pasosVisibles.findIndex(p => p.num === paso) < pasosVisibles.length - 1 ? (
          <button onClick={siguiente} disabled={guardando} style={{
            ...btnPrimario,
            background: `linear-gradient(135deg, ${form.color}, ${form.color}dd)`,
            boxShadow: `0 4px 12px ${form.color}55`,
          }}>
            Siguiente →
          </button>
        ) : (
          <button onClick={guardar} disabled={guardando} style={{
            ...btnPrimario,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            boxShadow: '0 4px 12px rgba(22,163,74,0.4)',
          }}>
            {guardando ? '⏳ Guardando...' : (esNuevo ? '🚀 CREAR PROYECTO' : '💾 GUARDAR CAMBIOS')}
          </button>
        )}
      </div>

      {/* Confirmación centrada al marcar el proyecto como TERMINADO (estado completado) */}
      <ConfirmModal
        abierto={confirmarTerminado}
        tono="peligro"
        icono="🏁"
        titulo="¿Marcar proyecto como TERMINADO?"
        mensaje="El proyecto quedará marcado como Terminado y se registrará la fecha y el responsable del cierre."
        detalle="Podrás reabrirlo cambiando el estado nuevamente."
        textoConfirmar="Sí, marcar Terminado"
        textoCancelar="Cancelar"
        onConfirmar={() => { updField('estado', 'completado'); setConfirmarTerminado(false); }}
        onCancelar={() => setConfirmarTerminado(false)}
      />
    </div>
  );
}

function Sec({ titulo, color, children }) {
  return (
    <div style={{ background: BASE.bgSoft, padding: '16px 18px', borderRadius: '12px', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px', marginBottom: '12px' }}>{titulo}</p>
      {children}
    </div>
  );
}
function Grid({ cols, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', marginBottom: '8px' }}>{children}</div>;
}
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
      {hint && <p style={{ fontSize: '9.5px', color: BASE.muted, marginTop: '3px', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}
function ResumenCard({ label, datos }) {
  return (
    <div style={{
      background: BASE.white, border: `1px solid ${BASE.border}`,
      borderLeft: `4px solid ${BASE.gold}`,
      borderRadius: '10px', padding: '12px 16px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', marginBottom: '8px' }}>{label.toUpperCase()}</p>
      {datos.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: i < datos.length - 1 ? `1px solid ${BASE.border}` : 'none' }}>
          <span style={{ color: BASE.muted, fontWeight: '700' }}>{k}</span>
          <span style={{ color: BASE.navy, fontWeight: '900', textAlign: 'right' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const selS = { ...inpS, cursor: 'pointer', fontWeight: '700' };
const btnGhost = { padding: '8px 14px', borderRadius: '8px', background: 'transparent', color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '11.5px', fontWeight: '900', cursor: 'pointer' };
const btnSec = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.navy, border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '900', cursor: 'pointer' };
const btnPrimario = { padding: '11px 22px', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px' };
const btnDel = { width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: 'none', fontSize: '16px', fontWeight: '900', cursor: 'pointer' };
