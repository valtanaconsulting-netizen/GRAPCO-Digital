// src/data/aliasesActividades.js
// Equivalencias de nombres: cuando la obra registró una actividad con un nombre
// que no existe en el catálogo WBS, aquí se indica a qué actividad REAL del
// catálogo se le imputan sus HH. La actividad destino define su partida/subpartida.
//
// CLAVE: el nombre tal como lo escribió la obra, en MAYÚSCULAS, sin sufijos de
//        frente «(F1-PTARI)» etc. (misma normalización que usa el CPI).
// VALOR: el nombre exacto de la actividad del catálogo.
//
// Se va completando a medida que se confirma cada caso.
export const ALIAS_ACTIVIDADES = {
  'APOYO A OTRAS OBRAS': 'APOYO A OTRAS OBRAS - PRECOTEX',
  'TRAZO Y REPLANTEO TOPOGRAFICO': 'TRAZO Y REPLANTEO TOPOGRAFICO',
};
