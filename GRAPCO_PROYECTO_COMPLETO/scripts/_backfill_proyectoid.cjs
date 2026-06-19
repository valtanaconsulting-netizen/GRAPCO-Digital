// scripts/_backfill_proyectoid.cjs
// Backfill de proyectoId en docs LEGACY (sin proyectoId) → 'creditex-ptar'.
// Toda la data histórica de la plataforma es de CREDITEX (único proyecto previo).
// Esto habilita el aislamiento de LECTURA a nivel de reglas Firestore sin romper nada.
//
// USO:
//   node scripts/_backfill_proyectoid.cjs            # DRY-RUN (cuenta, NO escribe)
//   node scripts/_backfill_proyectoid.cjs --apply    # APLICA (escribe proyectoId)
//
// Requiere: serviceAccount.json en la raíz del repo (gitignored) + firebase-admin.
// SEGURO: solo toca docs SIN proyectoId; nunca sobreescribe uno existente.

const path = require('path');
const admin = require('firebase-admin');

const LEGACY_PROYECTO = 'creditex-ptar';
const APPLY = process.argv.includes('--apply');

// Colecciones TRANSACCIONALES (por proyecto). NO se tocan los maestros globales
// (Materiales, Personal, Cuadrillas, Configuracion, Usuarios, Proyectos, Frentes…).
const COLECCIONES = [
  'Registros_Campo', 'Historial', 'RDO', 'Planes_Diarios', 'PlanDiario',
  'Cartas_Balance', 'CuadrillasActivas', 'Asistencia_Diaria',
  'ValorizacionesContractuales', 'PartidasContractuales', 'Adicionales', 'Deductivos',
  'Registro_Facturas', 'GG_Oficina', 'ValorizacionesSubcontratistas', 'Valorizaciones', 'Subcontratos',
  'Kardex_Movimientos', 'OrdenesCompra', 'OrdenesServicio', 'Requerimientos',
  'Protocolos', 'PETs', 'NoConformidades', 'Ensayos', 'ProtocolosCALFOR',
  'ATS', 'InspeccionesSeguridad', 'SustentoMetrados', 'VDC_Evidencias',
  'PlanMaestro', 'APUs', 'APUs_Real', 'RO_Mensual', 'Insumos',
  'LPS', 'LPS_Plazos', 'PPC_Compromisos', 'VDC_Restricciones', 'VDC_Lecciones',
  'PullPlanningHitos', 'PullPlanningTareas', 'Cronogramas', 'Indicadores_Ejecutivos',
  'BIM_Modelos', 'BIM_Vinculos',
];

async function main() {
  let sa;
  try {
    sa = require(path.join(__dirname, '..', 'serviceAccount.json'));
  } catch (e) {
    console.error('\n❌ No se encontró serviceAccount.json en la raíz del repo.');
    console.error('   Descárgalo de Firebase Console → grapco-demo-2026 → Configuración →');
    console.error('   Cuentas de servicio → Generar nueva clave privada, renómbralo a');
    console.error('   serviceAccount.json y ponlo junto a package.json.\n');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
  const db = admin.firestore();

  console.log(`\n${APPLY ? '🚀 APLICANDO' : '🔍 DRY-RUN (no escribe)'} · proyectoId legacy = "${LEGACY_PROYECTO}"`);
  console.log(`Proyecto Firebase: ${sa.project_id}\n`);
  console.log('Colección'.padEnd(32) + 'Total'.padStart(8) + 'SinProy'.padStart(10) + (APPLY ? '  Escritos' : ''));
  console.log('─'.repeat(APPLY ? 60 : 50));

  let totSin = 0, totEscritos = 0;
  for (const col of COLECCIONES) {
    let snap;
    try { snap = await db.collection(col).get(); }
    catch (e) { console.log(col.padEnd(32) + '  (error: ' + e.message.slice(0, 30) + ')'); continue; }
    const total = snap.size;
    const sin = snap.docs.filter(d => {
      const v = d.data().proyectoId;
      return v === undefined || v === null || v === '';
    });
    totSin += sin.length;

    let escritos = 0;
    if (APPLY && sin.length) {
      for (let i = 0; i < sin.length; i += 400) {
        const batch = db.batch();
        sin.slice(i, i + 400).forEach(d => batch.update(d.ref, { proyectoId: LEGACY_PROYECTO }));
        await batch.commit();
        escritos += Math.min(400, sin.length - i);
      }
      totEscritos += escritos;
    }
    if (total > 0) {
      console.log(col.padEnd(32) + String(total).padStart(8) + String(sin.length).padStart(10) + (APPLY ? String(escritos).padStart(10) : ''));
    }
  }
  console.log('─'.repeat(APPLY ? 60 : 50));
  console.log(`TOTAL docs sin proyectoId: ${totSin}` + (APPLY ? ` · escritos: ${totEscritos}` : ''));
  if (!APPLY) console.log('\n→ Revisa el conteo. Si está OK, corre de nuevo con --apply para escribir.\n');
  else console.log('\n✅ Backfill completo. Ahora se pueden endurecer las reglas de lectura por proyecto.\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
