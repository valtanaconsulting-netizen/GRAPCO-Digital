// Divide el catalogo grande en un .txt por categoria (segun la 2da carpeta del relpath).
const fs = require('fs');
const dir = __dirname + '/_costos_catalog';
const src = fs.readFileSync(dir + '/05__Gesti_n_Costos.txt', 'utf8');
const blocks = src.split(/(?=########## ARCHIVO: )/).filter(b => b.includes('ARCHIVO:'));
const byCat = {};
for (const b of blocks) {
  const mm = b.match(/ARCHIVO:\s*\\?05\.[^\\]+\\(\d+\.\s*[^\\]+)\\/);
  const cat = mm ? mm[1].trim() : 'raiz';
  (byCat[cat] = byCat[cat] || []).push(b);
}
const idx = [];
for (const [cat, arr] of Object.entries(byCat)) {
  const safe = cat.replace(/[^0-9A-Za-z]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  const fn = 'cat_' + safe + '.txt';
  fs.writeFileSync(dir + '/' + fn, ('CATEGORIA: ' + cat + '\n\n' + arr.join('\n')), 'utf8');
  const kb = Math.round(fs.statSync(dir + '/' + fn).size / 1024);
  idx.push({ cat, fn, archivos: arr.length, kb });
}
idx.sort((a, b) => a.cat.localeCompare(b.cat, 'es', { numeric: true }));
idx.forEach(x => console.log(`${String(x.archivos).padStart(3)} archivos · ${String(x.kb).padStart(5)} KB · ${x.fn}`));
console.log('\nTOTAL bloques: ' + blocks.length + ' · categorias: ' + idx.length);
fs.writeFileSync(dir + '/_index.json', JSON.stringify(idx, null, 2), 'utf8');
