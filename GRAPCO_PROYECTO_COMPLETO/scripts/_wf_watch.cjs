// Watcher de progreso del workflow. Uso: node _wf_watch.cjs "<journal.jsonl>" [total=21]
// Emite una linea por cada agente que termina (evento "result") y cierra al completar.
const fs = require('fs');
const journal = process.argv[2];
const total = parseInt(process.argv[3] || '21', 10);

let seen = 0;
let stableTicks = 0;
const MAX_TICKS = 35;       // ~7 min a 12s
const INTERVAL = 12000;

function label(r) {
  if (!r || !r.result) return '(agente)';
  const o = r.result;
  if (o.resumenEjecutivo) return 'SINTESIS — informe consolidado';
  return String(o.area || '(agente)').replace(/\s+/g, ' ').slice(0, 90);
}

function tick(n) {
  let lines = [];
  try { lines = fs.readFileSync(journal, 'utf8').split(/\r?\n/).filter(Boolean); }
  catch { console.log(`[espera] journal aun no disponible (tick ${n})`); return false; }
  const res = lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
                   .filter(x => x && x.type === 'result');
  if (res.length > seen) {
    for (let i = seen; i < res.length; i++) console.log(`OK ${i + 1}/${total} | ${label(res[i])}`);
    seen = res.length;
    stableTicks = 0;
  } else {
    stableTicks++;
  }
  if (seen >= total) { console.log(`LISTO Auditoria completa: ${seen}/${total} agentes`); return true; }
  if (seen >= total - 1 && stableTicks >= 5) { console.log(`LISTO ${seen}/${total} (sintesis cerrando)`); return true; }
  return false;
}

(async () => {
  for (let n = 1; n <= MAX_TICKS; n++) {
    if (tick(n)) process.exit(0);
    await new Promise(r => setTimeout(r, INTERVAL));
  }
  console.log(`[fin watcher] ${seen}/${total} tras tiempo maximo`);
})();
