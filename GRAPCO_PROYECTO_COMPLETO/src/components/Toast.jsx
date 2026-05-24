// src/components/Toast.jsx
import React, { useEffect } from 'react';
import { BASE } from '../utils/styles';

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const cfg = {
    success: { bg:'#f0fdf4', border:'#86efac', color:'#15803d', icon:'✅' },
    error:   { bg:'#fef2f2', border:'#fca5a5', color:'#dc2626', icon:'❌' },
    info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8', icon:'ℹ️' },
    warning: { bg:'#fffbeb', border:'#fcd34d', color:'#b45309', icon:'⚠️' },
  }[type] || { bg:'#f8fafc', border:'#e2e8f0', color:BASE.text, icon:'💬' };

  return (
    <>
      <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }`}</style>
      <div style={{
        position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
        background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:'12px',
        padding:'12px 20px', zIndex:9999, display:'flex', alignItems:'center', gap:'10px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.15)', maxWidth:'90vw', minWidth:'260px',
        animation:'slideUp 0.3s ease',
      }}>
        <span style={{fontSize:'20px'}}>{cfg.icon}</span>
        <span style={{fontSize:'13px',fontWeight:'600',color:cfg.color,flex:1}}>{msg}</span>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:cfg.color,fontSize:'18px',padding:0}}>×</button>
      </div>
    </>
  );
}