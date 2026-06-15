// src/components/Modal.jsx
import React from 'react';
import { BASE } from '../utils/styles';

export default function Modal({ title, onClose, children, maxW = '480px' }) {
  return (
    <div
      style={{
        position:'fixed', top:0, left:0, right:0, bottom:0,
        background:'rgba(0,0,0,0.6)', zIndex:998,
        display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'#fff', borderRadius:'16px',
          padding:'clamp(14px, 4vw, 22px)',
          width:'100%',
          maxWidth:`min(${maxW}, calc(100vw - 24px))`,
          maxHeight:'90dvh', overflowY:'auto',
          boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
          <h3 style={{fontSize:'16px',fontWeight:'800',color:BASE.navy}}>{title}</h3>
          <button
            onClick={onClose}
            style={{width:'32px',height:'32px',borderRadius:'50%',border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:'16px'}}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}  