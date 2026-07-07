// src/context/AuthContext.jsx — v2 (Bloque 12)
// Mejoras de seguridad:
//   - Carga rol desde colección "Usuarios" (capitalización consistente)
//   - Verifica que la cuenta esté activa (campo `activo`)
//   - Cierra sesión automáticamente si la cuenta fue desactivada
//   - Mensajes de error genéricos (no revela si email existe)
//   - Audit log de operaciones críticas

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { leerRutaHash, escribirRutaHash, limpiarRutaHash } from '../utils/urlNav';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const USUARIO_DEMO = {
  uid: 'demo-local',
  email: 'demo@grapco.pe',
  displayName: 'Usuario Demo',
  isAnonymous: true,
  isDemo: true,
};

// ── BYPASS LOGIN (acceso directo sin "INICIAR SESIÓN") ──
// Solo activo en dev/emulator (localhost). En producción siempre se muestra el
// login real para que el usuario use su cuenta Firebase Auth.
const BYPASS_LOGIN =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const USUARIO_BYPASS = {
  uid: 'bypass-admin',
  email: 'admin@grapco.pe',
  displayName: 'Admin (acceso directo)',
  isAnonymous: false,
  isDemo: false,
};

// Mensajes de error genéricos: NO revelan si el email existe o no
const ERRORES_FIREBASE_GENERICOS = {
  'auth/user-not-found':         'Credenciales inválidas',
  'auth/wrong-password':         'Credenciales inválidas',
  'auth/invalid-credential':     'Credenciales inválidas',
  'auth/invalid-email':          'Credenciales inválidas',
  'auth/user-disabled':          'Cuenta desactivada. Contacta al administrador.',
  'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión a internet. Reintenta.',
};

const traducirError = (err) => {
  const code = err?.code || '';
  return ERRORES_FIREBASE_GENERICOS[code] || 'No se pudo iniciar sesión. Reintenta.';
};

// Audit helper: registra operaciones críticas
const auditar = async (uid, accion, detalles = {}) => {
  try {
    await addDoc(collection(db, 'Auditoria_Seguridad'), {
      uid,
      accion,
      detalles,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch (e) {
    console.warn('[Audit]', e.message);
  }
};

// Roles de área única → entran DIRECTO a su panel (sin SelectorPerfil) y no
// pueden cambiar de área. Garantiza que un capataz solo vea su registro.
const AUTO_AREA = {
  capataz: 'capataz',
  carta_balance: 'carta_balance',
  almacenero: 'almacenero',
  logistica: 'almacenero',
};
// Roles que un rolPermitido puede activar. admin/ingeniero = cualquiera (null).
// Para cualquier rol no listado, solo se permite su propio rol (sin escalada).
const ROLES_PERMITIDOS = {
  admin: null,
  ingeniero: null,
  oficina_tecnica: ['oficina_tecnica'],
  // SSOMA (rol 'seguridad') → plataforma SIGMA (2026-06-15).
  // Planeamiento (rol 'planeamiento') → app PLANEAMIENTO_PLATAFORMA; Calidad
  // (roles 'calidad' / 'supervisor_cliente') → app CALIDAD_PLATAFORMA (2026-06-24).
};
const rolEsValido = (rolPermitido, rolElegido) => {
  if (rolPermitido === 'admin' || rolPermitido === 'ingeniero') return true;
  if (AUTO_AREA[rolPermitido]) return rolElegido === AUTO_AREA[rolPermitido];
  const lista = ROLES_PERMITIDOS[rolPermitido];
  if (lista === null) return true;
  if (Array.isArray(lista)) return lista.includes(rolElegido);
  return rolElegido === rolPermitido; // por defecto: solo su propio rol
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [rol,     setRol]     = useState(null);
  // rolPermitido = rol REAL guardado en /Usuarios. Sirve para filtrar el SelectorPerfil:
  // admin puede entrar como cualquier área; los demás solo a su área asignada.
  // `rol` en cambio es el rol ACTIVO de la sesión (puede ser null mientras el usuario
  // está en el SelectorPerfil y aún no eligió un área).
  const [rolPermitido, setRolPermitido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [esDemo,  setEsDemo]  = useState(false);

  const esDemoRef = useRef(false);

  // Carga rol + chequea activo desde "Usuarios" (capital).
  // Si el usuario no tiene perfil aun, lo auto-crea como 'ingeniero' (acceso compartido).
  const cargarPerfil = async (firebaseUser) => {
    const uid = firebaseUser.uid;
    try {
      const ref = doc(db, 'Usuarios', uid);
      // CACHE-FIRST: en arranques en caliente el perfil ya está en IndexedDB, así que
      // resuelve al INSTANTE sin esperar el viaje al servidor (que era lo que dejaba
      // colgada la pantalla "Cargando plataforma"). Si no está en cache (primer login
      // o cache purgada), cae al getDoc normal (servidor). Un rol cambiado por el admin
      // mientras la persona estaba fuera se refleja igual: el onSnapshot de más abajo
      // se suscribe a /Usuarios/{uid} y actualiza rolPermitido EN VIVO al llegar el dato.
      let snap;
      try {
        snap = await getDocFromCache(ref);
      } catch {
        snap = await getDoc(ref);
      }
      if (!snap.exists()) {
        console.log('[Auth] Usuario sin perfil, auto-creando con rol MÍNIMO (capataz):', uid);
        const nuevoPerfil = {
          email: firebaseUser.email || '',
          nombre: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0] || 'Usuario',
          rol: 'capataz',   // rol mínimo: un admin promueve después (evita escalada por self-register)
          activo: true,
          creadoEn: serverTimestamp(),
          ultimoLogin: serverTimestamp(),
          autoCreado: true,
        };
        try {
          await setDoc(ref, nuevoPerfil);
          await auditar(uid, 'perfil_auto_creado', { email: firebaseUser.email, rol: 'capataz' });
        } catch (createErr) {
          // Si las rules bloquean la auto-creacion, igual dejamos pasar al usuario en memoria.
          console.warn('[Auth] No se pudo persistir perfil auto-creado:', createErr.message);
        }
        return { rol: 'capataz', activo: true, nombre: nuevoPerfil.nombre };
      }
      const data = snap.data();
      return {
        rol: data.rol || 'ingeniero',
        activo: data.activo !== false,  // por defecto activo si no se especifica
        nombre: data.nombre || null,
      };
    } catch (err) {
      console.error('[Auth] Error al cargar perfil:', err);
      // Fallback ante error de lectura: rol MÍNIMO (capataz), nunca ingeniero (evita escalada por error).
      return { rol: 'capataz', activo: true };
    }
  };

  useEffect(() => {
    // Bypass: login automático con admin del seed (emulator).
    // En el emulator existe admin@grapco.pe / admin12345 (creado por scripts/seed-emulator.mjs).
    if (BYPASS_LOGIN) {
      (async () => {
        try {
          await signInWithEmailAndPassword(auth, 'admin@grapco.pe', 'admin12345');
          // El onAuthStateChanged más abajo se encargará de cargar el perfil y setear user/rol.
        } catch (err) {
          console.warn(
            '[Auth] Bypass auto-login falló. Arranca emulator + ejecuta scripts/seed-emulator.mjs, o desactiva BYPASS_LOGIN para login manual:',
            err.code, err.message
          );
          setUser(null);
          setRol(null);
          setEsDemo(false);
          setLoading(false);
        }
      })();
      // No retornamos: dejamos que onAuthStateChanged escuche el resultado del signIn.
    }

    const demoActivo = sessionStorage.getItem('grapco_demo') === 'true';
    if (demoActivo) {
      esDemoRef.current = true;
      setUser(USUARIO_DEMO);
      setRol('ingeniero');
      setEsDemo(true);
      setLoading(false);
      return;
    }

    // unsubPerfil: cuando el admin cambia el rol o desactiva el usuario desde el panel,
    // queremos reaccionar EN VIVO sin que la persona tenga que cerrar sesión y volver a entrar.
    let unsubPerfil = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (esDemoRef.current) return;

      // Cancelar suscripción previa si la había (por ejemplo, logout o cambio de cuenta)
      if (unsubPerfil) { unsubPerfil(); unsubPerfil = null; }

      if (firebaseUser) {
        // Primero auto-crear el doc si no existe; cargarPerfil maneja esa lógica.
        const perfil = await cargarPerfil(firebaseUser);

        // Bloqueo: si la cuenta está desactivada, cerrar sesión
        if (!perfil.activo) {
          console.warn('[Auth] Cuenta desactivada, cerrando sesión');
          await auditar(firebaseUser.uid, 'login_bloqueado_cuenta_inactiva');
          await signOut(auth);
          setUser(null);
          setRol(null);
          setLoading(false);
          alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
          return;
        }

        setUser(firebaseUser);
        setRolPermitido(perfil.rol);
        // Si hay rol persistido en sessionStorage (= viene de un reload por cambio de
        // proyecto, etc.) lo restauramos. Si no, dejamos rol=null para que aparezca
        // el SelectorPerfil ("después de ingresar me aparezca las opciones de qué área").
        let rolPersistido = null;
        try { rolPersistido = sessionStorage.getItem('grapco_rol_activo'); } catch (_) {}
        // Deep-link: si la URL trae un área (#/calidad, #/ingeniero/...), MANDA
        // sobre sessionStorage → permite varias pestañas en áreas DISTINTAS a
        // la vez (cada pestaña conserva su propia ruta).
        const areaHash = leerRutaHash()?.area || null;
        // Roles de área única: entran directo a su panel (sin selector, sin escalar).
        const areaAuto = AUTO_AREA[perfil.rol];
        // ¿Un área "pega" (se restaura al recargar / nuevo login) para este perfil?
        // Las ÁREAS DE TRABAJADOR (AUTO_AREA: capataz, almacén, carta balance, etc.)
        // NO son pegajosas para admin/ingeniero: si un admin entró solo a PREVISUALIZAR
        // el área de capataz, un reload o nuevo login NO debe dejarlo atrapado ahí
        // (regresa al SelectorPerfil). Solo "pega" si su rol REAL es ese mismo rol.
        const areaPega = (area) => {
          if (!area) return false;
          if (AUTO_AREA[area]) return perfil.rol === area;   // área de trabajador → solo su dueño
          return rolEsValido(perfil.rol, area);              // áreas multi (ingeniero/calidad/...) sí pegan
        };
        if (areaAuto) {
          setRol(areaAuto);
          try { sessionStorage.setItem('grapco_rol_activo', areaAuto); } catch (_) {}
        } else if (areaHash === 'elegir') {
          // "#/elegir" = forzar el SelectorPerfil (botón "Nueva pestaña" del
          // navbar: la pestaña nueva hereda el sessionStorage en Chrome, así
          // que sin esto entraría a la misma área en vez de dejar elegir otra)
          try { sessionStorage.removeItem('grapco_rol_activo'); } catch (_) {}
          limpiarRutaHash();
          setRol(null);
        } else if (areaHash && areaPega(areaHash)) {
          setRol(areaHash);
          try { sessionStorage.setItem('grapco_rol_activo', areaHash); } catch (_) {}
        } else {
          // Restaurar el rol persistido solo si "pega" para este perfil. Si era un
          // área de trabajador previsualizada por un admin, se limpia y va al selector.
          if (areaPega(rolPersistido)) {
            setRol(rolPersistido);
          } else {
            try { sessionStorage.removeItem('grapco_rol_activo'); } catch (_) {}
            limpiarRutaHash();
            setRol(null);
          }
        }
        setEsDemo(false);

        // Ahora suscribirse a /Usuarios/{uid} para reflejar cambios de rol/activo en vivo
        let lastClaimsRev;   // aislamiento multi-tenant: detectar re-emisión de Custom Claims
        unsubPerfil = onSnapshot(doc(db, 'Usuarios', firebaseUser.uid), (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          // Si una Cloud Function re-emitió los Custom Claims {rol,proy,sa} (claimsRev
          // cambió en vivo), refresca el ID token para traerlos sin re-login. Inocuo
          // hoy: ningún doc tiene claimsRev hasta que corra adminSincronizarClaims.
          if (typeof data.claimsRev === 'number') {
            if (lastClaimsRev !== undefined && data.claimsRev !== lastClaimsRev) {
              auth.currentUser?.getIdToken(true).catch(() => {});
            }
            lastClaimsRev = data.claimsRev;
          }
          // Si el admin desactivó la cuenta en otra ventana, cerrar sesión
          if (data.activo === false) {
            console.warn('[Auth] Cuenta desactivada (live update), cerrando sesión');
            signOut(auth);
            setUser(null);
            setRol(null);
            setRolPermitido(null);
            alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
            return;
          }
          if (data.rol) setRolPermitido(data.rol);
        }, (err) => console.warn('[Auth] perfil snapshot:', err));
      } else {
        setUser(null);
        setRol(null);
        setRolPermitido(null);
        setEsDemo(false);
      }
      setLoading(false);
    });

    return () => {
      if (unsubPerfil) unsubPerfil();
      unsubscribe();
    };
  }, []);

  const register = async (email, password, rolDeseado, nombre = '') => {
    if (rolDeseado === 'ingeniero' || rolDeseado === 'admin') {
      throw new Error('Este rol solo lo puede crear un administrador.');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'Usuarios', cred.user.uid), {
        email,
        nombre: nombre || email.split('@')[0],
        rol: rolDeseado,
        activo: true,
        creadoEn: serverTimestamp(),
        ultimoLogin: serverTimestamp(),
      });
      await auditar(cred.user.uid, 'registro_usuario', { email, rol: rolDeseado });
      return cred.user;
    } catch (err) {
      throw new Error(traducirError(err));
    }
  };

  // Bootstrap del primer admin (solo funciona si /Bootstrap/done no existe)
  const registerAsBootstrapAdmin = async (email, password, nombre = '') => {
    try {
      // 1. Verificar que aun se permite bootstrap
      const bootstrapDoc = await getDoc(doc(db, 'Bootstrap', 'done'));
      if (bootstrapDoc.exists()) {
        throw new Error('El primer admin ya fue creado. Usa el login normal.');
      }
      // 2. Crear cuenta Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // 3. Crear perfil con rol=admin (las reglas lo permiten porque no hay marker)
      await setDoc(doc(db, 'Usuarios', cred.user.uid), {
        email,
        nombre: nombre || email.split('@')[0],
        rol: 'admin',
        activo: true,
        creadoEn: serverTimestamp(),
        ultimoLogin: serverTimestamp(),
        esPrimerAdmin: true,
      });
      // 4. Cerrar la puerta del bootstrap
      await setDoc(doc(db, 'Bootstrap', 'done'), {
        cerradoEn: serverTimestamp(),
        cerradoPor: cred.user.uid,
        emailPrimerAdmin: email,
      });
      await auditar(cred.user.uid, 'bootstrap_primer_admin', { email });
      return cred.user;
    } catch (err) {
      console.error('[Bootstrap]', err);
      throw new Error(err.message || traducirError(err));
    }
  };

  const login = async (email, password) => {
    sessionStorage.removeItem('grapco_demo');
    esDemoRef.current = false;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Actualizar último login (no bloqueante)
      setDoc(doc(db, 'Usuarios', cred.user.uid),
        { ultimoLogin: serverTimestamp() }, { merge: true })
        .catch(() => {});
      auditar(cred.user.uid, 'login_exitoso');
      return cred.user;
    } catch (err) {
      // Audit del intento fallido (sin saber el uid)
      auditar('anon', 'login_fallido', { email, code: err.code });
      throw new Error(traducirError(err));
    }
  };

  const loginDemo = () => {
    sessionStorage.setItem('grapco_demo', 'true');
    esDemoRef.current = true;
    setUser(USUARIO_DEMO);
    setRol('ingeniero');
    setEsDemo(true);
    setLoading(false);
  };

  const logout = async () => {
    // En modo bypass: limpiar solo el rol → vuelve al SelectorPerfil
    if (BYPASS_LOGIN) {
      try { sessionStorage.removeItem('grapco_rol_activo'); } catch (_) {}
      setRol(null);
      return;
    }
    const uidActual = user?.uid;
    sessionStorage.removeItem('grapco_demo');
    try { sessionStorage.removeItem('grapco_rol_activo'); } catch (_) {}
    esDemoRef.current = false;
    setEsDemo(false);
    setUser(null);
    setRol(null);
    if (uidActual && uidActual !== 'demo-local') {
      auditar(uidActual, 'logout');
      await signOut(auth);
    }
  };

  // Lo invoca SelectorPerfil cuando el usuario elige un área.
  // Persistimos en sessionStorage para que cambiar de proyecto (que hace window.reload)
  // no obligue a re-elegir área.
  const entrarComoRol = (rolElegido) => {
    // Defensa: nunca permitir un rol fuera de lo asignado en /Usuarios.
    if (!rolEsValido(rolPermitido, rolElegido)) {
      console.warn('[Auth] Rol no permitido:', rolElegido, 'para', rolPermitido);
      const destino = AUTO_AREA[rolPermitido] || null;
      try { sessionStorage.setItem('grapco_rol_activo', destino || ''); } catch (_) {}
      setRol(destino);
      return;
    }
    try { sessionStorage.setItem('grapco_rol_activo', rolElegido || ''); } catch (_) {}
    if (rolElegido) escribirRutaHash(rolElegido);
    setRol(rolElegido);
  };

  // Cambiar de area: vuelve al SelectorPerfil. Para roles de área única se
  // mantiene en su panel (no pueden cambiar de área).
  const cambiarArea = () => {
    const areaAuto = AUTO_AREA[rolPermitido];
    if (areaAuto) { setRol(areaAuto); return; }
    try { sessionStorage.removeItem('grapco_rol_activo'); } catch (_) {}
    limpiarRutaHash();
    setRol(null);
  };

  // value memoizado: sin esto se recrea un objeto nuevo en CADA render del provider
  // y React re-renderiza TODOS los consumidores de useAuth (toda la app). Las funciones
  // (register/login/...) solo dependen de user/rolPermitido, ambos en las deps → siempre frescas.
  const value = useMemo(() => ({
    user, rol, rolPermitido, loading, esDemo,
    // Área única destino (capataz, etc.) → App lo usa para entrar directo.
    areaAuto: AUTO_AREA[rolPermitido] || null,
    register, registerAsBootstrapAdmin, login, loginDemo, logout, entrarComoRol, cambiarArea,
    // Helpers de chequeo de rol (más ergonómico)
    isCapataz: rol === 'capataz',
    isIngeniero: rol === 'ingeniero',
    isAdmin: rol === 'admin',
    // Roles del Bloque 19 (modulo Materiales/Subcontratos)
    isAlmacenero: rol === 'almacenero',
    isLogistica: rol === 'logistica',
    isSubcontratista: rol === 'subcontratista',
    // Roles del Bloque 20 (Calidad + Oficina Tecnica)
    isCalidad: rol === 'calidad',
    isSupervisorCliente: rol === 'supervisor_cliente',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, rol, rolPermitido, loading, esDemo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
