// ============================================================================
// GRAPCO — Registro declarativo de áreas y flujos de trabajo
// ----------------------------------------------------------------------------
// Para agregar un flujo nuevo: añade una entrada a FLUJOS. El motor
// (grapco.mjs) se encarga de resolver área, mostrar el plan y ejecutar.
// Cada paso es { titulo, cmd, cwd } — cwd relativo a la raíz del repo.
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// --- Áreas de la plataforma -------------------------------------------------

export const AREAS = {
  produccion: {
    dir: '1. GRAPCO - AREA DE PRODUCCIÓN - VALORIZACIÓN',
    proyecto: 'grapco-demo-2026',
    // Sitio de hosting con URL propia (el ID de proyecto no se puede renombrar)
    sitio: 'grapco-produccion',
    alias: ['p', '1', 'produccion', 'producción', 'valorizacion', 'valorización'],
  },
  planeamiento: {
    dir: '2. GRAPCO - ÁREA DE PLANEAMIENTO',
    proyecto: 'grapco-planeamiento-2026',
    alias: ['pl', '2', 'planeamiento'],
  },
  calidad: {
    dir: '3. GRAPCO - ÁREA DE CALIDAD',
    proyecto: 'grapco-calidad-2026',
    alias: ['c', '3', 'calidad'],
  },
  ssoma: {
    dir: '4. GRAPCO - ÁREA DE SSOMA (SIGMA)',
    proyecto: 'grapco-sigma-2026',
    alias: ['s', '4', 'ssoma', 'sigma'],
  },
};

// Carpeta de secretos (fuera del repo). Puede sobreescribirse con la
// variable de entorno GRAPCO_SECRETS.
export const CARPETA_SECRETS =
  process.env.GRAPCO_SECRETS || join(homedir(), 'GRAPCO_SECRETS');

// --- Utilidades usadas por las definiciones ---------------------------------

export function tieneScript(raiz, area, nombre) {
  try {
    const pkg = JSON.parse(
      readFileSync(join(raiz, area.dir, 'package.json'), 'utf8'),
    );
    return Boolean(pkg.scripts && pkg.scripts[nombre]);
  } catch {
    return false;
  }
}

export function esArea(texto) {
  if (!texto) return false;
  const t = String(texto).toLowerCase();
  return Object.entries(AREAS).some(([nombre, a]) => nombre === t || a.alias.includes(t));
}

export function leerFirebaseJson(raiz, area) {
  try {
    return JSON.parse(readFileSync(join(raiz, area.dir, 'firebase.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Cita argumentos para reconstruir un comando de shell sin perder espacios
function citar(args) {
  return args.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
}

export function rutaServiceAccount(raiz) {
  return join(raiz, AREAS.produccion.dir, 'serviceAccount.json');
}

export function rutaServiceAccountSecrets() {
  return join(CARPETA_SECRETS, 'produccion', 'serviceAccount.json');
}

// --- Flujos -----------------------------------------------------------------
// area: 'requerida'  → exige un área (acepta "todas" si multiArea: true)
//       'produccion' → fijo al área de producción
//       'ninguna'    → no aplica a un área
// pasos(ctx) → lista de { titulo, cmd, cwd } | { titulo, fn } (función JS)
// ctx = { raiz, area, areas, args, opciones }

export const FLUJOS = {
  dev: {
    descripcion: 'Arranca el servidor de desarrollo (vite) de un área',
    area: 'requerida',
    multiArea: false,
    pasos: ({ area }) => [
      { titulo: `Servidor dev — ${area.nombre}`, cmd: 'npm run dev', cwd: area.dir },
    ],
  },

  instalar: {
    descripcion: 'Instala dependencias (npm) de un área o de todas',
    area: 'requerida',
    multiArea: true,
    pasos: ({ raiz, area }) => {
      const pasos = [
        { titulo: `npm install — ${area.nombre}`, cmd: 'npm install', cwd: area.dir },
      ];
      if (area.nombre === 'produccion') {
        for (const sub of ['scripts', 'functions']) {
          if (existsSync(join(raiz, area.dir, sub, 'package.json'))) {
            pasos.push({
              titulo: `npm install — produccion/${sub}`,
              cmd: 'npm install',
              cwd: join(area.dir, sub),
            });
          }
        }
      }
      return pasos;
    },
  },

  build: {
    descripcion: 'Compila el frontend (vite build) de un área o de todas',
    area: 'requerida',
    multiArea: true,
    pasos: ({ area }) => [
      { titulo: `Build — ${area.nombre}`, cmd: 'npm run build', cwd: area.dir },
    ],
  },

  lint: {
    descripcion: 'Corre eslint en un área o en todas (omite las que no lo tienen)',
    area: 'requerida',
    multiArea: true,
    pasos: ({ raiz, area }) => {
      if (!tieneScript(raiz, area, 'lint')) {
        return [{ titulo: `Lint — ${area.nombre} (sin script lint, se omite)`, omitir: true }];
      }
      return [{ titulo: `Lint — ${area.nombre}`, cmd: 'npm run lint', cwd: area.dir }];
    },
  },

  deploy: {
    descripcion:
      'Build + despliegue a Firebase Hosting. Opciones: --reglas, --functions, --todo (solo despliega lo que el área tiene configurado)',
    area: 'requerida',
    multiArea: false,
    opciones: ['reglas', 'functions', 'todo'],
    pasos: ({ raiz, area, opciones }) => {
      const P = `--project ${area.proyecto}`;
      const fb = leerFirebaseJson(raiz, area);
      const pasos = [];
      if (opciones.reglas || opciones.todo) {
        const partes = [];
        if (fb.firestore) partes.push('firestore:rules', 'firestore:indexes');
        if (fb.storage) partes.push('storage');
        if (partes.length) {
          pasos.push({
            titulo: `Reglas e índices — ${area.nombre}`,
            cmd: `firebase deploy ${P} --only ${partes.join(',')}`,
            cwd: area.dir,
          });
        } else if (opciones.reglas) {
          pasos.push({
            titulo: `Reglas — ${area.nombre} no tiene firestore/storage en su firebase.json, se omite`,
            omitir: true,
          });
        }
      }
      if (opciones.functions || opciones.todo) {
        if (fb.functions) {
          pasos.push({
            titulo: `Cloud Functions — ${area.nombre}`,
            cmd: `firebase deploy ${P} --only functions`,
            cwd: area.dir,
          });
        } else if (opciones.functions) {
          pasos.push({
            titulo: `Functions — ${area.nombre} no tiene functions en su firebase.json, se omite`,
            omitir: true,
          });
        }
      }
      pasos.push(
        { titulo: `Build — ${area.nombre}`, cmd: 'npm run build', cwd: area.dir },
        {
          titulo: `Hosting — ${area.nombre} (${area.sitio || area.proyecto})`,
          cmd: `firebase deploy ${P} --only hosting`,
          cwd: area.dir,
        },
      );
      return pasos;
    },
  },

  'test-reglas': {
    descripcion: 'Corre los tests de reglas Firestore en el emulador (producción)',
    area: 'produccion',
    pasos: ({ area }) => [
      { titulo: 'Tests de reglas (emulador)', cmd: 'npm run test:rules', cwd: area.dir },
    ],
  },

  datos: {
    descripcion:
      'Ejecuta un script de datos de producción (scripts/). Sin argumento: lista los disponibles',
    area: 'produccion',
    pasos: ({ area, args }) => {
      const lista = [...args];
      const pasos = [];
      // "grapco datos produccion X" es un error natural: el área aquí es fija
      if (lista.length && esArea(lista[0])) {
        pasos.push({
          titulo: `"${lista[0]}" es un área — datos siempre corre en producción, lo ignoro`,
          omitir: true,
        });
        lista.shift();
      }
      const script = lista[0];
      if (!script) return [{ titulo: 'Listar scripts disponibles', fn: 'listarScriptsDatos' }];
      const interprete = script.endsWith('.py') ? 'python' : 'node';
      const resto = citar(lista.slice(1));
      pasos.push(
        { titulo: 'Verificar serviceAccount.json', fn: 'avisarServiceAccount' },
        {
          titulo: `Script de datos: ${script}`,
          cmd: `${interprete} "${script}"${resto ? ' ' + resto : ''}`,
          cwd: join(area.dir, 'scripts'),
        },
      );
      return pasos;
    },
  },

  secretos: {
    descripcion:
      'Copia serviceAccount.json desde GRAPCO_SECRETS al área de producción (queda gitignored)',
    area: 'ninguna',
    pasos: () => [{ titulo: 'Copiar serviceAccount.json', fn: 'asegurarServiceAccount' }],
  },

  web: {
    descripcion: 'Abre en el navegador la app publicada de un área',
    area: 'requerida',
    multiArea: false,
    pasos: ({ area }) => [
      {
        titulo: `Abrir https://${area.sitio || area.proyecto}.web.app`,
        cmd: `start https://${area.sitio || area.proyecto}.web.app`,
        cwd: '.',
      },
    ],
  },

  ml: {
    descripcion:
      'Dirección de Machine Learning: "exportar" (snapshot del dataset desde Firestore) o "entrenar" (baselines). Ver ml/README.md',
    area: 'produccion',
    pasos: ({ area, args }) => {
      const sub = args[0];
      if (sub === 'exportar') {
        return [
          { titulo: 'Verificar serviceAccount.json', fn: 'asegurarServiceAccount' },
          {
            titulo: 'Exportar snapshot de Firestore → ml/datasets/',
            cmd: `node exportar-dataset-ml.mjs${args[1] ? ' ' + citar(args.slice(1)) : ''}`,
            cwd: join(area.dir, 'scripts'),
          },
        ];
      }
      if (sub === 'entrenar') {
        const resto = citar(args.slice(1));
        return [
          {
            titulo: 'Entrenar baselines (honesto: se niega si hay pocas muestras)',
            cmd: `python entrenar_baseline.py${resto ? ' ' + resto : ''}`,
            cwd: 'ml',
          },
        ];
      }
      return [{ titulo: 'Uso: grapco ml exportar | grapco ml entrenar [args] — lee ml/README.md', omitir: true }];
    },
  },

  doctor: {
    descripcion: 'Diagnostica el entorno: node, firebase-tools, secretos, node_modules, git',
    area: 'ninguna',
    pasos: () => [{ titulo: 'Diagnóstico del entorno', fn: 'doctor' }],
  },
};
