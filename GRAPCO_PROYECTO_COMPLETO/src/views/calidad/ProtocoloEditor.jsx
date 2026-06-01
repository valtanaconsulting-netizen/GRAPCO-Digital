// src/views/calidad/ProtocoloEditor.jsx — Editor individual de protocolo (B20)
// Llena checklist + firma residente + firma supervisor cliente

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import {
  TIPOS_PROTOCOLO, ELEMENTOS_TIPO, ESTADOS_PROTOCOLO,
  calcularEstadoProtocolo,
} from '../../utils/calidadOTAnalytics';
import FotoUploader from '../../components/FotoUploader';
import VisorPlanos from '../../components/VisorPlanos';

export default function ProtocoloEditor({ protocoloId, showToast, onClose }) {
  const { user, rol } = useAuth();
  const [protocolo, setProtocolo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [verPlanos, setVerPlanos] = useState(false);

  // Canvas para firmas
  const canvasResRef = useRef(null);
  const canvasSupRef = useRef(null);
  const [firmandoR, setFirmandoR] = useState(false);
  const [firmandoS, setFirmandoS] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'Protocolos', protocoloId));
        if (snap.exists()) {
          setProtocolo({ id: snap.id, ...snap.data() });
        } else {
          showToast?.('Protocolo no encontrado', 'error');
          onClose?.();
        }
      } catch (e) {
        showToast?.('Error: ' + e.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [protocoloId]);

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando protocolo...</p>;
  if (!protocolo) return null;

  const tipo = TIPOS_PROTOCOLO[protocolo.tipo] || TIPOS_PROTOCOLO.concreto;
  const elem = ELEMENTOS_TIPO.find(e => e.id === protocolo.elementoTipo);
  const estadoActual = ESTADOS_PROTOCOLO[protocolo.estado] || ESTADOS_PROTOCOLO.pendiente;
  const estadoCalc = calcularEstadoProtocolo(protocolo);

  const actualizarItem = (idx, campo, valor) => {
    const nuevoChecklist = [...protocolo.checklist];
    nuevoChecklist[idx] = { ...nuevoChecklist[idx], [campo]: valor };
    setProtocolo({ ...protocolo, checklist: nuevoChecklist });
  };

  const guardarChecklist = async () => {
    setGuardando(true);
    try {
      const calc = calcularEstadoProtocolo(protocolo);
      await updateDoc(doc(db, 'Protocolos', protocoloId), {
        checklist: protocolo.checklist,
        fotos: Array.isArray(protocolo.fotos) ? protocolo.fotos : [],
        estado: calc.estado,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      });
      showToast?.('✅ Checklist guardado', 'success');
      setProtocolo({ ...protocolo, estado: calc.estado });
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Firmas — funciones genericas
  const startDraw = (canvasRef, setFirmando) => (e) => {
    setFirmando(true);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = BASE.navy;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (canvasRef, firmando) => (e) => {
    if (!firmando) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const limpiar = (canvasRef) => () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const subirFirma = async (canvasRef, prefijo) => {
    if (!canvasRef.current) return null;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (!dataUrl || dataUrl.length < 1000) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const r = ref(storage, `protocolos/firmas/${prefijo}_${protocoloId}_${Date.now()}.png`);
      await uploadBytes(r, blob);
      return await getDownloadURL(r);
    } catch (e) {
      console.warn('[Firma]', e);
      return null;
    }
  };

  const firmarResidente = async () => {
    if (estadoCalc.estado === 'pendiente') {
      showToast?.('Primero llena el checklist completo', 'error');
      return;
    }
    if (!['ingeniero', 'admin', 'calidad'].includes(rol)) {
      showToast?.('Solo residentes/ingenieros pueden firmar aqui', 'error');
      return;
    }
    setGuardando(true);
    try {
      const firmaUrl = await subirFirma(canvasResRef, 'residente');
      const firma = {
        uid: user?.uid || 'desconocido',
        email: user?.email || 'desconocido',
        fecha: serverTimestamp(),
        firmaUrl,
      };
      await updateDoc(doc(db, 'Protocolos', protocoloId), {
        firmaResidente: firma,
        estado: 'firmado_residente',
      });
      showToast?.('✅ Firma residente registrada', 'success');
      setProtocolo({ ...protocolo, firmaResidente: firma, estado: 'firmado_residente' });
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const firmarSupervisor = async (decision) => {
    if (!['supervisor_cliente', 'admin'].includes(rol)) {
      showToast?.('Solo supervisores del cliente pueden firmar aqui', 'error');
      return;
    }
    if (!protocolo.firmaResidente?.uid) {
      showToast?.('Primero el residente debe firmar', 'error');
      return;
    }
    setGuardando(true);
    try {
      const firmaUrl = await subirFirma(canvasSupRef, 'supervisor');
      const firma = {
        uid: user?.uid || 'desconocido',
        email: user?.email || 'desconocido',
        fecha: serverTimestamp(),
        firmaUrl,
        decision, // 'liberado' | 'observado' | 'rechazado'
      };
      const nuevoEstado = decision; // 'liberado' | 'observado' | 'rechazado'
      await updateDoc(doc(db, 'Protocolos', protocoloId), {
        firmaSupervisor: firma,
        estado: nuevoEstado,
      });
      const msg = decision === 'liberado' ? '✅ Protocolo LIBERADO' :
                  decision === 'observado' ? '⚠️ Protocolo OBSERVADO' : '🔴 Protocolo RECHAZADO';
      showToast?.(msg, decision === 'liberado' ? 'success' : 'error');
      setProtocolo({ ...protocolo, firmaSupervisor: firma, estado: nuevoEstado });
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderLeft: `5px solid ${estadoActual.color}`,
        borderRadius: '14px', padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <button onClick={onClose} style={{
              padding: '6px 14px', borderRadius: '8px',
              background: BASE.bgSoft, color: BASE.navy,
              border: `1px solid ${BASE.border}`, fontSize: '11px', fontWeight: '900',
              cursor: 'pointer', marginBottom: '8px',
            }}>← Volver a Protocolos</button>
            <p style={{ fontSize: '20px', fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>
              {protocolo.codigo}
            </p>
            <p style={{ fontSize: '13px', color: BASE.muted, marginTop: '4px' }}>
              {tipo.icono} {tipo.label} · {elem?.icono} {elem?.label} {protocolo.elementoCodigo}
            </p>
            {protocolo.partidaWBS && (
              <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px', fontFamily: 'monospace' }}>
                Partida WBS: {protocolo.partidaWBS}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{
              background: estadoActual.color, color: '#fff',
              padding: '8px 16px', borderRadius: '14px',
              fontSize: '12px', fontWeight: '900', letterSpacing: '0.6px',
            }}>{estadoActual.icono} {estadoActual.label}</span>
            <button onClick={() => setVerPlanos(true)} title="Ver los planos del frente (PDF/imagen) sin salir del protocolo" style={{
              padding: '8px 14px', borderRadius: '8px', background: BASE.navy, color: '#fff',
              border: 'none', fontSize: '12px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>📐 Ver plano</button>
          </div>
        </div>
      </div>

      {verPlanos && (
        <VisorPlanos
          proyectoId={protocolo.proyectoId}
          frenteCodigo={protocolo.frenteCodigo}
          onClose={() => setVerPlanos(false)}
          showToast={showToast}
        />
      )}

      {/* Indicador de siguiente accion */}
      <div style={{
        background: '#dbeafe',
        border: `1px solid #2563eb55`,
        borderLeft: `4px solid #2563eb`,
        borderRadius: '12px', padding: '12px 18px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: '#1e40af', letterSpacing: '0.5px' }}>
          📍 SIGUIENTE ACCION
        </p>
        <p style={{ fontSize: '13px', color: BASE.text, marginTop: '4px' }}>{estadoCalc.siguienteAccion}</p>
      </div>

      {/* CHECKLIST */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{
          background: BASE.bgSoft, padding: '12px 18px',
          borderBottom: `1px solid ${BASE.border}`,
          borderLeft: `4px solid ${tipo.color}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            📋 CHECKLIST ({protocolo.checklist?.length || 0} items)
          </p>
          <button onClick={guardarChecklist} disabled={guardando} style={{
            padding: '8px 18px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${tipo.color}, ${tipo.color}dd)`,
            color: '#fff', border: 'none', fontSize: '11px', fontWeight: '900',
            cursor: guardando ? 'not-allowed' : 'pointer', letterSpacing: '0.4px',
            opacity: guardando ? 0.5 : 1,
          }}>
            {guardando ? '⏳' : '💾 GUARDAR CHECKLIST'}
          </button>
        </div>

        <div style={{ padding: '0' }}>
          {protocolo.checklist?.map((item, idx) => (
            <div key={idx} style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${BASE.border}`,
              display: 'flex', flexDirection: 'column', gap: '8px',
              background: idx % 2 === 0 ? BASE.white : BASE.bgSoft,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '14px', marginTop: '2px' }}>{item.critico ? '🔴' : '⚪'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: BASE.text }}>
                    {idx + 1}. {item.item}
                    {item.critico && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#fee2e2', color: '#991b1b',
                        padding: '2px 7px', borderRadius: '8px',
                        fontSize: '9px', fontWeight: '900',
                      }}>CRITICO</span>
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: '24px' }}>
                {[
                  { val: 'OK',     label: '✅ OK',         color: '#16a34a' },
                  { val: 'NO_OK',  label: '❌ NO OK',       color: '#dc2626' },
                  { val: 'NA',     label: '⊘ N/A',          color: '#64748b' },
                ].map(opt => (
                  <button key={opt.val}
                    onClick={() => actualizarItem(idx, 'valor', opt.val)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px',
                      background: item.valor === opt.val ? opt.color : BASE.bgSoft,
                      color: item.valor === opt.val ? '#fff' : BASE.muted,
                      border: `1.5px solid ${item.valor === opt.val ? opt.color : BASE.border}`,
                      fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                      letterSpacing: '0.4px',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              <input type="text" value={item.obs || ''}
                onChange={e => actualizarItem(idx, 'obs', e.target.value)}
                placeholder="Observaciones (opcional)"
                style={{
                  width: '100%', padding: '7px 11px', borderRadius: '6px',
                  border: `1.5px solid ${BASE.border}`, fontSize: '11.5px',
                  background: '#fff',
                }} />
            </div>
          ))}
        </div>
      </div>

      {/* EVIDENCIA FOTOGRÁFICA */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px 22px',
        borderLeft: `5px solid #16a34a`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            📸 EVIDENCIA FOTOGRÁFICA ({protocolo.fotos?.length || 0})
          </p>
          <button onClick={guardarChecklist} disabled={guardando} style={{
            padding: '6px 14px', borderRadius: '8px',
            background: '#16a34a', color: '#fff', border: 'none',
            fontSize: '10.5px', fontWeight: '900', cursor: 'pointer',
          }}>{guardando ? '⏳' : '💾 Guardar fotos'}</button>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginBottom: '10px', lineHeight: 1.5 }}>
          Fotos del elemento liberado: antes, durante y después. Forman parte del protocolo y se imprimen junto al checklist.
        </p>
        <FotoUploader
          fotos={protocolo.fotos || []}
          onChange={(fotos) => setProtocolo({ ...protocolo, fotos })}
          ruta={`Protocolos/${protocolo.elementoId || 'sin-elemento'}/${protocoloId}`}
          max={20}
          showToast={showToast}
        />
      </div>

      {/* FIRMA RESIDENTE */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px 22px',
        borderLeft: `5px solid #7c3aed`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            ✍️ FIRMA DEL RESIDENTE / INGENIERO
          </p>
          {protocolo.firmaResidente?.uid ? (
            <span style={{
              background: '#dcfce7', color: '#15803d',
              padding: '4px 12px', borderRadius: '12px',
              fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
            }}>✓ FIRMADO</span>
          ) : (
            <button onClick={limpiar(canvasResRef)} style={{
              padding: '4px 12px', borderRadius: '6px',
              background: BASE.bgSoft, color: BASE.muted,
              border: `1px solid ${BASE.border}`, fontSize: '10.5px',
              fontWeight: '800', cursor: 'pointer',
            }}>🗑️ Limpiar</button>
          )}
        </div>

        {protocolo.firmaResidente?.uid ? (
          <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            {protocolo.firmaResidente.firmaUrl && (
              <img src={protocolo.firmaResidente.firmaUrl} alt="Firma residente"
                style={{ maxHeight: '80px', marginBottom: '8px' }} />
            )}
            <p style={{ fontSize: '11.5px', color: BASE.text, fontWeight: '700' }}>
              {protocolo.firmaResidente.email}
            </p>
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
              {protocolo.firmaResidente.fecha?.toDate
                ? protocolo.firmaResidente.fecha.toDate().toLocaleString('es-PE')
                : 'Hace un momento'}
            </p>
          </div>
        ) : (
          <>
            <canvas ref={canvasResRef} width={500} height={120}
              onMouseDown={startDraw(canvasResRef, setFirmandoR)}
              onMouseMove={draw(canvasResRef, firmandoR)}
              onMouseUp={() => setFirmandoR(false)} onMouseLeave={() => setFirmandoR(false)}
              onTouchStart={startDraw(canvasResRef, setFirmandoR)}
              onTouchMove={draw(canvasResRef, firmandoR)}
              onTouchEnd={() => setFirmandoR(false)}
              style={{
                background: BASE.white, border: `2px dashed ${BASE.border}`, borderRadius: '8px',
                cursor: 'crosshair', maxWidth: '100%', display: 'block', touchAction: 'none',
              }} />
            <button onClick={firmarResidente} disabled={guardando} style={{
              marginTop: '10px', padding: '11px 22px', borderRadius: '8px',
              background: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
              color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
              cursor: guardando ? 'not-allowed' : 'pointer', letterSpacing: '0.5px',
              opacity: guardando ? 0.5 : 1,
            }}>
              ✍️ FIRMAR COMO RESIDENTE
            </button>
          </>
        )}
      </div>

      {/* FIRMA SUPERVISOR CLIENTE */}
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px 22px',
        borderLeft: `5px solid ${BASE.gold}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.5px' }}>
            👁️ FIRMA DEL SUPERVISOR DEL CLIENTE
          </p>
          {protocolo.firmaSupervisor?.uid ? (
            <span style={{
              background: protocolo.firmaSupervisor.decision === 'liberado' ? '#dcfce7' :
                          protocolo.firmaSupervisor.decision === 'observado' ? '#fed7aa' : '#fee2e2',
              color: protocolo.firmaSupervisor.decision === 'liberado' ? '#15803d' :
                     protocolo.firmaSupervisor.decision === 'observado' ? '#9a3412' : '#991b1b',
              padding: '4px 12px', borderRadius: '12px',
              fontSize: '10px', fontWeight: '900', letterSpacing: '0.4px',
            }}>{protocolo.firmaSupervisor.decision?.toUpperCase()}</span>
          ) : (
            <button onClick={limpiar(canvasSupRef)} style={{
              padding: '4px 12px', borderRadius: '6px',
              background: BASE.bgSoft, color: BASE.muted,
              border: `1px solid ${BASE.border}`, fontSize: '10.5px',
              fontWeight: '800', cursor: 'pointer',
            }}>🗑️ Limpiar</button>
          )}
        </div>

        {protocolo.firmaSupervisor?.uid ? (
          <div style={{ background: BASE.bgSoft, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            {protocolo.firmaSupervisor.firmaUrl && (
              <img src={protocolo.firmaSupervisor.firmaUrl} alt="Firma supervisor"
                style={{ maxHeight: '80px', marginBottom: '8px' }} />
            )}
            <p style={{ fontSize: '11.5px', color: BASE.text, fontWeight: '700' }}>
              {protocolo.firmaSupervisor.email}
            </p>
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '2px' }}>
              {protocolo.firmaSupervisor.fecha?.toDate
                ? protocolo.firmaSupervisor.fecha.toDate().toLocaleString('es-PE')
                : 'Hace un momento'}
            </p>
          </div>
        ) : (
          <>
            <canvas ref={canvasSupRef} width={500} height={120}
              onMouseDown={startDraw(canvasSupRef, setFirmandoS)}
              onMouseMove={draw(canvasSupRef, firmandoS)}
              onMouseUp={() => setFirmandoS(false)} onMouseLeave={() => setFirmandoS(false)}
              onTouchStart={startDraw(canvasSupRef, setFirmandoS)}
              onTouchMove={draw(canvasSupRef, firmandoS)}
              onTouchEnd={() => setFirmandoS(false)}
              style={{
                background: BASE.white, border: `2px dashed ${BASE.border}`, borderRadius: '8px',
                cursor: 'crosshair', maxWidth: '100%', display: 'block', touchAction: 'none',
              }} />
            <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '6px', fontStyle: 'italic' }}>
              Firme y luego elija una decision:
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => firmarSupervisor('liberado')} disabled={guardando} style={btnFirma('#16a34a')}>
                ✅ LIBERAR
              </button>
              <button onClick={() => firmarSupervisor('observado')} disabled={guardando} style={btnFirma('#f97316')}>
                ⚠️ OBSERVAR
              </button>
              <button onClick={() => firmarSupervisor('rechazado')} disabled={guardando} style={btnFirma('#dc2626')}>
                🔴 RECHAZAR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnFirma = (color) => ({
  padding: '11px 20px', borderRadius: '8px',
  background: color, color: '#fff',
  border: 'none', fontSize: '12px', fontWeight: '900',
  cursor: 'pointer', letterSpacing: '0.5px',
  boxShadow: `0 4px 12px ${color}55`,
});
