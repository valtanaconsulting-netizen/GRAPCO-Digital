// src/data/partidasCartaBalance.js
// Relaciona cada actividad de Carta Balance (productividad) con su PARTIDA del
// presupuesto / WBS ISO de CREDITEX (presupuestoCreditex.js). Así el tablero de
// productividad se cruza con la partida del CPI a la que pertenece.
//
// match: palabras clave (en MAYÚSCULAS) que deben aparecer en el nombre de la
//        actividad registrada en la carta para imputarla a esta partida.

export const PARTIDAS_CB = [
  {
    tipo: 'EXCAVACION', match: ['EXCAVAC'],
    partida: 'MOVIMIENTO DE TIERRAS', subpartida: 'MOVIMIENTO DE TIERRAS PTARI',
    actividad: 'EXCAVACIÓN LOCALIZADA MANUAL', un: 'M3', ipMeta: 2.6933,
  },
  {
    tipo: 'ENCOFRADO', match: ['ENCOFRAD'],
    partida: 'ENCOFRADO', subpartida: 'ENCOFRADO',
    actividad: 'ENCOFRADO Y DESENCOFRADO DE CALZADURA', un: 'M2', ipMeta: 1.25,
  },
  {
    tipo: 'VACIADO', match: ['VACIADO', 'CONCRETO CICLOPEO', 'CONCRETO CICLÓPEO', 'CALZADURA (HECHO'],
    partida: 'CONCRETO', subpartida: 'CONCRETO SIMPLE',
    actividad: 'CONCRETO CICLÓPEO 1:10 PARA CALZADURAS', un: 'M3', ipMeta: 2.1,
  },
  {
    tipo: 'ACERO', match: ['ACERO'],
    partida: 'ACERO', subpartida: 'ACERO',
    actividad: 'COLOCADO DE ACERO', un: 'KG', ipMeta: 0.03,
  },
];

// Devuelve la partida ISO de una actividad. Prioriza el tipoActividad guardado
// en la carta; si no, hace match por palabra clave del nombre.
export function partidaDe(actividad, tipoActividad) {
  if (tipoActividad) {
    const byTipo = PARTIDAS_CB.find((p) => p.tipo === tipoActividad);
    if (byTipo) return byTipo;
  }
  const A = String(actividad || '').toUpperCase();
  return PARTIDAS_CB.find((p) => p.match.some((m) => A.includes(m))) || null;
}
