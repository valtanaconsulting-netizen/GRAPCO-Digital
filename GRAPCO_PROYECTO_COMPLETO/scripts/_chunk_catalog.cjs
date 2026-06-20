// Trocea cada cat_*.txt en piezas <=170KB (por bloques de ARCHIVO) para repartir a agentes.
const fs = require('fs');
const dir = __dirname + '/_costos_catalog';
const MAX = 170 * 1024;
const cats = fs.readdirSync(dir).filter(f => /^cat_.*\.txt$/.test(f) && !/__p\d+\.txt$/.test(f));
const chunks = [];
for (const cf of cats) {
  const full = dir + '/' + cf;
  const src = fs.readFileSync(full, 'utf8');
  const head = (src.match(/^CATEGORIA:.*$/m) || ['CATEGORIA: ?'])[0];
  const blocks = src.split(/(?=########## ARCHIVO: )/).filter(b => b.includes('ARCHIVO:'));
  const base = cf.replace(/\.txt$/, '');
  if (Buffer.byteLength(src) <= MAX) {
    chunks.push({ file: cf, cat: head, archivos: blocks.length, kb: Math.round(Buffer.byteLength(src) / 1024) });
    continue;
  }
  // trocear
  let part = 1, buf = head + '\n\n', cnt = 0;
  const flush = () => {
    const fn = base + '__p' + part + '.txt';
    fs.writeFileSync(dir + '/' + fn, buf, 'utf8');
    chunks.push({ file: fn, cat: head, archivos: cnt, kb: Math.round(Buffer.byteLength(buf) / 1024) });
    part++; buf = head + ' (cont. ' + part + ')\n\n'; cnt = 0;
  };
  for (const b of blocks) {
    if (Buffer.byteLength(buf) + Buffer.byteLength(b) > MAX && cnt > 0) flush();
    buf += b + '\n'; cnt++;
  }
  if (cnt > 0) flush();
}
chunks.sort((a, b) => a.file.localeCompare(b.file, 'es', { numeric: true }));
chunks.forEach(c => console.log(`${String(c.archivos).padStart(3)} arch · ${String(c.kb).padStart(4)} KB · ${c.file}`));
console.log('\nTOTAL chunks a analizar: ' + chunks.length);
fs.writeFileSync(dir + '/_chunks.json', JSON.stringify(chunks, null, 2), 'utf8');
