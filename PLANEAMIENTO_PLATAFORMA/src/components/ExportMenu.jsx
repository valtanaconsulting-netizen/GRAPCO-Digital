// src/components/ExportMenu.jsx — Menú "Exportar ▾" reutilizable (Informe / Data / …).
// Cada item: { icon, title, sub, onClick }. Cierra al elegir o al hacer click fuera.

import React, { useState } from 'react';
import { BASE } from '../utils/styles';

export default function ExportMenu({ label = '⬇️ Exportar ▾', items = [], buttonStyle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={buttonStyle || defBtn}>{label}</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
            background: '#fff', border: `1px solid ${BASE.border}`, borderRadius: '10px',
            boxShadow: '0 14px 34px -12px rgba(8,26,46,0.45)', minWidth: '264px', overflow: 'hidden',
          }}>
            {items.map((it, i) => (
              <button key={i} onClick={() => { setOpen(false); it.onClick?.(); }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
                  padding: '11px 14px', borderBottom: i === items.length - 1 ? 'none' : `1px solid ${BASE.border}`,
                }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{it.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: BASE.navy }}>{it.title}</span>
                  {it.sub && <span style={{ display: 'block', fontSize: '10.5px', color: BASE.muted, marginTop: '1px' }}>{it.sub}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const defBtn = {
  padding: '8px 14px', borderRadius: '8px', background: BASE.white, color: BASE.navy,
  border: `1px solid ${BASE.border}`, fontSize: '11px', fontWeight: '900', cursor: 'pointer',
  letterSpacing: '0.4px', whiteSpace: 'nowrap',
};
