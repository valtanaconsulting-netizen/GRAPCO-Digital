// scripts/generar-iconos-pwa.mjs
// Regenera los íconos PWA + favicons: tile BLANCO redondeado con el logo GRAPCO
// y un borde AZUL de 1px REAL (se dibuja a la resolución final de cada tamaño,
// no se escala un maestro, para que la línea sea siempre de 1 píxel).
// Requiere: npm i -D sharp
// Uso: node scripts/generar-iconos-pwa.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const BLUE = '#2F80E5';
const logoB64 = readFileSync('public/brand/grapco-logo-clean.png').toString('base64');
const logoHref = `data:image/png;base64,${logoB64}`;

// SVG dibujado al tamaño S (px) para que el trazo sea de 1px exacto.
//  - variant 'rounded': tile blanco con borde azul de 1px (favicon / apple / PWA)
//  - variant 'mask'   : full-bleed blanco sin borde (maskable → el SO enmascara)
const svg = (variant, S) => {
  const isMask = variant === 'mask';
  if (isMask) {
    const pad = Math.round(S * 0.19);
    const dim = S - pad * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect x="0" y="0" width="${S}" height="${S}" fill="#ffffff"/>
  <image href="${logoHref}" x="${pad}" y="${pad}" width="${dim}" height="${dim}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
  }
  const rx = Math.max(2, Math.round(S * 0.20));
  const pad = Math.round(S * 0.14);
  const dim = S - pad * 2;
  // Trazo de 0.5px (línea muy fina) centrado en x=0.5.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect x="0.5" y="0.5" width="${S - 1}" height="${S - 1}" rx="${rx}" fill="#ffffff" stroke="${BLUE}" stroke-width="0.5"/>
  <image href="${logoHref}" x="${pad}" y="${pad}" width="${dim}" height="${dim}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
};

const render = (variant, S, file) =>
  sharp(Buffer.from(svg(variant, S)), { density: 384 }).resize(S, S).png().toFile(file);

const sizes = [72, 96, 128, 192, 256, 384, 512];

for (const s of sizes) {
  await render('rounded', s, `public/brand/grapco-${s}.png`);
  await render('mask', s, `public/brand/grapco-${s}-mask.png`);
}
// Apple touch icon (180) + favicons
await render('rounded', 180, 'public/brand/grapco-apple-180.png');
await render('rounded', 32, 'public/brand/grapco-favicon-32.png');
await render('rounded', 16, 'public/brand/grapco-favicon-16.png');
// SVG maestro (a 512) por si se quiere reusar
writeFileSync('public/brand/grapco-icon.svg', svg('rounded', 512));

console.log('OK iconos regenerados: tile blanco + logo GRAPCO + borde azul de 1px real.');
