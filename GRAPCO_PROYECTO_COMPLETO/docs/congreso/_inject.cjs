const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { render } = require('./_render.cjs');
const S = require('./_specs.cjs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DIR = __dirname;
const MAP = {
  'Informe-Mapa-GRAPCO.html': ['PLANIFICACION', 'PRODUCCION', 'RO'],
  'Paper-Congreso-GRAPCO.html': ['GLOBAL', 'RO', 'F05', 'LPS'],
  'Poster-Congreso-GRAPCO.html': ['GLOBAL', 'BALANZA'],
};
const CSS = '.svgfig{margin:18px 0;text-align:center;break-inside:avoid}.svgfig svg{max-width:100%;height:auto;display:inline-block;border:1px solid #e3e9f0;border-radius:12px;box-shadow:0 6px 20px rgba(11,31,57,.08)}';

for (const [file, keys] of Object.entries(MAP)) {
  let h = fs.readFileSync(path.join(DIR, file), 'utf8');
  if (!h.includes('.svgfig{')) h = h.replace('</style>', CSS + '</style>');
  let i = 0;
  h = h.replace(/<div class="diagram">[\s\S]*?<\/div>/g, () => {
    const k = keys[i++];
    return k ? '<div class="svgfig">' + render(S[k]) + '</div>' : '';
  });
  fs.writeFileSync(path.join(DIR, file), h);
  console.log(file, '->', i, 'diagramas SVG');
}

const toUrl = (p) => 'file:///' + p.split(path.sep).join('/');
for (const file of Object.keys(MAP)) {
  const hp = path.join(DIR, file);
  const pp = hp.replace(/\.html$/, '.pdf');
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-pdf-header-footer',
    '--print-to-pdf=' + pp, toUrl(hp)], { stdio: ['ignore', 'ignore', 'ignore'] });
  console.log('PDF', path.basename(pp), (fs.statSync(pp).size / 1024).toFixed(0) + 'KB');
}
console.log('LISTO');
