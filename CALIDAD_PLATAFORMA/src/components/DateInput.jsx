// src/components/DateInput.jsx
//
// Truco visual: el <input type="date"> está absolute-positioned cubriendo todo
// el wrapper con opacity:0 → el click va DIRECTAMENTE al input (no a la capa
// visual, que es `pointer-events: none`). Esto deja que el navegador maneje
// el calendario nativo sin interferencia de JS — antes el wrapper tenía
// onClick={showPicker()} que se disparaba al clickear las flechas del picker
// y cerraba-reabría el calendario momentáneamente.
import React from 'react';
import { BASE } from '../utils/styles';
import { hoy, fmtFecha } from '../utils/helpers';

export default function DateInput({ label, value, onChange, getSemana, large = false, max = null, min = null }) {
  const hoyStr = hoy();
  const esHoy  = value === hoyStr;
  const semana = getSemana ? getSemana(value) : null;
  const maxValue = max !== null ? max : hoyStr;
  const minValue = min;

  return (
    <div>
      {label && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
          <label style={{fontSize:'11px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px'}}>{label}</label>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            {semana && (
              <span style={{fontSize:'10px',fontWeight:'800',color:BASE.navy,background:'#eff6ff',border:'1px solid #bfdbfe',padding:'2px 9px',borderRadius:'20px'}}>
                Sem. {semana}
              </span>
            )}
            {!esHoy && (
              <button type="button" onClick={() => onChange(hoyStr)}
                style={{fontSize:'11px',fontWeight:'700',color:BASE.green,background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'20px',padding:'3px 10px',cursor:'pointer'}}>
                HOY
              </button>
            )}
            {esHoy && <span style={{fontSize:'11px',color:BASE.green,fontWeight:'700'}}>✓ Hoy</span>}
          </div>
        </div>
      )}

      <div style={{
        position:'relative',
        background: large ? BASE.white : '#f8fafc',
        border:`2px solid ${esHoy ? BASE.green : BASE.border}`,
        borderRadius:'10px',
        padding: large ? '14px 16px' : '10px 14px',
        transition:'border-color 0.2s',
        boxShadow: esHoy ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
      }}>
        {/* Capa visual — NO intercepta clicks (pointer-events: none) */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          pointerEvents: 'none',
        }}>
          <div>
            <p style={{fontSize: large ? '20px' : '15px', fontWeight:'800', color:BASE.navy, letterSpacing:'-0.3px', margin: 0}}>
              {value ? fmtFecha(value) : 'Seleccionar fecha...'}
            </p>
            {semana && (
              <p style={{fontSize:'11px', color:BASE.muted, marginTop:'2px', margin: '2px 0 0'}}>
                Semana {semana} del proyecto
              </p>
            )}
          </div>
          <span style={{fontSize:'22px', flexShrink:0}}>📅</span>
        </div>

        {/* Input nativo — recibe los clicks y maneja su propio calendario sin interferencia.
            onClick → showPicker() abre el calendario al tocar CUALQUIER parte del recuadro
            (sin esto, el navegador solo lo abriría con su iconito, que aquí está oculto). */}
        <input
          type="date"
          value={value || ''}
          max={maxValue}
          min={minValue || undefined}
          onChange={e => onChange(e.target.value)}
          onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* navegador sin showPicker */ } }}
          style={{
            position:'absolute', top:0, left:0, width:'100%', height:'100%',
            opacity:0, cursor:'pointer', fontSize:'16px',
            border:'none', background:'transparent', padding:0,
          }}
        />
      </div>
    </div>
  );
}