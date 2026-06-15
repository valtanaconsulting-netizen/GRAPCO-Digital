// _render.cjs — motor de diagramas SVG profesionales (marca GRAPCO). Sin dependencias.
// Layout por capas (filas) con cajas redondeadas, degradados, flechas con punta,
// abanicos de convergencia/divergencia limpios, etiquetas de arista y leyenda.
const fs = require('fs');
const path = require('path');

const PAL = {
  navy:'#0B1F39', navy2:'#16386a', gold:'#E5A82F', goldd:'#B7820F', goldsoft:'#FBE7BC',
  teal:'#0E8AA0', teald:'#0a6576', green:'#1f9d57', red:'#c0392b',
  ink:'#1c2733', muted:'#64748b', line:'#cbd7e6', soft:'#eef3f9', white:'#ffffff'
};
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function wrap(s, max){
  const words=String(s).split(/\s+/); const L=[]; let c='';
  for(const w of words){ if(!c) c=w; else if((c+' '+w).length<=max) c+=' '+w; else {L.push(c); c=w;} }
  if(c) L.push(c); return L;
}
const FW = 7.0;            // ancho aprox por caracter a 12.5px bold
function styleOf(t){
  switch(t){
    case 'src':  return {fill:'url(#gGold)', stroke:PAL.goldd, tcol:PAL.navy, scol:'#6b551f', tag:PAL.navy, sw:2};
    case 'coll': return {fill:'url(#gNavy)', stroke:PAL.navy, tcol:'#fff', scol:'#c7d6ea', tag:PAL.gold, sw:1.5};
    case 'out':  return {fill:'url(#gTeal)', stroke:PAL.teald, tcol:'#fff', scol:'#dff3f7', tag:'#fff', sw:1.5};
    case 'hub':  return {fill:'url(#gNavy)', stroke:PAL.gold, tcol:'#fff', scol:'#c7d6ea', tag:PAL.gold, sw:3};
    case 'note': return {fill:PAL.soft, stroke:PAL.line, tcol:PAL.navy, scol:PAL.muted, tag:PAL.muted, sw:1.2};
    case 'good': return {fill:'url(#gGreen)', stroke:'#157a42', tcol:'#fff', scol:'#dbf3e4', tag:'#fff', sw:1.5};
    default:     return {fill:'#ffffff', stroke:PAL.navy2, tcol:PAL.navy, scol:PAL.muted, tag:PAL.navy2, sw:1.5}; // proc
  }
}
// Mide/renderiza una caja. Devuelve {h, draw(top)}.
function box(nd, w){
  const st = styleOf(nd.type);
  const padY=11, padX=12;
  const tLines = wrap(nd.title, Math.max(8, Math.floor((w-2*padX)/FW)));
  const sLines = nd.sub ? wrap(nd.sub, Math.max(10, Math.floor((w-2*padX)/6.0))) : [];
  const th=17, sh=13, tagh = nd.tag?19:0;
  const h = Math.max(46, padY + tLines.length*th + (sLines.length?sLines.length*sh+3:0) + tagh + padY);
  function draw(cx, top){
    const x = cx - w/2;
    let y = top + padY + 13;
    let s = `<g filter="url(#shadow)">`;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="11" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.sw}"/>`;
    if(nd.type==='src'||nd.type==='hub') s += `<rect x="${x}" y="${top}" width="5" height="${h}" rx="2.5" fill="${PAL.gold}"/>`;
    for(const ln of tLines){ s += `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="12.5" font-weight="700" fill="${st.tcol}">${esc(ln)}</text>`; y+=th; }
    for(const ln of sLines){ s += `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="10.5" fill="${st.scol}">${esc(ln)}</text>`; y+=sh; }
    if(nd.tag){ const tw=nd.tag.length*6.4+16; s += `<rect x="${cx-tw/2}" y="${top+h-tagh-3}" width="${tw}" height="17" rx="8.5" fill="${nd.type==='proc'||nd.type==='note'?PAL.soft:'rgba(255,255,255,0.16)'}" stroke="${st.tag}" stroke-width="0.8"/><text x="${cx}" y="${top+h-tagh+9.5}" text-anchor="middle" font-family="Consolas,monospace" font-size="9.5" font-weight="700" fill="${st.tag}">${esc(nd.tag)}</text>`; }
    s += `</g>`;
    return s;
  }
  return { h, draw, w };
}

function render(spec){
  const W = spec.w || 1040;
  const padX = 26;
  const titleH = spec.title ? 56 : 12;
  const cL = padX, cW = W - 2*padX;
  const vGap = spec.vGap || 60;
  // medir capas
  let y = titleH + (spec.bands? 8: 16);
  const place = {}; const rows = [];
  for(const layer of spec.layers){
    const n = layer.length;
    let rowH = 46;
    const cells = layer.map((nd,i)=>{
      const w = nd.w || Math.min(spec.nodeW||230, Math.floor(cW/n) - 16);
      const cx = cL + (i+0.5)*(cW/n);
      const b = box(nd, w); rowH = Math.max(rowH, b.h);
      return {nd, cx, w, b};
    });
    cells.forEach(c=>{ place[c.nd.id] = {cx:c.cx, top:y, w:c.w, h:c.b.h, b:c.b}; });
    rows.push({cells, top:y, h:rowH});
    y += rowH + vGap;
  }
  const H = y - vGap + 18;

  // distribucion de extremos para abanicos limpios (in/out)
  const edges = (spec.edges||[]).map(e=>({...e}));
  const inByT = {}, outByS = {};
  edges.forEach(e=>{ (inByT[e.to]=inByT[e.to]||[]).push(e); (outByS[e.from]=outByS[e.from]||[]).push(e); });
  function spread(node, list, key){ // asigna x a lo largo del borde del nodo
    const N=list.length; if(!node) return;
    const span = Math.min(node.w-24, 24*(N-1)); const x0 = node.cx - span/2;
    list.sort((a,b)=>{ const pa=place[key==='end'?a.from:a.to]||{cx:0}, pb=place[key==='end'?b.from:b.to]||{cx:0}; return pa.cx-pb.cx; });
    list.forEach((e,i)=>{ e[key+'X'] = N===1? node.cx : x0 + (N===1?0:span*(i/(N-1))); });
  }
  Object.keys(inByT).forEach(t=> spread(place[t], inByT[t], 'end'));
  Object.keys(outByS).forEach(s=> spread(place[s], outByS[s], 'start'));

  // SVG defs
  const markers = [['mNavy',PAL.navy2],['mGold',PAL.goldd],['mTeal',PAL.teald],['mGrey','#8aa0bb'],['mGreen','#157a42'],['mRed',PAL.red]]
    .map(([id,c])=>`<marker id="${id}" markerWidth="11" markerHeight="11" refX="8.5" refY="5" orient="auto"><path d="M1,1 L9,5 L1,9 L3.2,5 Z" fill="${c}"/></marker>`).join('');
  const defs = `<defs>
    <linearGradient id="gNavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a63"/><stop offset="1" stop-color="${PAL.navy}"/></linearGradient>
    <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C45A"/><stop offset="1" stop-color="${PAL.gold}"/></linearGradient>
    <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13a6c0"/><stop offset="1" stop-color="${PAL.teal}"/></linearGradient>
    <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27b265"/><stop offset="1" stop-color="${PAL.green}"/></linearGradient>
    <filter id="shadow" x="-8%" y="-8%" width="116%" height="130%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.6" flood-color="#0b1f39" flood-opacity="0.18"/></filter>
  </defs>`;

  // bandas (swimlanes) de fondo
  let bands='';
  if(spec.bands){
    for(const bd of spec.bands){
      const top = rows[bd.from].top - 16; const bot = rows[bd.to].top + rows[bd.to].h + 16;
      bands += `<rect x="10" y="${top}" width="${W-20}" height="${bot-top}" rx="14" fill="${bd.fill||'#f7fafd'}" stroke="${bd.stroke||PAL.line}" stroke-width="1" stroke-dasharray="${bd.dash||'0'}"/>`;
      bands += `<text x="24" y="${top+20}" font-family="Segoe UI,Arial" font-size="11.5" font-weight="800" letter-spacing="1.5" fill="${bd.label_col||PAL.muted}">${esc(bd.label||'')}</text>`;
    }
  }

  // aristas
  function edgePath(e){
    const a = place[e.from], b = place[e.to]; if(!a||!b) return '';
    const up = b.top > a.top; // destino mas abajo => normal (down). si destino arriba => up
    let sx = e.startX ?? a.cx, ex = e.endX ?? b.cx, sy, ey, mk, col;
    const down = b.top >= a.top;
    if(down){ sy = a.top + a.h; ey = b.top; } else { sy = a.top; ey = b.top + b.h; }
    col = e.color || (down?PAL.navy2:'#8aa0bb');
    mk = e.color===PAL.gold?'mGold': e.color===PAL.teal?'mTeal': e.color===PAL.green?'mGreen': e.color===PAL.red?'mRed': (!down?'mGrey':'mNavy');
    const my = (sy+ey)/2;
    let d;
    if(Math.abs(sx-ex)<3) d = `M${sx},${sy} L${ex},${ey}`;
    else d = `M${sx},${sy} L${sx},${my} L${ex},${my} L${ex},${ey}`;
    let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${e.w||2}" ${e.dash?`stroke-dasharray="${e.dash}"`:''} marker-end="url(#${mk})" opacity="${e.op||0.9}"/>`;
    if(e.label){ const lw=e.label.length*5.7+14; const ly=my; s += `<rect x="${(sx+ex)/2-lw/2}" y="${ly-9}" width="${lw}" height="17" rx="8" fill="#fff" stroke="${col}" stroke-width="0.9"/><text x="${(sx+ex)/2}" y="${ly+3.5}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="9.5" font-weight="700" fill="${col}">${esc(e.label)}</text>`; }
    return s;
  }
  const edgesSvg = edges.map(edgePath).join('');

  // nodos
  let nodesSvg='';
  for(const r of rows) for(const c of r.cells) nodesSvg += c.b.draw(c.cx, r.top);

  // titulo
  let title='';
  if(spec.title){
    title = `<rect x="0" y="0" width="${W}" height="44" rx="0" fill="${PAL.navy}"/><rect x="0" y="0" width="6" height="44" fill="${PAL.gold}"/>`+
            `<text x="20" y="28" font-family="Segoe UI,Arial" font-size="16" font-weight="800" fill="#fff">${esc(spec.title)}</text>`+
            `<text x="${W-16}" y="27" text-anchor="end" font-family="Segoe UI,Arial" font-size="10.5" font-weight="800" letter-spacing="2" fill="${PAL.gold}">GRAPCO · VDC</text>`;
  }
  // leyenda
  let legend='';
  if(spec.legend){
    let lx = 22; const ly = H-6;
    legend += `<g>`;
    for(const lg of spec.legend){ const st=styleOf(lg.type); legend += `<rect x="${lx}" y="${ly-11}" width="15" height="12" rx="3" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1"/><text x="${lx+20}" y="${ly-1}" font-family="Segoe UI,Arial" font-size="10.5" fill="${PAL.muted}">${esc(lg.label)}</text>`; lx += 26 + lg.label.length*6.0 + 14; }
    legend += `</g>`;
  }
  const legendH = spec.legend? 22:0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H+legendH}" width="${W}" height="${H+legendH}" font-family="Segoe UI,Arial" role="img">${defs}<rect x="0" y="0" width="${W}" height="${H+legendH}" fill="#ffffff"/>${bands}${title}${edgesSvg}${nodesSvg}${legend}</svg>`;
}

module.exports = { render, PAL };

// Si se ejecuta directo: render de prueba del diagrama RO
if(require.main===module){
  const ro = require('./_specs.cjs').RO;
  fs.writeFileSync(path.join(__dirname,'_test_ro.svg'), render(ro));
  console.log('OK _test_ro.svg');
}
