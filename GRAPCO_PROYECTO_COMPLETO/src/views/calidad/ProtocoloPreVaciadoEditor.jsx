// src/views/calidad/ProtocoloPreVaciadoEditor.jsx
// Editor del Protocolo Pre-Vaciado de Concreto (CAL-FOR-006).
//
// Replica los campos del formato corporativo:
//  · Proyecto / Cliente / Supervisión
//  · Estructura / Ejes / Nivel / Sector · N° Registro autogenerado (PV-{Frente}-{NNN})
//  · f'c · Volumen · Plano ref · N° probetas · Tipo concreto · Slump · Fecha
//  · Checklist FIJO de 10 ítems con SI/NO/N/A + observación por ítem
//  · Observaciones generales + flag "Se adjunta planos"
//  · Tabla guías de remisión (manual; OCR vendrá luego)
//
// Botón "📄 Generar PDF para firma" descarga el CAL-FOR-006 calcado para imprimir,
// firmar a mano (5 firmas Hold Point) y luego escanear/subir.

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where,
  orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { BASE } from '../../utils/styles';
import {
  CHECKLIST_PREVACIADO, ESTADOS_PROTOCOLO,
  generarNumeroRegistro, codigoFrente, formatSemanaISO,
  calcularEstadoProtocolo,
} from '../../utils/calidadOTAnalytics';
import { descargarProtocoloPreVaciadoPDF } from '../../utils/pdf/ProtocoloPreVaciadoPDF';
import PdfFirmadoUploader from '../../components/PdfFirmadoUploader';
import VisorPlanos from '../../components/VisorPlanos';

const TIPO = 'prevaciado';

const FORM_VACIO = {
  // Cabecera
  proyecto: '', cliente: '', supervision: '',
  // Identificación
  estructuraElemento: '', ejes: '', nivel: '', sectorSubSector: '',
  numeroRegistro: '',
  // Datos técnicos del vaciado
  fc: '', volumen: '', planoRef: '', numProbetas: '',
  tipoConcreto: 'premezclado', // 'insitu' | 'premezclado'
  slumpDiseno: '',
  fechaVaciado: new Date().toISOString().slice(0, 10),
  // Trazabilidad (frente + semana)
  frenteId: null,
  frenteCodigo: '',
  semanaISO: formatSemanaISO(new Date()),
  // Checklist
  checklist: CHECKLIST_PREVACIADO.map(c => ({ ...c, valor: 'NO_LLENADO', obs: '' })),
  // Observaciones y adjuntos
  observaciones: '',
  seAdjuntaPlanos: false,
  // Guías de remisión
  guias: [],
  // Versión del formato corporativo (por si el cliente actualiza)
  versionFormato: '1.00',
  // Tipo discriminador
  tipo: TIPO,
};

export default function ProtocoloPreVaciadoEditor({ protocoloId, showToast, onClose }) {
  const { user } = useAuth();
  const { proyectoActivo, proyectoActivoId, frentesDelProyecto, frenteActivo } = useProyectoActivo();

  const [form, setForm] = useState(FORM_VACIO);
  const [cargando, setCargando] = useState(!!protocoloId);
  const [guardando, setGuardando] = useState(false);
  const [verPlanos, setVerPlanos] = useState(false);
  const esNuevo = !protocoloId;

  // Cargar protocolo existente
  useEffect(() => {
    if (!protocoloId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'Protocolos', protocoloId));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            ...FORM_VACIO,
            ...d,
            checklist: Array.isArray(d.checklist) && d.checklist.length
              ? d.checklist
              : FORM_VACIO.checklist,
            guias: Array.isArray(d.guias) ? d.guias : [],
          });
        } else {
          showToast?.('Protocolo no encontrado', 'error');
          onClose?.();
        }
      } catch (e) {
        showToast?.('Error: ' + e.message, 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, [protocoloId]);

  // Autorellenar cabecera con proyecto activo + frente activo (solo en nuevo)
  useEffect(() => {
    if (!esNuevo) return;
    if (!proyectoActivo) return;
    setForm(prev => ({
      ...prev,
      proyecto: prev.proyecto || proyectoActivo.nombre || '',
      cliente: prev.cliente || proyectoActivo.cliente || '',
      supervision: prev.supervision || proyectoActivo.supervision || '',
      frenteId: prev.frenteId || frenteActivo?.id || null,
      frenteCodigo: prev.frenteCodigo || (frenteActivo ? codigoFrente(frenteActivo) : ''),
    }));
  }, [esNuevo, proyectoActivo, frenteActivo]);

  // Generar N° Registro al cambiar frente o si está vacío
  useEffect(() => {
    if (!esNuevo) return;
    if (form.numeroRegistro) return;       // ya está
    if (!form.frenteCodigo) return;        // necesitamos frente
    (async () => {
      const seq = await siguienteSecuencia(proyectoActivoId, form.frenteCodigo);
      const num = generarNumeroRegistro(TIPO, form.frenteCodigo, seq);
      setForm(prev => ({ ...prev, numeroRegistro: num }));
    })();
  }, [esNuevo, form.frenteCodigo, proyectoActivoId]);

  // Recalcular semana ISO si cambia fechaVaciado
  useEffect(() => {
    if (!form.fechaVaciado) return;
    const w = formatSemanaISO(new Date(form.fechaVaciado));
    if (w !== form.semanaISO) setForm(prev => ({ ...prev, semanaISO: w }));
  }, [form.fechaVaciado]);

  const itemsLlenos = useMemo(() => form.checklist.filter(c => c.valor !== 'NO_LLENADO').length, [form.checklist]);
  const pctLleno = Math.round((itemsLlenos / form.checklist.length) * 100);
  const estadoCalc = useMemo(() => calcularEstadoProtocolo(form), [form]);

  // ── Handlers ─────────────────────────────────────────────────
  const upd = (campo, val) => setForm(prev => ({ ...prev, [campo]: val }));

  const updChecklist = (idx, campo, val) => {
    setForm(prev => {
      const nx = [...prev.checklist];
      nx[idx] = { ...nx[idx], [campo]: val };
      return { ...prev, checklist: nx };
    });
  };

  const addGuia = () => setForm(prev => ({
    ...prev,
    guias: [...prev.guias, { numGuia: '', placa: '', hSalida: '', hLlegada: '', hInicio: '', hFin: '' }],
  }));
  const updGuia = (idx, campo, val) => setForm(prev => {
    const nx = [...prev.guias];
    nx[idx] = { ...nx[idx], [campo]: val };
    return { ...prev, guias: nx };
  });
  const delGuia = (idx) => setForm(prev => ({
    ...prev,
    guias: prev.guias.filter((_, i) => i !== idx),
  }));

  const cambiarFrente = (frenteId) => {
    const f = frentesDelProyecto.find(x => x.id === frenteId);
    setForm(prev => ({
      ...prev,
      frenteId: f?.id || null,
      frenteCodigo: f ? codigoFrente(f) : '',
      // Si el N° ya está, lo invalido para que se regenere con el nuevo frente
      numeroRegistro: '',
    }));
  };

  const guardar = async (mostrarToast = true) => {
    if (!form.estructuraElemento) {
      showToast?.('Estructura/Elemento es obligatorio', 'error');
      return null;
    }
    if (!form.numeroRegistro) {
      showToast?.('Falta el N° de Registro — selecciona un frente', 'error');
      return null;
    }
    setGuardando(true);
    try {
      const calc = calcularEstadoProtocolo(form);
      const payload = {
        ...form,
        proyectoId: proyectoActivoId,
        estado: calc?.estado || form.estado || 'pendiente',
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (esNuevo) {
        const refDoc = await addDoc(collection(db, 'Protocolos'), {
          ...payload,
          codigo: form.numeroRegistro, // alineamos código viejo con N° Registro nuevo
          fechaCreacion: serverTimestamp(),
          creadoPor: user?.email || 'desconocido',
        });
        mostrarToast && showToast?.(`✅ Protocolo ${form.numeroRegistro} creado`, 'success');
        return refDoc.id;
      }
      await updateDoc(doc(db, 'Protocolos', protocoloId), payload);
      mostrarToast && showToast?.('✅ Cambios guardados', 'success');
      return protocoloId;
    } catch (e) {
      showToast?.('Error al guardar: ' + e.message, 'error');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const generarPDF = async () => {
    // Guardar antes para que el PDF refleje lo más reciente
    const id = await guardar(false);
    if (!id) return;
    try {
      await descargarProtocoloPreVaciadoPDF(form);
      showToast?.('📄 PDF descargado · Imprime, firma y luego sube el escaneado', 'success');
    } catch (e) {
      showToast?.('Error generando PDF: ' + e.message, 'error');
    }
  };

  if (cargando) {
    return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando protocolo...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Toolbar ── */}
      <div style={toolbar}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 900, color: BASE.gold, letterSpacing: 1.4 }}>
            CAL-FOR-006 · LIBERACIÓN DE PRE-VACIADO DE CONCRETO
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, marginTop: 2 }}>
            {form.numeroRegistro || 'Nuevo protocolo'}
          </h2>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            Frente: <b>{form.frenteCodigo || '—'}</b> · Semana: <b>{form.semanaISO}</b> · Estado: <b>{ESTADOS_PROTOCOLO[estadoCalc?.estado]?.label || '—'}</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={btnGhost}>← Volver</button>
          <button onClick={generarPDF} disabled={guardando} style={btnGold}>
            📄 GENERAR PDF PARA FIRMA
          </button>
          <button onClick={() => guardar(true)} disabled={guardando} style={btnNavy}>
            {guardando ? '⏳' : '💾'} GUARDAR
          </button>
        </div>
      </div>

      {/* ── Cabecera Proyecto/Cliente/Supervisión ── */}
      <Card title="Cabecera del protocolo">
        <Grid cols={3}>
          <Field label="Proyecto / Obra"><Inp value={form.proyecto} onChange={v => upd('proyecto', v)} /></Field>
          <Field label="Cliente / Propietario"><Inp value={form.cliente} onChange={v => upd('cliente', v)} /></Field>
          <Field label="Supervisión del proyecto"><Inp value={form.supervision} onChange={v => upd('supervision', v)} /></Field>
        </Grid>
      </Card>

      {/* ── Identificación del elemento ── */}
      <Card title="Identificación del elemento" right={(
        <button onClick={() => setVerPlanos(true)} style={btnVerPlano} title="Ver los planos del frente (PDF/imagen) sin salir del protocolo">
          📐 Ver plano
        </button>
      )}>
        <Grid cols={5}>
          <Field label="Estructura / Elemento *">
            <Inp value={form.estructuraElemento} onChange={v => upd('estructuraElemento', v)} placeholder="Ej: Zapata almacén" />
          </Field>
          <Field label="Ejes"><Inp value={form.ejes} onChange={v => upd('ejes', v)} /></Field>
          <Field label="Nivel"><Inp value={form.nivel} onChange={v => upd('nivel', v)} /></Field>
          <Field label="Sector / Sub-sector"><Inp value={form.sectorSubSector} onChange={v => upd('sectorSubSector', v)} /></Field>
          <Field label="N° Registro (auto)">
            <Inp value={form.numeroRegistro} onChange={() => {}} readonly />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Frente *">
            <select value={form.frenteId || ''} onChange={e => cambiarFrente(e.target.value)} style={inpStyle}>
              <option value="">— Selecciona frente —</option>
              {frentesDelProyecto.map(f => (
                <option key={f.id} value={f.id}>{f.nombre} ({codigoFrente(f)})</option>
              ))}
            </select>
          </Field>
          <Field label="Semana ISO (auto)"><Inp value={form.semanaISO} onChange={() => {}} readonly /></Field>
        </Grid>
      </Card>

      {/* ── Datos del vaciado ── */}
      <Card title="Datos del vaciado">
        <Grid cols={4}>
          <Field label="Resistencia f'c"><Inp value={form.fc} onChange={v => upd('fc', v)} placeholder="210 kg/cm²" /></Field>
          <Field label="Volumen"><Inp value={form.volumen} onChange={v => upd('volumen', v)} placeholder="12 m³" /></Field>
          <Field label="Plano de referencia"><Inp value={form.planoRef} onChange={v => upd('planoRef', v)} placeholder="E-02" /></Field>
          <Field label="N° Probetas"><Inp value={form.numProbetas} onChange={v => upd('numProbetas', v)} placeholder="3" /></Field>
        </Grid>
        <Grid cols={3}>
          <Field label="Tipo de concreto">
            <div style={{ display: 'flex', gap: 6 }}>
              <Radio label="In situ"      checked={form.tipoConcreto === 'insitu'}      onChange={() => upd('tipoConcreto', 'insitu')} />
              <Radio label="Premezclado" checked={form.tipoConcreto === 'premezclado'} onChange={() => upd('tipoConcreto', 'premezclado')} />
            </div>
          </Field>
          <Field label="Slump de diseño"><Inp value={form.slumpDiseno} onChange={v => upd('slumpDiseno', v)} placeholder='4"' /></Field>
          <Field label="Fecha de vaciado">
            <input type="date" value={form.fechaVaciado} onChange={e => upd('fechaVaciado', e.target.value)} style={inpStyle} />
          </Field>
        </Grid>
      </Card>

      {/* ── Checklist 10 ítems ── */}
      <Card
        title="Check list de pre-vaciado (10 ítems)"
        right={(
          <span style={{ fontSize: 11, fontWeight: 800, color: BASE.muted, letterSpacing: 0.4 }}>
            {itemsLlenos}/{form.checklist.length} · {pctLleno}%
          </span>
        )}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 32 }}>#</th>
                <th style={thStyle}>Actividad</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>SI</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>NO</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>N/A</th>
                <th style={{ ...thStyle, width: 220 }}>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {form.checklist.map((it, idx) => (
                <tr key={idx}>
                  <td style={tdNum}>{idx + 1}</td>
                  <td style={tdStyle}>
                    {it.item}
                    {it.critico && <span style={badgeCritico}>CRÍTICO</span>}
                  </td>
                  <RadioCell checked={it.valor === 'OK'}    onClick={() => updChecklist(idx, 'valor', 'OK')}    color="#16a34a" />
                  <RadioCell checked={it.valor === 'NO_OK'} onClick={() => updChecklist(idx, 'valor', 'NO_OK')} color="#dc2626" />
                  <RadioCell checked={it.valor === 'NA'}    onClick={() => updChecklist(idx, 'valor', 'NA')}    color="#64748b" />
                  <td style={tdStyle}>
                    <input value={it.obs} onChange={e => updChecklist(idx, 'obs', e.target.value)} style={inpInline} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Observaciones generales y planos ── */}
      <Card title="Observaciones y planos">
        <Field label="Observaciones / comentarios">
          <textarea value={form.observaciones} onChange={e => upd('observaciones', e.target.value)}
            rows={3} style={{ ...inpStyle, resize: 'vertical', fontFamily: BASE.font }}
            placeholder="Detalle adicional, condiciones especiales, restricciones..." />
        </Field>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: BASE.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.seAdjuntaPlanos} onChange={e => upd('seAdjuntaPlanos', e.target.checked)} />
          Se adjunta planos
        </label>
      </Card>

      {/* ── Tabla de guías de remisión ── */}
      <Card
        title="Guías de remisión (mixer)"
        right={(
          <button onClick={addGuia} style={btnSmallGold}>+ AGREGAR GUÍA</button>
        )}
      >
        {form.guias.length === 0 ? (
          <p style={{ fontSize: 12, color: BASE.muted, padding: '8px 0' }}>
            No hay guías registradas todavía. Aplica solo si es concreto premezclado.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>N° Guía</th>
                  <th style={thStyle}>Placa</th>
                  <th style={thStyle}>H. Salida planta</th>
                  <th style={thStyle}>H. Llegada obra</th>
                  <th style={thStyle}>H. Inicio vaciado</th>
                  <th style={thStyle}>H. Fin vaciado</th>
                  <th style={{ ...thStyle, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.guias.map((g, i) => (
                  <tr key={i}>
                    <td style={tdStyle}><input value={g.numGuia} onChange={e => updGuia(i, 'numGuia', e.target.value)} style={inpInline} /></td>
                    <td style={tdStyle}><input value={g.placa}   onChange={e => updGuia(i, 'placa', e.target.value)}   style={inpInline} /></td>
                    <td style={tdStyle}><input type="time" value={g.hSalida}  onChange={e => updGuia(i, 'hSalida',  e.target.value)} style={inpInline} /></td>
                    <td style={tdStyle}><input type="time" value={g.hLlegada} onChange={e => updGuia(i, 'hLlegada', e.target.value)} style={inpInline} /></td>
                    <td style={tdStyle}><input type="time" value={g.hInicio}  onChange={e => updGuia(i, 'hInicio',  e.target.value)} style={inpInline} /></td>
                    <td style={tdStyle}><input type="time" value={g.hFin}     onChange={e => updGuia(i, 'hFin',     e.target.value)} style={inpInline} /></td>
                    <td style={tdStyle}>
                      <button onClick={() => delGuia(i)} style={btnDel}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 10.5, color: BASE.muted, marginTop: 6 }}>
          💡 Próximamente: subir foto de la guía y autocompletar campos con OCR (Gemini Vision).
        </p>
      </Card>

      {/* ── Próximo paso ── */}
      <div style={nextStepBox}>
        <p style={{ fontSize: 11, fontWeight: 900, color: BASE.gold, letterSpacing: 1, marginBottom: 4 }}>
          FLUJO HOLD POINT
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          1) Generar PDF · 2) Imprimir · 3) 5 firmas físicas · 4) Escanear · 5) Subir aquí abajo
        </p>
      </div>

      {/* ── Upload PDF firmado ── */}
      {!esNuevo && (
        <Card title="Subir PDF firmado (escaneado)">
          <PdfFirmadoUploader
            protocolo={{ id: protocoloId, ...form }}
            onUploaded={() => {
              setForm(prev => ({ ...prev, estado: 'liberado' }));
            }}
            showToast={showToast}
          />
        </Card>
      )}
      {esNuevo && (
        <div style={{
          background: BASE.bgSoft, border: `1px dashed ${BASE.border}`, borderRadius: 12,
          padding: 14, fontSize: 11.5, color: BASE.muted, textAlign: 'center',
        }}>
          💡 Guarda primero el protocolo para habilitar la subida del PDF firmado.
        </div>
      )}

      {verPlanos && (
        <VisorPlanos
          proyectoId={proyectoActivoId}
          frenteCodigo={form.frenteCodigo}
          onClose={() => setVerPlanos(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Calcular siguiente secuencia de N° Registro para frente+proyecto
// ════════════════════════════════════════════════════════════════
async function siguienteSecuencia(proyectoId, frenteCodigo) {
  try {
    // Buscar el último protocolo del mismo tipo+frente en el proyecto activo.
    // Como el numeroRegistro tiene formato PV-F03-NNN ordenamos por numeroRegistro desc.
    const q = query(
      collection(db, 'Protocolos'),
      where('tipo', '==', TIPO),
      where('proyectoId', '==', proyectoId),
      where('frenteCodigo', '==', frenteCodigo),
      orderBy('numeroRegistro', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return 1;
    const ult = snap.docs[0].data().numeroRegistro || '';
    const m = ult.match(/-(\d+)$/);
    return m ? Number(m[1]) + 1 : 1;
  } catch (e) {
    console.warn('[siguienteSecuencia] fallback', e.message);
    // Fallback: timestamp-based para no bloquear si no hay índice todavía
    return Math.floor(Date.now() / 1000) % 1000;
  }
}

// ════════════════════════════════════════════════════════════════
// Componentes auxiliares
// ════════════════════════════════════════════════════════════════
function Card({ title, right, children }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={cardTitleStyle}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function Grid({ cols = 3, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 10 }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <div>
      <label style={lblStyle}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder, readonly }) {
  return (
    <input
      value={value || ''}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readonly}
      style={{ ...inpStyle, background: readonly ? '#f1f5f9' : '#fff', color: readonly ? BASE.muted : BASE.text }}
    />
  );
}
function Radio({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${checked ? BASE.navy : BASE.border}`, background: checked ? BASE.navySoft : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
function RadioCell({ checked, onClick, color }) {
  return (
    <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        display: 'inline-block', width: 22, height: 22, borderRadius: '50%',
        border: `2px solid ${checked ? color : BASE.border}`,
        background: checked ? color : '#fff',
        color: '#fff', fontSize: 13, fontWeight: 900, lineHeight: '20px',
      }}>{checked ? '✓' : ''}</div>
    </td>
  );
}

// ── estilos ──
const toolbar = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 14, padding: '14px 18px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const cardStyle = {
  background: BASE.white, border: `1px solid ${BASE.border}`,
  borderRadius: 14, padding: '14px 16px',
  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const cardTitleStyle = { fontSize: 13, fontWeight: 900, color: BASE.navy, letterSpacing: 0.3 };
const lblStyle = { fontSize: 9.5, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, display: 'block', marginBottom: 4 };
const inpStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${BASE.border}`, fontSize: 12.5, fontWeight: 600, background: '#fff',
  color: BASE.text, outline: 'none', boxSizing: 'border-box',
};
const inpInline = { ...inpStyle, padding: '6px 8px', fontSize: 12 };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '8px 6px', fontSize: 10.5, fontWeight: 900, color: BASE.muted, letterSpacing: 0.5, borderBottom: `1.5px solid ${BASE.border}`, background: BASE.bgSoft };
const tdStyle = { padding: '6px', fontSize: 12, borderBottom: `1px solid ${BASE.borderSoft}`, verticalAlign: 'middle' };
const tdNum = { ...tdStyle, textAlign: 'center', fontWeight: 800, color: BASE.muted, width: 32 };
const badgeCritico = {
  marginLeft: 8, padding: '2px 6px', borderRadius: 4,
  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
  fontSize: 9, fontWeight: 900, letterSpacing: 0.4,
};
const btnNavy = {
  padding: '10px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
  color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.4,
  boxShadow: '0 4px 12px rgba(15,42,71,0.35)',
};
const btnGold = {
  padding: '10px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
  color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.4,
  boxShadow: '0 4px 12px rgba(229,168,47,0.35)',
};
const btnVerPlano = {
  padding: '7px 12px', borderRadius: 8, background: BASE.navy, color: '#fff',
  border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3,
};
const btnGhost = {
  padding: '10px 14px', borderRadius: 8, background: BASE.bgSoft,
  color: BASE.muted, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer',
};
const btnSmallGold = {
  padding: '6px 12px', borderRadius: 6, background: BASE.gold, color: '#fff',
  border: 'none', fontSize: 10.5, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.4,
};
const btnDel = {
  padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#dc2626',
  border: '1px solid #fecaca', fontSize: 11, fontWeight: 900, cursor: 'pointer',
};
const nextStepBox = {
  background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
  borderLeft: `5px solid ${BASE.gold}`,
  borderRadius: 12, padding: '14px 18px', color: '#fff',
};
