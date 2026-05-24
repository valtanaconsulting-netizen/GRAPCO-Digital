// src/components/RankingCuadrillas.jsx
// Ranking de cuadrillas con score compuesto (CPI × consistencia × cumplimiento).

import React from 'react';
import { BASE } from '../utils/styles';
import { fmtCPIPct, getEstado, fmt1 } from '../utils/helpers';

export default function RankingCuadrillas({ ranking = [] }) {
  if (!ranking.length) {
    return (
      <div style={{background:BASE.white,borderRadius:'14px',border:`1px solid ${BASE.border}`,padding:'24px',textAlign:'center'}}>
        <p style={{fontSize:'30px',marginBottom:'6px'}}>👷</p>
        <p style={{fontSize:'12px',color:BASE.muted,fontWeight:'600'}}>Sin datos suficientes para ranking</p>
      </div>
    );
  }

  // Top 5 mejores y peores
  const top5 = ranking.slice(0, 5);
  const bottom5 = ranking.slice(-5).reverse();
  const sonDistintos = top5.length + bottom5.length > ranking.length;

  const Card = ({ titulo, lista, color, icon }) => (
    <div style={{background:BASE.white,borderRadius:'14px',border:`1px solid ${BASE.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',background:color,color:'#fff',display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'18px'}}>{icon}</span>
        <p style={{fontSize:'12px',fontWeight:'800',letterSpacing:'0.5px'}}>{titulo}</p>
      </div>
      <div style={{padding:'8px'}}>
        {lista.map((c, i) => {
          const cc = getEstado(c.cpiPromedio);
          return (
            <div key={c.capataz} style={{
              display:'flex',alignItems:'center',gap:'10px',
              padding:'10px 12px',
              borderBottom: i < lista.length - 1 ? `1px solid ${BASE.border}` : 'none',
            }}>
              <span style={{
                width:'28px',height:'28px',borderRadius:'50%',
                background:i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#fb923c' : '#f1f5f9',
                color: i < 3 ? '#fff' : BASE.muted,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'12px',fontWeight:'800',flexShrink:0,
              }}>{i + 1}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:'12px',fontWeight:'700',color:BASE.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.capataz}</p>
                <p style={{fontSize:'10px',color:BASE.muted,marginTop:'2px'}}>
                  {c.semanas} sem · {fmt1(c.totalHH)} HH · {c.totalReg} reg
                </p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:'14px',fontWeight:'800',color:cc.color}}>{fmtCPIPct(c.cpiPromedio)}</p>
                <p style={{fontSize:'9px',color:BASE.muted,marginTop:'1px'}}>
                  Score: <strong>{c.score.toFixed(2)}</strong>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{display:'grid',gridTemplateColumns: sonDistintos ? 'repeat(auto-fit,minmax(320px,1fr))' : '1fr', gap:'12px'}}>
      <Card titulo="🏆 TOP CUADRILLAS" lista={top5} color={BASE.green} icon="🏆"/>
      {sonDistintos && (
        <Card titulo="⚠️ ATENCIÓN REQUERIDA" lista={bottom5} color="#dc2626" icon="⚠️"/>
      )}
    </div>
  );
}