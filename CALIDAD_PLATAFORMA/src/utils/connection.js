// src/utils/connection.js
// Decide si conviene cargar media pesada (video de fondo) según la red del dispositivo.
// En obra el celular suele tener señal variable: si la conexión es muy lenta o el usuario
// activó "ahorro de datos", NO cargamos el video (el fondo con gradiente/mesh se ve igual
// de bien) → arranque más rápido y menos consumo de datos/batería.

export function conexionLenta() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData) return true;                                  // usuario pidió ahorrar datos
    if (['slow-2g', '2g'].includes(c.effectiveType)) return true; // red muy lenta
    return false;
  } catch {
    return false;
  }
}
