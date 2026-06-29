# Diseño de ingeniería — Aislamiento multi-tenant real (rec #1)

_GRAPCO · 2026-06-29 · fundamentado en firestore.rules + ProyectoActivoContext + AuthContext + functions/admin.js + migracionProyectoId.js. 5 agentes._

> **ESTADO:** diseño aprobado para ejecución por fases. El cutover de reglas (F5) NO se despliega sin los 3 gates (0 huérfanos · 100% claims · suite cross-tenant verde) y con rollback listo.

## Diagnóstico

ESTADO REAL HOY (confirmado leyendo firestore.rules, ProyectoActivoContext.jsx, AuthContext.jsx, functions/admin.js, migracionProyectoId.js):

1) El aislamiento por proyecto es 100% COSMÉTICO/CLIENTE. NINGUNA regla de Firestore valida proyectoId. El patrón es `allow read: if isAuth()` en ~66/67 colecciones (única excepción: Auditoria_Seguridad que limita read a isAdmin). El aislamiento real lo hace `filtrarPorContexto()` en React (ProyectoActivoContext.jsx L144-155) + 13 queries con where('proyectoId'). Cualquiera con un token válido y la consola del navegador (o Postman con el ID token) lee TODAS las colecciones de TODOS los proyectos/clientes. Es una fuga cross-tenant total a nivel de backend.

2) NO HAY CUSTOM CLAIMS de proyecto. `request.auth.token.email` se usa solo para superadmins (rules L30-33) y para Kardex.registradoPor (L275). El `proyectoIdAsignado` existe pero vive como CAMPO en /Usuarios (functions/admin.js L136, L185), NO como claim. Por tanto las rules NO pueden leerlo barato; tendrían que hacer get(/Usuarios/$(uid)) en cada operación (1 read extra por op, rompe free-tier en colecciones calientes y añade latencia/offline-fragilidad).

3) EL MODELO DE DATOS ESTÁ A MEDIO CAMINO. ~20 colecciones YA escriben proyectoId (Cartas_Balance, Asistencia_Diaria, Kardex_Movimientos, Planes_Diarios, BIM_*, OrdenesCompra/Servicio, Catalogo_WBS, Cronogramas, Cuadrillas, Frentes, Indicadores_Ejecutivos, SustentoMetrados, PartidasContractuales, Personal en BD, etc.). Otras escriben null o nada. CRÍTICO: Registros_Campo (el tareo, colección más caliente) se escribe vía batch.set en Capataz.jsx SIN proyectoId garantizado → ya hay huérfanos. Materiales/Almacenes/PreciosMercado/Partidas son catálogos hoy globales. Existe ya `migracionProyectoId.js` pero solo cubre 3 colecciones (Almacenes, Kardex, Registros_Campo) y rellena al PROYECTO_DEFAULT_ID con heurística por capataz.

4) CONVENCIÓN LEGACY YA DEFINIDA: docs sin proyectoId se tratan como pertenecientes a PROYECTO_DEFAULT_ID='creditex-ptar' (proyecto.js, ProyectoActivoContext L150). LEGACY_CREDITEX_IDS=['creditex-ptar']. Esto es el ancla del backfill y de la regla de fallback.

5) MULTI-BACKEND: las 4 apps (GRAPCO/Planeamiento/Calidad/SIGMA) comparten grapco-demo-2026; functions/admin.js ya maneja 2 audiences ('control-productividad-franklin','grapco-demo-2026'). El claim debe emitirse para todas. Offline-first: persistencia IndexedDB + onSnapshot vivo de /Usuarios → NO podemos romper getDocFromCache ni meter get() pesados en rules.

CONCLUSIÓN: el trabajo NO es solo reescribir rules; es (a) sembrar un claim de proyecto server-side, (b) garantizar proyectoId en TODO doc, (c) recién entonces endurecer rules con fallback durante la transición. Cualquier endurecimiento sin (a)+(b) tumba la plataforma viva.

## Modelo de Custom Claims

MODELO ELEGIDO: Custom Claims de Firebase Auth como fuente de autorización en rules + /Usuarios como fuente de verdad editable. Claims se DERIVAN de /Usuarios server-side.

POR QUÉ CLAIMS (no get(/Usuarios) en rules):
- Costo: get() en rules = 1 read facturado por operación. En Registros_Campo/Kardex (calientes) eso multiplica reads y puede salir del free-tier. Claims viajan en el JWT = 0 reads, 0 latencia, funciona offline (el token ya está en el dispositivo).
- Offline-first: rules basadas en claim no requieren red para evaluar; get() sí necesitaría el doc /Usuarios accesible.

FORMA DEL CLAIM (mantener <1000 bytes total del token):
  {
    rol: 'capataz' | 'ingeniero' | 'admin' | ...,         // espejo de Usuarios.rol
    proy: ['creditex-ptar', 'proj-xyz'],                  // ARRAY de proyectos autorizados (multi-proyecto real: un ingeniero puede tener varios)
    sa: true                                              // (opcional) superadmin flag, evita lista hardcodeada
  }
Se usa array `proy` (no string) porque admins/ingenieros legítimamente abarcan varios proyectos; capataz tendrá 1. Si proy está vacío/ausente y rol es admin/superadmin → acceso a todo (gobernanza).

DÓNDE SE SETEA (server-side, única vía):
- En functions/admin.js, en adminCrearUsuario y adminCambiarRol, tras escribir el doc /Usuarios, llamar:
    await admin.auth().setCustomUserClaims(uid, { rol, proy: arrayProyectos, sa });
- Añadir un campo Usuarios.proyectosAutorizados (array) además del proyectoIdAsignado actual (compat); el claim `proy` se deriva de ese array (o de [proyectoIdAsignado] si solo hay uno).
- Nueva Cloud Function `sincronizarClaims` (callable admin) que recorre /Usuarios y re-emite claims a todos — es el motor del backfill de claims y el botón de "reparar".
- Trigger opcional onUpdate de /Usuarios que re-emite el claim si cambió rol/proyectos (mantiene claim y doc en sync sin depender de que el admin pase por la función). Mantenerlo idempotente y con guard para no recursar.

PROPAGACIÓN (el punto frágil de los claims): un claim nuevo NO aparece hasta que el cliente renueva el ID token. Estrategia:
- Tras setCustomUserClaims, la función NO puede forzar refresh remoto; el cliente lo hace.
- En AuthContext.jsx, el onSnapshot ya vivo de /Usuarios/{uid}: cuando detecte cambio de rol/proyectos, llamar `auth.currentUser.getIdToken(true)` (force refresh) para traer el claim nuevo sin re-login. Añadir un campo Usuarios.claimsRev (incremental) que la función incrementa; el snapshot lo observa y dispara el refresh.
- Al hacer login y en cada arranque, un getIdToken(true) de cortesía la primera vez tras el cutover garantiza claim presente.

SUPERADMIN: migrar la lista hardcodeada (rules L32 / admin.js L51) a claim `sa:true` seteado por la función para esos correos; mantener la lista hardcodeada SOLO como failsafe en la función (no en rules calientes) para poder re-emitir si alguien queda sin claim.

## Enfoque de reglas

PRINCIPIO: aislamiento por proyecto a nivel de DOCUMENTO usando el claim `proy`, con FALLBACK legacy durante la transición, sin romper colecciones globales legítimas.

NUEVOS HELPERS (todos basados en claim → 0 reads):
  function claims()      { return request.auth.token; }
  function rol()         { return isAuth() ? (claims().rol != null ? claims().rol : '') : ''; }   // claim, NO get()
  function proysClaim()  { return isAuth() && claims().proy is list ? claims().proy : []; }
  function isSuperAdmin(){ return isAuth() && (claims().sa == true || claims().email in [..failsafe..]); }
  function esGlobalDeProyecto() { return rol() in ['admin','ingeniero'] || isSuperAdmin(); } // ven multi-proyecto si su claim los cubre
  // Proyecto del doc, con fallback legacy: doc sin proyectoId == 'creditex-ptar'
  function proyDoc()     { return ('proyectoId' in resource.data && resource.data.proyectoId != null) ? resource.data.proyectoId : 'creditex-ptar'; }
  function proyNuevo()   { return ('proyectoId' in request.resource.data && request.resource.data.proyectoId != null) ? request.resource.data.proyectoId : 'creditex-ptar'; }
  // ¿el usuario puede ver/escribir ESTE proyecto?
  function puedeProyecto(p) { return isSuperAdmin() || proysClaim().hasAny([p]); }
  function leeDoc()      { return puedeProyecto(proyDoc()); }
  function escribeDoc()  { return puedeProyecto(proyNuevo()) && (proyDoc() == proyNuevo()); } // no migrar un doc a otro proyecto

REGLA GENÉRICA por colección de proyecto (reemplaza el read laxo):
  allow read:   if isAuth() && (FLAG_TRANSICION ? true : leeDoc());      // ver flag abajo
  allow create: if <permiso de rol existente> && (FLAG_TRANSICION ? true : escribeDoc());
  allow update: if <permiso de rol existente> && (FLAG_TRANSICION ? true : leeDoc() && escribeDoc());
  allow delete: if <permiso existente> && (FLAG_TRANSICION ? true : leeDoc());

FLAG_TRANSICION: NO existe sintaxis de "flag" en rules; se materializa publicando DOS versiones del archivo. Durante transición se despliega la versión PERMISIVA-CON-FALLBACK (read sigue `if isAuth()` pero los WRITES ya exigen proyectoId presente para nuevos docs). Tras backfill+claims, se despliega la versión ENDURECIDA (read pasa a leeDoc()). Así el "flag" es operacional (qué archivo deployas), no runtime, y es 100% reversible con un redeploy del archivo viejo.

COLECCIONES QUE NO LLEVAN proyectoId (se mantienen globales, NO se les aplica leeDoc):
  - /Usuarios: read se ENDURECE a self-or-admin (allow read: if isOwner(userId) || isAdmin()) para no filtrar emails/roles entre clientes. Escrituras de rol/activo siguen solo vía función.
  - /Proyectos, /Frentes: read limitado a los proyectos en el claim (un cliente no debe enumerar la cartera de otros). allow read: if isSuperAdmin() || puedeProyecto(proyId) (para Proyectos el id ES el proyecto; para Frentes usar resource.data.proyectoId).
  - /Configuracion, /Bootstrap, /TipoCambio: globales legítimos (config sistema, TC SUNAT) → quedan isAuth() read.
  - /Materiales, /Almacenes, /PreciosMercado: HOY globales. DECISIÓN: tratarlos como globales de empresa (read isAuth) PERO con campo proyectoId opcional para inventario por obra; en Almacenes/Kardex SÍ aislar por proyecto (ya llevan proyectoId). Catálogo Materiales/PreciosMercado permanece global (precios de mercado son compartibles) salvo que el negocio pida lo contrario.
  - /Auditoria_Seguridad: ya solo admin lee; añadir proyectoId al payload pero no condiciona read.

INVARIANTE ANTI-ESCALADA EN WRITES: en la versión endurecida, create exige que request.resource.data.proyectoId esté en proysClaim() → un capataz no puede crear un registro "para" otro proyecto aunque manipule el cliente. update exige proyDoc()==proyNuevo() → nadie reasigna un doc a otro tenant.

DENY-BY-DEFAULT final se conserva.

## Hook de aislamiento (useColeccionAislada)

OBJETIVO: que las suscripciones traigan SOLO el proyecto activo desde el servidor (corta la fuga visible + el costo), y que sea el patrón por defecto para nuevos devs. Esto complementa las rules (defensa en profundidad): rules = imposibilidad; hook = correcto-por-construcción + barato.

NUEVO HOOK `useColeccionAislada` (src/hooks/useColeccionAislada.js):
  export function useColeccionAislada(nombreColeccion, opts = {}) {
    const { proyectoActivoId, frenteActivoId, modoTodosFrentes } = useProyectoActivo();
    const { filtros = [], orderByClause = null, incluirLegacy = true, porFrente = false } = opts;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      if (!proyectoActivoId) return;
      // Caso legacy: en creditex-ptar hay docs sin proyectoId. Firestore where('==') NO los trae,
      // así que para el proyecto DEFAULT se hace doble suscripción: where(proyectoId==default) UNION sin-where-filtrado-cliente,
      // o (preferido) where('proyectoId','in',[default, null]) NO soporta null → usar 2 listeners y mergear.
      const clauses = [where('proyectoId','==', proyectoActivoId), ...filtros];
      if (porFrente && !modoTodosFrentes && frenteActivoId) clauses.push(where('frenteId','==',frenteActivoId));
      if (orderByClause) clauses.push(orderByClause);
      const qMain = query(collection(db, nombreColeccion), ...clauses);
      const unsubs = [];
      let parte1 = [], parte2 = [];
      const emit = () => setData(mergeDedupById(parte1, parte2));
      unsubs.push(onSnapshot(qMain, s => { parte1 = s.docs.map(d=>({id:d.id,...d.data()})); emit(); setLoading(false); }, errHandler));
      // Solo el proyecto DEFAULT necesita rescatar huérfanos legacy (post-backfill esto se desactiva con un flag).
      if (incluirLegacy && proyectoActivoId === PROYECTO_DEFAULT_ID && !BACKFILL_COMPLETO) {
        const qLegacy = query(collection(db, nombreColeccion)); // se filtra en cliente a los sin-proyectoId
        unsubs.push(onSnapshot(qLegacy, s => { parte2 = s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.proyectoId); emit(); }, errHandler));
      }
      return () => unsubs.forEach(u=>u());
    }, [nombreColeccion, proyectoActivoId, frenteActivoId, modoTodosFrentes, JSON.stringify(filtros)]);
    return { data, loading };
  }

PUNTOS CLAVE:
- INYECCIÓN where(proyectoId): el hook fuerza el where en el servidor. Esto requiere índices compuestos cuando se combina con orderBy/otros where → declarar en firestore.indexes.json (parte del rollout, autocreados por el primer query fallido en dev). Coste ~$0; los índices no se facturan.
- LEGACY sin doble-lectura cara: la doble suscripción SOLO ocurre en el proyecto creditex-ptar y SOLO mientras BACKFILL_COMPLETO=false. Una vez backfilleado, todos los legacy ya tienen proyectoId='creditex-ptar' y el where simple los trae → se apaga la segunda suscripción (un flag de build/remote-config). Para los demás proyectos NUNCA hubo huérfanos → siempre 1 listener.
- MIGRACIÓN GRADUAL: arrancar reemplazando los 5 archivos de mayor fuga/costo (PanelGerencia, PortfolioDashboard, EstadoObra, ComparativoFrentes, useAvanceF07Vivo) que hoy bajan colecciones completas. PortfolioDashboard/PanelGerencia son multi-proyecto por diseño → usan variante `useColeccionMultiProyecto(proysDelClaim)` con where('proyectoId','in', proys) (máx 10 → ok) en vez del aislado.
- COMPATIBILIDAD: el hook NO elimina filtrarPorContexto; lo deja como segunda malla (defensa en profundidad y para arrays ya en memoria). Donde un componente ya usa filtrarPorContexto sobre una colección completa, se migra a useColeccionAislada incrementalmente sin romper.
- Para WRITES: crear `useEscrituraAislada` / helper construirDocAislado(data) que SIEMPRE inyecta { proyectoId: proyectoActivoId, frenteId } al payload de addDoc/setDoc/batch.set, para que ningún write nuevo nazca huérfano (cierra la fuente del problema en Capataz.jsx).

## Backfill de proyectoId

META: que NINGÚN doc de las colecciones aisladas quede sin proyectoId ANTES de endurecer rules. Si queda uno, al endurecer read=leeDoc() ese doc cae a fallback 'creditex-ptar' (no desaparece) — pero los writes/updates fallarían si el usuario no tiene creditex-ptar en su claim. Por eso: backfill total + verificación 0-huérfanos como gate del cutover.

INVENTARIO DE COLECCIONES A BACKFILLEAR (extender migracionProyectoId.js que hoy solo cubre 3):
  GRUPO A (caliente / crítico): Registros_Campo, Borradores_Capataz, Planes_Diarios, PlanDiario, Asignacion_Tareo, CuadrillasActivas.
  GRUPO B (oficina técnica / costos): Cartas_Balance, SustentoMetrados, PartidasContractuales, ValorizacionesContractuales, MetradosContractuales, PresupuestoF07, ValorizacionF07_Avance, RO_Mensual, Registro_Facturas, GG_Oficina, ValorizacionesSubcontratistas, Deductivos, Valorizaciones, Adicionales, Cartas, IndicesPolinomicos.
  GRUPO C (planeamiento/LPS): PlanMaestro, Catalogo_WBS, Cronogramas, PPC_Compromisos, VDC_Restricciones, VDC_Lecciones, VDC_Evidencias, LPS, LPS_Plazos, PullPlanningHitos, PullPlanningTareas, Indicadores_Ejecutivos.
  GRUPO D (calidad/seguridad): Protocolos, ProtocolosCALFOR, PETs, NoConformidades, Ensayos, RDO, ATS, InspeccionesSeguridad.
  GRUPO E (materiales/compras): Kardex_Movimientos, Almacenes, OrdenesCompra, OrdenesServicio, Requerimientos, Subcontratos, Stock_Actual.
  GLOBALES (NO tocar proyectoId): Usuarios, Proyectos, Frentes, Configuracion, Bootstrap, TipoCambio, Materiales, PreciosMercado, Auditoria_Seguridad, Insumos, APUs, APUs_Real, Partidas (decidir si es global).

ALGORITMO (idempotente, server-side preferido vía firebase-admin con serviceAccount, NO desde cliente para no chocar con rules ni cuotas):
  1. Para cada colección: leer en lotes, filtrar docs sin proyectoId.
  2. Inferir proyectoId destino con heurística (extender la de migracionProyectoId.js):
     a. Si el doc tiene capataz/uid → /Usuarios.proyectoIdAsignado de ese usuario.
     b. Si tiene frenteId → /Frentes.proyectoId.
     c. Si tiene código/prefijo ligado a un proyecto → mapa de prefijos.
     d. Fallback final: PROYECTO_DEFAULT_ID='creditex-ptar' (es la convención legacy ya viva).
  3. batch.update(...) en lotes de 400, con campo migradoEn para trazabilidad y reversibilidad.
  4. Re-correr diagnosticarMigracion ampliado hasta sinProyecto==0 en TODAS las colecciones aisladas.

CLAIMS-FIRST (antes de tocar rules): correr sincronizarClaims para que TODO /Usuarios tenga claim { rol, proy }. Verificar que cada usuario activo tenga proy no-vacío (o sa). Capataces/usuarios de obra → proy=[su proyectoIdAsignado]. Admin/ingeniero → proy = lista de proyectos que manejan (o todos vía sa/rol). Usuarios legacy CREDITEX → asegurar 'creditex-ptar' en su proy.

EJECUCIÓN: script Node con firebase-admin (serviceAccount.json ya disponible, gitignored, proyecto grapco-demo-2026). Correr primero en modo --dry-run (solo cuenta), luego --apply. Mantener log/CSV de qué doc fue a qué proyecto para auditoría y rollback.

## Rollout por etapas

ROLLOUT NO-BREAKING POR ETAPAS (cada etapa reversible, ninguna rompe la plataforma viva):

FLAG OPERACIONAL: como rules no tienen flags runtime, el "flag" = qué archivo de rules está desplegado. Se mantienen 3 artefactos versionados:
  - firestore.rules            (ACTUAL, permisivo, en producción)
  - firestore.rules.transicion (writes exigen proyectoId en nuevos docs; reads aún isAuth)
  - firestore.rules.endurecido (read=leeDoc(); el BORRADOR entregado)
Para apps cliente: un flag de build/Remote-Config `AISLAMIENTO_SERVER=on/off` que activa los where en los hooks (puede prenderse antes que las rules duras, porque solo restringe lo que el cliente pide, nunca rompe permisos).

ETAPA 0 — Preparación (sin deploy de rules):
  - Implementar setCustomUserClaims en functions/admin.js + función sincronizarClaims + trigger onUpdate /Usuarios.
  - Implementar useColeccionAislada + construirDocAislado.
  - Ampliar migracionProyectoId.js a todas las colecciones (modo dry-run).
  - Desplegar SOLO functions (no rules). Las apps siguen igual.

ETAPA 1 — Claims (server, invisible al usuario):
  - Correr sincronizarClaims. Verificar en Rules Playground / token inspector que un usuario de prueba trae { rol, proy }.
  - AuthContext: añadir getIdToken(true) cuando el snapshot de /Usuarios cambie claimsRev. Desplegar hosting. Nadie pierde acceso (rules aún no miran el claim).

ETAPA 2 — Backfill de datos:
  - Correr migración --apply por grupos (A→E). Re-correr diagnóstico hasta 0 huérfanos en cada colección aislada.
  - Activar inyección de proyectoId en TODOS los writes (construirDocAislado) y desplegar hosting → desde aquí no nacen huérfanos nuevos.

ETAPA 3 — Rules de TRANSICIÓN (deploy reversible):
  - Desplegar firestore.rules.transicion a un PROYECTO STAGING primero (o usar el emulator + suite de tests). Validar en Rules Playground con tokens simulados de proyecto A leyendo doc de proyecto B (debe seguir pasando read, pero un create con proyectoId ajeno debe fallar).
  - Deploy a producción `firebase deploy --only firestore:rules --project grapco-demo-2026`. Monitorear errores de permiso (writes). Reads intactos → cero riesgo de pantallas vacías. Si algo truena, redeploy de firestore.rules (vuelta atrás en <1 min).

ETAPA 4 — Hooks aislados + Remote flag:
  - Migrar los 5 archivos de mayor fuga/costo a useColeccionAislada. Encender AISLAMIENTO_SERVER. Validar que no haya pantallas vacías por índices faltantes (declarar firestore.indexes.json y `firebase deploy --only firestore:indexes`).

ETAPA 5 — Cutover ENDURECIDO (el momento delicado):
  - GATE OBLIGATORIO antes de desplegar: (a) 0 huérfanos confirmado, (b) 100% usuarios activos con claim proy/sa, (c) test cross-tenant=0 fugas en emulator verde.
  - Desplegar firestore.rules.endurecido. Ventana de baja actividad (noche Perú). Monitor activo de denegaciones.
  - ROLLBACK INSTANTÁNEO disponible: redeploy firestore.rules.transicion. Mantenerlo a mano 72h.

ETAPA 6 — Limpieza: apagar la doble-suscripción legacy (BACKFILL_COMPLETO=true), retirar fallback 'creditex-ptar' de las rules SOLO si se confirma que ningún doc legacy quedó sin proyectoId (opcional; el fallback es barato y seguro, puede quedarse).

## Plan de pruebas (cross-tenant = 0 fugas)

OBJETIVO: demostrar cross-tenant = 0 fugas ANTES de producción, sin depender de inspección manual.

A) SUITE DE RULES EN EMULATOR (@firebase/rules-unit-testing, corre local/CI, $0):
  Sembrar 2 tenants: usuario A con claim {rol:'capataz', proy:['proj-A']}, usuario B con {rol:'capataz', proy:['proj-B']}, admin con {rol:'admin', sa:true}, y un usuario legacy con proy:['creditex-ptar'].
  Casos por CADA colección aislada (parametrizar la lista de ~50 colecciones):
   1. A lee doc de proj-A → PERMITIDO.
   2. A lee doc de proj-B → DENEGADO (assertFails). ← prueba núcleo anti-fuga.
   3. A crea doc con proyectoId='proj-B' → DENEGADO (anti-suplantación de tenant).
   4. A actualiza doc de proj-A cambiando proyectoId→'proj-B' → DENEGADO (no reasignar tenant).
   5. A lee doc legacy SIN proyectoId estando en proj-A → DENEGADO; usuario legacy (proy incluye creditex-ptar) → PERMITIDO (valida el fallback).
   6. admin/sa lee doc de cualquier proyecto → PERMITIDO.
   7. ingeniero con proy=['proj-A','proj-B'] lee ambos → PERMITIDO; un tercero proj-C → DENEGADO.
  Colecciones globales:
   8. A lee /Usuarios de B → DENEGADO (solo self/admin); A lee su propio /Usuarios → PERMITIDO.
   9. A enumera /Proyectos → solo ve proj-A; no ve proj-B.
   10. write de rol/activo en /Usuarios desde cliente → DENEGADO (solo función/admin).
  Append-only: Kardex/Auditoria update/delete → DENEGADO.

B) PRUEBA DE FUEGO MANUAL (Rules Playground en consola Firebase):
  Para 6-8 colecciones representativas, simular get/list con auth token {proy:['proj-A']} sobre path de proj-B y confirmar "Denegado". Documentar capturas como evidencia de gate.

C) PRUEBA E2E CLIENTE (token real, sin UI):
  Script Node que loguea como capataz de proj-A, toma su ID token y hace getDocs directos a colecciones de proj-B vía REST/SDK → debe recibir permission-denied. Esto valida la cadena real (token→claim→rules), no solo el emulator.

D) PRUEBA DE NO-REGRESIÓN FUNCIONAL:
  Con rules endurecidas en staging/emulator, smoke test de los flujos vivos: capataz sube tareo (Registros_Campo create), ingeniero ve dashboard, almacenero registra Kardex, valorización F07 lee/escribe. Todos deben funcionar para su propio proyecto. Verificar que NINGUNA pantalla queda vacía (señal de índice faltante o claim ausente).

E) PRUEBA OFFLINE:
  Cortar red, operar en cache (IndexedDB), reconectar → confirmar que rules basadas en claim no bloquean writes offline encolados (el token ya tiene el claim) y que la sync sube sin permission-denied.

F) GATE NUMÉRICO antes de ETAPA 5: diagnóstico huérfanos==0, %usuarios-con-claim==100, suite A/E en verde. Sin los 3, no se despliega el endurecido.

## Riesgos del cutover

QUÉ PUEDE TUMBAR LA PLATAFORMA VIVA Y CÓMO SE EVITA:

1) CLAIM AUSENTE/STALE → usuario sin `proy` en el token. Con rules endurecidas leeDoc() le niega TODO y ve la app vacía o no puede subir tareo. CAUSA típica: el cliente no refrescó el ID token tras setCustomUserClaims (el claim no se propaga hasta getIdToken(true) o re-login; los tokens viven ~1h). MITIGACIÓN: F1 fuerza getIdToken(true) vía onSnapshot/claimsRev; gate de cobertura claims==100% antes de F5; failsafe superadmin por email en rules; rollback a rules.transicion.

2) DOC HUÉRFANO (sin proyectoId) tras endurecer → cae a fallback 'creditex-ptar'. Si el usuario NO tiene creditex-ptar en su claim, no lo lee/edita → datos "desaparecen" para él. MITIGACIÓN: backfill 0-huérfanos como gate (F2); el fallback evita pérdida total (el dato sigue siendo legible por quien tenga creditex-ptar); migradoEn permite revertir.

3) ÍNDICES COMPUESTOS FALTANTES → al meter where('proyectoId') + orderBy/otros where, el query falla con "needs index" y la pantalla queda vacía aunque las rules estén bien. MITIGACIÓN: declarar firestore.indexes.json y desplegarlo en F4 ANTES de migrar hooks; probar en staging; el flag AISLAMIENTO_SERVER es reversible.

4) LEGACY where('==') NO TRAE NULOS → en creditex-ptar, mientras haya huérfanos, un where(proyectoId==creditex-ptar) NO los devuelve (Firestore no matchea campo ausente). Pantallas legacy incompletas. MITIGACIÓN: doble-suscripción en el hook SOLO para el proyecto default hasta BACKFILL_COMPLETO; tras backfill todos llevan el id explícito.

5) OFFLINE / WRITES ENCOLADOS → un write hecho offline se evalúa contra rules al sincronizar; si el token cacheado no tenía el claim, falla al subir y se pierde el trabajo del capataz sin señal. MITIGACIÓN: F1 garantiza claim antes de F5; el claim viaja en el token persistido, así que offline ya lo tiene; test E offline en el plan.

6) APPS HERMANAS (Planeamiento/Calidad/SIGMA) sobre el mismo backend → si sus builds no incluyen el refresh de token ni inyectan proyectoId en sus writes, al endurecer rompen aunque GRAPCO esté bien. MITIGACIÓN: F0/F1 (functions + claim) son compartidos por las 4 apps; coordinar deploy de las 4 antes de F5; emitir claim para todos los audiences.

7) COSTO/CUOTA → si por error se dejan get(/Usuarios) en rules calientes, el read facturado por op puede salir del free-tier. MITIGACIÓN: el diseño es 100% claims (0 reads en rules); los hooks aislados REDUCEN reads (cortan descargas de colecciones completas).

8) RECURSIÓN DEL TRIGGER onUpdate /Usuarios → si re-emitir claim escribe en /Usuarios sin guard, loop infinito = costo. MITIGACIÓN: el trigger solo actúa si cambió rol/proyectos y escribe claimsRev con guard de no-cambio.

9) VENTANA DE CUTOVER → desplegar el endurecido en hora pico podría afectar capataces subiendo tareo. MITIGACIÓN: ventana de baja actividad (noche Perú), monitor de denegaciones en vivo, rollback a transicion preparado y probado, comunicado a usuarios clave.

REGLA DE ORO: ningún endurecimiento de read se despliega sin los 3 gates (0 huérfanos, 100% claims, suite cross-tenant verde) y con rollback a firestore.rules.transicion listo en <1 minuto.

## Fases

**F0 — F0 — Cimientos (functions + hooks, sin tocar rules ni datos visibles)**
  - Entregable: setCustomUserClaims en adminCrearUsuario/adminCambiarRol; Cloud Function sincronizarClaims (callable admin) + trigger onUpdate /Usuarios con claimsRev; campo Usuarios.proyectosAutorizados; useColeccionAislada.js + construirDocAislado; migracionProyectoId.js ampliado a TODAS las colecciones en modo dry-run. Deploy SOLO functions.
  - Riesgo: BAJO. Nada cambia para el usuario; rules siguen permisivas. Riesgo: trigger recursivo (mitigar con guard en claimsRev).

**F1 — F1 — Claims live (server invisible)**
  - Entregable: Ejecutar sincronizarClaims → todo /Usuarios con claim {rol,proy,sa}. AuthContext hace getIdToken(true) al cambiar claimsRev. Inspector confirma claims en token. Deploy hosting.
  - Riesgo: BAJO-MEDIO. Si un usuario activo queda sin claim proy, en F5 perdería acceso. Mitigar: reporte de cobertura claims==100% como gate.

**F2 — F2 — Backfill de datos a 0 huérfanos**
  - Entregable: Migración --apply por grupos A→E con heurística (usuario→proyectoIdAsignado, frente→proyecto, fallback creditex-ptar). construirDocAislado activo en todos los writes (no nacen huérfanos). Diagnóstico==0 en cada colección aislada.
  - Riesgo: MEDIO. Mal-inferir el proyecto de un doc lo manda al tenant equivocado. Mitigar: dry-run + CSV de revisión + migradoEn para revertir; preferir fallback conservador creditex-ptar.

**F3 — F3 — Rules de TRANSICIÓN (writes exigen proyectoId, reads abiertos)**
  - Entregable: Deploy firestore.rules.transicion. Reads intactos (cero pantallas vacías); creates/updates exigen proyectoId del claim. Validado en emulator + Rules Playground.
  - Riesgo: MEDIO. Un write legítimo sin proyectoId fallaría. Mitigar: F2 ya garantiza inyección; rollback = redeploy rules actuales (<1 min).

**F4 — F4 — Hooks aislados + flag servidor**
  - Entregable: Migrar PanelGerencia, PortfolioDashboard, EstadoObra, ComparativoFrentes, useAvanceF07Vivo a useColeccionAislada/MultiProyecto. firestore.indexes.json desplegado. Encender AISLAMIENTO_SERVER. Cae el costo de reads y la fuga visible.
  - Riesgo: MEDIO. Índices compuestos faltantes → query falla y pantalla vacía. Mitigar: declarar índices y probar en staging; flag reversible.

**F5 — F5 — Cutover ENDURECIDO (read=leeDoc)**
  - Entregable: Tras gate (0 huérfanos + claims 100% + tests verdes): deploy firestore.rules.endurecido en ventana de baja actividad, con monitor de denegaciones y rollback a transicion preparado 72h.
  - Riesgo: ALTO. Es el único punto que puede tumbar la plataforma viva. Mitigado por gate numérico, fallback legacy en rules y rollback instantáneo.

**F6 — F6 — Limpieza y endurecimiento residual**
  - Entregable: Apagar doble-suscripción legacy (BACKFILL_COMPLETO). Endurecer /Usuarios read a self/admin y /Proyectos/Frentes a claim. Migrar superadmins de lista hardcodeada a claim sa. Opcional: retirar fallback creditex-ptar de rules si se confirma 0 legacy huérfano.
  - Riesgo: BAJO. Cambios acotados, ya con aislamiento probado; cada uno con su propio test.


---

## Anexo · inventario de suscripciones

INVENTARIO DETALLADO POR COLECCION Y PATRON:

COLECCIONES CON MAYOR EXPOSICION (riesgo alto):

1. Registros_Campo (tareos de capataz) - 6+ usos sin filtro en servidor
   Archivos problematicos:
   - src/hooks/useAvanceF07Vivo.js (L44-45): onSnapshot(collection) -> filtra en cliente por proyId
   - src/views/modulos/portfolio/PortfolioDashboard.jsx (L38): descarga TODO, filtra despues
   - src/views/modulos/panelGerencia/PanelGerencia.jsx (L52): descarga TODO, filtra despues
   - src/views/modulos/estadoObra/EstadoObra.jsx: onSnapshot(collection) sin where
   - src/utils/ipRealProyecto.js: getDocs(collection) sin where, fallback a getDocs(query(where))
   - src/views/admin/ResumenAdmin.jsx: getDocs(collection) estadístico
   
   RIESGO: Ingenieros/admins con acceso a múltiples proyectos ven registros de OTROS proyectos al cargar vistas

2. Cartas_Balance (valuaciones) - 5+ usos sin filtro
   Archivos:
   - src/views/ImportarCartaBalance.jsx (L115, L150): getDocs(collection) luego filtra cliente
   - src/views/CartaBalance.jsx: onSnapshot(collection) sin filtro
   - src/views/CartaBalanceAnalisis.jsx (L157): query(...where('proyectoId')) - CORRECTO
   - src/views/WarRoomCuadrillas.jsx: onSnapshot(collection) sin where
   - src/admin/ResumenAdmin.jsx: getDocs(collection) estadístico
   
   RIESGO: Expone montos de proyectos ajenos durante la carga (antes de que se filtre)

3. Cuadrillas - 4 usos
   - src/hooks/useFirebaseData.js (L61): onSnapshot(collection) SIN proyectoId (es lookup de catálogo global - CORRECTO)
   - src/views/admin/GestionUsuarios.jsx (L60+): onSnapshot(collection) - es admin listing CORRECTO
   - src/views/Capataz.jsx (L693): getDocs(collection) luego busca por capataz específico - PARCIALMENTE CORRECTO
   
4. Cuadrillas, Personal, Materiales, Almacenes - Catálogos globales 
   ESTOS SON MULTITENANT (sin proyectoId) - CORRECTO si es intencional
   - src/hooks/useFirebaseData.js: onSnapshot(collection(db, 'Cuadrillas')) 
   - src/hooks/useFirebaseData.js: onSnapshot(collection(db, 'Personal'))
   Nota: Algunos no tienen proyectoId porque son catálogos globales de empresa

PATRON ACTUAL - construirFiltros() en ProyectoActivoContext:

```javascript
const construirFiltros = useCallback(() => {
  const f = { proyectoId: proyectoActivoId };
  if (!modoTodosFrentes && frenteActivoId) f.frenteId = frenteActivoId;
  return f;
}, [proyectoActivoId, frenteActivoId, modoTodosFrentes]);

const filtrarPorContexto = useCallback((items, opts = {}) => {
  if (!Array.isArray(items)) return [];
  const { ignorarProyecto = false, ignorarFrente = false } = opts;
  return items.filter(i => {
    if (!ignorarProyecto) {
      if (i.proyectoId && i.proyectoId !== proyectoActivoId) return false;
      if (!i.proyectoId && proyectoActivoId !== PROYECTO_DEFAULT_ID) return false;
    }
    if (!ignorarFrente && !modoTodosFrentes && i.frenteId && i.frenteId !== frenteActivoId) return false;
    return true;
  });
}, [...]);
```

CARACTERISTICA DEL PATRON: Deja pasar legacy (sin proyectoId) solo en proyecto DEFAULT

QUERIES CON FILTRO where(proyectoId) - CORRECTAS (13 usos):

✓ src/views/asistencia/MarcadorAsistencia.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/asistencia/AsistenciaDiaria.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/CartaBalanceAnalisis.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/compras/OrdenEditor.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/modulos/planMaestro/DashboardPlanMaestro.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/modulos/planMaestro/EditorMasivoActividades.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/modulos/planMaestro/WBSExplorer.jsx: where('proyectoId', '==', proyectoActivoId)
✓ src/views/modulos/dashboardEjecutivo/DashboardEjecutivo.jsx: where('proyectoId', '==', proyectoActivoId) para Indicadores
✓ src/views/materialesK: orderBy y query en consultas puntuales
✓ src/utils/ipRealProyecto.js: getDocs(query(where('proyectoId', '==', projId)))

ARCHIVOS CON RIESGO DIRECTO (20 archivos sin filtro adecuado):

GRUPO A - Fetch completo en cliente (HIGH RISK):
1. src/views/modulos/panelGerencia/PanelGerencia.jsx (L50-59) - 9 colecciones sin where
2. src/views/modulos/portfolio/PortfolioDashboard.jsx (L36-39) - 4 colecciones sin where
3. src/views/modulos/resultadoOperativo/PartidasExtras.jsx - sin filtro
4. src/views/modulos/estadoObra/EstadoObra.jsx - sin filtro
5. src/views/modulos/proyectos/ComparativoFrentes.jsx (L45+) - 5 colecciones sin where

GRUPO B - Presupuesto/Configuración (MEDIUM RISK):
6. src/hooks/usePresupuestoContractual.js (L34-37) - PartidasContractuales sin where inicial
7. src/hooks/useAvanceF07Vivo.js (L44-47) - Registros_Campo y SustentoMetrados sin where
8. src/views/oficina tecnica/PrefijosCodigos.jsx - cargas de catálogos sin proyectoId filter
9. src/views/oficina tecnica/ValorizacionesView.jsx - ValorizacionesContractuales sin where
10. src/views/oficina tecnica/SustentoMetrados.jsx - SustentoMetrados sin where
11. src/views/oficina tecnica/MetradoSustentoModal.jsx - múltiples sin where
12. src/views/oficina tecnica/InformeSustento.jsx - sin where
13. src/views/oficina tecnica/ValorizacionF07.jsx - sin where
14. src/views/oficina tecnica/CRValorizacion.jsx - sin where

GRUPO C - Materiales/Compras/Otros (MEDIUM RISK):
15. src/views/materiales/EntradaMaterial.jsx - Kardex_Movimientos sin where
16. src/views/materiales/ImportarRegistroAlmacen.jsx - sin where en batch
17. src/views/compras/OrdenesListView.jsx - (tiene where en L123 pero carga Almacenes sin filtro)
18. src/views/PersonalBaseDatos.jsx - Asistencia_Diaria sin where
19. src/views/admin/GestionUsuarios.jsx - admin listing (intencional, BAJO RISK)
20. src/utils/migracionProyectoId.js - herramienta de admin, BAJO RISK"
