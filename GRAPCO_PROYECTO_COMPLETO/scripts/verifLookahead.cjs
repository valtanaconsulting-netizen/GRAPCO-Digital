// Verifica que la ventana Lookahead actual se llene con actividades del LAP.
const { LAP_CREDITEX } = require('../src/data/lapCreditex.js');
const INICIO = '2025-11-03';
const HOY = process.argv[2] || '2026-06-02';

const utc = (s) => { const [y,m,d] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
const obtenerSemana = (f, ini) => Math.max(1, Math.floor(Math.floor((utc(f)-utc(ini))/86400000)/7)+1);
const fechasDeSemana = (sem, ini) => {
  const inicio = new Date(ini+'T00:00:00');
  const dow = inicio.getDay();
  const desp = dow === 0 ? -6 : 1 - dow;
  const lun1 = new Date(inicio); lun1.setDate(inicio.getDate()+desp);
  const lun = new Date(lun1); lun.setDate(lun1.getDate()+(sem-1)*7);
  return Array.from({length:7},(_,i)=>{ const f=new Date(lun); f.setDate(lun.getDate()+i); return f.toISOString().slice(0,10); });
};

// Plan consolidado por nombre (última programación conocida).
const porNombre = new Map();
[...LAP_CREDITEX].sort((a,b)=>(a.semana||0)-(b.semana||0)).forEach(snap=>{
  (snap.actividades||[]).forEach(a=>{
    if (a.tipo!=='tarea'||!a.fechaIni) return;
    const k=(a.actividad||'').toUpperCase().trim(); if(!k) return;
    porNombre.set(k,{actividad:a.actividad,ini:a.fechaIni,fin:a.fechaFin,hh:a.hh,metrado:a.metrado,und:a.und});
  });
});
const plan = [...porNombre.values()];
console.log(`Plan LAP consolidado: ${plan.length} actividades únicas con fecha`);

const semAct = obtenerSemana(HOY, INICIO);
console.log(`HOY=${HOY} → SEMANA ACTUAL = ${semAct}\n`);
for (let i=0;i<6;i++){
  const sem = semAct+i;
  const dias = fechasDeSemana(sem, INICIO);
  const ini=dias[0], fin=dias[6];
  const acts = plan.filter(a=>a.ini<=fin && a.fin>=ini);
  console.log(`SEM ${sem} [${ini} → ${fin}] ${i===0?'(ACTUAL)':''} → ${acts.length} actividades`);
  acts.slice(0,3).forEach(a=>console.log(`    · ${a.actividad.slice(0,42)} (${a.ini}→${a.fin}, ${a.hh??'—'} HH)`));
}
