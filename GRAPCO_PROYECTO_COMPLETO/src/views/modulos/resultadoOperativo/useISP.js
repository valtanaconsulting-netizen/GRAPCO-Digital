// src/views/modulos/resultadoOperativo/useISP.js
// Cache a nivel de módulo del ISP subido + hook para subir/leer. El ISP NO se
// persiste en Firestore (acordado): se sube por sesión y se mantiene en memoria
// para que sobreviva al cambiar de pestaña (se pierde al recargar la página).

import { useState, useCallback, useSyncExternalStore } from 'react';
import { parseISPDesdeArchivo } from '../../../utils/ispParser';

let _isp = null;                 // { semanas, tarifa, porSemana, _archivo }
const _subs = new Set();
const emit = () => _subs.forEach((fn) => fn());

export function setISP(data) { _isp = data; emit(); }
export function getISP() { return _isp; }
export function limpiarISP() { _isp = null; emit(); }

export default function useISP() {
  const isp = useSyncExternalStore(
    (cb) => { _subs.add(cb); return () => _subs.delete(cb); },
    () => _isp,
    () => _isp,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargarISP = useCallback(async (file) => {
    setCargando(true); setError(null);
    try {
      const data = await parseISPDesdeArchivo(file);
      if (!data.semanas.length) {
        throw new Error('No se encontraron hojas "ISP-SEMxx" en el archivo. ¿Es el ISP correcto?');
      }
      data._archivo = file.name;
      setISP(data);
      return data;
    } catch (e) {
      setError(e?.message || 'No se pudo leer el ISP');
      throw e;
    } finally {
      setCargando(false);
    }
  }, []);

  return { isp, cargando, error, cargarISP, limpiarISP };
}
