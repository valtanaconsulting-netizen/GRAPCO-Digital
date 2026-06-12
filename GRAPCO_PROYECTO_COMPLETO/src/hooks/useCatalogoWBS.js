// src/hooks/useCatalogoWBS.js
// Lee el Catálogo WBS editable de un proyecto desde Firestore (Catalogo_WBS/{proyectoId}).
// Si el proyecto aún no tiene catálogo propio, cae al catálogo fijo del código
// (CATALOGO_MASTER / INFO_MAP) para que el ISP nunca se quede sin datos.

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CATALOGO_MASTER, INFO_MAP } from '../utils/constants';
import { arbolACatalogoMaster, arbolAInfoMap } from '../utils/catalogoWbs';

export function useCatalogoWBS(proyectoId) {
  const [arbol, setArbol] = useState(null);   // null = aún cargando / sin catálogo propio
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proyectoId) { setArbol(null); setLoading(false); return; }
    setLoading(true);
    let cancel = false;
    const unsub = onSnapshot(
      doc(db, 'Catalogo_WBS', proyectoId),
      (snap) => {
        if (cancel) return;
        const data = snap.exists() ? snap.data() : null;
        setArbol(data && Array.isArray(data.arbol) ? data.arbol : null);
        setLoading(false);
      },
      (e) => { if (!cancel) { console.warn('[useCatalogoWBS]', e); setArbol(null); setLoading(false); } }
    );
    return () => { cancel = true; unsub(); };
  }, [proyectoId]);

  // Estructuras que consume el ISP — del catálogo propio del proyecto.
  // AISLAMIENTO MULTI-PROYECTO: el catálogo fijo del código (CATALOGO_MASTER,
  // que es el presupuesto CREDITEX) solo aplica como respaldo a los proyectos
  // LEGACY de CREDITEX. Un proyecto NUEVO sin catálogo arranca VACÍO — debe
  // cargar el suyo desde el Editor WBS (no hereda actividades ajenas).
  const esLegacy = LEGACY_CREDITEX_IDS.includes(proyectoId);
  const existe = Array.isArray(arbol) && arbol.length > 0;
  const catalogoMaster = useMemo(
    () => (existe ? arbolACatalogoMaster(arbol) : (esLegacy ? CATALOGO_MASTER : {})),
    [existe, arbol, esLegacy]
  );
  const infoMap = useMemo(
    () => (existe ? arbolAInfoMap(arbol) : (esLegacy ? INFO_MAP : {})),
    [existe, arbol, esLegacy]
  );

  return { loading, arbol, existe, catalogoMaster, infoMap };
}

// Proyectos "legacy" cuyo respaldo es el catálogo CREDITEX hardcodeado.
export const LEGACY_CREDITEX_IDS = ['creditex-ptar', 'default-ptari'];
