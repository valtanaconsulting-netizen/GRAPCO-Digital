// src/views/asistencia/MarcadorAsistencia.jsx
// Kiosko biométrico de asistencia — reconocimiento facial GRUPAL en vivo.
// Una sola toma reconoce y marca a 10+ personas a la vez (detectAllFaces).
//
// Reglas de hora (pedido de gerencia):
//  • ENTRADA con TOLERANCIA hasta 07:45:
//      - llega ≤ 07:30        → tareo 07:30 (PUNTUAL)
//      - llega 07:31–07:45    → tareo 07:30, pero marcado TARDE (dentro de tolerancia)
//      - llega  > 07:45 (8,9,10,11:10…) → esa HORA REAL es su entrada del tareo
//        (las HH se cuentan desde su llegada real, no desde 07:30).
//    Siempre se guarda entradaReal (hora exacta) para el registro de puntualidad.
//  • SALIDA: el TAREO usa la hora EN PUNTO hacia abajo (piso). 17:00–17:59→17:00,
//    18:35→18:00, 19:35→19:00. Se guarda también la hora REAL (salidaReal).
//  • horasTrabajadas = salida-piso − entrada DEL TAREO (07:30 o la real si llegó
//    pasada la tolerancia) − refrigerio, así el tareo del capataz hereda HH coherentes.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, query, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { usePersonal } from '../../hooks/useFirebaseData';
import { cargarModelos, obtenerDescriptoresTodos, buscarMatch, arrayToDescriptor, similitudPct, distanciaDeSimilitud } from '../../utils/faceapi';

const hoyStr = () => new Date().toISOString().slice(0, 10);
const horaStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const minutos = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ── Normalización de horas para el TAREO ──
const ENTRADA_TAREO = '07:30';        // entrada oficial cuando se llega a tiempo / dentro de tolerancia
const TOLERANCIA_ENTRADA = '07:45';   // tope de tolerancia: hasta aquí el tareo cuenta 07:30
const DESCANSO_MIN  = 60;             // refrigerio (min)
// Entrada que va al TAREO según la hora REAL de llegada (regla de tolerancia 07:45).
const entradaTareoDe = (horaReal) =>
  minutos(horaReal) <= minutos(TOLERANCIA_ENTRADA) ? ENTRADA_TAREO : horaReal;
// Salida del tareo = hora EN PUNTO hacia abajo (piso). Salen a esa hora pero se
// cambian/asean; el tareo cuenta hasta la hora cumplida. 17:35→17:00, 19:35→19:00.
const salidaTareoDe = (hhmm) => {
  const [h] = (hhmm || '17:00').split(':').map(Number);
  return `${String(h || 0).padStart(2, '0')}:00`;
};

// ── SEGURIDAD BIOMÉTRICA — umbral de similitud OBLIGATORIO ──
// Un rostro solo se acepta si alcanza SIMILITUD_MIN. Por debajo NUNCA hay match
// ni registro (evita que caras desconocidas marquen asistencia al azar).
// NO bajar de 75 sin autorización: es el piso de seguridad pedido por gerencia.
const SIMILITUD_MIN  = 75;   // % mínimo obligatorio para aceptar un rostro
const SIMILITUD_AUTO = 80;   // % desde el cual basta con menos evidencia temporal
const DIST_MAX  = distanciaDeSimilitud(SIMILITUD_MIN);   // 0.25 → similitud 75%
const DIST_AUTO = distanciaDeSimilitud(SIMILITUD_AUTO);  // 0.20 → similitud 80%

// ── Robustez del marcaje grupal ──
const COOLDOWN_MS   = 12000;  // tras marcar a alguien, no re-marcarlo por 12 s
const RACHA_TTL_MS  = 2200;   // una "racha" caduca si no se le vuelve a ver en 2.2 s
const JORNADA_MIN_MIN = 60;   // SALIDA solo si pasó ≥ 60 min desde la entrada real
                              // (evita marcar salida por error justo tras la entrada)

export default function MarcadorAsistencia({ showToast }) {
  const { user } = useAuth();
  const { proyectoActivoId, frenteActivoId, modoTodosFrentes, filtrarPorContexto } = useProyectoActivo();
  const personalDB = usePersonal();

  // Reconocemos SOLO al personal enrolado de ESTE proyecto (aislamiento): el marcador
  // no debe identificar ni marcar a obreros de otra obra.
  const personalEnrolado = useMemo(() => {
    if (!Array.isArray(personalDB)) return [];
    return filtrarPorContexto(personalDB)
      .filter(p => p.activo !== false)
      .map(p => {
        const raw = p.faceDescriptors;
        let descArrays = [];
        if (Array.isArray(raw)) descArrays = raw;
        else if (raw && typeof raw === 'object') descArrays = Object.values(raw);
        return { ...p, faceDescriptors: descArrays.map(arrayToDescriptor) };
      })
      .filter(p => p.faceDescriptors.length > 0);
  }, [personalDB, filtrarPorContexto]);

  // Asistencias de hoy: { personalId: { entrada, entradaReal, salida, salidaReal } }
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
        if (x.personalId) m[x.personalId] = {
          entrada: x.entrada || null, entradaReal: x.entradaReal || null,
          salida: x.salida || null, salidaReal: x.salidaReal || null,
          tarde: !!x.tarde, fueraTolerancia: !!x.fueraTolerancia,
        };
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
  const [analizando, setAnalizando] = useState(false);
  const [detectados, setDetectados] = useState(0);   // caras vistas en el último frame
  const [reconocidos, setReconocidos] = useState(0); // de esas, cuántas superan el piso
  const [hintCandidato, setHintCandidato] = useState(null); // { nombre, sim } mejor parecido bajo el piso
  const [recientes, setRecientes] = useState([]);    // [{ nombre, accion, hora, ts }] feedback
  const videoRef = useRef(null);
  const rachaRef = useRef(new Map());     // personalId → { hits, t, dist }
  const cooldownRef = useRef(new Map());  // personalId → ts del último marcaje
  const registrandoRef = useRef(false);   // evita lotes solapados

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
      // Resolución alta: en una toma grupal las caras quedan pequeñas, así que
      // más píxeles = descriptores más fiables. Pedimos 1920×1440 ideal (4:3).
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
      setStream(s);
    } catch (e) {
      showToast?.('No se pudo acceder a la cámara: ' + e.message, 'error');
    }
  };
  const cerrarCamara = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setDetectados(0); setReconocidos(0); setHintCandidato(null);
    rachaRef.current.clear();
  };

  // Limpieza de los chips de "recién marcados" (se desvanecen a los 6 s).
  useEffect(() => {
    if (!recientes.length) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setRecientes(prev => prev.filter(r => now - r.ts < 6000));
    }, 1000);
    return () => clearInterval(iv);
  }, [recientes.length]);

  // ── Registro por LOTE: una foto del frame (evidencia grupal) + un writeBatch ──
  const registrarLote = async (lote, dataUrl, ts) => {
    if (registrandoRef.current || !proyectoActivoId) return;
    registrandoRef.current = true;
    try {
      const fecha = hoyStr();
      const hora = horaStr();
      // Una sola subida de la foto del frame; se reutiliza para todo el lote.
      const blob = await (await fetch(dataUrl)).blob();
      const r = storageRef(storage, `Asistencia/${fecha}/lote_${ts}.jpg`);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const fotoUrl = await getDownloadURL(r);

      const batch = writeBatch(db);
      const marcados = [];
      for (const mt of lote) {
        const personalId = mt.obrero.id;
        const docId = `${fecha}_${proyectoActivoId}_${personalId}`;
        const docRef = doc(db, 'Asistencia_Diaria', docId);
        const base = {
          fecha, proyectoId: proyectoActivoId,
          frenteId: modoTodosFrentes ? null : frenteActivoId,
          personalId, nombre: mt.obrero.nombre, categoria: mt.obrero.categoria || '',
          fuente: 'biometric-face', matchDistancia: mt.distancia, matchSimilitud: mt.similitud ?? null,
          registradoPor: user?.email || 'kiosko', actualizadoEn: serverTimestamp(),
        };
        if (mt.accion === 'entrada') {
          const entradaT = entradaTareoDe(hora);             // 07:30 si ≤07:45; si no, la hora real
          const tarde = minutos(hora) > minutos(ENTRADA_TAREO);
          batch.set(docRef, {
            ...base,
            entrada: entradaT,                                // TAREO (con tolerancia 07:45)
            entradaReal: hora,                                // hora REAL de llegada (puntualidad)
            tarde,                                            // llegó después de 07:30
            minTarde: Math.max(0, minutos(hora) - minutos(ENTRADA_TAREO)),
            fueraTolerancia: minutos(hora) > minutos(TOLERANCIA_ENTRADA),
            descanso: DESCANSO_MIN,
            fotoEvidencia: fotoUrl,
          }, { merge: true });
        } else {
          const salidaT = salidaTareoDe(hora);
          // Las HH se cuentan desde la ENTRADA del tareo ya registrada (07:30 o la
          // hora real si llegó pasada la tolerancia), no desde un 07:30 fijo.
          const entradaBase = hoy[personalId]?.entrada || ENTRADA_TAREO;
          const horas = Math.max(0, (minutos(salidaT) - minutos(entradaBase) - DESCANSO_MIN) / 60);
          batch.set(docRef, {
            ...base,
            salida: salidaT,          // TAREO: hora en punto (piso)
            salidaReal: hora,         // hora REAL de salida
            horasTrabajadas: +horas.toFixed(2),
            fotoSalida: fotoUrl,
          }, { merge: true });
        }
        cooldownRef.current.set(personalId, Date.now());
        rachaRef.current.delete(personalId);
        marcados.push({ nombre: mt.obrero.nombre, accion: mt.accion, hora });
      }
      await batch.commit();
      setRecientes(prev => [...marcados.map(m => ({ ...m, ts: Date.now() })), ...prev].slice(0, 8));
    } catch (e) {
      showToast?.('Error guardando: ' + e.message, 'error');
    } finally {
      registrandoRef.current = false;
    }
  };

  // ── Loop de detección GRUPAL ──
  useEffect(() => {
    if (!stream || !modelosOK) return;
    let cancel = false;
    const tick = async () => {
      if (cancel) return;
      if (!videoRef.current || !videoRef.current.videoWidth || registrandoRef.current) {
        setTimeout(tick, 300); return;
      }
      setAnalizando(true);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const dets = await obtenerDescriptoresTodos(canvas);
        const now = Date.now();

        // Caduca rachas viejas (alguien que solo pasó un instante no acumula).
        for (const [id, rr] of rachaRef.current) if (now - rr.t > RACHA_TTL_MS) rachaRef.current.delete(id);

        let reconoc = 0;
        let mejorGlobal = { dist: Infinity, nombre: null };  // mejor parecido del frame (para feedback)
        const lote = [];
        const enLote = new Set();
        for (const det of dets) {
          const best = buscarMatch(det.descriptor, personalEnrolado, Infinity);
          if (best?.obrero && best.distancia < mejorGlobal.dist) {
            mejorGlobal = { dist: best.distancia, nombre: best.obrero.nombre };
          }
          if (!best?.obrero || best.distancia > DIST_MAX) continue;  // bajo el piso 75% → ignora
          reconoc++;
          const id = best.obrero.id;

          // Cooldown: no re-marcar a quien acaba de marcar.
          const cd = cooldownRef.current.get(id);
          if (cd && now - cd < COOLDOWN_MS) continue;

          // Racha: exige verlo en varios frames antes de marcar (anti-falso positivo).
          // ≥80% similitud → 2 frames bastan; 75–80% → 3 (más evidencia).
          const prev = rachaRef.current.get(id) || { hits: 0 };
          const hits = prev.hits + 1;
          rachaRef.current.set(id, { hits, t: now, dist: best.distancia });
          const need = best.distancia <= DIST_AUTO ? 2 : 3;
          if (hits < need) continue;

          const accion = estadoDe(id);
          if (accion === 'completo') continue;
          if (accion === 'salida') {
            const er = hoy[id]?.entradaReal || hoy[id]?.entrada;
            if (er && (minutos(horaStr()) - minutos(er)) < JORNADA_MIN_MIN) continue; // demasiado pronto
          }
          if (enLote.has(id)) continue;
          enLote.add(id);
          lote.push({ obrero: best.obrero, distancia: best.distancia, similitud: similitudPct(best.distancia), accion });
        }
        setDetectados(dets.length);
        setReconocidos(reconoc);
        // Feedback: si hay caras pero NINGUNA superó el piso, mostramos al más parecido
        // con su % real ("te veo como X al 68%") para que se acerque/mejore la luz en vez
        // de quedarse sin saber por qué no marca.
        if (dets.length > 0 && reconoc === 0 && mejorGlobal.nombre) {
          setHintCandidato({ nombre: mejorGlobal.nombre, sim: similitudPct(mejorGlobal.dist) });
        } else {
          setHintCandidato(null);
        }

        if (lote.length) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          await registrarLote(lote, dataUrl, now);
        }
      } catch { /* reintenta */ }
      setAnalizando(false);
      if (!cancel) setTimeout(tick, 260);
    };
    tick();
    return () => { cancel = true; };
  }, [stream, modelosOK, personalEnrolado, hoy]);

  // ── Estado visual del header ──
  const presentes = Object.values(hoy).filter(r => r.entrada && !r.salida).length;
  const completos = Object.values(hoy).filter(r => r.entrada && r.salida).length;
  const hayFresco = recientes.some(r => Date.now() - r.ts < 1500);

  const headerColor = hayFresco ? '#15803d' : BASE.navy;
  const headerTxt = !stream ? '📷 LISTO PARA INICIAR'
    : hayFresco ? '✅ MARCAJE REGISTRADO'
    : '👥 ESCANEANDO GRUPO…';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Banda de estado grande */}
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

        {/* CÁMARA — área grande */}
        <div style={{
          flex: '2.2 1 460px', minWidth: 0,
          background: `linear-gradient(160deg, ${BASE.navy} 0%, ${BASE.navyDark} 100%)`,
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
                    padding: '14px 28px', background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
                    color: BASE.navy, border: 'none', borderRadius: '12px', fontWeight: 900,
                    fontSize: '15px', cursor: 'pointer', boxShadow: `0 8px 20px ${BASE.gold}55`,
                    opacity: (!modelosOK || personalEnrolado.length === 0) ? 0.5 : 1,
                  }}>
                  ▶ Iniciar marcador grupal
                </button>
              </div>
            )}

            {/* Contador en vivo de rostros detectados / reconocidos */}
            {stream && (
              <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(0,0,0,0.62)', color: '#fff', padding: '6px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                  {analizando ? '● ' : ''}👥 {detectados} {detectados === 1 ? 'rostro' : 'rostros'}
                </span>
                {reconocidos > 0 && (
                  <span style={{ background: 'rgba(21,128,61,0.82)', color: '#fff', padding: '6px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                    ✓ {reconocidos} reconocido{reconocidos === 1 ? '' : 's'}
                  </span>
                )}
                {/* Pista cuando hay cara pero no llega al piso de 75% */}
                {hintCandidato && (
                  <span style={{ background: 'rgba(217,119,6,0.92)', color: '#fff', padding: '6px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}
                    title={`Acércate, mira de frente y mejora la luz para superar el ${SIMILITUD_MIN}% mínimo`}>
                    ≈ {hintCandidato.nombre} · {hintCandidato.sim}% (acércate / +luz)
                  </span>
                )}
              </div>
            )}

            {/* Recuadro guía grupal */}
            {stream && (
              <div style={{
                position: 'absolute', inset: '8% 6%', borderRadius: '14px', pointerEvents: 'none',
                border: `3px dashed ${hayFresco ? 'rgba(34,197,94,0.8)' : 'rgba(229,168,47,0.45)'}`,
                transition: 'border-color 0.3s',
              }} />
            )}

            {/* Chips de "recién marcados" (feedback grupal) */}
            {recientes.length > 0 && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(0deg, rgba(10,22,40,0.95), rgba(10,22,40,0.4) 75%, transparent)',
                padding: '26px 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                <p style={{ fontSize: '10.5px', fontWeight: 900, color: '#cbd5e1', letterSpacing: '1px' }}>RECIÉN MARCADOS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {recientes.map((r, i) => (
                    <span key={`${r.nombre}-${r.ts}-${i}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: r.accion === 'entrada' ? 'rgba(22,163,74,0.92)' : 'rgba(37,99,235,0.92)',
                      color: '#fff', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                      {r.accion === 'entrada' ? '▸' : '◂'} {r.nombre}
                      <b style={{ color: '#fde68a', fontFamily: 'monospace' }}>{r.hora}</b>
                    </span>
                  ))}
                </div>
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
              const col = st === 'pres' ? '#15803d' : st === 'fin' ? BASE.muted : BASE.mutedSoft;
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: r.tarde ? '#b45309' : '#15803d', fontFamily: 'monospace' }}
                      title={r.entradaReal ? `Llegada real ${r.entradaReal}${r.tarde ? (r.fueraTolerancia ? ' · fuera de tolerancia (>07:45)' : ' · tarde (dentro de tolerancia)') : ' · puntual'}` : ''}>
                      ▸ {r.entrada}{r.entradaReal && r.entradaReal !== r.entrada ? <span style={{ color: BASE.mutedSoft, fontWeight: 700 }}> ({r.entradaReal})</span> : null}
                      {r.tarde && <span style={{ fontSize: '8.5px', fontWeight: 900, letterSpacing: '0.4px', color: '#fff', background: r.fueraTolerancia ? '#b91c1c' : '#d97706', padding: '1px 5px', borderRadius: '5px' }}>{r.fueraTolerancia ? 'TARDE' : 'TOL.'}</span>}
                    </span>
                  )}
                  {r?.salida && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace' }}
                      title={r.salidaReal ? `Salida real ${r.salidaReal}` : ''}>
                      ◂ {r.salida}
                    </span>
                  )}
                  {!r?.entrada && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: BASE.mutedSoft, letterSpacing: '0.5px' }}>PENDIENTE</span>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '10.5px', color: BASE.muted, marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>
            Reconoce hasta 10+ personas a la vez. 1ª marca = ENTRADA, 2ª = SALIDA (hora en punto). Tolerancia 07:45: si llega hasta 07:45 el tareo cuenta 07:30 (tarde si pasó de 07:30); si llega después, esa hora real es su entrada. Solo se acepta con similitud ≥ {SIMILITUD_MIN}%.
          </p>
        </div>
      </div>
    </div>
  );
}

const cardBox = { background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center', color: BASE.muted, fontSize: '13px', fontWeight: 600 };
