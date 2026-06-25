// src/components/Tooltip.jsx
// Tooltip accesible con posicionamiento smart, soporta hover + focus.
// Uso:
//   <Tooltip texto="CPI = EV/AC. Mide eficiencia de costo, ≥1.0 está bajo presupuesto.">
//     <span>CPI</span>
//   </Tooltip>

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Tooltip({
  texto,
  children,
  posicion = 'auto',  // auto | top | bottom | left | right
  delay = 300,
  ancho = 'auto',
  variant = 'default',  // default | info | help
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({});
  const [posCalc, setPosCalc] = useState('top');
  const triggerRef = useRef(null);
  const timerRef = useRef(null);
  const { esDark } = useTheme();

  const mostrar = () => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Calcular posición ideal si auto
      let pos = posicion;
      if (posicion === 'auto') {
        if (rect.top > 80) pos = 'top';
        else if (vh - rect.bottom > 80) pos = 'bottom';
        else if (rect.left > 200) pos = 'left';
        else pos = 'right';
      }
      setPosCalc(pos);
      setCoords({
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      setVisible(true);
    }, delay);
  };
  const ocultar = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const colorBg = esDark ? '#0f172a' : '#1e3a5f';
  const colorText = '#fff';
  const accent = variant === 'info' ? '#3b82f6' : variant === 'help' ? '#f59e0b' : null;

  // Calcular estilos de posición
  const getStylesPos = () => {
    const pad = 10;
    if (posCalc === 'top') return {
      top: coords.top - pad, left: coords.left + coords.width / 2,
      transform: 'translate(-50%, -100%)',
    };
    if (posCalc === 'bottom') return {
      top: coords.bottom + pad, left: coords.left + coords.width / 2,
      transform: 'translateX(-50%)',
    };
    if (posCalc === 'left') return {
      top: coords.top + coords.height / 2, left: coords.left - pad,
      transform: 'translate(-100%, -50%)',
    };
    return {
      top: coords.top + coords.height / 2, left: coords.right + pad,
      transform: 'translateY(-50%)',
    };
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
        tabIndex={0}
        role="button"
        aria-describedby={visible ? `tooltip-${triggerRef.current?.dataset?.tid}` : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'help',
          borderBottom: `1px dotted ${accent || (esDark ? '#64748b' : '#94a3b8')}`,
        }}>
        {children}
      </span>
      {visible && (
        <div
          role="tooltip"
          className="anim-fade-in"
          style={{
            position: 'absolute',
            ...getStylesPos(),
            background: colorBg,
            color: colorText,
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            lineHeight: 1.5,
            maxWidth: '280px',
            width: ancho,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 10000,
            pointerEvents: 'none',
            ...(accent && { borderTop: `3px solid ${accent}` }),
          }}>
          {texto}
        </div>
      )}
    </>
  );
}
