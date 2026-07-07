// src/hooks/firestoreSuscribir.js
// Suscripción a Firestore con manejo de error SIEMPRE presente.
//
// Problema que resuelve: muchas vistas hacían `onSnapshot(ref, onData)` SIN el 3er
// callback de error. En obra sin señal (cache frío) o ante permission-denied, el
// fallo quedaba en silencio → la pantalla mostraba "vacío" (indistinguible de "no
// hay datos") o un spinner infinito si el `setLoading(false)` vivía solo en el
// callback de éxito. En almacén eso es peligroso: el operario podía registrar una
// salida sobre stock incompleto.
//
// `suscribir` registra siempre un onError que loguea y deja a la vista marcar su
// estado de error (cerrar loading + mostrar aviso) vía la opción onError.
import { onSnapshot } from 'firebase/firestore';

/**
 * @param {import('firebase/firestore').Query|import('firebase/firestore').DocumentReference} ref
 * @param {(snap:any)=>void} onData
 * @param {{ label?: string, onError?: (e:any)=>void }} [opts]
 * @returns {() => void} unsubscribe
 */
export function suscribir(ref, onData, { label = 'firestore', onError } = {}) {
  return onSnapshot(
    ref,
    onData,
    (e) => {
      console.error(`[${label}] error de lectura Firestore:`, e?.code || e?.message, e);
      try { onError?.(e); } catch (_) { /* el handler de la vista no debe romper la suscripción */ }
    }
  );
}
