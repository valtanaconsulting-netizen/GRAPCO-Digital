// src/utils/tipoCambioClient.js — Cliente de Tipo de Cambio SUNAT (B26 · Fase 2)
//
// Estrategia:
//   1. Cachea TC en colección Firestore TipoCambio/{YYYY-MM-DD}
//   2. Si no existe, intenta fetchear desde proxy publico apis.net.pe (entrega TC oficial SUNAT)
//   3. Fallback: pide ingreso manual al usuario
//
// Razon de no llamar a SUNAT directamente: el endpoint oficial SUNAT no tiene CORS habilitado para frontend.
// apis.net.pe es un proxy publico peruano que devuelve EL MISMO TC oficial SUNAT y permite CORS.

import { collection, doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const fechaKey = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  return f.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Fuentes de TC, en orden de preferencia. Todas son gratuitas, sin token y
// con CORS habilitado (probadas desde frontend). Cada una devuelve
// { compra, venta, fuente } o null si no aplica/falla.
//
// 1) apis.net.pe — TC OFICIAL SUNAT (compra/venta bancarizado). Hoy suele
//    requerir token; si responde sin él, es la fuente más exacta para contabilidad.
// 2) fawazahmed0 currency-api (CDN jsDelivr) — tipo de cambio de MERCADO
//    USD→PEN. Muy estable, sin token. Aproximación cuando SUNAT no responde.
// 3) Mirror pages.dev del mismo dataset (por si jsDelivr está caído).
async function fetchSUNAT(key) {
  try {
    const res = await fetch(`https://api.apis.net.pe/v1/tipo-cambio-sunat?fecha=${key}`, { method: 'GET' });
    if (!res.ok) return null;
    const d = await res.json();
    const compra = parseFloat(d.compra ?? d.precioCompra ?? d.purchasePrice ?? 0);
    const venta  = parseFloat(d.venta  ?? d.precioVenta  ?? d.salePrice     ?? 0);
    if (compra > 0 && venta > 0) return { compra, venta, fuente: 'SUNAT' };
  } catch (e) { console.warn('[TC] SUNAT proxy no disponible:', e?.message || e); }
  return null;
}

async function fetchMercado(key) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/usd.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) continue;
      const d = await res.json();
      const rate = parseFloat(d?.usd?.pen ?? 0);
      if (rate > 0) {
        // Mercado da un solo valor; aplicamos un spread mínimo informativo.
        return {
          compra: Math.round(rate * 1000) / 1000,
          venta:  Math.round(rate * 1.002 * 1000) / 1000,
          fuente: 'MERCADO',
        };
      }
    } catch (e) { console.warn('[TC] Fuente mercado falló:', url, e?.message || e); }
  }
  return null;
}

/**
 * Obtiene el TC del dia. Orden: cache Firestore → API SUNAT (proxy) → ultimo TC conocido.
 * @param {string|Date} fecha - Default hoy
 * @returns {Promise<{fecha, compra, venta, fuente}>}
 */
export async function obtenerTCDelDia(fecha = new Date()) {
  const key = fechaKey(fecha);

  // 1. Cache Firestore
  try {
    const ref = doc(db, 'TipoCambio', key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data.compra && data.venta) {
        return { fecha: key, ...data };
      }
    }
  } catch (e) {
    console.warn('[TC] No se pudo leer cache:', e);
  }

  // 2. Fuentes online (SUNAT oficial → mercado como respaldo)
  const resultado = (await fetchSUNAT(key)) || (await fetchMercado(key));
  if (resultado) {
    const tc = {
      fecha: key,
      compra: resultado.compra,
      venta: resultado.venta,
      fuente: resultado.fuente,
      obtenidoEn: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'TipoCambio', key), tc);
    } catch (e) {
      console.warn('[TC] No se pudo cachear:', e);
    }
    return tc;
  }

  // 3. Fallback: ultimo TC conocido
  try {
    const q = query(collection(db, 'TipoCambio'), orderBy('fecha', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return { ...data, fuente: data.fuente + ' (FALLBACK)' };
    }
  } catch (e) {
    console.warn('[TC] No se pudo leer ultimo TC:', e);
  }

  // 4. Sin info: retornar null para que el caller maneje
  return null;
}

/**
 * Guarda manualmente un TC (cuando SUNAT no tiene info: feriados, fines de semana).
 */
export async function guardarTCManual(fecha, compra, venta, usuario = 'sistema') {
  const key = fechaKey(fecha);
  const data = {
    fecha: key,
    compra: parseFloat(compra),
    venta: parseFloat(venta),
    fuente: 'manual',
    registradoPor: usuario,
    obtenidoEn: new Date().toISOString(),
  };
  await setDoc(doc(db, 'TipoCambio', key), data);
  return data;
}

/**
 * Convierte un monto a Soles usando el TC del dia.
 * @param {number} monto
 * @param {string} monedaOrigen - 'PEN' o 'USD'
 * @param {object} tc - TC del dia { compra, venta }
 * @param {string} usar - 'compra' (default para gastos/ingresos) o 'venta'
 */
export function convertirAPEN(monto, monedaOrigen, tc, usar = 'compra') {
  const m = parseFloat(monto || 0);
  if (!m) return 0;
  if (monedaOrigen === 'PEN') return m;
  if (!tc) return 0;
  const factor = parseFloat(tc[usar] || tc.compra || 0);
  return Math.round(m * factor * 100) / 100;
}

/**
 * Convierte de PEN a otra moneda (para reportes consolidados).
 */
export function convertirDesdePEN(montoPEN, monedaDestino, tc, usar = 'compra') {
  if (monedaDestino === 'PEN') return montoPEN;
  if (!tc) return 0;
  const factor = parseFloat(tc[usar] || tc.compra || 0);
  if (!factor) return 0;
  return Math.round((montoPEN / factor) * 100) / 100;
}

export const MONEDAS = [
  { id: 'PEN', label: 'Soles', simbolo: 'S/.' },
  { id: 'USD', label: 'Dolares', simbolo: '$' },
];

export const fmtMoneda = (n, moneda = 'PEN') => {
  if (n == null || isNaN(n)) return '—';
  const sim = moneda === 'USD' ? '$' : 'S/.';
  return `${sim} ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
