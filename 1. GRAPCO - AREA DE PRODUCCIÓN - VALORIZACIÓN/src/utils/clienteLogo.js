// src/utils/clienteLogo.js
// Identidad del CLIENTE del proyecto activo (logo/monograma). Reutilizado por el
// topbar (Navbar) y la barra de contexto del hub (SelectorPerfil).
// El logo SUBIDO en el editor de proyecto (Proyectos.logoCliente) SIEMPRE tiene prioridad.

// Logos de clientes conocidos (mientras no suban el suyo). La clave es un fragmento
// del nombre del cliente.
export const LOGOS_CLIENTE_CONOCIDOS = {
  creditex: '/brand/creditex-logo.png',
};

export const clienteDe = (p) => p?.cliente || p?.clienteNombre || p?.empresa || '';

export function logoClienteConocido(nombre) {
  const k = String(nombre || '').toLowerCase();
  for (const clave in LOGOS_CLIENTE_CONOCIDOS) {
    if (k.includes(clave)) return LOGOS_CLIENTE_CONOCIDOS[clave];
  }
  return '';
}

// Monograma de respaldo: ignora sufijos societarios (SAA/SAC/S.A./EIRL…) y toma 2
// letras representativas. "CREDITEX SAA" → "CR" · "TEXTIL S.A.A" → "TE".
export function monogramaCliente(nombre) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return '—';
  const esSufijo = (w) => /^(sa|saa|sac|saac|eirl|srl|ltda|cia|ca)$/i.test(w.replace(/\./g, ''));
  const palabras = limpio.split(/\s+/).filter(w => !esSufijo(w));
  const ws = palabras.length ? palabras : limpio.split(/\s+/);
  if (ws.length >= 2) return (ws[0][0] + ws[1][0]).toUpperCase();
  return (ws[0] || limpio).slice(0, 2).toUpperCase();
}

// { nombre, logoUrl, monograma } del cliente del proyecto activo.
export function resolverCliente(proyecto) {
  const nombre = clienteDe(proyecto);
  const logoUrl = proyecto?.logoCliente || proyecto?.logoUrl || logoClienteConocido(nombre);
  return { nombre, logoUrl, monograma: monogramaCliente(nombre) };
}
