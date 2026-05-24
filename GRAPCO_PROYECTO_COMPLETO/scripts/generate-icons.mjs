// scripts/generate-icons.mjs
// Genera iconos PWA en múltiples tamaños desde el logo cuadrado del cliente.
// Output → public/icons/icon-{72,96,128,192,512}.png
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const SRC = path.resolve('../public/grapco-logo-square.jpeg');
const OUT_DIR = path.resolve('../public/icons');
const SIZES = [72, 96, 128, 192, 256, 384, 512];
const PADDING_BG = '#0F2A47'; // navy GRAPCO para los lados maskable

fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `icon-${size}.png`);
    // Iconos "any" → logo a tamaño completo
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: PADDING_BG })
      .png()
      .toFile(out);
    console.log(`✓ ${out}`);

    // Iconos "maskable" → con padding extra (la imagen se mueve al centro)
    const outMask = path.join(OUT_DIR, `icon-${size}-maskable.png`);
    const inner = Math.round(size * 0.7); // 30 % de padding total
    const innerBuf = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: PADDING_BG }).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: PADDING_BG },
    })
      .composite([{ input: innerBuf, gravity: 'center' }])
      .png()
      .toFile(outMask);
    console.log(`✓ ${outMask}`);
  }
  console.log(`\nGenerados ${SIZES.length * 2} iconos en ${OUT_DIR}`);
})();
