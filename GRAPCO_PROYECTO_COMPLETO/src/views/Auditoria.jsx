// src/views/ingeniero/Auditoria.jsx — V2 con CPI %
import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import { calcCPI, getEstado, fmt1, fmtCPIPct } from '../utils/helpers';
import { FotoGaleriaCompacta } from '../components/FotoUploader';
import VistaHeader from '../components/VistaHeader';
import Modal from '../components/Modal';
import PlanillaMetrado, { TIPOS_METRADO, parcialFila } from './oficinatecnica/PlanillaMetrado';

export default function Auditoria({ filtrados, eliminar, guardarMetrado, hhPorSemana = [], hhTotales = { hn:0, he:0, total:0 }, totalBaseDatos = 0 }) {
  const [hhOpen, setHhOpen] = useState(false);
  const [metrarReg, setMetrarReg] = useState(null);   // registro al que se le está editando el metrado
  const [diaSel, setDiaSel] = useState('');           // filtro por día (chip de HH); '' = todos

  const calcularHHRegistro = (r) => {
    let hn = 0, he = 0;
    (r.detalleTareo || []).forEach(t => {
      if (!t) return;
      hn += parseFloat(t.hn) || 0;
      he += parseFloat(t.he) || 0;
    });
    if (hn === 0 && he === 0 && r.totalHH) hn = parseFloat(r.totalHH) || 0;
    return { hn, he, total: hn + he };
  };

  const fuenteIcon = (fuente) => {
    switch (fuente) {
      case 'registro':            return { icon: '✓', color: BASE.green,  title: 'IP del registro' };
      case 'catalogo':            return { icon: '📚', color: BASE.navy,   title: 'IP del catálogo' };
      case 'promedio_historico':  return { icon: '📊', color: BASE.navyLight,  title: 'IP calculado del promedio histórico' };
      case 'auto_real':           return { icon: '⚙️', color: BASE.gold,  title: 'IP autoinferido del propio registro' };
      case 'metrado_cero':        return { icon: '∅',  color: BASE.muted, title: 'Metrado = 0, IP no aplica' };
      default:                    return { icon: '?',  color: BASE.muted, title: 'Sin datos' };
    }
  };

  // Resumen de HH del set filtrado: total + desglose por día (más reciente primero).
  // Suma la columna HH Tot de los registros visibles (mismo criterio que la tabla).
  const hhPorDia = {};
  let hhTotalFiltrado = 0;
  (filtrados || []).forEach(r => {
    const { total } = calcularHHRegistro(r);
    hhTotalFiltrado += total;
    const dia = r.fecha || '—';
    hhPorDia[dia] = (hhPorDia[dia] || 0) + total;
  });
  const diasOrdenados = Object.keys(hhPorDia).sort((a, b) => (a < b ? 1 : -1)); // desc
  const DIAS_VISIBLES = 10;
  const diasMostrar = diasOrdenados.slice(0, DIAS_VISIBLES);
  const diasOcultos = diasOrdenados.length - diasMostrar.length;
  const fmtDia = (d) => (d && d.length >= 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : d);
  const DOW = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const diaSemana = (d) => {
    if (!d || d.length < 10) return d;
    const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
    return DOW[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
  };
  // Registros mostrados en la tabla: si hay un día seleccionado (chip), solo ese día.
  const filtradosVista = diaSel ? (filtrados || []).filter(r => r.fecha === diaSel) : (filtrados || []);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* TABLA AUDITORÍA — overflow:visible: el scroll lo maneja el contenedor único de
          Ingeniero, así el encabezado sticky se ancla a ÉL y queda fijo arriba al bajar. */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'visible',boxShadow:BASE.shadowMd}}>
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap',borderBottom:`1px solid ${BASE.border}`,background:BASE.bgSoft}}>
          <span style={{fontSize:'12px',fontWeight:'700',color:BASE.navy,whiteSpace:'nowrap'}}>REGISTROS — Más reciente arriba</span>
          <div style={{display:'flex',alignItems:'center',gap:'7px',flexWrap:'wrap',justifyContent:'flex-end'}}>
            <span style={{fontSize:'10px',color:BASE.muted,whiteSpace:'nowrap'}}>{filtradosVista.length} registros</span>
            {/* HH totales del set filtrado */}
            <span style={{display:'inline-flex',alignItems:'baseline',gap:'5px',background:BASE.white,border:`1px solid ${BASE.border}`,borderRadius:'7px',padding:'3px 9px',whiteSpace:'nowrap'}}>
              <span style={{fontSize:'9px',fontWeight:'800',color:BASE.muted,letterSpacing:'0.5px'}}>HH TOTALES</span>
              <span style={{fontSize:'12px',fontWeight:'900',color:BASE.navy,fontFamily:'var(--grapco-font-mono, monospace)'}}>{fmt1(hhTotalFiltrado)}</span>
            </span>
            {/* HH por DÍA de la semana (LUN/MAR/…); click filtra la tabla a ese día */}
            {diasMostrar.map(d => {
              const activo = diaSel === d;
              return (
                <button key={d} onClick={() => setDiaSel(activo ? '' : d)} title={fmtDia(d)}
                  style={{display:'inline-flex',alignItems:'baseline',gap:'5px',cursor:'pointer',
                    background:activo?BASE.navy:BASE.white,border:`1px solid ${activo?BASE.navy:BASE.border}`,
                    borderLeft:`3px solid ${BASE.gold}`,borderRadius:'7px',padding:'3px 9px',whiteSpace:'nowrap'}}>
                  <span style={{fontSize:'9.5px',fontWeight:'800',color:activo?'#fff':BASE.muted,letterSpacing:'0.3px'}}>{diaSemana(d)}</span>
                  <span style={{fontSize:'11px',fontWeight:'800',color:activo?'#fff':BASE.navy,fontFamily:'var(--grapco-font-mono, monospace)'}}>{fmt1(hhPorDia[d])} HH</span>
                </button>
              );
            })}
            {diasOcultos > 0 && (
              <span style={{fontSize:'10px',color:BASE.mutedSoft,fontWeight:'700',whiteSpace:'nowrap'}}>+{diasOcultos} días</span>
            )}
            {diaSel && (
              <button onClick={() => setDiaSel('')} title="Ver todos los días"
                style={{cursor:'pointer',background:'transparent',border:`1px solid ${BASE.border}`,borderRadius:'7px',padding:'3px 9px',fontSize:'10px',fontWeight:'700',color:BASE.muted,whiteSpace:'nowrap'}}>
                ✕ todos
              </button>
            )}
          </div>
        </div>
        {/* overflow:visible (NO 'auto'): un overflow:auto/scroll haría de este div un contenedor
            de scroll que "captura" el sticky e impide que el encabezado se ancle a la ventana.
            Sin contenedor de scroll, el encabezado se pega de verdad bajo el navbar al bajar. */}
        <div style={{overflow:'visible'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'960px'}}>
            <thead>
              {/* sticky top:0 = se queda fijo arriba del contenedor de scroll de Ingeniero al bajar */}
              <tr>{['Sem.','Fecha','Partida','Actividad','Unidad','M. Reportado','M. Validado','HN','HE','HH Tot','IP Real','IP Meta','CPI','Fuente','📷',''].map((h,i)=>(
                <th key={i} style={{position:'sticky',top:0,zIndex:5,padding:'11px 10px',fontSize:'11px',fontWeight:'700',color:'#fff',background:BASE.navy,textAlign:i>4?'center':'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {!filtradosVista.length
                ? <tr><td colSpan={16} style={{padding:'48px',textAlign:'center',color:BASE.muted}}>
                    <p style={{fontSize:'40px',marginBottom:'8px'}}>📋</p>
                    <p style={{fontSize:'13px',fontWeight:'600'}}>Sin registros para los filtros aplicados</p>
                  </td></tr>
                : filtradosVista.map((r,idx)=>{
                  const ipReal = r._ipReal || r.ipReal;
                  const ipMeta = r._ipMeta || r.ipMeta;
                  const cpi = calcCPI(ipMeta, ipReal);
                  const cc = getEstado(cpi);
                  const { hn, he, total } = calcularHHRegistro(r);
                  const fuzzyMatch = r._matched && r._matchScore !== undefined && r._matchScore < 1;
                  const fnt = fuenteIcon(r._ipFuente);
                  // Dos metrados lado a lado: REPORTADO (capataz) vs VALIDADO (OT).
                  const metReportado = Number(r.metradoReportado ?? r.metrado) || 0;
                  const metValidado  = Number(r.metradoValidado ?? r.metradoReportado ?? r.metrado) || 0;
                  const metDifiere = Math.abs(metValidado - metReportado) > 0.001;
                  return (
                    <tr key={r.id} style={{background:idx%2===0?BASE.white:BASE.bgSoft,borderBottom:`1px solid ${BASE.border}`}}>
                      <td style={{padding:'10px 13px',fontWeight:'700',color:BASE.navy}}>S{r.semana}</td>
                      <td style={{padding:'10px 13px',color:BASE.muted,fontSize:'11px'}}>{r.fecha}</td>
                      <td style={{padding:'10px 13px',fontSize:'10px',color:BASE.muted,maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.partida}>
                        {r._partidaCanonica || r.partida}
                      </td>
                      <td style={{padding:'10px 13px',fontWeight:'600',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.actividad}>
                        {fuzzyMatch && (<span style={{fontSize:'9px',color:BASE.navyLight,marginRight:'4px'}} title={`Catálogo: ${r._actividadCanonica}`}>≈</span>)}
                        {r.actividad}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center',color:BASE.navy,fontWeight:'700',fontSize:'11px'}}>
                        <span style={{background:BASE.navySoft,padding:'2px 8px',borderRadius:'10px',border:`1px solid ${BASE.border}`}}>{r.unidad || '—'}</span>
                      </td>
                      {/* M. REPORTADO (capataz) — solo lectura; toda actividad muestra su metrado (0 incl.) */}
                      <td style={{padding:'10px 13px',textAlign:'center',color:BASE.muted,fontWeight:'600',fontFamily:'var(--grapco-font-mono, monospace)'}}>
                        {Number(metReportado).toLocaleString('es-PE',{maximumFractionDigits:2})}
                      </td>
                      {/* M. VALIDADO (OT) — siempre visible (default = reportado), editable con el modal; borde dorado si OT corrigió */}
                      <td style={{padding:'6px 8px',textAlign:'center'}}>
                        {guardarMetrado ? (
                          <button
                            onClick={()=>setMetrarReg(r)}
                            title={metDifiere ? `Validado por OT · capataz reportó ${metReportado}` : 'Editar metrado validado'}
                            style={{
                              display:'inline-flex',alignItems:'center',gap:'4px',
                              padding:'4px 9px',borderRadius:'7px',cursor:'pointer',
                              fontSize:'12px',fontWeight:'700',
                              fontFamily:'var(--grapco-font-mono, monospace)',
                              color:BASE.navy,
                              background:BASE.bgSoft,
                              border:`1px solid ${metDifiere?BASE.gold:BASE.border}`,
                              transition:'all 0.12s',
                            }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=BASE.gold;e.currentTarget.style.background='#fffaf2';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor=metDifiere?BASE.gold:BASE.border;e.currentTarget.style.background=BASE.bgSoft;}}>
                            {Number(metValidado).toLocaleString('es-PE',{maximumFractionDigits:2})} <span style={{fontSize:'9px',opacity:0.55}}>✎</span>
                          </button>
                        ) : (
                          <span style={{color:BASE.text,fontWeight:'400'}}>{Number(metValidado).toLocaleString('es-PE',{maximumFractionDigits:2})}</span>
                        )}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center',color:BASE.text}}>{fmt1(hn)}</td>
                      <td style={{padding:'10px 13px',textAlign:'center',color:he>0?BASE.orange:BASE.muted,fontWeight:he>0?'700':'400'}}>{fmt1(he)}</td>
                      <td style={{padding:'10px 13px',textAlign:'center',fontWeight:'700',color:BASE.navy}}>{fmt1(total)}</td>
                      <td style={{padding:'10px 13px',textAlign:'center',fontWeight:'700',color:BASE.text}}>
                        {ipReal ? parseFloat(ipReal).toFixed(3) : '—'}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center',color:BASE.muted}}>
                        {ipMeta ? parseFloat(ipMeta).toFixed(3) : '—'}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center',fontWeight:'800',color:cc.color,background:cc.bg}}>
                        {fmtCPIPct(cpi)}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center'}} title={fnt.title}>
                        <span style={{fontSize:'14px',color:fnt.color}}>{fnt.icon}</span>
                      </td>
                      <td style={{padding:'6px 8px',textAlign:'center'}}>
                        {(r.fotos && r.fotos.length > 0) ? (
                          <FotoGaleriaCompacta fotos={r.fotos} meta={{
                            observacion: r.observacion || r.observaciones || r.causas || '',
                            actividad: r._actividadCanonica || r.actividad || '',
                            partida: r._partidaCanonica || r.partida || '',
                            fecha: r.fecha,
                          }} />
                        ) : (
                          <span style={{fontSize:'10px',color:BASE.muted,opacity:0.4}}>—</span>
                        )}
                      </td>
                      <td style={{padding:'10px 13px',textAlign:'center'}}>
                        <button onClick={()=>eliminar(r)} style={{padding:'4px 10px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div style={{padding:'8px 14px',borderTop:`1px solid ${BASE.border}`,background:BASE.bgSoft,fontSize:'10px',color:BASE.muted,display:'flex',gap:'14px',flexWrap:'wrap'}}>
          <span><span style={{color:BASE.green}}>✓</span> Registro</span>
          <span><span style={{color:BASE.navy}}>📚</span> Catálogo</span>
          <span><span style={{color:BASE.navyLight}}>📊</span> Promedio histórico</span>
          <span><span style={{color:BASE.gold}}>⚙️</span> Auto inferido</span>
          <span><span style={{color:BASE.muted}}>∅</span> Sin metrado</span>
        </div>
      </div>

      {/* MODAL: metrar un registro — valor directo o planilla de cómputo (formato) */}
      {metrarReg && (
        <ModalMetrado
          registro={metrarReg}
          onCerrar={()=>setMetrarReg(null)}
          onGuardar={async (payload)=>{ await guardarMetrado(metrarReg, payload); }}
        />
      )}
    </div>
  );
}

// Infiere el TIPO de formato de metrado a partir de la partida / actividad / unidad
// del registro. Es solo un valor inicial: el selector de la planilla permite cambiarlo.
function inferirTipoMetrado(r) {
  const txt = `${r._partidaCanonica || r.partida || ''} ${r._actividadCanonica || r.actividad || ''}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (/ACERO|REFUERZO|VARILLA|FIERRO/.test(txt)) return 'acero';
  if (/ENCOFRAD/.test(txt)) return 'encofrado';
  if (/TARRAJEO|SOLAQUEO|REVOQUE/.test(txt)) return 'tarrajeo';
  if (/DEMOLIC/.test(txt)) return 'demolicion';
  if (/ELIMINAC|DESMONTE|ACARREO|VOLQUETE/.test(txt)) return 'eliminacion';
  if (/EXCAVAC/.test(txt)) return 'excavacion';
  if (/RELLENO/.test(txt)) return 'relleno';
  if (/CONCRETO|VACIAD|ZAPATA|COLUMNA|VIGA|LOSA|SOLADO|CIMIENTO|PLACA/.test(txt)) return 'concreto';
  // Respaldo por unidad del registro
  const u = (r.unidad || '').toLowerCase();
  if (u === 'kg') return 'acero';
  if (u === 'm2') return 'encofrado';
  if (u === 'm3') return 'concreto';
  return 'generico';
}

// ────────────────────────────────────────────────────────────────────────────
// Modal para METRAR un registro: dos modos — (1) valor directo o (2) usar un
// FORMATO (PlanillaMetrado: concreto m³, acero kg, encofrado m², excavación,
// eliminación/volquetes, demolición…). El total calculado se guarda como el
// metrado del registro; el IP Real y el CPI se recalculan solos.
// ────────────────────────────────────────────────────────────────────────────
function ModalMetrado({ registro: r, onCerrar, onGuardar }) {
  const tipoInicial = r.tipoMetrado || inferirTipoMetrado(r);
  const tieneFormato = Array.isArray(r.detalleMetrado) && r.detalleMetrado.length > 0;
  const [modo, setModo] = useState(tieneFormato ? 'formato' : 'directo'); // 'directo' | 'formato'

  // Modo directo — parte del ÚLTIMO metrado VALIDADO por OT (no del reportado del
  // capataz), para no revertir la validación previa al reabrir y guardar.
  const metBase = r.metradoValidado ?? r.metradoReportado ?? r.metrado;
  const [valor, setValor] = useState(metBase != null ? String(metBase) : '');
  const [unidadDir, setUnidadDir] = useState(r.unidad || '');

  // Modo formato (planilla)
  const totalInicial = (r.detalleMetrado || []).reduce((s, f) => s + parcialFila(tipoInicial, f), 0);
  const [pTipo, setPTipo]     = useState(tipoInicial);
  const [pUnidad, setPUnidad] = useState(r.unidad || TIPOS_METRADO[tipoInicial]?.unidad || 'und');
  const [pDetalle, setPDetalle] = useState(r.detalleMetrado || []);
  const [pMeta, setPMeta]     = useState(r.metaMetrado || {});
  const [pTotal, setPTotal]   = useState(Math.round(totalInicial * 1000) / 1000);

  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      if (modo === 'directo') {
        await onGuardar({
          metrado: parseFloat(valor) || 0,
          unidad: unidadDir || undefined,
          tipoMetrado: null, detalleMetrado: [], metaMetrado: {},
        });
      } else {
        await onGuardar({
          metrado: pTotal,
          unidad: pUnidad,
          tipoMetrado: pTipo,
          detalleMetrado: pDetalle,
          metaMetrado: pMeta,
        });
      }
      onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  const partida = r._partidaCanonica || r.partida || '—';
  const totalMostrar = modo === 'directo' ? (parseFloat(valor) || 0) : pTotal;
  const unidadMostrar = modo === 'directo' ? (unidadDir || r.unidad || '') : pUnidad;

  return (
    <Modal onClose={onCerrar} title="Metrar registro" maxW="900px">
      {/* Contexto del registro */}
      <div style={{
        display:'flex',flexWrap:'wrap',gap:'10px',alignItems:'center',
        background:BASE.bgSoft,border:`1px solid ${BASE.border}`,borderRadius:'10px',
        padding:'10px 14px',marginBottom:'14px',
      }}>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:'9.5px',fontWeight:'800',color:BASE.muted,letterSpacing:'0.5px',margin:0}}>{partida}</p>
          <p style={{fontSize:'13px',fontWeight:'800',color:BASE.navy,margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.actividad}</p>
          <p style={{fontSize:'10px',color:BASE.muted,margin:'2px 0 0'}}>S{r.semana} · {r.fecha}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{fontSize:'9.5px',fontWeight:'800',color:BASE.muted,letterSpacing:'0.5px',margin:0}}>METRADO A GUARDAR</p>
          <p style={{fontSize:'20px',fontWeight:'900',color:BASE.goldDark,margin:'2px 0 0',fontFamily:'var(--grapco-font-mono, monospace)'}}>
            {Number(totalMostrar).toLocaleString('es-PE', { maximumFractionDigits: 3 })}
            <span style={{fontSize:'11px',color:BASE.muted,marginLeft:'5px'}}>{unidadMostrar}</span>
          </p>
        </div>
      </div>

      {/* Selector de modo: valor directo vs formato */}
      <div style={{display:'inline-flex',background:'#f1f5f9',borderRadius:'10px',padding:'4px',gap:'4px',marginBottom:'16px'}}>
        {[
          { key:'directo', label:'① Valor directo', icono:'⌨️' },
          { key:'formato', label:'② Usar formato',  icono:'📐' },
        ].map(b => {
          const activo = modo === b.key;
          return (
            <button key={b.key} type="button" onClick={()=>setModo(b.key)} style={{
              padding:'8px 16px',
              background: activo ? BASE.navy : 'transparent',
              color: activo ? '#fff' : BASE.muted,
              border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:'800',cursor:'pointer',
              display:'inline-flex',alignItems:'center',gap:'7px',transition:'all 0.15s',
            }}>
              <span style={{fontSize:'14px'}}>{b.icono}</span>{b.label}
            </button>
          );
        })}
      </div>

      {modo === 'directo' ? (
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',alignItems:'end'}}>
          <div>
            <label style={{display:'block',fontSize:'10px',fontWeight:'800',color:BASE.muted,marginBottom:'5px',letterSpacing:'0.4px'}}>METRADO</label>
            <input
              type="number" min="0" step="0.01" autoFocus
              value={valor} onChange={e=>setValor(e.target.value)}
              placeholder="0.00"
              style={{width:'100%',padding:'11px 13px',borderRadius:'9px',border:`1.5px solid ${BASE.border}`,fontSize:'16px',fontWeight:'700',fontFamily:'var(--grapco-font-mono, monospace)',boxSizing:'border-box',outline:'none'}}
            />
          </div>
          <div>
            <label style={{display:'block',fontSize:'10px',fontWeight:'800',color:BASE.muted,marginBottom:'5px',letterSpacing:'0.4px'}}>UNIDAD</label>
            <input
              type="text" value={unidadDir} onChange={e=>setUnidadDir(e.target.value)}
              placeholder="m3, kg, m2…"
              style={{width:'100%',padding:'11px 13px',borderRadius:'9px',border:`1.5px solid ${BASE.border}`,fontSize:'14px',fontWeight:'700',textAlign:'center',boxSizing:'border-box',outline:'none'}}
            />
          </div>
        </div>
      ) : (
        <PlanillaMetrado
          tipo={pTipo}
          unidad={pUnidad}
          detalle={pDetalle}
          meta={pMeta}
          onChange={({ tipo, unidad, detalle, total, meta }) => {
            setPTipo(tipo); setPUnidad(unidad); setPDetalle(detalle);
            setPTotal(total); setPMeta(meta || {});
          }}
        />
      )}

      {/* Acciones */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',marginTop:'18px'}}>
        <button onClick={onCerrar} disabled={guardando} style={{
          padding:'10px 20px',borderRadius:'9px',background:'#fff',color:BASE.navy,
          border:`1.5px solid ${BASE.border}`,fontSize:'12px',fontWeight:'700',cursor:'pointer',
        }}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{
          padding:'10px 22px',borderRadius:'9px',background:BASE.navy,color:'#fff',
          border:'none',fontSize:'12px',fontWeight:'800',cursor:'pointer',letterSpacing:'0.4px',
          opacity: guardando ? 0.6 : 1,
        }}>{guardando ? 'Guardando…' : 'Guardar metrado'}</button>
      </div>
    </Modal>
  );
}