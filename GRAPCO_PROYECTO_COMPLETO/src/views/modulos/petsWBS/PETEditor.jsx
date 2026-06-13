// src/views/modulos/petsWBS/PETEditor.jsx
// Editor estructurado de PET siguiendo el molde GRAPCO SGC-CAL-PETS-XXX:
// 10 secciones (Propósito, Alcance, Referencias, Definiciones, EPP, Equipos,
// Procedimiento, Responsabilidades, Control de Cambios, Anexos) +
// cabecera de aprobaciones (Elaboró / Revisó / Aprobó).

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, getDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { BASE, LOGO, CHART_PALETTE } from '../../../utils/styles';
import Modal from '../../../components/Modal';

const APROBACIONES_DEFAULT = [
  { rol: 'ELABORÓ',  nombre: '', cargo: 'Ing. de Calidad',     fecha: '' },
  { rol: 'REVISÓ',   nombre: '', cargo: 'Ing. Residente',      fecha: '' },
  { rol: 'REVISÓ',   nombre: '', cargo: 'Jefe SSOMA',          fecha: '' },
  { rol: 'REVISÓ',   nombre: '', cargo: 'Gerente de Proyectos', fecha: '' },
  { rol: 'APROBÓ',   nombre: '', cargo: 'Gerente General',     fecha: '' },
];

const FORM_INICIAL = {
  codigo: '',
  titulo: '',
  version: '00',
  estado: 'vigente',
  aplicaActividadesWBS: [],
  aprobaciones: APROBACIONES_DEFAULT,
  // 10 secciones
  proposito: '',
  alcance: '',
  referencias: [],            // ['Ley 29783', 'D.S. 005-2012-TR', ...]
  definiciones: [],           // [{ termino, descripcion }]
  epp: [],                    // ['Casco con barbiquejo', ...]
  equipos: [],                // ['Nivel óptico o láser', ...]
  procedimiento: {
    consideracionesIniciales: '',
    desarrollo: [],           // [{ titulo, descripcion }]
  },
  responsabilidades: [],      // [{ cargo, items: [] }]
  controlCambios: [],         // [{ rev, pagina, inciso, descripcion }]
  anexos: [],                 // ['Matriz IPER', 'ATS', ...]
};

const SECCIONES = [
  { id: 'cabecera',      l: 'Cabecera',        icono: '📑' },
  { id: '1-proposito',   l: '1. Propósito',    icono: '🎯' },
  { id: '2-alcance',     l: '2. Alcance',      icono: '📐' },
  { id: '3-referencias', l: '3. Referencias',  icono: '📚' },
  { id: '4-definicion',  l: '4. Definiciones', icono: '📖' },
  { id: '5-epp',         l: '5. EPP',          icono: '🦺' },
  { id: '6-equipos',     l: '6. Equipos',      icono: '🔧' },
  { id: '7-procedim',    l: '7. Procedimiento',icono: '⚙️' },
  { id: '8-responsab',   l: '8. Responsabilidades', icono: '👥' },
  { id: '9-cambios',     l: '9. Control cambios', icono: '🔄' },
  { id: '10-anexos',     l: '10. Anexos',      icono: '📎' },
];

export default function PETEditor({ petId, onClose, showToast }) {
  const { user } = useAuth();
  const [seccion, setSeccion] = useState('cabecera');
  const [form, setForm] = useState(FORM_INICIAL);
  const [loading, setLoading] = useState(!!petId);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'PETs', petId));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            ...FORM_INICIAL,
            ...d,
            aprobaciones: d.aprobaciones?.length ? d.aprobaciones : APROBACIONES_DEFAULT,
            procedimiento: d.procedimiento || { consideracionesIniciales: '', desarrollo: [] },
            referencias: d.referencias || [],
            definiciones: d.definiciones || [],
            epp: d.epp || [],
            equipos: d.equipos || [],
            responsabilidades: d.responsabilidades || [],
            controlCambios: d.controlCambios || [],
            anexos: d.anexos || [],
          });
        }
      } catch (e) {
        showToast?.('Error cargando PET: ' + e.message, 'error');
      } finally { setLoading(false); }
    })();
  }, [petId]);

  const guardar = async () => {
    if (!form.codigo || !form.titulo) {
      showToast?.('Código y título son obligatorios', 'error');
      setSeccion('cabecera');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        ...form,
        codigo: form.codigo.trim().toUpperCase(),
        titulo: form.titulo.trim(),
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (petId) {
        await updateDoc(doc(db, 'PETs', petId), data);
        showToast?.('PET actualizado', 'success');
      } else {
        data.creadoEn = serverTimestamp();
        data.creadoPor = user?.email || 'desconocido';
        data.firmasOperarios = [];
        await addDoc(collection(db, 'PETs'), data);
        showToast?.(`PET ${form.codigo} creado`, 'success');
      }
      onClose?.();
    } catch (e) {
      showToast?.('Error al guardar: ' + e.message, 'error');
    } finally { setGuardando(false); }
  };

  const imprimir = () => window.print();

  if (loading) {
    return <Modal onClose={onClose} title="Cargando PET…" maxW="900px"><p style={{ color: BASE.muted }}>Cargando…</p></Modal>;
  }

  return (
    <Modal onClose={onClose} title={petId ? `Editar PET ${form.codigo}` : 'Nuevo PET'} maxW="960px">
      {/* Sub-nav de secciones */}
      <div style={{
        display: 'flex', gap: '4px', flexWrap: 'wrap',
        marginBottom: '14px', padding: '4px',
        background: BASE.bgSoft, borderRadius: '10px',
      }}>
        {SECCIONES.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)} style={{
            padding: '7px 11px', borderRadius: '8px',
            background: seccion === s.id ? BASE.navy : 'transparent',
            color: seccion === s.id ? '#fff' : BASE.muted,
            border: 'none', fontSize: '11px', fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{s.icono} {s.l}</button>
        ))}
      </div>

      {/* Contenido por sección */}
      <div style={{ minHeight: '280px' }}>
        {seccion === 'cabecera'      && <Cabecera form={form} setForm={setForm} />}
        {seccion === '1-proposito'   && <Texto label="Propósito" value={form.proposito} onChange={v => setForm({ ...form, proposito: v })}
          placeholder="Establecer el procedimiento que define el método para normalizar las actividades de…" />}
        {seccion === '2-alcance'     && <Texto label="Alcance" value={form.alcance} onChange={v => setForm({ ...form, alcance: v })}
          placeholder="Este procedimiento es aplicable a todos los trabajos de…" />}
        {seccion === '3-referencias' && <Lista label="Referencias normativas / legales" items={form.referencias}
          onChange={v => setForm({ ...form, referencias: v })}
          placeholder="Ej: Ley 29783, Ley de Seguridad y Salud en el trabajo" />}
        {seccion === '4-definicion'  && <ListaDefiniciones items={form.definiciones} onChange={v => setForm({ ...form, definiciones: v })} />}
        {seccion === '5-epp'         && <Lista label="Equipo de Protección Personal / Colectiva" items={form.epp}
          onChange={v => setForm({ ...form, epp: v })} placeholder="Casco con barbiquejo" />}
        {seccion === '6-equipos'     && <Lista label="Equipos / Herramientas / Materiales" items={form.equipos}
          onChange={v => setForm({ ...form, equipos: v })} placeholder="Nivel óptico o láser" />}
        {seccion === '7-procedim'    && <Procedimiento value={form.procedimiento} onChange={v => setForm({ ...form, procedimiento: v })} />}
        {seccion === '8-responsab'   && <Responsabilidades items={form.responsabilidades} onChange={v => setForm({ ...form, responsabilidades: v })} />}
        {seccion === '9-cambios'     && <ControlCambios items={form.controlCambios} onChange={v => setForm({ ...form, controlCambios: v })} />}
        {seccion === '10-anexos'     && <Lista label="Anexos" items={form.anexos} onChange={v => setForm({ ...form, anexos: v })}
          placeholder="Matriz IPER" />}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '16px', borderTop: `1px solid ${BASE.border}`, paddingTop: '14px' }}>
        <button onClick={imprimir} style={btn(CHART_PALETTE[2])}>🖨️ Imprimir / PDF</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} disabled={guardando} style={btn(BASE.muted)}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={btn(BASE.navy)}>
            {guardando ? 'Guardando…' : '💾 Guardar PET'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Sub-componentes por sección ──

function Cabecera({ form, setForm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 120px', gap: '10px' }}>
        <Campo label="Código *">
          <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} style={inp()} placeholder="SGC-CAL-PETS-001" />
        </Campo>
        <Campo label="Título *">
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} style={inp()} placeholder="TRAZO, NIVEL Y REPLANTEO" />
        </Campo>
        <Campo label="Rev.">
          <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} style={inp()} placeholder="00" />
        </Campo>
        <Campo label="Estado">
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} style={inp()}>
            <option value="vigente">Vigente</option>
            <option value="en-revision">En revisión</option>
            <option value="obsoleto">Obsoleto</option>
          </select>
        </Campo>
      </div>
      <p style={{ fontSize: '10px', fontWeight: 800, color: BASE.muted, letterSpacing: '0.4px', marginTop: '8px' }}>
        TABLA DE APROBACIONES
      </p>
      <div style={{ border: `1px solid ${BASE.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        {form.aprobaciones.map((ap, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 1fr 130px',
            gap: '8px', padding: '8px 10px',
            background: i % 2 === 0 ? '#fff' : BASE.bgSoft,
            borderBottom: i < form.aprobaciones.length - 1 ? `1px solid ${BASE.border}` : 'none',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '10.5px', fontWeight: 900, color: BASE.navy }}>{ap.rol}</span>
            <input value={ap.nombre} onChange={(e) => {
              const a = [...form.aprobaciones]; a[i] = { ...a[i], nombre: e.target.value };
              setForm({ ...form, aprobaciones: a });
            }} placeholder="Nombre completo" style={inp()} />
            <input value={ap.cargo} onChange={(e) => {
              const a = [...form.aprobaciones]; a[i] = { ...a[i], cargo: e.target.value };
              setForm({ ...form, aprobaciones: a });
            }} placeholder="Cargo" style={inp()} />
            <input type="date" value={ap.fecha} onChange={(e) => {
              const a = [...form.aprobaciones]; a[i] = { ...a[i], fecha: e.target.value };
              setForm({ ...form, aprobaciones: a });
            }} style={inp()} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Texto({ label, value, onChange, placeholder }) {
  return (
    <Campo label={label}>
      <textarea rows={10} value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ ...inp(), resize: 'vertical', minHeight: '180px' }} placeholder={placeholder} />
    </Campo>
  );
}

function Lista({ label, items, onChange, placeholder }) {
  return (
    <div>
      <p style={lbl()}>{label.toUpperCase()}</p>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: BASE.muted, padding: '8px 0', minWidth: '20px' }}>•</span>
          <input value={it} onChange={(e) => {
            const next = [...items]; next[i] = e.target.value;
            onChange(next);
          }} style={inp()} placeholder={placeholder} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={btnIcon(BASE.red)}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} style={btnAdd()}>+ Añadir</button>
    </div>
  );
}

function ListaDefiniciones({ items, onChange }) {
  return (
    <div>
      <p style={lbl()}>DEFINICIONES (TÉRMINO + DESCRIPCIÓN)</p>
      {items.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '6px', marginBottom: '8px' }}>
          <input value={d.termino} placeholder="Bench Mark (B.M.)" onChange={(e) => {
            const next = [...items]; next[i] = { ...d, termino: e.target.value }; onChange(next);
          }} style={inp()} />
          <input value={d.descripcion} placeholder="Hito topográfico de concreto…" onChange={(e) => {
            const next = [...items]; next[i] = { ...d, descripcion: e.target.value }; onChange(next);
          }} style={inp()} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={btnIcon(BASE.red)}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { termino: '', descripcion: '' }])} style={btnAdd()}>+ Añadir definición</button>
    </div>
  );
}

function Procedimiento({ value, onChange }) {
  const desarrollo = value?.desarrollo || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Campo label="7.1 Consideraciones iniciales">
        <textarea rows={6} value={value?.consideracionesIniciales || ''}
          onChange={(e) => onChange({ ...value, consideracionesIniciales: e.target.value })}
          style={{ ...inp(), resize: 'vertical' }}
          placeholder="Consideraciones técnicas y de seguridad antes de iniciar la actividad…" />
      </Campo>
      <div>
        <p style={lbl()}>7.2 DESARROLLO DE LA ACTIVIDAD (PASOS)</p>
        {desarrollo.map((p, i) => (
          <div key={i} style={{ border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input value={p.titulo} placeholder={`Paso ${i + 1}: revisión de equipos…`} onChange={(e) => {
                const next = [...desarrollo]; next[i] = { ...p, titulo: e.target.value };
                onChange({ ...value, desarrollo: next });
              }} style={{ ...inp(), fontWeight: 700 }} />
              <button onClick={() => onChange({ ...value, desarrollo: desarrollo.filter((_, j) => j !== i) })} style={btnIcon(BASE.red)}>✕</button>
            </div>
            <textarea rows={3} value={p.descripcion} onChange={(e) => {
              const next = [...desarrollo]; next[i] = { ...p, descripcion: e.target.value };
              onChange({ ...value, desarrollo: next });
            }} style={{ ...inp(), resize: 'vertical' }} placeholder="Descripción detallada del paso…" />
          </div>
        ))}
        <button onClick={() => onChange({ ...value, desarrollo: [...desarrollo, { titulo: '', descripcion: '' }] })} style={btnAdd()}>+ Añadir paso</button>
      </div>
    </div>
  );
}

function Responsabilidades({ items, onChange }) {
  return (
    <div>
      <p style={lbl()}>RESPONSABILIDADES POR CARGO</p>
      {items.map((r, i) => (
        <div key={i} style={{ border: `1px solid ${BASE.border}`, borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input value={r.cargo} placeholder="Residente de Obra" onChange={(e) => {
              const next = [...items]; next[i] = { ...r, cargo: e.target.value }; onChange(next);
            }} style={{ ...inp(), fontWeight: 800, background: BASE.navySoft }} />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={btnIcon(BASE.red)}>✕</button>
          </div>
          <Lista label="Responsabilidades" items={r.items || []} onChange={(v) => {
            const next = [...items]; next[i] = { ...r, items: v }; onChange(next);
          }} placeholder="Liderar, organizar, coordinar y supervisar…" />
        </div>
      ))}
      <button onClick={() => onChange([...items, { cargo: '', items: [] }])} style={btnAdd()}>+ Añadir cargo</button>
    </div>
  );
}

function ControlCambios({ items, onChange }) {
  return (
    <div>
      <p style={lbl()}>CONTROL DE CAMBIOS</p>
      <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 1fr 40px', gap: '6px', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px' }}>
        <span>REV</span><span>PÁGINA</span><span>INCISO</span><span>DESCRIPCIÓN</span><span></span>
      </div>
      {items.map((c, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 1fr 40px', gap: '6px', marginBottom: '6px' }}>
          <input value={c.rev}        onChange={(e) => { const n = [...items]; n[i] = { ...c, rev: e.target.value };        onChange(n); }} style={inp()} />
          <input value={c.pagina}     onChange={(e) => { const n = [...items]; n[i] = { ...c, pagina: e.target.value };     onChange(n); }} style={inp()} />
          <input value={c.inciso}     onChange={(e) => { const n = [...items]; n[i] = { ...c, inciso: e.target.value };     onChange(n); }} style={inp()} />
          <input value={c.descripcion} onChange={(e) => { const n = [...items]; n[i] = { ...c, descripcion: e.target.value }; onChange(n); }} style={inp()} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={btnIcon(BASE.red)}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { rev: '', pagina: '', inciso: '', descripcion: '' }])} style={btnAdd()}>+ Añadir cambio</button>
    </div>
  );
}

// ── helpers visuales ──
function Campo({ label, children }) {
  return (
    <div>
      <p style={lbl()}>{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

const lbl = () => ({ fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '6px', letterSpacing: '0.4px' });
const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
const btnIcon = (c) => ({ background: c, color: '#fff', border: 'none', padding: '0 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', minWidth: '30px' });
const btnAdd = () => ({ background: BASE.gold, color: BASE.navy, border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', marginTop: '4px' });
