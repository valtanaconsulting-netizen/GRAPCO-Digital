// src/views/capataz/secciones/TrabajadorCard.jsx
// Tarjeta de tareo HN/HE por trabajador. Extraído de Capataz.jsx (Fase 1 de refactor).
//
// IMPORTANTE: este archivo DEBE quedarse a nivel de módulo. La advertencia original
// en Capataz.jsx era contra definir el componente DENTRO del padre (referencia nueva
// en cada render → React desmontaba los nodos y se perdía focus/scroll). Aquí, como
// es export por defecto desde su propio archivo, la referencia es estable → seguro.
import React from 'react';
import { BASE, CARGOS_CORTO } from '../../../utils/styles';
import { JORNADA_LEGAL } from '../../../utils/constants';
import { clasificarHE } from '../../../utils/helpers';

export default function TrabajadorCard({
  t,
  idx,
  isMobile,
  acumHN,
  acumHE,
  sinTopeHN,
  actividadActivaId,
  updTareo,
}) {
  const saldo = JORNADA_LEGAL - acumHN;
  const excedido = !sinTopeHN && acumHN > JORNADA_LEGAL;
  const { he60, he100 } = clasificarHE(acumHE);
  const tieneHoras = (t.hn > 0 || t.he > 0);
  const letra = String.fromCharCode(65 + idx);

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${excedido ? '#fca5a5' : tieneHoras ? BASE.green : BASE.border}`,
      borderRadius: '12px',
      padding: isMobile ? '12px 11px' : '14px',
      boxShadow: tieneHoras ? `0 2px 8px ${BASE.green}22` : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Cabecera en UNA sola línea: avatar + nombre (ancho completo) + cargo a la derecha. Sin DNI. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          width: '26px', height: '26px', borderRadius: '8px',
          background: tieneHoras ? BASE.green : BASE.navy,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '900', flexShrink: 0,
        }}>{letra}</span>
        <strong style={{
          flex: 1, minWidth: 0,
          fontSize: '12.5px', color: BASE.text,
          lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={t.nombre}>{t.nombre}</strong>
        <span style={{
          flexShrink: 0,
          fontSize: '10px', fontWeight: '700',
          background: BASE.navy + '15', color: BASE.navy,
          padding: '3px 9px', borderRadius: '12px',
        }}>{(CARGOS_CORTO && CARGOS_CORTO[t.cargo]) || t.cargo}</span>
      </div>

      {/* Inputs HN / HE — SIEMPRE lado a lado (2 columnas, también en móvil).
          En móvil se compactan botones/tipografía para que ambos entren en la fila. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: isMobile ? '10px' : '12px',
        marginBottom: '10px',
      }}>
        {[
          { lab: 'HN', sub: 'Normales', key: 'hn', color: BASE.navy, bg: BASE.navy + '0d' },
          { lab: 'HE', sub: 'Extras',   key: 'he', color: BASE.gold, bg: BASE.gold + '15' },
        ].map(({ lab, sub, key, color, bg }) => {
          const btn = isMobile ? 36 : 44;
          return (
          <div key={key} style={{
            background: bg,
            borderRadius: '10px',
            padding: isMobile ? '9px 7px 8px' : '10px 8px 8px',
            border: `1.5px solid ${t[key] > 0 ? color : 'transparent'}`,
            minWidth: 0,
          }}>
            <div style={{ textAlign: 'center', marginBottom: '7px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color, letterSpacing: '0.5px' }}>{lab}</span>
              <span style={{ fontSize: '9px', color: BASE.muted, marginLeft: '4px' }}>{sub}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '5px' : '6px', minWidth: 0 }}>
              <button type="button"
                onClick={() => updTareo(actividadActivaId, t.nombre, key, (t[key] || 0) - 0.5)}
                style={{
                  width: btn, height: btn, borderRadius: '8px',
                  border: 'none', background: '#fff',
                  color: color, fontSize: isMobile ? '20px' : '22px', fontWeight: '800',
                  cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  boxShadow: BASE.shadowSm,
                }}>−</button>
              <input
                type="number" step="0.5" min="0" inputMode="decimal"
                value={t[key]}
                onChange={e => updTareo(actividadActivaId, t.nombre, key, e.target.value)}
                // Al enfocar/tocar el campo se selecciona todo el contenido para que
                // la primera tecla REEMPLACE el valor (escribir 5 sobre el 0 da "5",
                // no "05"; 6.5 da "6.5", no "06.5"). Así el capataz teclea limpio.
                onFocus={e => e.target.select()}
                style={{
                  flex: 1, minWidth: 0, width: '100%', textAlign: 'center',
                  fontWeight: '900', color, fontSize: isMobile ? '18px' : '22px',
                  border: 'none', background: 'transparent', outline: 'none',
                  padding: '0',
                }}
              />
              <button type="button"
                onClick={() => updTareo(actividadActivaId, t.nombre, key, (t[key] || 0) + 0.5)}
                style={{
                  width: btn, height: btn, borderRadius: '8px',
                  border: 'none', background: color, color: '#fff',
                  fontSize: isMobile ? '20px' : '22px', fontWeight: '800',
                  cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  boxShadow: BASE.shadowSm,
                }}>+</button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Saldo + desglose HE */}
      <div style={{
        fontSize: '11px',
        padding: '7px 11px',
        background: excedido ? BASE.redLight : BASE.bgSoft,
        borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
      }}>
        <span style={{
          color: excedido ? BASE.red : (sinTopeHN || saldo > 0) ? BASE.greenDark : BASE.muted,
          fontWeight: '700',
        }}>
          {sinTopeHN
            ? '✓ Sábado · HN sin tope'
            : excedido
              ? `⚠️ Excede ${(acumHN - JORNADA_LEGAL).toFixed(1)}h`
              : `✓ Saldo: ${saldo.toFixed(1)}h`}
        </span>
        {acumHE > 0 && (
          <span style={{ color: BASE.muted, fontSize: '10px' }}>
            <strong style={{ color: BASE.gold }}>{he60.toFixed(1)}</strong>@60%
            {' · '}
            <strong style={{ color: BASE.red }}>{he100.toFixed(1)}</strong>@100%
          </span>
        )}
      </div>
    </div>
  );
}
