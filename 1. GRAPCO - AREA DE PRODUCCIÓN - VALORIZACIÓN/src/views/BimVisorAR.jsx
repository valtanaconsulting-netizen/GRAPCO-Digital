// src/views/BimVisorAR.jsx — Visor AR (realidad aumentada) de modelos BIM.
//
// Overlay fullscreen con <model-viewer> (Google): previsualiza el GLB del modelo y
// con un toque en "Ver en obra (AR)" prende la cámara de la tablet — se toca el piso
// una vez y el modelo queda anclado ahí (Scene Viewer en Android, Quick Look en iPad,
// WebXR donde esté disponible).
//
// El GLB se genera bajo demanda: export OBJ en APS → conversión a GLB en la Cloud
// Function apsEstadoGlb → Storage (bim-ar/{urn}.glb). Ver functions/arGlb.js.
//
// Requisitos de dispositivo para el modo AR: Android con ARCore (Google Play
// Services for AR) usando Chrome, o iPad/iPhone con ARKit (Safari, vía USDZ que
// Quick Look genera del GLB). Sin AR, el visor 3D funciona en cualquier equipo.
//
// La librería es 100% lazy: se importa con await import() al montar (convención del
// repo para libs pesadas; vite.config la excluye de chunks eager).

import React, { useEffect, useRef, useState } from 'react';
import { iniciarExportGlb, consultarEstadoGlb, esperarGlb } from '../utils/apsClient';
import { D } from './BimShell';

const NAVY = '#0F2A47';
const GOLD = '#E5A82F';

export default function BimVisorAR({ modelo, onClose, showToast }) {
  // fase: cargando-lib | verificando | sin-glb | preparando | listo | error
  const [fase, setFase] = useState('cargando-lib');
  const [glbUrl, setGlbUrl] = useState(modelo?.glbUrl || '');
  const [progreso, setProgreso] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [escalaReal, setEscalaReal] = useState(false);  // false = maqueta, true = 1:1
  const vivoRef = useRef(true);

  // Carga lazy de la librería + resolución del GLB
  useEffect(() => {
    vivoRef.current = true;
    (async () => {
      try {
        await import('@google/model-viewer');
        if (!vivoRef.current) return;
        // Solo GLB v2+ (enderezado, en metros, centrado). Los v1 salían volteados
        // y desplazados en AR — si el doc tiene uno viejo, se reconvierte.
        if (modelo?.glbUrl && (modelo?.glbVersion || 0) >= 2) {
          setGlbUrl(modelo.glbUrl); setFase('listo'); return;
        }
        // ¿Existe ya el GLB en Storage? (modelos preparados antes o por otro usuario)
        setFase('verificando');
        const estado = await consultarEstadoGlb(modelo.urn);
        if (!vivoRef.current) return;
        if (estado.status === 'success') { setGlbUrl(estado.glbUrl); setFase('listo'); return; }
        if (estado.status === 'exportando') { seguirEsperando(); return; }
        setFase('sin-glb');
      } catch (err) {
        if (!vivoRef.current) return;
        setErrorMsg(err.message);
        setFase('error');
      }
    })();
    return () => { vivoRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo?.urn]);

  const seguirEsperando = () => {
    setFase('preparando');
    setProgreso('Export OBJ en curso…');
    esperarGlb(modelo.urn, (d) => {
      if (!vivoRef.current) return;
      setProgreso(d.status === 'exportando' ? `Exportando geometría… ${d.progress || ''}` : 'Convirtiendo a GLB…');
    })
      .then((d) => {
        if (!vivoRef.current) return;
        setGlbUrl(d.glbUrl);
        setFase('listo');
        showToast?.('Modelo AR listo 🎉', 'success');
      })
      .catch((err) => {
        if (!vivoRef.current) return;
        setErrorMsg(err.message);
        setFase('error');
      });
  };

  const prepararModelo = async () => {
    try {
      setFase('preparando');
      setProgreso('Solicitando export a Autodesk…');
      await iniciarExportGlb(modelo.urn);
      seguirEsperando();
    } catch (err) {
      setErrorMsg(err.message);
      setFase('error');
    }
  };

  const nombre = modelo?.nombreOriginal || modelo?.nombre || 'Modelo BIM';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,18,34,0.85)',
      backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 10,
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${GOLD},#B07D1B)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>📐</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nombre} · Realidad Aumentada
            </p>
            <p style={{ fontSize: 10, color: '#9DB0C7' }}>
              Pulsa "Ver en obra (AR)", apunta al piso y toca una vez para anclar el modelo
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fase === 'listo' && (
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', border: '1px solid #2A3F5C', borderRadius: 999, padding: 3 }}>
              {[{ v: false, l: '🏠 Maqueta' }, { v: true, l: '📏 Escala real 1:1' }].map(o => (
                <button key={String(o.v)} onClick={() => setEscalaReal(o.v)} style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: escalaReal === o.v ? GOLD : 'transparent',
                  color: escalaReal === o.v ? NAVY : '#9DB0C7', fontSize: 11, fontWeight: 800,
                }}>{o.l}</button>
              ))}
            </div>
          )}
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid #2A3F5C', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#E3EAF3', fontSize: 12, fontWeight: 800,
          }}>✕ Cerrar</button>
        </div>
      </div>

      {/* CUERPO */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: 14, overflow: 'hidden', background: '#101823', position: 'relative' }}>
        {fase === 'listo' && (
          <model-viewer
            key={escalaReal ? 'fijo' : 'auto'}
            src={glbUrl}
            alt={nombre}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale={escalaReal ? 'fixed' : 'auto'}
            ar-placement="floor"
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '100%', background: '#101823' }}
          >
            <button slot="ar-button" style={{
              position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
              padding: '13px 26px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg,${GOLD},#C98F1F)`, color: NAVY,
              fontSize: 14, fontWeight: 900, letterSpacing: 0.2,
              boxShadow: '0 10px 28px -6px rgba(229,168,47,0.65)',
            }}>
              📷 Ver en obra (AR)
            </button>
          </model-viewer>
        )}

        {fase !== 'listo' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 30,
          }}>
            {(fase === 'cargando-lib' || fase === 'verificando' || fase === 'preparando') && (
              <>
                <div style={{
                  width: 40, height: 40, border: '3px solid #2A3F5C', borderTop: `3px solid ${GOLD}`,
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                  {fase === 'preparando' ? 'Preparando modelo para AR' : 'Cargando visor AR…'}
                </p>
                {fase === 'preparando' && (
                  <>
                    <p style={{ fontSize: 11.5, color: '#9DB0C7' }}>{progreso}</p>
                    <p style={{ fontSize: 10.5, color: '#5B6878', maxWidth: 380 }}>
                      Autodesk exporta la geometría y la convertimos a formato AR. Solo pasa la
                      primera vez por modelo; puede tardar varios minutos si es grande. Puedes
                      cerrar y volver luego: el proceso continúa solo.
                    </p>
                  </>
                )}
              </>
            )}

            {fase === 'sin-glb' && (
              <>
                <p style={{ fontSize: 40 }}>🕶️</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Este modelo aún no está preparado para AR</p>
                <p style={{ fontSize: 11.5, color: '#9DB0C7', maxWidth: 400 }}>
                  Se genera una versión ligera del modelo (GLB) para verlo con la cámara.
                  Solo se hace una vez y queda guardada para todos.
                </p>
                <button onClick={prepararModelo} style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg,${GOLD},#C98F1F)`, color: NAVY,
                  fontSize: 13, fontWeight: 900, boxShadow: '0 10px 28px -6px rgba(229,168,47,0.65)',
                }}>⚙️ Preparar modelo AR</button>
              </>
            )}

            {fase === 'error' && (
              <>
                <p style={{ fontSize: 34 }}>⚠️</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#FCA5A5' }}>No se pudo preparar el modelo</p>
                <p style={{ fontSize: 11.5, color: '#9DB0C7', maxWidth: 420 }}>{errorMsg}</p>
                <button onClick={prepararModelo} style={{
                  padding: '10px 20px', borderRadius: 10, border: `1px solid ${D.border}`, cursor: 'pointer',
                  background: '#fff', color: NAVY, fontSize: 12, fontWeight: 800,
                }}>Reintentar</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* PIE — requisitos */}
      <p style={{ fontSize: 9.5, color: '#5B6878', textAlign: 'center' }}>
        AR requiere: Android con ARCore (Chrome) o iPad/iPhone (Safari). En equipos sin AR el visor 3D funciona igual.
        {escalaReal ? ' · Escala real 1:1: camina el modelo en el terreno.' : ' · Maqueta: colócalo sobre una mesa y ajusta el tamaño con dos dedos.'}
      </p>
    </div>
  );
}
