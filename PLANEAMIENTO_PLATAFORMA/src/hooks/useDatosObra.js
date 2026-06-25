// src/hooks/useDatosObra.js — Capa de datos de obra para los módulos de Control
// LPS / EVM (VDC, Curva S, CPI/EAC, Plan Diario, Tablero LPS).
//
// Extraída de Ingeniero.jsx (GRAPCO) al separar Planeamiento como app aparte
// (2026-06-24). Reúne, desde las MISMAS fuentes únicas (Registros_Campo +
// Catalogo_WBS), el historial enriquecido y el árbol WBS agregado con HH real /
// meta / presupuesto, además de cuadrillas y planes diarios. Aquí NO hay filtros
// de UI: `filtrados` = todo el historial enriquecido del proyecto activo.

import { useMemo } from 'react';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { useCatalogoWBS } from './useCatalogoWBS';
import { useHistorial, useCuadrillas, usePersonal, usePlanesDiarios } from './useFirebaseData';
import { FECHA_INICIO_PROYECTO } from '../utils/constants';
import {
  getActivityOrder, buscarActividadCanonica, resolverIP, obtenerSemana, hoy,
} from '../utils/helpers';
import { normActividad } from '../utils/normalizacion';
import { ALIAS_ACTIVIDADES } from '../data/aliasesActividades';

export function useDatosObra() {
  const { filtrarPorContexto, proyectoActivoId } = useProyectoActivo();
  const { historial } = useHistorial(hoy());
  const cuadrillasDB = useCuadrillas();
  const personalDB = usePersonal();
  const planesDiarios = usePlanesDiarios();

  const { catalogoMaster: catWbs, infoMap: infoWbs } = useCatalogoWBS(proyectoActivoId);

  const historialProyecto = useMemo(
    () => filtrarPorContexto(historial || [], {}),
    [historial, filtrarPorContexto],
  );

  // Cuadrillas del proyecto activo + diccionario capataz→miembros (cuadrillasActivas).
  const cuadrillasDBFiltrado = useMemo(() => {
    if (!cuadrillasDB) return {};
    const lista = Object.entries(cuadrillasDB).map(([id, c]) => ({ id, ...(c || {}) }));
    const result = {};
    filtrarPorContexto(lista).forEach(c => { result[c.id] = c; });
    return result;
  }, [cuadrillasDB, filtrarPorContexto]);

  const cuadrillasActivas = useMemo(() => {
    const result = {};
    Object.values(cuadrillasDBFiltrado || {}).forEach((c) => {
      if (!c || !c.capataz) return;
      result[c.capataz] = (c.miembros || []).map(m => m?.nombre).filter(Boolean);
    });
    return result;
  }, [cuadrillasDBFiltrado]);

  const planesDiariosFiltrado = useMemo(
    () => (Array.isArray(planesDiarios) ? filtrarPorContexto(planesDiarios) : planesDiarios),
    [planesDiarios, filtrarPorContexto],
  );

  // ── Enriquecer historial (idéntico a Ingeniero.jsx) ──
  const historialEnriquecido = useMemo(() => {
    const base = (historialProyecto || []).map(r => {
      if (!r) return r;
      const semanaRecalc = r.fecha ? obtenerSemana(r.fecha, FECHA_INICIO_PROYECTO) : r.semana;
      const txt = (r.actividad || '').trim();
      const canonica = buscarActividadCanonica(txt);
      if (canonica) {
        return {
          ...r,
          semana: semanaRecalc,
          _actividadCanonica: canonica.actividad,
          _partidaCanonica: canonica.partida,
          _subpartidaCanonica: canonica.subpartida,
          _matched: true,
          _matchScore: canonica.score,
        };
      }
      return { ...r, semana: semanaRecalc, _actividadCanonica: txt, _matched: false };
    });
    const catIP = {};
    Object.keys(infoWbs || {}).forEach(k => {
      const info = infoWbs[k] || {};
      catIP[normActividad(k)] = { ipM: info.ipM || 0, ipP: info.ipP || 0 };
    });
    return base.map(r => {
      if (!r) return r;
      const ipDatos = resolverIP(r, base);
      const cat = catIP[normActividad(r._actividadCanonica || r.actividad)];
      const ipMcat = cat && cat.ipM ? cat.ipM : null;
      const ipPcat = cat && cat.ipP ? cat.ipP : null;
      return {
        ...r,
        _ipMeta:   ipMcat || ipDatos.ipM,
        _ipPpto:   ipPcat || ipDatos.ipP,
        _ipReal:   ipDatos.ipReal,
        _ipFuente: (ipMcat || ipPcat) ? 'catalogo' : ipDatos.fuente,
      };
    });
  }, [historialProyecto, infoWbs]);

  // En Planeamiento no hay filtros de UI: el set de trabajo es todo el historial.
  const filtrados = historialEnriquecido;

  // ── Árbol WBS agregado con HH real/meta/presupuesto (idéntico a Ingeniero.jsx) ──
  const wbs = useMemo(() => {
    const normTxt = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
      .replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
    const normAct = normActividad;

    const j = {};
    const idxP = {};
    const idxS = {};
    const idxA = {};
    const idxAP = {};
    const idxGA = {};
    Object.keys(catWbs || {}).forEach(p => {
      const pk = p.toUpperCase().trim();
      j[pk] = { hhR:0, hhM:0, hhP:0, subs:{} };
      idxP[normTxt(p)] = pk;
      idxS[pk] = {};
      idxAP[pk] = {};
      Object.keys(catWbs[p]).forEach(sp => {
        const sk = sp.toUpperCase().trim();
        j[pk].subs[sk] = { hhR:0, hhM:0, hhP:0, acts:{} };
        idxS[pk][normTxt(sp)] = sk;
        const aKey = pk + '|' + sk;
        idxA[aKey] = {};
        catWbs[p][sp].forEach(a => {
          const aTrim = a.trim();
          const ad = infoWbs[aTrim.toUpperCase()] || {};
          j[pk].subs[sk].acts[aTrim] = {
            hhR:0, hhM:0, hhP:0, met:0,
            metP: ad.metP || 0,
            _info: { ipM: ad.ipM || null, ipP: ad.ipP || null, metP: ad.metP || 0, un: ad.un || 'UND' },
          };
          idxA[aKey][normAct(a)] = aTrim;
          if (!idxAP[pk][normAct(a)]) idxAP[pk][normAct(a)] = { sk, aTrim };
          idxGA[normAct(a)] = { pk, sk, aTrim };
        });
      });
    });
    (filtrados || []).forEach(r => {
      const p  = (r._partidaCanonica    || r.partida    || '').toUpperCase().trim();
      let   sp = (r._subpartidaCanonica || r.subpartida || '').toUpperCase().trim();
      const a  = (r._actividadCanonica  || r.actividad  || '').trim();
      let jp, js, act;
      const pk = j[p] ? p : idxP[normTxt(p)];
      if (pk && j[pk]) {
        jp = j[pk];
        if (!sp) sp = pk;
        const sk = jp.subs[sp] ? sp : (idxS[pk] && idxS[pk][normTxt(sp)]);
        if (sk && jp.subs[sk]) {
          js = jp.subs[sk];
          const ak = js.acts[a] ? a : (idxA[pk + '|' + sk] && idxA[pk + '|' + sk][normAct(a)]);
          if (ak) act = js.acts[ak];
        }
        if (!act && idxAP[pk]) {
          const hit = idxAP[pk][normAct(a)];
          if (hit && jp.subs[hit.sk]) { js = jp.subs[hit.sk]; act = js.acts[hit.aTrim]; }
        }
      }
      if (!act) {
        const destino = ALIAS_ACTIVIDADES[normAct(a)];
        const g = destino && idxGA[normAct(destino)];
        if (g) { jp = j[g.pk]; js = jp.subs[g.sk]; act = js.acts[g.aTrim]; }
      }
      if (act && jp && js) {
        const met = parseFloat(r.metrado) || 0, hR = parseFloat(r.totalHH) || 0;
        const ipM = act._info.ipM || r._ipMeta;
        const ipP = act._info.ipP || r._ipPpto;
        const hM = (ipM && met > 0) ? met * ipM : 0;
        const hP = (ipP && met > 0) ? met * ipP : 0;
        jp.hhR += hR; jp.hhM += hM; jp.hhP += hP;
        js.hhR += hR; js.hhM += hM; js.hhP += hP;
        act.hhR += hR; act.hhM += hM; act.hhP += hP; act.met += met;
        if (!act._info.ipM && ipM) act._info.ipM = ipM;
        if (!act._info.ipP && ipP) act._info.ipP = ipP;
        if (!act._info.un  && r.unidad) act._info.un = r.unidad;
      }
    });
    return j;
  }, [filtrados, catWbs, infoWbs]);

  return {
    historial: historialEnriquecido,
    filtrados,
    wbs,
    infoMap: infoWbs,
    cuadrillasActivas,
    cuadrillasDB: cuadrillasDBFiltrado,
    planesDiarios: planesDiariosFiltrado,
    personalDB,
    proyectoActivoId,
  };
}
