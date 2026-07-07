// scripts/generar-iconos-pwa.mjs
// Regenera los íconos PWA (los que se ven al instalar la app en teléfono/laptop)
// con el MISMO look premium que dentro de la plataforma: frame navy + tile
// blanco redondeado + aro dorado + el logo GRAPCO centrado.
// Requiere: npm i -D sharp
// Uso: node scripts/generar-iconos-pwa.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const NAVY1 = '#163659', NAVY2 = '#0B1F39', GOLD = '#E5A82F';
const logoB64 = readFileSync('public/grapco-logo-square.jpeg').toString('base64');
const logoHref = `data:image/jpeg;base64,${logoB64}`;

// Construye el SVG maestro (512). rxBg controla el redondeo del fondo:
//  - "any": esquinas redondeadas (se ve como tarjeta)
//  - "maskable": full-bleed (rx 0) → el SO aplica su propia máscara/círculo
const svg = (rxBg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY1}"/>
      <stop offset="100%" stop-color="${NAVY2}"/>
    </linearGradient>
    <clipPath id="tile"><rect x="92" y="92" width="328" height="328" rx="60"/></clipPath>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="${rxBg}" fill="url(#bg)"/>
  <!-- filo dorado superior sutil -->
  <rect x="0" y="0" width="512" height="6" fill="${GOLD}" opacity="0.85" rx="${rxBg ? 3 : 0}"/>
  <!-- tile blanco con el logo -->
  <rect x="92" y="92" width="328" height="328" rx="60" fill="#ffffff"/>
  <image href="${logoHref}" x="104" y="104" width="304" height="304" clip-path="url(#tile)" preserveAspectRatio="xMidYMid slice"/>
  <!-- aro dorado del tile -->
  <rect x="92" y="92" width="328" height="328" rx="60" fill="none" stroke="${GOLD}" stroke-width="7"/>
</svg>`;

const sizes = [72, 96, 128, 192, 256, 384, 512];

for (const s of sizes) {
  await sharp(Buffer.from(svg(96))).resize(s, s).png().toFile(`public/brand/grapco-${s}.png`);
  await sharp(Buffer.from(svg(0))).resize(s, s).png().toFile(`public/brand/grapco-${s}-mask.png`);
}
// Apple touch icon (180) + favicons
await sharp(Buffer.from(svg(96))).resize(180, 180).png().toFile('public/brand/grapco-apple-180.png');
await sharp(Buffer.from(svg(96))).resize(32, 32).png().toFile('public/brand/grapco-favicon-32.png');
await sharp(Buffer.from(svg(96))).resize(16, 16).png().toFile('public/brand/grapco-favicon-16.png');
// Guardar el SVG maestro por si se quiere reusar
writeFileSync('public/brand/grapco-icon.svg', svg(96));

console.log('OK iconos PWA regenerados:', sizes.length * 2 + 4, 'archivos (tile blanco + aro dorado + logo sobre frame navy).');
