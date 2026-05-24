// src/views/ingeniero/Auditoria.jsx — V2 con CPI %
import React, { useState } from 'react';
import { BASE } from '../utils/styles';
import { calcCPI, getEstado, fmt1, fmtCPIPct } from '../utils/helpers';
import { FotoGaleriaCompacta } from '../components/FotoUploader';

export default function Auditoria({ filtrados, eliminar, hhPorSemana = [], hhTotales = { hn:0, he:0, total:0 }, totalBaseDatos = 0 }) {
  const [hhOpen, setHhOpen] = useState(false);
  const ocultosPorFiltro = Math.max(0, totalBaseDatos - filtrados.length);

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
      case 'promedio_historico':  return { icon: '📊', color: '#7c3aed',  title: 'IP calculado del promedio histórico' };
      case 'auto_real':           return { icon: '⚙️', color: '#d97706',  title: 'IP autoinferido del propio registro' };
      case 'metrado_cero':        return { icon: '∅',  color: BASE.muted, title: 'Metrado = 0, IP no aplica' };
      default:                    return { icon: '?',  color: BASE.muted, title: 'Sin datos' };
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* PANEL HH SEMANAL — colapsable */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'hidden'}}>
        <button onClick={()=>setHhOpen(!hhOpen)}
          style={{width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px',background:'transparent',border:'none',cursor:'pointer',fontWeight:'700'}}>
          <span style={{fontSize:'14px',color:BASE.navy}}>{hhOpen?'▼':'▶'}</span>
          <span style={{fontSize:'12px',color:BASE.navy}}>⏱️ HORAS HOMBRE — DESGLOSE SEMANAL</span>
          <div style={{flex:1,display:'flex',justifyContent:'flex-end',gap:'10px',fontSize:'11px',color:BASE.muted}}>
            <span><b style={{color:BASE.green}}>{fmt1(hhTotales.hn)}</b> HN</span>
            <span style={{color:hhTotales.he>0?BASE.orange:BASE.muted}}><b>{fmt1(hhTotales.he)}</b> HE</span>
            <span><b style={{color:BASE.navy}}>{fmt1(hhTotales.total)}</b> TOT</span>
            <span>{hhPorSemana.length} sem.</span>
          </div>
        </button>
        {hhOpen && hhPorSemana.length > 0 && (
          <div style={{padding:'0 16px 16px',borderTop:`1px solid ${BASE.border}`}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'480px',marginTop:'10px'}}>
                <thead>
                  <tr>
                    {['Sem','HN','HE','Total','Reg','% Total'].map((h,i)=>(
                      <th key={i} style={{padding:'8px 10px',background:'#f8fafc',color:BASE.navy,fontSize:'10px',fontWeight:'700',textAlign:i===0?'left':'center',borderBottom:`1px solid ${BASE.border}`,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hhPorSemana.map((s)=>{
                    const pct = hhTotales.total > 0 ? (s.total / hhTotales.total * 100) : 0;
                    return (
                      <tr key={s.semana} style={{borderBottom:`1px solid ${BASE.border}`}}>
                        <td style={{padding:'7px 10px',fontWeight:'700',color:BASE.navy}}>S{s.semana}</td>
                        <td style={{padding:'7px 10px',textAlign:'center'}}>{fmt1(s.hn)}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:s.he>0?BASE.orange:BASE.muted,fontWeight:s.he>0?'700':'400'}}>{fmt1(s.he)}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',fontWeight:'800',color:BASE.navy}}>{fmt1(s.total)}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:BASE.muted}}>{s.registros}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:BASE.muted,fontWeight:'600'}}>{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:BASE.navy,color:'#fff',fontWeight:'800'}}>
                    <td style={{padding:'9px 10px',color:'#fff'}}>TOTAL</td>
                    <td style={{padding:'9px 10px',textAlign:'center',color:'#fff'}}>{fmt1(hhTotales.hn)}</td>
                    <td style={{padding:'9px 10px',textAlign:'center',color:'#fdba74'}}>{fmt1(hhTotales.he)}</td>
                    <td style={{padding:'9px 10px',textAlign:'center',color:'#fff',fontSize:'13px'}}>{fmt1(hhTotales.total)}</td>
                    <td style={{padding:'9px 10px',textAlign:'center',color:'#fff'}}>{filtrados.length}</td>
                    <td style={{padding:'9px 10px',textAlign:'center',color:'#86efac'}}>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DIAGNÓSTICO — base de datos vs mostrados */}
      <div style={{
        background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'10px',
        padding:'9px 14px',display:'flex',gap:'18px',flexWrap:'wrap',alignItems:'center',fontSize:'11px',
      }}>
        <span style={{fontWeight:'800',color:BASE.navy}}>🛢️ Base de datos: <b>{totalBaseDatos}</b> registros (TODOS los proyectos)</span>
        <span style={{fontWeight:'800',color:BASE.navy}}>👁️ Mostrados aquí: <b>{filtrados.length}</b></span>
        {ocultosPorFiltro > 0 && (
          <span style={{color:'#b45309',fontWeight:'700'}}>
            ⚠️ {ocultosPorFiltro} ocultos por los filtros de arriba (semana / partida / fecha) — límpialos para verlos todos
          </span>
        )}
      </div>

      {/* TABLA AUDITORÍA */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${BASE.border}`,background:'#f8fafc'}}>
          <span style={{fontSize:'12px',fontWeight:'700',color:BASE.navy}}>📋 REGISTROS — Más reciente arriba</span>
          <span style={{fontSize:'10px',color:BASE.muted}}>{filtrados.length} registros</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'960px'}}>
            <thead>
              <tr>{['Sem.','Fecha','Partida','Actividad','Unidad','Metrado','HN','HE','HH Tot','IP Real','IP Meta','CPI','Fuente','📷',''].map((h,i)=>(
                <th key={i} style={{padding:'11px 10px',fontSize:'11px',fontWeight:'700',color:'#fff',background:BASE.navy,textAlign:i>4?'center':'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {!filtrados.length
                ? <tr><td colSpan={15} style={{padding:'48px',textAlign:'center',color:BASE.muted}}>
                    <p style={{fontSize:'40px',marginBottom:'8px'}}>📋</p>
                    <p style={{fontSize:'13px',fontWeight:'600'}}>Sin registros para los filtros aplicados</p>
                  </td></tr>
                : filtrados.map((r,idx)=>{
                  const ipReal = r._ipReal || r.ipReal;
                  const ipMeta = r._ipMeta || r.ipMeta;
                  const cpi = calcCPI(ipMeta, ipReal);
                  const cc = getEstado(cpi);
                  const { hn, he, total } = calcularHHRegistro(r);
                  const fuzzyMatch = r._matched && r._matchScore !== undefined && r._matchScore < 1;
                  const fnt = fuenteIcon(r._ipFuente);
                  const metZero = (parseFloat(r.metrado) || 0) <= 0;
                  return (
                    <tr key={r.id} style={{background:idx%2===0?BASE.white:'#f8fafc',borderBottom:`1px solid ${BASE.border}`}}>
                      <td style={{padding:'9px 10px',fontWeight:'700',color:BASE.navy}}>S{r.semana}</td>
                      <td style={{padding:'9px 10px',color:BASE.muted,fontSize:'11px'}}>{r.fecha}</td>
                      <td style={{padding:'9px 10px',fontSize:'10px',color:BASE.muted,maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.partida}>
                        {r._partidaCanonica || r.partida}
                      </td>
                      <td style={{padding:'9px 10px',fontWeight:'600',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.actividad}>
                        {fuzzyMatch && (<span style={{fontSize:'9px',color:'#7c3aed',marginRight:'4px'}} title={`Catálogo: ${r._actividadCanonica}`}>≈</span>)}
                        {r.actividad}
                      </td>
                      <td style={{padding:'9px 10px',textAlign:'center',color:BASE.navy,fontWeight:'700',fontSize:'11px'}}>
                        <span style={{background:'#eff6ff',padding:'2px 8px',borderRadius:'10px',border:'1px solid #bfdbfe'}}>{r.unidad || '—'}</span>
                      </td>
                      <td style={{padding:'9px 10px',textAlign:'center',color:metZero?'#dc2626':BASE.text,fontWeight:metZero?'700':'400'}}>{r.metrado}</td>
                      <td style={{padding:'9px 10px',textAlign:'center',color:BASE.text}}>{fmt1(hn)}</td>
                      <td style={{padding:'9px 10px',textAlign:'center',color:he>0?BASE.orange:BASE.muted,fontWeight:he>0?'700':'400'}}>{fmt1(he)}</td>
                      <td style={{padding:'9px 10px',textAlign:'center',fontWeight:'700',color:BASE.navy}}>{fmt1(total)}</td>
                      <td style={{padding:'9px 10px',textAlign:'center',fontWeight:'700',color:BASE.text}}>
                        {ipReal ? parseFloat(ipReal).toFixed(3) : '—'}
                      </td>
                      <td style={{padding:'9px 10px',textAlign:'center',color:BASE.muted}}>
                        {ipMeta ? parseFloat(ipMeta).toFixed(3) : '—'}
                      </td>
                      <td style={{padding:'9px 10px',textAlign:'center',fontWeight:'800',color:cc.color,background:cc.bg}}>
                        {fmtCPIPct(cpi)}
                      </td>
                      <td style={{padding:'9px 10px',textAlign:'center'}} title={fnt.title}>
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
                      <td style={{padding:'9px 10px',textAlign:'center'}}>
                        <button onClick={()=>eliminar(r)} style={{padding:'4px 10px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div style={{padding:'8px 14px',borderTop:`1px solid ${BASE.border}`,background:'#f8fafc',fontSize:'10px',color:BASE.muted,display:'flex',gap:'14px',flexWrap:'wrap'}}>
          <span><span style={{color:BASE.green}}>✓</span> Registro</span>
          <span><span style={{color:BASE.navy}}>📚</span> Catálogo</span>
          <span><span style={{color:'#7c3aed'}}>📊</span> Promedio histórico</span>
          <span><span style={{color:'#d97706'}}>⚙️</span> Auto inferido</span>
          <span><span style={{color:BASE.muted}}>∅</span> Sin metrado</span>
        </div>
      </div>
    </div>
  );
}