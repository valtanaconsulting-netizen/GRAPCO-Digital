// src/data/seed/seedPTARI.js — Datos seed PTARI para demostración (B25)
//
// Genera un proyecto completo de PTARI Lima Sur para sustentación:
// - 1 proyecto + 3 frentes
// - ~30 actividades del Plan Maestro distribuidas entre frentes
// - 3 hitos de Pull Planning con tareas
// - APUs empresariales reutilizables (5 ejemplos)
//
// Botón en Settings/Admin: "Cargar datos demo PTARI"

import { collection, doc, writeBatch, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { PLANTILLA_HIDRAULICA, aplicarPlantilla } from '../../utils/plantillas/plantillasPlanMaestro';

const SEED_TAG = 'SEED_PTARI_DEMO_2026';

/**
 * Carga datos demo de PTARI. Idempotente — limpia datos seed previos antes.
 */
export async function cargarSeedPTARI({ user, showToast }) {
  try {
    // 1. Limpiar datos seed previos
    await limpiarSeed();

    // 2. Crear proyecto PTARI Demo
    const proyectoData = {
      codigo: 'PTARI-DEMO-2026',
      nombre: 'PTARI Lima Sur (Demo)',
      descripcionCorta: 'Planta de tratamiento de aguas residuales · Capacidad 200 lps',
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
      avancePctActual: 0,
      cpiActual: 1.0,
      spiActual: 1.0,
      color: '#0d9488',
      _seedTag: SEED_TAG,
      creadoEn: serverTimestamp(),
      creadoPor: user?.email || 'demo',
    };
    const proyRef = doc(collection(db, 'Proyectos'));
    const batch1 = writeBatch(db);
    batch1.set(proyRef, proyectoData);

    // 3. Crear 3 frentes
    const FRENTES = [
      { codigo: 'F-NORTE',   nombre: 'Tanque Sedimentación',  responsable: 'Ing. Juan Pérez',    color: '#7c3aed', orden: 1, presupuestoFrente: 4500000 },
      { codigo: 'F-SUR',     nombre: 'Edificio Operaciones',   responsable: 'Ing. María López',   color: '#0d9488', orden: 2, presupuestoFrente: 3000000 },
      { codigo: 'F-CENTRAL', nombre: 'Línea Impulsión',        responsable: 'Ing. Carlos Castro', color: '#f59e0b', orden: 3, presupuestoFrente: 5000000 },
    ];
    const frentesRefs = [];
    for (const f of FRENTES) {
      const fRef = doc(collection(db, 'Frentes'));
      batch1.set(fRef, {
        ...f,
        descripcion: f.nombre + ' del proyecto PTARI',
        proyectoId: proyRef.id,
        avancePctActual: 0,
        activo: true,
        _seedTag: SEED_TAG,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'demo',
      });
      frentesRefs.push({ ref: fRef, codigo: f.codigo });
    }
    await batch1.commit();

    // 4. Cargar plantilla hidráulica distribuida en los frentes
    const todasActs = aplicarPlantilla(PLANTILLA_HIDRAULICA, {
      proyectoId: proyRef.id,
      fechaInicio: '2026-03-01',
      escalaPresupuesto: 1.0,
    });

    // Distribuir actividades entre frentes según código:
    // 02.* → Norte (obras civiles tanque)
    // 03.* → Central (líneas hidráulicas)
    // 04.* → Sur (electromecánico va al edificio)
    // 05.* → Sur (instrumentación)
    // 01.* → Sur (provisionales generales)
    const fNorte   = frentesRefs.find(f => f.codigo === 'F-NORTE').ref.id;
    const fSur     = frentesRefs.find(f => f.codigo === 'F-SUR').ref.id;
    const fCentral = frentesRefs.find(f => f.codigo === 'F-CENTRAL').ref.id;

    const asignarFrente = (a) => {
      const cap = (a.codigo || '').substring(0, 2);
      if (cap === '02') return fNorte;
      if (cap === '03') return fCentral;
      if (cap === '04' || cap === '05' || cap === '01') return fSur;
      return fSur;
    };

    // Insertar actividades en lotes
    let idx = 0;
    for (let i = 0; i < todasActs.length; i += 400) {
      const batch = writeBatch(db);
      todasActs.slice(i, i + 400).forEach(a => {
        const ref = doc(collection(db, 'PlanMaestro'));
        batch.set(ref, {
          ...a,
          frenteId: asignarFrente(a),
          _seedTag: SEED_TAG,
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'demo',
        });
        idx++;
      });
      await batch.commit();
    }

    // 5. APUs empresariales
    const APUS = [
      {
        codigo: 'AP-CONC-280',
        descripcion: 'Concreto premezclado f\'c=280 kg/cm² · Vaciado y curado',
        unidad: 'm3',
        rendimientoTeorico: 1.2,
        scope: 'empresa',
        materiales: [
          { codigo: 'CEM', descripcion: 'Cemento Portland tipo I', unidad: 'bls', cantidad: 9.5, precio: 28 },
          { codigo: 'AGF', descripcion: 'Agregado fino', unidad: 'm3', cantidad: 0.45, precio: 45 },
          { codigo: 'AGG', descripcion: 'Agregado grueso', unidad: 'm3', cantidad: 0.85, precio: 50 },
          { codigo: 'AGU', descripcion: 'Agua', unidad: 'm3', cantidad: 0.18, precio: 8 },
        ],
        manoObra: [
          { categoria: 'capataz', cantidad: 0.1, salarioBase: 3500 },
          { categoria: 'operario', cantidad: 1, salarioBase: 2800 },
          { categoria: 'oficial', cantidad: 1, salarioBase: 2200 },
          { categoria: 'ayudante', cantidad: 6, salarioBase: 1700 },
        ],
        equipos: [
          { codigo: 'VIB', descripcion: 'Vibrador de concreto', cantidad: 1, costoHora: 15 },
        ],
      },
      {
        codigo: 'AP-ACR-001',
        descripcion: 'Acero de refuerzo Grado 60 · Habilitado y colocado',
        unidad: 'kg',
        rendimientoTeorico: 0.025,
        scope: 'empresa',
        materiales: [
          { codigo: 'FE', descripcion: 'Acero corrugado fy=4200', unidad: 'kg', cantidad: 1.05, precio: 4.0 },
          { codigo: 'ALA', descripcion: 'Alambre #16', unidad: 'kg', cantidad: 0.03, precio: 6.5 },
        ],
        manoObra: [
          { categoria: 'operario', cantidad: 1, salarioBase: 2800 },
          { categoria: 'oficial', cantidad: 1, salarioBase: 2200 },
        ],
      },
      {
        codigo: 'AP-EXC-MS',
        descripcion: 'Excavación en material suelto · Maquinaria',
        unidad: 'm3',
        rendimientoTeorico: 0.1,
        scope: 'empresa',
        manoObra: [
          { categoria: 'operario', cantidad: 1, salarioBase: 2800 },
          { categoria: 'ayudante', cantidad: 2, salarioBase: 1700 },
        ],
        equipos: [
          { codigo: 'EXC', descripcion: 'Excavadora hidráulica', cantidad: 1, costoHora: 180 },
        ],
      },
      {
        codigo: 'AP-MUR-KK',
        descripcion: 'Muro de ladrillo King Kong · Soga',
        unidad: 'm2',
        rendimientoTeorico: 1.5,
        scope: 'empresa',
        materiales: [
          { codigo: 'LAD', descripcion: 'Ladrillo KK 18 huecos', unidad: 'und', cantidad: 39, precio: 1.20 },
          { codigo: 'CEM', descripcion: 'Cemento', unidad: 'bls', cantidad: 0.25, precio: 28 },
          { codigo: 'AGF', descripcion: 'Arena gruesa', unidad: 'm3', cantidad: 0.025, precio: 45 },
        ],
        manoObra: [
          { categoria: 'operario', cantidad: 1, salarioBase: 2800 },
          { categoria: 'ayudante', cantidad: 1, salarioBase: 1700 },
        ],
      },
      {
        codigo: 'AP-TUB-HD200',
        descripcion: 'Suministro e instalación tubería HDPE 200mm',
        unidad: 'ml',
        rendimientoTeorico: 0.4,
        scope: 'empresa',
        materiales: [
          { codigo: 'HDPE200', descripcion: 'Tubería HDPE 200mm', unidad: 'ml', cantidad: 1.02, precio: 125 },
          { codigo: 'ACC', descripcion: 'Accesorios y soldadura', unidad: 'glb', cantidad: 0.05, precio: 80 },
        ],
        manoObra: [
          { categoria: 'operario', cantidad: 1, salarioBase: 2800 },
          { categoria: 'oficial', cantidad: 1, salarioBase: 2200 },
          { categoria: 'ayudante', cantidad: 2, salarioBase: 1700 },
        ],
      },
    ];

    const batchAPUs = writeBatch(db);
    APUS.forEach(apu => {
      const ref = doc(collection(db, 'APUs'));
      batchAPUs.set(ref, {
        ...apu,
        _seedTag: SEED_TAG,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'demo',
      });
    });
    await batchAPUs.commit();

    // 6. Pull Planning - 3 hitos con tareas
    const HITOS = [
      {
        nombre: 'Fin de obras civiles - Tanque',
        tipo: 'fase',
        fechaHito: new Date('2026-07-15'),
        responsable: 'Ing. Juan Pérez',
        tareas: [
          { nombre: 'Vaciado losa de fondo', diasAntes: 90, duracion: 7, responsable: 'GRAPCO' },
          { nombre: 'Vaciado muros perimetrales', diasAntes: 60, duracion: 14, responsable: 'GRAPCO' },
          { nombre: 'Impermeabilización interior', diasAntes: 30, duracion: 10, responsable: 'Subcon. Impermeabilizaciones SAC' },
          { nombre: 'Pruebas de hermeticidad', diasAntes: 7, duracion: 5, responsable: 'Calidad GRAPCO' },
        ],
      },
      {
        nombre: 'Línea de impulsión completa',
        tipo: 'fase',
        fechaHito: new Date('2026-09-30'),
        responsable: 'Ing. Carlos Castro',
        tareas: [
          { nombre: 'Excavación de zanjas', diasAntes: 75, duracion: 14, responsable: 'GRAPCO' },
          { nombre: 'Suministro tubería HDPE', diasAntes: 60, duracion: 1, responsable: 'Logística' },
          { nombre: 'Instalación tubería', diasAntes: 45, duracion: 21, responsable: 'GRAPCO + Subcon' },
          { nombre: 'Pruebas hidráulicas', diasAntes: 14, duracion: 5, responsable: 'Calidad' },
          { nombre: 'Tapado y compactación', diasAntes: 7, duracion: 4, responsable: 'GRAPCO' },
        ],
      },
      {
        nombre: 'Recepción final del cliente',
        tipo: 'contractual',
        fechaHito: new Date('2026-12-15'),
        responsable: 'Ing. Residente Principal',
        tareas: [
          { nombre: 'Pruebas de funcionamiento integrado', diasAntes: 30, duracion: 14, responsable: 'GRAPCO + SEDAPAL' },
          { nombre: 'Documentación as-built', diasAntes: 21, duracion: 14, responsable: 'Oficina técnica' },
          { nombre: 'Capacitación al personal del cliente', diasAntes: 14, duracion: 5, responsable: 'GRAPCO + Proveedores' },
          { nombre: 'Levantamiento observaciones', diasAntes: 7, duracion: 5, responsable: 'GRAPCO' },
          { nombre: 'Acta de recepción', diasAntes: 0, duracion: 1, responsable: 'Gerencia' },
        ],
      },
    ];

    const COL_TAREAS = ['#1e3a5f', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626'];
    const batchPull = writeBatch(db);

    for (const h of HITOS) {
      const hRef = doc(collection(db, 'PullPlanningHitos'));
      batchPull.set(hRef, {
        nombre: h.nombre,
        descripcion: '',
        tipo: h.tipo,
        fechaHito: h.fechaHito,
        proyectoId: proyRef.id,
        frenteId: null,
        responsable: h.responsable,
        cumplido: false,
        _seedTag: SEED_TAG,
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'demo',
      });

      h.tareas.forEach((t, j) => {
        const tRef = doc(collection(db, 'PullPlanningTareas'));
        batchPull.set(tRef, {
          nombre: t.nombre,
          descripcion: '',
          hitoId: hRef.id,
          proyectoId: proyRef.id,
          diasAntesDelHito: t.diasAntes,
          duracionDias: t.duracion,
          responsableEmpresa: t.responsable,
          color: COL_TAREAS[j % COL_TAREAS.length],
          completada: false,
          _seedTag: SEED_TAG,
          creadoEn: serverTimestamp(),
          creadoPor: user?.email || 'demo',
        });
      });
    }
    await batchPull.commit();

    showToast?.(`✅ Seed PTARI cargado: 1 proyecto · 3 frentes · ${todasActs.length} actividades · 5 APUs · 3 hitos`, 'success');
    return { ok: true, proyectoId: proyRef.id };
  } catch (e) {
    console.error('[Seed]', e);
    showToast?.('Error cargando seed: ' + e.message, 'error');
    return { ok: false, error: e.message };
  }
}

/**
 * Limpia TODOS los datos seed previos (idempotente).
 */
export async function limpiarSeed() {
  const colecciones = ['Proyectos', 'Frentes', 'PlanMaestro', 'APUs', 'PullPlanningHitos', 'PullPlanningTareas'];
  for (const col of colecciones) {
    try {
      const q = query(collection(db, col), where('_seedTag', '==', SEED_TAG));
      const snap = await getDocs(q);
      if (snap.size === 0) continue;
      // Eliminar en lotes
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn(`[limpiarSeed] ${col}:`, e);
    }
  }
}
