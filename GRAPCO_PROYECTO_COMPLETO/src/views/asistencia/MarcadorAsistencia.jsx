// src/views/asistencia/MarcadorAsistencia.jsx
// Kiosko biométrico de asistencia — reconocimiento facial en vivo.
// Mundial-grade: ENTRADA y SALIDA automáticas, auto-confirmación en match fuerte,
// pantallas grandes legibles a distancia, loop continuo sin clics, evidencia foto.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, query, where, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { usePersonal } from '../../hooks/useFirebaseData';
import { cargarModelos, obtenerDescriptor, buscarMatch, arrayToDescriptor, similitudPct, distanciaDeSimilitud, promediarDescriptores, faceapi } from '../../utils/faceapi';

const hoyStr = () => new Date().toISOString().slice(0, 10);
const horaStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const minutos = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ── SEGURIDAD BIOMÉTRICA — umbral de similitud OBLIGATORIO ──
// Un rostro solo se acepta si alcanza SIMILITUD_MIN. Por debajo NUNCA hay match
// ni registro (evita que caras desconocidas marquen asistencia al azar).
// NO bajar de 75 sin autorización: es el piso de seguridad pedido por gerencia.
const SIMILITUD_MIN  = 75;   // % mínimo obligatorio para aceptar un rostro
const SIMILITUD_AUTO = 80;   // % desde el cual registra solo (auto); entre 75-80 pide confirmar
const DIST_MAX  = distanciaDeSimilitud(SIMILITUD_MIN);   // 0.25 → similitud 75%
const DIST_AUTO = distanciaDeSimilitud(SIMILITUD_AUTO);  // 0.20 → similitud 80%

export default function MarcadorAsistencia({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
  const personalDB = usePersonal();

  // Buscar en TODO el personal activo enrolado (identidad biométrica global).
  // El proyecto activo solo se usa para guardar la asistencia, no para filtrar
  // a quién reconocer — así no excluimos a nadie por un proyectoId desactualizado.
  const personalEnrolado = useMemo(() => {
    if (!Array.isArray(personalDB)) return [];
    return personalDB
      .filter(p => p.activo !== false)
      .map(p => {
        const raw = p.faceDescriptors;
        let descArrays = [];
        if (Array.isArray(raw)) descArrays = raw;
        else if (raw && typeof raw === 'object') descArrays = Object.values(raw);
        return { ...p, faceDescriptors: descArrays.map(arrayToDescriptor) };
      })
      .filter(p => p.faceDescriptors.length > 0);
  }, [personalDB]);

  // Asistencias de hoy: { personalId: { entrada, salida, fotoUrl } }
  const [hoy, setHoy] = useState({});
  useEffect(() => {
    if (!proyectoActivoId) return;
    const q = query(
      collection(db, 'Asistencia_Diaria'),
      where('fecha', '==', hoyStr()),
      where('proyectoId', '==', proyectoActivoId),
    );
    return onSnapshot(q, (snap) => {
      const m = {};
      snap.forEach(d => {
        const x = d.data();
        if (x.personalId) m[x.personalId] = { entrada: x.entrada || null, salida: x.salida || null, fotoUrl: x.fotoEvidencia || null };
      });
      setHoy(m);
    });
  }, [proyectoActivoId]);

  const estadoDe = (id) => {
    const r = hoy[id];
    if (!r || !r.entrada) return 'entrada';
    if (r.entrada && !r.salida) return 'salida';
    return 'completo';
  };

  const [modelosOK, setModelosOK] = useState(false);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [stream, setStream] = useState(null);
  const [match, setMatch] = useState(null);     // { obrero, distancia, dataUrl, accion }
  const [exito, setExito] = useState(null);     // { nombre, accion, hora, foto }
  const [noId, setNoId] = useState(false);      // cara detectada pero sin match (similitud < mínimo)
  const [noIdSim, setNoIdSim] = useState(0);    // % de similitud del mejor candidato rechazado
  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cuenta, setCuenta] = useState(0);      // countdown auto-confirm
  const videoRef = useRef(null);
  const lastDetectAt = useRef(0);
  const bufRef = useRef([]);   // buffer de descriptores recientes (suavizado temporal)

  useEffect(() => {
    setCargandoModelos(true);
    cargarModelos()
      .then(() => setModelosOK(true))
      .catch(() => showToast?.('Error cargando modelos. Verifica tu conexión.', 'error'))
      .finally(() => setCargandoModelos(false));
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  const abrirCamara = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(s);
    } catch (e) {
      showToast?.('No se pudo acceder a la cámara: ' + e.message, 'error');
    }
  };
  const cerrarCamara = () => { if (stream) stream.getTracks().forEach(t => t.stop()); setStream(null); setMatch(null); setNoId(false); bufRef.current = []; };

  // Loop de detección
  useEffect(() => {
    if (!stream || !modelosOK || match || exito || guardando) return;
    let cancel = false;
    const tick = async () => {
      if (cancel) return;
      const now = Date.now();
      if (now - lastDetectAt.current < 420) { setTimeout(tick, 140); return; }
      lastDetectAt.current = now;
      if (!videoRef.current || !videoRef.current.videoWidth) { setTimeout(tick, 300); return; }
      setAnalizando(true);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const det = await obtenerDescriptor(canvas);
        if (det) {
          // ── Suavizado temporal ──
          // Acumulamos las últimas capturas y promediamos el descriptor. Promediar
          // varios frames del mismo rostro elimina el "salto" del % y baja la
          // distancia real → reconocimiento mucho más exacto y estable.
          const buf = bufRef.current;
          // Si el rostro cambió mucho (otra persona / gran movimiento) reiniciamos.
          if (buf.length) {
            const dPrev = faceapi.euclideanDistance(det.descriptor, buf[buf.length - 1].d);
            if (dPrev > 0.6) buf.length = 0;
          }
          buf.push({ d: det.descriptor, t: now });
          while (buf.length > 6) buf.shift();                       // máx 6 capturas
          while (buf.length && now - buf[0].t > 2500) buf.shift();  // y solo de los últimos 2.5 s

          const descProm = promediarDescriptores(buf.map(x => x.d)) || det.descriptor;
          // Buscar el MEJOR candidato sin filtrar, y luego aplicar el piso de seguridad.
          const best = buscarMatch(descProm, personalEnrolado, Infinity);
          const sim = best?.obrero ? similitudPct(best.distancia) : 0;
          // Aceptar solo si: alcanza el mínimo (≥ SIMILITUD_MIN) Y hay al menos 2
          // frames coherentes (un único frame ruidoso nunca dispara un registro).
          if (best?.obrero && best.distancia <= DIST_MAX && buf.length >= 2) {
            const accion = estadoDe(best.obrero.id);
            bufRef.current = [];
            setNoId(false);
            setMatch({
              obrero: best.obrero,
              distancia: best.distancia,
              similitud: sim,
              dataUrl: canvas.toDataURL('image/jpeg', 0.85),
              accion,
            });
            setAnalizando(false);
            return;
          }
          // Hay cara pero NO alcanza el mínimo → rechazo (posible desconocido).
          setNoIdSim(sim);
          setNoId(true);
          setTimeout(() => setNoId(false), 1800);
        } else {
          // Sin cara en el frame → vaciamos el buffer para no mezclar sesiones.
          if (bufRef.current.length) bufRef.current = [];
        }
      } catch { /* reintenta */ }
      setAnalizando(false);
      if (!cancel) setTimeout(tick, 320);
    };
    tick();
    return () => { cancel = true; };
  }, [stream, modelosOK, match, exito, guardando, personalEnrolado, hoy]);

  // Auto-confirmación con cuenta regresiva cuando el match es fuerte
  useEffect(() => {
    if (!match || match.accion === 'completo') { setCuenta(0); return; }
    if (match.distancia > DIST_AUTO) return; // similitud 75-80% → confirmación manual (no auto)
    setCuenta(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      setCuenta(n);
      if (n <= 0) { clearInterval(iv); registrar(match); }
    }, 800);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  const registrar = async (mt) => {
    if (!mt || !proyectoActivoId || guardando) return;
    if (mt.accion === 'completo') { setMatch(null); return; }
    setGuardando(true);
    setCuenta(0);
    try {
      const personalId = mt.obrero.id;
      const fecha = hoyStr();
      const hora = horaStr();
      const blob = await (await fetch(mt.dataUrl)).blob();
      const path = `Asistencia/${fecha}/${personalId}_${mt.accion}.jpg`;
      const r = storageRef(storage, path);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const fotoUrl = await getDownloadURL(r);

      const docId = `${fecha}_${proyectoActivoId}_${personalId}`;
      const base = {
        fecha, proyectoId: proyectoActivoId,
        frenteId: modoTodosFrentes ? null : frenteActivoId,
        personalId, nombre: mt.obrero.nombre, categoria: mt.obrero.categoria || '',
        fuente: 'biometric-face', matchDistancia: mt.distancia, matchSimilitud: mt.similitud ?? null,
        registradoPor: user?.email || 'kiosko', actualizadoEn: serverTimestamp(),
      };

      if (mt.accion === 'entrada') {
        await setDoc(doc(db, 'Asistencia_Diaria', docId), {
          ...base, entrada: hora, descanso: 60, fotoEvidencia: fotoUrl,
        }, { merge: true });
      } else {
        const ent = hoy[personalId]?.entrada || '07:00';
        const horas = Math.max(0, (minutos(hora) - minutos(ent) - 60) / 60);
        await setDoc(doc(db, 'Asistencia_Diaria', docId), {
          ...base, salida: hora, horasTrabajadas: +horas.toFixed(2), fotoSalida: fotoUrl,
        }, { merge: true });
      }

      setExito({ nombre: mt.obrero.nombre, accion: mt.accion, hora, foto: mt.dataUrl });
      setMatch(null);
      setTimeout(() => setExito(null), 3200); // vuelve a escanear solo
    } catch (e) {
      showToast?.('Error guardando: ' + e.message, 'error');
      setMatch(null);
    } finally { setGuardando(false); }
  };

  // ── Estado visual del header ──
  const presentes = Object.values(hoy).filter(r => r.entrada && !r.salida).length;
  const completos = Object.values(hoy).filter(r => r.entrada && r.salida).length;

  const headerColor = exito ? '#15803d' : noId ? '#b45309' : match ? '#1d4ed8' : BASE.navy;
  const headerTxt = exito
    ? (exito.accion === 'entrada' ? '✅ ENTRADA REGISTRADA' : '✅ SALIDA REGISTRADA')
    : noId ? '⚠️ ROSTRO NO IDENTIFICADO'
    : match ? '👤 IDENTIFICANDO…'
    : stream ? '🔍 ACÉRCATE A LA CÁMARA' : '📷 LISTO PARA INICIAR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Banda de estado grande — con relieve y degradado */}
      <div style={{
        background: headerColor,
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 45%), linear-gradient(0deg, rgba(0,0,0,0.18), rgba(0,0,0,0))',
        color: '#fff', borderRadius: '16px',
        padding: '15px 22px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap',
        transition: 'background 0.3s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 14px 32px -16px rgba(8,26,46,0.7)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.5px' }}>{headerTxt}</span>
        <span style={{ display: 'flex', gap: '10px', fontSize: '11.5px', fontWeight: 800, flexWrap: 'wrap' }}>
          {[['Presentes', presentes], ['Completaron', completos], ['Enrolados', personalEnrolado.length]].map(([l, v]) => (
            <span key={l} style={{
              background: 'rgba(255,255,255,0.14)', padding: '5px 12px', borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.16)', letterSpacing: '0.3px',
            }}>{l} <b style={{ fontSize: '13px' }}>{v}</b></span>
          ))}
        </span>
      </div>

      {cargandoModelos && (
        <div style={cardBox}>Cargando IA de reconocimiento (~7 MB, solo la 1ª vez)…</div>
      )}
      {personalEnrolado.length === 0 && modelosOK && (
        <div style={{ ...cardBox, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
          ⚠️ <strong>Aún no hay personal enrolado.</strong> Un administrador debe registrar los rostros en <strong>Admin → Enrolamiento Facial</strong> (3 fotos por persona, 1 sola vez).
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'stretch' }}>

        {/* CÁMARA — área grande (≈2.2× el panel); se apila debajo del panel en pantallas angostas */}
        <div style={{
          flex: '2.2 1 460px', minWidth: 0,
          background: 'linear-gradient(160deg, #0F2A47 0%, #081A2E 100%)',
          borderRadius: '18px', padding: '12px', position: 'relative',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 48px -24px rgba(0,0,0,0.7)',
        }}>
          <div style={{ background: '#000', borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

            {!stream && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#fff' }}>
                <span style={{ fontSize: '52px' }}>📷</span>
                <p style={{ fontSize: '14px', opacity: 0.8 }}>Cámara apagada</p>
                <button onClick={abrirCamara} disabled={!modelosOK || personalEnrolado.length === 0}
                  style={{
                    padding: '14px 28px', background: `linear-gradient(135deg, ${BASE.gold}, #d4941f)`,
                    color: BASE.navy, border: 'none', borderRadius: '12px', fontWeight: 900,
                    fontSize: '15px', cursor: 'pointer', boxShadow: `0 8px 20px ${BASE.gold}55`,
                    opacity: (!modelosOK || personalEnrolado.length === 0) ? 0.5 : 1,
                  }}>
                  ▶ Iniciar marcador
                </button>
              </div>
            )}

            {/* Marco guía / estado */}
            {stream && !exito && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: '58%', aspectRatio: '3/4', borderRadius: '50%', pointerEvents: 'none',
                border: `4px solid ${match ? '#22c55e' : noId ? '#f59e0b' : 'rgba(229,168,47,0.55)'}`,
                boxShadow: match ? '0 0 0 9999px rgba(21,128,61,0.18)' : 'none',
                transition: 'all 0.25s',
              }} />
            )}

            {stream && analizando && !match && !exito && (
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                ● Analizando…
              </div>
            )}

            {/* OVERLAY ÉXITO — pantalla grande */}
            {exito && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(21,128,61,0.94)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#fff', textAlign: 'center', padding: '20px',
              }}>
                <span style={{ fontSize: '64px', lineHeight: 1 }}>✅</span>
                <p style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', marginTop: '10px', opacity: 0.9 }}>
                  {exito.accion === 'entrada' ? 'BIENVENIDO' : 'HASTA MAÑANA'}
                </p>
                <p style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{exito.nombre}</p>
                <p style={{ fontSize: '15px', fontWeight: 700, marginTop: '6px', opacity: 0.92 }}>
                  {exito.accion === 'entrada' ? 'Entrada' : 'Salida'} registrada · {exito.hora}
                </p>
              </div>
            )}

            {/* OVERLAY MATCH — confirmación / cuenta regresiva */}
            {match && !exito && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(0deg, rgba(10,22,40,0.96), rgba(10,22,40,0.55) 70%, transparent)',
                padding: '18px 16px 16px', color: '#fff',
              }}>
                {match.accion === 'completo' ? (
                  <>
                    <p style={{ fontSize: '20px', fontWeight: 900 }}>{match.obrero.nombre}</p>
                    <p style={{ fontSize: '13px', color: '#fcd34d', fontWeight: 700, marginTop: '4px' }}>
                      Ya registró entrada y salida hoy. ¡Buen trabajo! 👏
                    </p>
                    <button onClick={() => setMatch(null)} style={btnGhost}>Continuar</button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#86efac', letterSpacing: '1px' }}>
                      ✓ RECONOCIDO · {match.similitud}% similitud {match.similitud >= SIMILITUD_AUTO ? '(alta)' : '(verificar)'}
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: 900, marginTop: '3px' }}>{match.obrero.nombre}</p>
                    <p style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
                      {match.obrero.categoria || 'Personal'} · Marcará <b style={{ color: '#fcd34d' }}>{match.accion === 'entrada' ? 'ENTRADA' : 'SALIDA'}</b> {horaStr()}
                    </p>
                    {cuenta > 0 ? (
                      <p style={{ fontSize: '14px', fontWeight: 800, marginTop: '10px' }}>
                        Registrando automáticamente en <span style={{ color: '#fcd34d', fontSize: '20px' }}>{cuenta}</span>…
                      </p>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button onClick={() => registrar(match)} disabled={guardando}
                          style={{ flex: 1, padding: '13px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>
                          {guardando ? 'Guardando…' : `✓ Confirmar ${match.accion}`}
                        </button>
                        <button onClick={() => setMatch(null)} style={btnGhost}>No soy yo</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* OVERLAY RECHAZO — rostro no alcanza el mínimo de similitud */}
            {noId && !match && !exito && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(0deg, rgba(146,64,14,0.96), rgba(146,64,14,0.55) 70%, transparent)',
                padding: '18px 16px 16px', color: '#fff',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 900, color: '#fed7aa', letterSpacing: '0.5px' }}>
                  ⚠️ ROSTRO NO RECONOCIDO
                </p>
                <p style={{ fontSize: '13px', opacity: 0.92, marginTop: '3px' }}>
                  Similitud <b style={{ color: '#fde047' }}>{noIdSim}%</b> — se requiere mínimo <b>{SIMILITUD_MIN}%</b>.
                </p>
                <p style={{ fontSize: '11.5px', opacity: 0.8, marginTop: '2px' }}>
                  Acércate al óvalo, mejora la iluminación o pide ser re-enrolado.
                </p>
              </div>
            )}
          </div>

          {stream && (
            <button onClick={cerrarCamara}
              style={{ marginTop: '10px', width: '100%', padding: '9px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              ⏹ Detener cámara
            </button>
          )}
        </div>

        {/* PANEL — asistencia en vivo */}
        <div style={{
          flex: '1 1 300px', minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%)',
          border: `1px solid rgba(15,42,71,0.07)`, borderRadius: '18px', padding: '16px',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 22px 48px -26px rgba(8,26,46,0.6)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 900, color: BASE.muted, letterSpacing: '1px', marginBottom: '10px' }}>
            ASISTENCIA DE HOY · {hoyStr()}
          </p>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '62vh', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {personalEnrolado.length === 0 && (
              <p style={{ color: BASE.muted, fontSize: '12px', textAlign: 'center', padding: '24px' }}>Sin personal enrolado.</p>
            )}
            {[...personalEnrolado].sort((a, b) => {
              const ra = hoy[a.id], rb = hoy[b.id];
              const sa = ra?.entrada ? (ra.salida ? 2 : 1) : 0;
              const sb = rb?.entrada ? (rb.salida ? 2 : 1) : 0;
              return sb - sa || (a.nombre || '').localeCompare(b.nombre || '');
            }).map(p => {
              const r = hoy[p.id];
              const st = !r?.entrada ? 'pend' : r.salida ? 'fin' : 'pres';
              const col = st === 'pres' ? '#15803d' : st === 'fin' ? BASE.muted : '#94a3b8';
              const bg = st === 'pres' ? '#dcfce7' : st === 'fin' ? '#f1f5f9' : BASE.bgSoft;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px',
                  background: bg, border: `1px solid ${st === 'pres' ? '#86efac' : BASE.border}`, borderRadius: '10px',
                }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: col, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 700, color: BASE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nombre}
                  </span>
                  {r?.entrada && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                      ▸ {r.entrada}
                    </span>
                  )}
                  {r?.salida && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace' }}>
                      ◂ {r.salida}
                    </span>
                  )}
                  {!r?.entrada && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>PENDIENTE</span>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>
            Acércate al óvalo. La 1ª marca = ENTRADA, la 2ª = SALIDA. Solo se acepta con similitud ≥ {SIMILITUD_MIN}%; registro automático desde {SIMILITUD_AUTO}%.
          </p>
        </div>
      </div>
    </div>
  );
}

const cardBox = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center', color: BASE.muted, fontSize: '13px', fontWeight: 600 };
const btnGhost = { marginTop: '12px', padding: '11px 18px', background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' };
