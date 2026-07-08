// src/utils/bimPropsStore.js — Store de parámetros TOTALES del modelo BIM.
//
// Carga el JSON columnar que genera la Cloud Function apsExtraerPropiedades
// (TODOS los parámetros de TODOS los elementos, con categorías/tipos reales de
// la jerarquía Revit y quantities en métrico verificado) y lo expone con
// índices en memoria. Reemplaza a la extracción de 4 propiedades del visor
// (bimQuantities.js queda como fallback si la función no responde).

import { callFunction } from './functionsClient';

const PROPS_CACHE = new Map();  // urn → store (vive mientras la SPA esté abierta)

const consultar = (urn, force = false) =>
  callFunction('apsExtraerPropiedades', { urn, ...(force ? { force: true } : {}) }, 'POST', { timeout: 5 * 60_000 });

/**
 * Carga (o recupera del caché) el store de propiedades de un URN.
 * Hace polling mientras APS prepara el JSON (status 'procesando'), igual que
 * la traducción SVF2. onEstado(msg) reporta progreso a la UI.
 */
export async function cargarPropiedades(urn, onEstado) {
  if (PROPS_CACHE.has(urn)) return PROPS_CACHE.get(urn);
  const inicio = Date.now();
  let r = await consultar(urn);
  while (r.status === 'procesando') {
    if (Date.now() - inicio > 6 * 60_000) throw new Error('Timeout preparando parámetros del modelo');
    onEstado?.('Autodesk está preparando los parámetros del modelo…');
    await new Promise(res => setTimeout(res, 10_000));
    r = await consultar(urn);
  }
  if (r.status !== 'ready') throw new Error(r.error || `Extracción de parámetros: ${r.status}`);
  onEstado?.(`Descargando ${r.stats?.elems || ''} elementos…`);
  const resp = await fetch(r.url);
  if (!resp.ok) throw new Error(`No pude descargar los parámetros (${resp.status})`);
  const data = await resp.json();
  const store = construirStore(data, r.stats);
  PROPS_CACHE.set(urn, store);
  return store;
}

function construirStore(data, stats) {
  const { strings, params, elems } = data;
  const str = (i) => strings[i] ?? '';

  // Lista de parámetros hidratada (para slicers / "colorear por")
  const listaParams = params.map((p, idx) => ({
    idx, grupo: str(p.g), nombre: str(p.n), tipo: p.t, unidad: p.u || '',
    clave: `${str(p.g)} · ${str(p.n)}`,
  }));

  const porExternalId = new Map();
  elems.forEach((e, i) => { if (e.x) porExternalId.set(e.x, i); });

  const _memoValores = new Map();

  const store = {
    stats: stats || { elems: elems.length, params: params.length },
    extraidoEn: data.extraidoEn,
    listaParams,
    paramsString: () => listaParams.filter(p => p.tipo === 's'),
    paramsNumericos: () => listaParams.filter(p => p.tipo === 'n'),

    /** Elementos en el shape que ya consume todo el módulo BIM (els). */
    quantities(dbIdPorExternalId) {
      return elems.map(e => ({
        dbId: dbIdPorExternalId?.get(e.x) ?? e.id,
        externalId: e.x,
        nombre: str(e.nm),
        nivel: str(e.q.nivel),
        categoria: str(e.cat),
        tipo: str(e.tipo),
        volumen: e.q.vol, area: e.q.area, longitud: e.q.len,
      }));
    },

    /** Valores distintos de un parámetro → Map<valor, Set<externalId>> (memoizado). */
    valoresDe(paramIdx) {
      if (_memoValores.has(paramIdx)) return _memoValores.get(paramIdx);
      const p = params[paramIdx];
      const m = new Map();
      for (const e of elems) {
        const par = e.p.find(([pi]) => pi === paramIdx);
        if (!par) continue;
        const valor = p.t === 's' ? str(par[1]) : String(par[1]) + (p.u ? ` ${p.u}` : '');
        if (!m.has(valor)) m.set(valor, new Set());
        m.get(valor).add(e.x || String(e.id));
      }
      _memoValores.set(paramIdx, m);
      return m;
    },

    /** Ficha completa de un elemento por externalId: grupos Revit → [{nombre, valor}]. */
    fichaDe(externalId) {
      const i = porExternalId.get(externalId);
      if (i === undefined) return null;
      const e = elems[i];
      const grupos = {};
      for (const [pi, val] of e.p) {
        const p = params[pi];
        const g = str(p.g);
        (grupos[g] = grupos[g] || []).push({
          nombre: str(p.n),
          valor: p.t === 's' ? str(val) : `${val}${p.u ? ' ' + p.u : ''}`,
        });
      }
      return { nombre: str(e.nm), externalId: e.x, categoria: str(e.cat), tipo: str(e.tipo), grupos };
    },

    /** Detecta un parámetro de zona/sector para sectorización real. */
    detectarParamsSector() {
      const rx = /sector|zona|zone|workset|fase de creaci|^fase$|^phase|^comentarios$|^comments$|^mark$|^marca$/i;
      return listaParams.filter(p => p.tipo === 's' && rx.test(p.nombre))
        .filter(p => { const n = this.valoresDe(p.idx).size; return n >= 2 && n <= 60; });
    },
  };
  return store;
}

/** Mapa externalId → dbId del visor (los objectid del server pueden divergir). */
export function mapearDbIds(viewer) {
  return new Promise((resolve) => {
    try {
      viewer.model.getExternalIdMapping(
        (map) => {
          const m = new Map();
          for (const [ext, dbId] of Object.entries(map || {})) m.set(ext, dbId);
          resolve(m);
        },
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
}
