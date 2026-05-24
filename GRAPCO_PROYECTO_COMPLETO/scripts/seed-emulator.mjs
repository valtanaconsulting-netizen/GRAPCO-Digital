// scripts/seed-emulator.mjs
// Siembra el Firestore Emulator local con datos demo para GRAPCO.
// Uso: node scripts/seed-emulator.mjs
// Requiere: emulator corriendo (firebase emulators:start) + JDK 21.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Apuntar a los emulators (las env vars hacen que el admin SDK omita rules)
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
process.env.GCLOUD_PROJECT = 'demo-grapco';

admin.initializeApp({ projectId: 'demo-grapco' });
const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

const SEED_TAG = 'SEED_PTARI_DEMO_2026';

// ── Helper para crear users en Auth emulator ──
async function ensureUser(email, password, displayName) {
  try {
    const u = await auth.getUserByEmail(email);
    return u;
  } catch {
    return auth.createUser({ email, password, displayName });
  }
}

// ── 1. Crear usuario admin ──
async function crearUsuarioAdmin() {
  const user = await ensureUser('admin@grapco.pe', 'admin12345', 'Admin GRAPCO');
  await db.collection('Usuarios').doc(user.uid).set({
    email: 'admin@grapco.pe',
    nombre: 'Admin GRAPCO',
    rol: 'admin',
    activo: true,
    creadoEn: FieldValue.serverTimestamp(),
    ultimoLogin: FieldValue.serverTimestamp(),
  });
  // NO creamos Bootstrap/done: dejamos abierto el self-bootstrap para que
  // usuarios anónimos (bypass) puedan auto-asignarse rol=admin localmente.
  console.log(`✔ Admin: admin@grapco.pe / admin12345 (uid=${user.uid})`);
  return user;
}

// ── 2. Proyecto + Frentes ──
async function crearProyecto(adminEmail) {
  const proyectoData = {
    codigo: 'PTARI-DEMO-2026',
    nombre: 'PTARI Lima Sur (Demo)',
    descripcionCorta: 'Planta de tratamiento de aguas residuales · 200 lps',
    cliente: 'SEDAPAL',
    tipoObra: 'hidraulica',
    ubicacion: { lat: -12.2196, lng: -76.9319, ciudad: 'Lima Sur', region: 'Lima', direccion: 'Villa El Salvador' },
    presupuestoContractual: 12500000,
    moneda: 'PEN',
    fechaInicioContractual: new Date('2026-03-01'),
    fechaFinContractual: new Date('2026-12-31'),
    plazoDias: 305,
    margenMetaPct: 15,
    estado: 'en_ejecucion',
    avancePctActual: 32,
    cpiActual: 0.95,
    spiActual: 1.02,
    color: '#0d9488',
    _seedTag: SEED_TAG,
    creadoEn: FieldValue.serverTimestamp(),
    creadoPor: adminEmail,
  };
  const proyRef = db.collection('Proyectos').doc();
  await proyRef.set(proyectoData);

  const FRENTES = [
    { codigo: 'F-01', nombre: 'PTARI 5',                  responsable: 'Ing. Juan Pérez',    color: '#7c3aed', orden: 1, presupuestoFrente: 4500000 },
    { codigo: 'F-02', nombre: 'Edificio Operaciones',     responsable: 'Ing. María López',   color: '#0d9488', orden: 2, presupuestoFrente: 3000000 },
    { codigo: 'F-03', nombre: 'Línea Impulsión',          responsable: 'Ing. Carlos Castro', color: '#f59e0b', orden: 3, presupuestoFrente: 5000000 },
  ];
  const frentes = [];
  for (const f of FRENTES) {
    const fRef = db.collection('Frentes').doc();
    await fRef.set({
      ...f,
      descripcion: f.nombre + ' del proyecto PTARI',
      proyectoId: proyRef.id,
      avancePctActual: 30 + Math.floor(Math.random() * 20),
      activo: true,
      _seedTag: SEED_TAG,
      creadoEn: FieldValue.serverTimestamp(),
      creadoPor: adminEmail,
    });
    frentes.push({ id: fRef.id, ...f });
  }
  console.log(`✔ Proyecto: ${proyectoData.nombre} con ${frentes.length} frentes`);
  return { proyectoId: proyRef.id, frentes };
}

// ── 3. Plan Maestro (actividades) ──
const PARTIDAS = [
  { codigo: '01.01.001', desc: 'Cartel de obra',                    unidad: 'und', metradoContractual: 1,   precioUnitario: 850 },
  { codigo: '01.01.002', desc: 'Caseta y almacén',                  unidad: 'm2',  metradoContractual: 40,  precioUnitario: 180 },
  { codigo: '01.01.003', desc: 'TRABAJOS PRELIMINARES - TRAZO Y REPLANTEO TOPOGRAFICO', unidad: 'MES', metradoContractual: 6,   precioUnitario: 280 },
  { codigo: '01.01.004', desc: 'TRABAJOS PRELIMINARES - ACARREO HORIZONTAL Y VERTICAL', unidad: 'MES', metradoContractual: 6,   precioUnitario: 180 },
  { codigo: '01.01.005', desc: 'OBRAS PROVISIONALES - LIMPIEZA Y AMOLADO EN METÁLICOS', unidad: 'M2',  metradoContractual: 320, precioUnitario: 0.53 },
  { codigo: '02.01.001', desc: 'Excavación masiva',                 unidad: 'm3',  metradoContractual: 3500, precioUnitario: 18 },
  { codigo: '02.01.002', desc: 'Excavación de zanjas',              unidad: 'm3',  metradoContractual: 1200, precioUnitario: 24 },
  { codigo: '02.01.003', desc: 'Relleno compactado',                unidad: 'm3',  metradoContractual: 1800, precioUnitario: 28 },
  { codigo: '02.02.001', desc: 'CONCRETO F\'C= 350 KG/CM2 EN LOSA DE FONDO', unidad: 'M3', metradoContractual: 180, precioUnitario: 1000 },
  { codigo: '02.02.002', desc: 'Concreto en muros f\'c=280',        unidad: 'm3',  metradoContractual: 240, precioUnitario: 620 },
  { codigo: '02.02.003', desc: 'Acero estructural fy=4200',         unidad: 'kg',  metradoContractual: 28000, precioUnitario: 4.8 },
  { codigo: '02.02.004', desc: 'Encofrado de muros',                unidad: 'm2',  metradoContractual: 1200, precioUnitario: 58 },
  { codigo: '02.02.005', desc: 'Impermeabilización',                unidad: 'm2',  metradoContractual: 800, precioUnitario: 75 },
  { codigo: '03.01.001', desc: 'Tubería HDPE 200mm',                unidad: 'ml',  metradoContractual: 850, precioUnitario: 145 },
  { codigo: '03.01.002', desc: 'Accesorios y válvulas',             unidad: 'und', metradoContractual: 24,  precioUnitario: 480 },
  { codigo: '04.01.001', desc: 'Salida para alumbrado',             unidad: 'pto', metradoContractual: 80,  precioUnitario: 95 },
  { codigo: '04.01.002', desc: 'Salida para tomacorriente',         unidad: 'pto', metradoContractual: 120, precioUnitario: 95 },
  { codigo: '05.01.001', desc: 'Tubería PVC SAP 1/2"',              unidad: 'ml',  metradoContractual: 280, precioUnitario: 28 },
];

async function crearPlanMaestro(proyectoId, frentes, adminEmail) {
  const frenteId = (cap) => {
    if (cap === '02') return frentes[0].id; // Norte = Tanque
    if (cap === '03') return frentes[2].id; // Central = Línea
    return frentes[1].id;                    // Sur = resto
  };

  for (let i = 0; i < PARTIDAS.length; i++) {
    const p = PARTIDAS[i];
    const cap = (p.codigo || '').substring(0, 2);
    const ref = db.collection('PlanMaestro').doc();
    await ref.set({
      codigo: p.codigo,
      descripcion: p.desc,
      unidad: p.unidad,
      metradoContractual: p.metradoContractual,
      metradoEjecutado: Math.floor(p.metradoContractual * (0.2 + Math.random() * 0.5)),
      precioUnitario: p.precioUnitario,
      hhTotalPresupuestado: Math.round(p.metradoContractual * 1.5 * 10) / 10,
      rendimientoTeorico: 1.5,
      proyectoId,
      frenteId: frenteId(cap),
      _seedTag: SEED_TAG,
      creadoEn: FieldValue.serverTimestamp(),
      creadoPor: adminEmail,
    });
  }
  console.log(`✔ Plan Maestro: ${PARTIDAS.length} partidas`);
}

// ── 4. Cuadrillas y Personal ──
async function crearCuadrillas(proyectoId, adminEmail) {
  const cuadrillas = [
    { capataz: 'Juan Pérez',    miembros: [
      { nombre: 'Pedro Castro',   categoria: 'operario' },
      { nombre: 'Luis Ramírez',   categoria: 'oficial'  },
      { nombre: 'Mario Quispe',   categoria: 'ayudante' },
      { nombre: 'Antonio Vargas', categoria: 'ayudante' },
    ]},
    { capataz: 'María López',   miembros: [
      { nombre: 'Rosa Mendoza',  categoria: 'operario' },
      { nombre: 'Carlos Soto',   categoria: 'oficial'  },
      { nombre: 'Jorge Salas',   categoria: 'ayudante' },
    ]},
    { capataz: 'Carlos Castro', miembros: [
      { nombre: 'Hugo Pacheco',  categoria: 'operario' },
      { nombre: 'Diego Flores',  categoria: 'oficial'  },
      { nombre: 'Marco Aliaga',  categoria: 'ayudante' },
      { nombre: 'Felix Yauri',   categoria: 'ayudante' },
    ]},
  ];
  for (const c of cuadrillas) {
    const ref = db.collection('Cuadrillas').doc();
    await ref.set({
      capataz: c.capataz,
      miembros: c.miembros,
      proyectoId,
      activo: true,
      _seedTag: SEED_TAG,
      creadoEn: FieldValue.serverTimestamp(),
    });
    for (const m of c.miembros) {
      const pref = db.collection('Personal').doc();
      await pref.set({
        nombre: m.nombre,
        categoria: m.categoria,
        capataz: c.capataz,
        proyectoId,
        activo: true,
        _seedTag: SEED_TAG,
        creadoEn: FieldValue.serverTimestamp(),
      });
    }
  }
  console.log(`✔ Cuadrillas: ${cuadrillas.length} con personal asignado`);
}

// ── 5. Registros_Campo (datos del dashboard) ──
async function crearRegistros(proyectoId, frentes, adminEmail) {
  const capataces = ['Juan Pérez', 'María López', 'Carlos Castro'];
  const HOY = new Date();
  let count = 0;

  // Genera ~150 registros en las últimas 25 semanas (hasta hoy)
  for (let semanas = 25; semanas >= 0; semanas--) {
    const diaSemana = new Date(HOY);
    diaSemana.setDate(diaSemana.getDate() - (semanas * 7));
    // 5-8 registros por semana
    const N = 5 + Math.floor(Math.random() * 4);
    for (let r = 0; r < N; r++) {
      const dia = new Date(diaSemana);
      dia.setDate(diaSemana.getDate() + Math.floor(Math.random() * 6));
      const fecha = dia.toISOString().slice(0, 10);
      const p = PARTIDAS[Math.floor(Math.random() * PARTIDAS.length)];
      const cap = capataces[Math.floor(Math.random() * capataces.length)];
      const frente = frentes[Math.floor(Math.random() * frentes.length)];
      const hn = 4 + Math.floor(Math.random() * 12);
      const he = Math.floor(Math.random() * 3);
      const cantPersonas = 3 + Math.floor(Math.random() * 4);
      const metrado = Math.round((p.metradoContractual / 30) * Math.random() * 10) / 10;
      const ipReal = metrado > 0 ? (hn + he) / metrado : 0;
      const ipMeta = 1.5;
      const cpi = ipMeta > 0 && ipReal > 0 ? Math.min(2, ipMeta / ipReal) : 1;

      const detalleTareo = [];
      for (let j = 0; j < cantPersonas; j++) {
        detalleTareo.push({
          nombre: `Operario ${j + 1}`,
          hn: Math.round((hn / cantPersonas) * 10) / 10,
          he: j === 0 ? he : 0,
        });
      }

      const ref = db.collection('Registros_Campo').doc();
      await ref.set({
        fecha,
        semana: `S${Math.max(1, 25 - semanas)}`,
        partida: p.codigo + ' ' + p.desc.substring(0, 30),
        actividad: p.desc,
        unidad: p.unidad,
        metrado,
        hn,
        he,
        totalHH: hn + he,
        ipReal,
        ipMeta,
        cpi,
        capataz: cap,
        proyectoId,
        frenteId: frente.id,
        detalleTareo,
        fuente: Math.random() > 0.5 ? 'campo' : 'oficina',
        creadoPor: adminEmail,
        timestamp: FieldValue.serverTimestamp(),
        _seedTag: SEED_TAG,
      });
      count++;
    }
  }
  console.log(`✔ Registros_Campo: ${count} registros en 25 semanas`);
}

// ── 6. APUs ──
async function crearAPUs(adminEmail) {
  const APUS = [
    { codigo: 'AP-CONC-280', descripcion: 'Concreto f\'c=280 kg/cm²', unidad: 'm3', scope: 'empresa' },
    { codigo: 'AP-ACR-001',  descripcion: 'Acero Grado 60',           unidad: 'kg', scope: 'empresa' },
    { codigo: 'AP-EXC-MS',   descripcion: 'Excavación material suelto', unidad: 'm3', scope: 'empresa' },
    { codigo: 'AP-MUR-KK',   descripcion: 'Muro ladrillo KK soga',    unidad: 'm2', scope: 'empresa' },
    { codigo: 'AP-TUB-HD200',descripcion: 'Tubería HDPE 200mm',       unidad: 'ml', scope: 'empresa' },
  ];
  for (const a of APUS) {
    const ref = db.collection('APUs').doc();
    await ref.set({
      ...a,
      rendimientoTeorico: 1.2,
      _seedTag: SEED_TAG,
      creadoEn: FieldValue.serverTimestamp(),
      creadoPor: adminEmail,
    });
  }
  console.log(`✔ APUs: ${APUS.length} insumos`);
}

// ── 7. Configuración ──
async function crearConfig() {
  await db.collection('Configuracion').doc('global').set({
    tarifaHoraOperario: 12.5,
    tarifaHoraOficial:  10.0,
    tarifaHoraAyudante:  8.0,
    tarifaHoraCapataz:  16.0,
    margenMetaPct: 15,
    moneda: 'PEN',
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  console.log('✔ Configuración global');
}

// ── MAIN ──
(async () => {
  try {
    console.log('[seed] Conectado a Firestore emulator en 127.0.0.1:8080');
    const adminUser = await crearUsuarioAdmin();
    const adminEmail = adminUser.email;
    await crearConfig();
    await crearAPUs(adminEmail);
    const { proyectoId, frentes } = await crearProyecto(adminEmail);
    await crearPlanMaestro(proyectoId, frentes, adminEmail);
    await crearCuadrillas(proyectoId, adminEmail);
    await crearRegistros(proyectoId, frentes, adminEmail);
    console.log('\n✅ Seed completo. Login: admin@grapco.pe / admin12345');
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed falló:', e);
    process.exit(1);
  }
})();
