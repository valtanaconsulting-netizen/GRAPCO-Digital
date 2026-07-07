// src/utils/bimQuantities.js
// Extrae cantidades (volumen, área, longitud) del modelo cargado en el
// Autodesk Viewer y las agrega por Nivel, Categoría y Resistencia.
// Técnica estándar "Power BI + BIM": se lee el property database del viewer
// (client-side, sin servidor) recorriendo los nodos hoja del árbol del modelo.

// Convierte "12.34 m³", "1,234.5", 45 → número
const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g, '').replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

const norm = (s) => (s || '').toString().trim().toLowerCase();

// Busca el primer property cuyo displayName matchee alguno de los patrones
const findProp = (props, patterns) => {
  for (const p of props) {
    const dn = norm(p.displayName);
    if (patterns.some(rx => rx.test(dn))) return p;
  }
  return null;
};

const RX = {
  volumen:   [/^volumen$/, /^volume$/, /volumen/, /\bvolume\b/],
  area:      [/^[áa]rea$/, /^area$/, /\b[áa]rea\b/, /\barea\b/],
  longitud:  [/^longitud$/, /^length$/, /longitud/, /\blength\b/],
  perimetro: [/per[ií]metro/, /perimeter/],
  nivel:     [/^nivel$/, /^level$/, /nivel base/, /base constraint/, /reference level/, /schedule level/, /restricci[óo]n de nivel/],
  categoria: [/^categor[íi]a$/, /^category$/, /revit category/, /categor[íi]a/],
  resistencia: [/resistencia/, /f'?c\b/, /compressive/, /strength/, /hormig[óo]n/, /concreto/, /material estructural/, /structural material/],
};

/**
 * Devuelve la lista de ELEMENTOS con su dbId + nivel + categoría + cantidades.
 * Base para sectorización 3D (agrupar/aislar/colorear por zona en el visor).
 * @returns {Promise<Array>} [{ dbId, nombre, nivel, categoria, volumen, area, longitud }]
 */
export function extraerElementosBIM(viewer) {
  return new Promise((resolve, reject) => {
    try {
      const model = viewer?.model;
      if (!model) return reject(new Error('No hay modelo cargado en el visor'));
      model.getObjectTree((tree) => {
        const leafIds = [];
        const recurse = (dbId) => {
          let hijos = 0;
          tree.enumNodeChildren(dbId, (c) => { hijos++; recurse(c); });
          if (hijos === 0) leafIds.push(dbId);
        };
        recurse(tree.getRootId());
        if (leafIds.length === 0) return reject(new Error('El modelo no tiene elementos'));

        const cb = (results) => {
          const out = [];
          results.forEach((r) => {
            const props = r.properties || [];
            const vol  = toNum(findProp(props, RX.volumen)?.displayValue);
            const area = toNum(findProp(props, RX.area)?.displayValue);
            const long = toNum(findProp(props, RX.longitud)?.displayValue);
            if (vol === 0 && area === 0 && long === 0) return;
            const nivel = (findProp(props, RX.nivel)?.displayValue ?? '').toString().trim() || 'Sin nivel';
            const cat   = (findProp(props, RX.categoria)?.displayValue ?? r.name?.split(' [')[0] ?? '').toString().trim() || 'Sin categoría';
            out.push({
              dbId: r.dbId,
              nombre: r.name || `#${r.dbId}`,
              nivel, categoria: cat,
              volumen: +vol.toFixed(3), area: +area.toFixed(3), longitud: +long.toFixed(3),
            });
          });
          resolve(out);
        };
        const onErr = (e) => reject(new Error('Error leyendo propiedades: ' + (e?.message || e)));
        model.getBulkProperties2
          ? model.getBulkProperties2(leafIds, { needsExternalId: false }, cb, onErr)
          : model.getBulkProperties(leafIds, [], cb, onErr);
      }, (e) => reject(new Error('No se pudo leer el árbol: ' + (e?.message || e))));
    } catch (err) { reject(err); }
  });
}

/**
 * @param {Object} viewer - instancia Autodesk.Viewing.GuiViewer3D ya con modelo cargado
 * @returns {Promise<Object>} { totales, porNivel, porCategoria, porResistencia, porClase }
 */
export function extraerCantidadesBIM(viewer) {
  return new Promise((resolve, reject) => {
    try {
      const model = viewer?.model;
      if (!model) return reject(new Error('No hay modelo cargado en el visor'));

      model.getObjectTree((tree) => {
        // Recolectar nodos HOJA (elementos reales, no agrupadores)
        const leafIds = [];
        const recurse = (dbId) => {
          let hijos = 0;
          tree.enumNodeChildren(dbId, (child) => { hijos++; recurse(child); });
          if (hijos === 0) leafIds.push(dbId);
        };
        recurse(tree.getRootId());

        if (leafIds.length === 0) return reject(new Error('El modelo no tiene elementos'));

        model.getBulkProperties2
          ? model.getBulkProperties2(leafIds, { needsExternalId: false }, onProps, onErr)
          : model.getBulkProperties(leafIds, [], onProps, onErr);

        function onErr(e) { reject(new Error('Error leyendo propiedades: ' + (e?.message || e))); }

        function onProps(results) {
          const porNivel = {};
          const porCategoria = {};
          const porResistencia = {};
          const porClase = {};
          let tVol = 0, tArea = 0, tLong = 0, tPerim = 0, recuento = 0;

          results.forEach((r) => {
            const props = r.properties || [];
            const pVol  = findProp(props, RX.volumen);
            const pArea = findProp(props, RX.area);
            const pLong = findProp(props, RX.longitud);
            const pPer  = findProp(props, RX.perimetro);
            const pNiv  = findProp(props, RX.nivel);
            const pCat  = findProp(props, RX.categoria);
            const pRes  = findProp(props, RX.resistencia);

            const vol  = toNum(pVol?.displayValue);
            const area = toNum(pArea?.displayValue);
            const long = toNum(pLong?.displayValue);
            const per  = toNum(pPer?.displayValue);

            // Sin geometría cuantificable → ignorar (juntas, ejes, vistas)
            if (vol === 0 && area === 0 && long === 0) return;

            recuento++;
            tVol += vol; tArea += area; tLong += long; tPerim += per;

            const nivel = (pNiv?.displayValue ?? '').toString().trim() || 'Sin nivel';
            const cat   = (pCat?.displayValue ?? r.name?.split(' [')[0] ?? '').toString().trim() || 'Sin categoría';
            const res   = (pRes?.displayValue ?? '').toString().trim() || 'Sin especificar';
            const clase = cat;

            const acc = (map, key) => {
              if (!map[key]) map[key] = { key, recuento: 0, volumen: 0, area: 0, longitud: 0, perimetro: 0 };
              const o = map[key];
              o.recuento++; o.volumen += vol; o.area += area; o.longitud += long; o.perimetro += per;
            };
            acc(porNivel, nivel);
            acc(porCategoria, cat);
            acc(porResistencia, res);
            acc(porClase, clase);
          });

          const ordenar = (map, by = 'volumen') =>
            Object.values(map).map(o => ({
              ...o,
              volumen: +o.volumen.toFixed(2),
              area: +o.area.toFixed(2),
              longitud: +o.longitud.toFixed(2),
              perimetro: +o.perimetro.toFixed(2),
            })).sort((a, b) => b[by] - a[by]);

          resolve({
            totales: {
              recuento,
              volumen: +tVol.toFixed(2),
              area: +tArea.toFixed(2),
              longitud: +tLong.toFixed(2),
              perimetro: +tPerim.toFixed(2),
            },
            porNivel: ordenar(porNivel),
            porCategoria: ordenar(porCategoria),
            porResistencia: ordenar(porResistencia),
            porClase: ordenar(porClase),
          });
        }
      }, (e) => reject(new Error('No se pudo leer el árbol del modelo: ' + (e?.message || e))));
    } catch (err) {
      reject(err);
    }
  });
}
