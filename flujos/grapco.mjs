#!/usr/bin/env node
// ============================================================================
// GRAPCO — Motor de flujos de trabajo
// ----------------------------------------------------------------------------
// Uso:   node flujos/grapco.mjs <flujo> [area] [args...] [--dry]
//        (o el atajo .\grapco desde la raíz del repo)
//
// Los flujos y áreas se definen en flujos.config.mjs — este archivo solo
// resuelve, muestra el plan y ejecuta. Cero dependencias externas.
// ============================================================================

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AREAS,
  CARPETA_SECRETS,
  FLUJOS,
  rutaServiceAccount,
  rutaServiceAccountSecrets,
} from './flujos.config.mjs';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

// --- Presentación -----------------------------------------------------------

const c = {
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
  rojo: (s) => `\x1b[31m${s}\x1b[0m`,
  amarillo: (s) => `\x1b[33m${s}\x1b[0m`,
  cian: (s) => `\x1b[36m${s}\x1b[0m`,
  negrita: (s) => `\x1b[1m${s}\x1b[0m`,
};

function ayuda() {
  console.log(`\n${c.negrita('GRAPCO — flujos de trabajo')}\n`);
  console.log(`  Uso: ${c.cian('grapco <flujo> [area] [args...] [--dry]')}\n`);
  console.log(c.negrita('  Flujos:'));
  const ancho = Math.max(...Object.keys(FLUJOS).map((n) => n.length));
  for (const [nombre, f] of Object.entries(FLUJOS)) {
    console.log(`    ${c.cian(nombre.padEnd(ancho + 2))}${f.descripcion}`);
  }
  console.log(`\n${c.negrita('  Áreas:')} ${Object.keys(AREAS).join(', ')}` +
    `  ${c.gris('(alias: p, pl, c, s, 1-4; "todas" solo en instalar, build y lint)')}`);
  console.log(`\n  Ejemplos:
    grapco dev produccion          ${c.gris('# servidor local del área de producción')}
    grapco build todas             ${c.gris('# compila las 4 apps')}
    grapco deploy calidad          ${c.gris('# build + hosting de calidad')}
    grapco deploy produccion --todo ${c.gris('# reglas + functions + hosting')}
    grapco datos seed-emulator.mjs ${c.gris('# corre un script de datos')}
    grapco doctor                  ${c.gris('# revisa el entorno')}\n`);
}

// --- Resolución de área -----------------------------------------------------

function resolverArea(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  for (const [nombre, a] of Object.entries(AREAS)) {
    if (nombre === t || a.alias.includes(t)) return { nombre, ...a };
  }
  return null;
}

// --- Funciones integradas (pasos fn:) ----------------------------------------

const FUNCIONES = {
  listarScriptsDatos() {
    const dir = join(RAIZ, AREAS.produccion.dir, 'scripts');
    const scripts = readdirSync(dir).filter((f) => /\.(mjs|cjs|js|py)$/.test(f));
    console.log(`\n  Scripts disponibles en ${c.gris('produccion/scripts/')}:\n`);
    for (const s of scripts) console.log(`    ${c.cian(s)}`);
    console.log(`\n  Corre uno con: ${c.cian('grapco datos <nombre> [args]')}`);
    console.log(`  Detalles de cada uno: ${c.gris('produccion/scripts/README.md')}\n`);
    return true;
  },

  asegurarServiceAccount() {
    const destino = rutaServiceAccount(RAIZ);
    if (existsSync(destino)) {
      console.log(`  ${c.verde('✓')} serviceAccount.json ya está en el área de producción`);
      return true;
    }
    const origen = rutaServiceAccountSecrets();
    if (!existsSync(origen)) {
      console.log(`  ${c.rojo('✗')} No encuentro ${origen}`);
      console.log(`    Coloca el serviceAccount.json en esa ruta o define GRAPCO_SECRETS.`);
      return false;
    }
    // Nunca copiar si git no lo ignora de verdad (pregunta a git, no al texto)
    const rel = `${AREAS.produccion.dir}/serviceAccount.json`;
    const chk = spawnSync(`git check-ignore -q -- "${rel}"`, { shell: true, cwd: RAIZ });
    if (chk.status !== 0) {
      console.log(`  ${c.rojo('✗')} git NO está ignorando ${rel}.`);
      console.log(`    Por seguridad no lo copio: agrégalo al .gitignore primero.`);
      return false;
    }
    copyFileSync(origen, destino);
    console.log(`  ${c.verde('✓')} serviceAccount.json copiado desde GRAPCO_SECRETS (gitignored)`);
    return true;
  },

  avisarServiceAccount() {
    if (existsSync(rutaServiceAccount(RAIZ))) {
      console.log(`  ${c.verde('✓')} serviceAccount.json presente en el área de producción`);
      return true;
    }
    console.log(`  ${c.amarillo('!')} No hay serviceAccount.json en el área de producción.`);
    console.log(`    Si el script lo necesita va a fallar; consíguelo con: ${c.cian('grapco secretos')}`);
    console.log(`    (los scripts de emulador, como seed-emulator.mjs, no lo necesitan)`);
    return true;
  },

  doctor() {
    let ok = true;
    const linea = (bien, texto, extra = '') => {
      const icono = bien === true ? c.verde('✓') : bien === 'warn' ? c.amarillo('!') : c.rojo('✗');
      console.log(`  ${icono} ${texto}${extra ? c.gris(` — ${extra}`) : ''}`);
      if (bien === false) ok = false;
    };
    const version = (cmd) => {
      const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
      return r.status === 0 ? r.stdout.trim().split('\n')[0] : null;
    };

    console.log(`\n${c.negrita('  Entorno')}`);
    const nodeV = version('node --version');
    linea(Boolean(nodeV), 'Node.js', nodeV || 'no encontrado');
    const fbV = version('firebase --version');
    linea(Boolean(fbV), 'firebase-tools', fbV || 'no instalado (npm i -g firebase-tools)');
    const gitV = version('git --version');
    linea(Boolean(gitV), 'git', gitV || 'no encontrado');

    console.log(`\n${c.negrita('  Secretos')}`);
    linea(existsSync(CARPETA_SECRETS), `Carpeta de secretos`, CARPETA_SECRETS);
    const saSecrets = existsSync(rutaServiceAccountSecrets());
    linea(saSecrets ? true : 'warn', 'serviceAccount.json en GRAPCO_SECRETS/produccion',
      saSecrets ? '' : 'no está — los scripts de datos lo necesitan');
    const saApp = existsSync(rutaServiceAccount(RAIZ));
    linea(saApp ? true : 'warn', 'serviceAccount.json en el área de producción',
      saApp ? '' : 'córrelo con: grapco secretos');

    console.log(`\n${c.negrita('  Dependencias (node_modules)')}`);
    for (const [nombre, a] of Object.entries(AREAS)) {
      const tiene = existsSync(join(RAIZ, a.dir, 'node_modules'));
      linea(tiene ? true : 'warn', nombre, tiene ? '' : `falta — grapco instalar ${nombre}`);
    }
    for (const sub of ['scripts', 'functions']) {
      const base = join(RAIZ, AREAS.produccion.dir, sub);
      if (existsSync(join(base, 'package.json'))) {
        const tiene = existsSync(join(base, 'node_modules'));
        linea(tiene ? true : 'warn', `produccion/${sub}`, tiene ? '' : 'falta npm install');
      }
    }

    console.log(`\n${c.negrita('  Repositorio')}`);
    const st = spawnSync('git status --short', { shell: true, cwd: RAIZ, encoding: 'utf8' });
    if (st.status === 0) {
      const cambios = st.stdout.trim() ? st.stdout.trim().split('\n').length : 0;
      linea(true, 'git status', cambios ? `${cambios} archivo(s) con cambios sin commit` : 'limpio');
    } else {
      linea('warn', 'git status', 'no se pudo leer');
    }
    console.log('');
    return ok;
  },
};

// --- Ejecución de pasos -------------------------------------------------------

function ejecutarPasos(pasos, dry) {
  for (const paso of pasos) {
    if (paso.omitir) {
      console.log(`\n${c.amarillo('↷')} ${paso.titulo}`);
      continue;
    }
    console.log(`\n${c.cian('▶')} ${c.negrita(paso.titulo)}`);
    if (paso.fn) {
      if (dry) { console.log(c.gris(`  [dry] función interna: ${paso.fn}`)); continue; }
      if (!FUNCIONES[paso.fn]()) return false;
      continue;
    }
    console.log(c.gris(`  $ ${paso.cmd}   (en ${paso.cwd})`));
    if (dry) continue;
    const inicio = Date.now();
    const r = spawnSync(paso.cmd, {
      shell: true,
      stdio: 'inherit',
      cwd: join(RAIZ, paso.cwd),
    });
    const seg = ((Date.now() - inicio) / 1000).toFixed(1);
    if (r.status !== 0) {
      console.log(`\n${c.rojo('✗')} Falló "${paso.titulo}" (${seg}s). Flujo detenido.`);
      return false;
    }
    console.log(`${c.verde('✓')} ${paso.titulo} ${c.gris(`(${seg}s)`)}`);
  }
  return true;
}

// --- Principal ----------------------------------------------------------------

function principal() {
  const crudos = process.argv.slice(2);
  const dry = crudos.includes('--dry');
  const argv = crudos.filter((a) => a !== '--dry');

  const nombreFlujo = argv.shift();
  if (!nombreFlujo || nombreFlujo === 'ayuda' || nombreFlujo === 'help') {
    ayuda();
    return 0;
  }
  const flujo = Object.hasOwn(FLUJOS, nombreFlujo) ? FLUJOS[nombreFlujo] : undefined;
  if (!flujo) {
    console.log(`${c.rojo('✗')} Flujo desconocido: "${nombreFlujo}". Corre ${c.cian('grapco')} para ver la lista.`);
    return 1;
  }

  // Solo se interpretan --dry (global) y las opciones que el flujo declara;
  // cualquier otro --flag viaja intacto como argumento (p. ej. para scripts de datos).
  const validas = new Set(flujo.opciones || []);
  const opciones = {};
  const posicionales = [];
  for (const a of argv) {
    if (a.startsWith('--') && validas.has(a.slice(2))) opciones[a.slice(2)] = true;
    else posicionales.push(a);
  }

  // Resolver área(s) según lo que pida el flujo
  let areas = [null];
  if (flujo.area === 'produccion') {
    areas = [{ nombre: 'produccion', ...AREAS.produccion }];
  } else if (flujo.area === 'requerida') {
    const texto = posicionales.shift();
    if (texto && texto.toLowerCase() === 'todas') {
      if (!flujo.multiArea) {
        console.log(`${c.rojo('✗')} El flujo "${nombreFlujo}" se corre de a un área por vez.`);
        return 1;
      }
      areas = Object.entries(AREAS).map(([nombre, a]) => ({ nombre, ...a }));
    } else {
      const area = resolverArea(texto);
      if (!area) {
        const motivo = texto ? `Área desconocida: "${texto}".` : 'Indica el área:';
        console.log(`${c.rojo('✗')} ${motivo} Válidas: ${Object.keys(AREAS).join(', ')}` +
          (flujo.multiArea ? ' o "todas"' : ''));
        return 1;
      }
      areas = [area];
    }
  }

  if (dry) console.log(c.amarillo('\n— Modo dry: muestro el plan sin ejecutar —'));

  const inicio = Date.now();
  for (const area of areas) {
    const pasos = flujo.pasos({ raiz: RAIZ, area, areas: AREAS, args: posicionales, opciones });
    if (!ejecutarPasos(pasos, dry)) return 1;
  }
  const seg = ((Date.now() - inicio) / 1000).toFixed(1);
  if (!dry) console.log(`\n${c.verde('✓ Flujo completo')} ${c.gris(`(${seg}s)`)}\n`);
  else console.log('');
  return 0;
}

process.exit(principal());
