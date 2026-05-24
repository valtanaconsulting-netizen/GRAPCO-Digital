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

  // Estructuras que consume el ISP — del catálogo propio o, si no existe, del fijo.
  const existe = Array.isArray(arbol) && arbol.length > 0;
  const catalogoMaster = useMemo(
    () => (existe ? arbolACatalogoMaster(arbol) : CATALOGO_MASTER),
    [existe, arbol]
  );
  const infoMap = useMemo(
    () => (existe ? arbolAInfoMap(arbol) : INFO_MAP),
    [existe, arbol]
  );

  return { loading, arbol, existe, catalogoMaster, infoMap };
}
