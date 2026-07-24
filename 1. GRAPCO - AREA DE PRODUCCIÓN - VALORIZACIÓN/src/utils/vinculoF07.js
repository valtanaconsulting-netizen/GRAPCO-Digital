// src/utils/vinculoF07.js — LA LLAVE del sistema: actividad de campo → ítem del F07.
//
// EL PROBLEMA QUE RESUELVE
// El capataz registra por NOMBRE de actividad; el presupuesto F07 se indexa por
// CÓDIGO de partida. Hasta ahora se emparejaban comparando descripciones
// normalizadas y cortadas a 24 caracteres, y eso falla de dos maneras:
//   1. El campo separa lo que el presupuesto une. Medido en CREDITEX-PTAR:
//      campo dice "COLOCADO DE ACERO", el F07 dice "HABILITADO Y COLOCADO DE
//      ACERO" → nunca calzan → ~92.500 kg de acero sin valorizar.
//   2. Aunque calzara, 11 ítems distintos del F07 comparten esa MISMA
//      descripción y solo se distinguen por su código (a qué estructura van).
//      El nombre, por sí solo, es incapaz de decidir a cuál acreditar.
//
// LA SOLUCIÓN
// Un diccionario explícito por proyecto (Mapeo_Actividad_F07/{proyectoId}) que
// Oficina Técnica llena una vez: actividad [+ frente] → ítem del presupuesto.
//
// POR QUÉ SE RESUELVE EN LECTURA Y NO AL ESCRIBIR
// El vínculo NO se congela dentro de cada registro de campo. Se resuelve al
// calcular la valorización. Así:
//   • Mapear una actividad arregla TODO su histórico de golpe (los registros ya
//     escritos empiezan a valorizar sin tocarlos).
//   • Si el mapeo se corrige, no quedan códigos viejos incrustados en miles de
//     documentos. Una sola fuente de verdad.
//
// ENCAJE VDC / LEAN / EVM
//   • VDC: el código de partida es la llave que liga modelo ↔ costo ↔ campo.
//   • Lean: el metrado que no cruza es desperdicio puro — trabajo ejecutado que
//     no se cobra. Esto lo hace medible y, por tanto, eliminable.
//   • EVM: sin este vínculo el Valor Ganado va corto y el CPI miente.

// Normalización SIN truncar. El corte a 24 del cruce por descripción era justo
// la causa de colisiones entre partidas que empiezan igual y difieren al final.
export const normVinculo = (s) => String(s || '')
  .toUpperCase()
  .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
  .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N')
  .replace(/[^A-Z0-9]/g, '');

// Clave del diccionario. Con `frenteId` la entrada es específica de ese frente
// (misma actividad puede ir a ítems distintos según la estructura); sin él, es la
// regla general de la actividad.
export const claveVinculo = (actividad, frenteId) => {
  const a = normVinculo(actividad);
  if (!a) return '';
  const f = normVinculo(frenteId);
  return f ? `${a}@${f}` : a;
};

// Resuelve el ítem F07 de un registro. Primero la regla específica del frente
// (más precisa), luego la general de la actividad. Devuelve la entrada guardada
// { item, mkey, descripcion } o null si esa actividad aún no se ha vinculado.
export function resolverItemF07(mapa, actividad, frenteId) {
  if (!mapa || !actividad) return null;
  if (frenteId) {
    const especifica = mapa[claveVinculo(actividad, frenteId)];
    if (especifica) return especifica;
  }
  return mapa[claveVinculo(actividad)] || null;
}

// ¿Cuántas actividades distintas están vinculadas? (para el indicador de avance
// del mapeo en la UI).
export const contarVinculos = (mapa) => Object.keys(mapa || {}).length;
