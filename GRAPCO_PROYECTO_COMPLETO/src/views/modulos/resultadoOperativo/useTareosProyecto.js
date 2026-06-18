// src/views/modulos/resultadoOperativo/useTareosProyecto.js
// Tareos del PROYECTO activo (Registros_Campo) para alimentar el CR / CHH del RO.
//
// Ignora el frente a propósito: los tareos de obra vienen etiquetados a nivel de
// proyecto (frenteId "<proy>_general"), así que el Costo Real / Control de HH se
// arma con TODA la mano de obra del proyecto — no se vacía al elegir un frente.
// Es el mismo origen que alimenta el ISP/Producción y el CHH en Producción.

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useProyectoActivo } from '../../../contexts/ProyectoActivoContext';

export default function useTareosProyecto() {
  const { filtrarPorContexto } = useProyectoActivo();
  const [tareos, setTareos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    const unsub = onSnapshot(
      collection(db, 'Registros_Campo'),
      (snap) => {
        if (cancel) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTareos(filtrarPorContexto(docs, { ignorarFrente: true }));
        setLoading(false);
      },
      (e) => { if (!cancel) { console.warn('[useTareosProyecto]', e); setLoading(false); } },
    );
    return () => { cancel = true; unsub(); };
  }, [filtrarPorContexto]);

  return { tareos, loading };
}
