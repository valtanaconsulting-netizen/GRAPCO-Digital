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
      padding: '14px',
      boxShadow: tieneHoras ? `0 2px 8px ${BASE.green}22` : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Cabecera: avatar + nombre */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
        <span style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: tieneHoras ? BASE.green : BASE.navy,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '900', flexShrink: 0,
        }}>{letra}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{
            fontSize: '14px', color: BASE.text,
            display: 'block', lineHeight: 1.25, wordBreak: 'break-word',
          }}>{t.nombre}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span style={{
              fontSize: '10px', fontWeight: '700',
              background: BASE.navy + '15', color: BASE.navy,
              padding: '2px 7px', borderRadius: '12px',
            }}>{(CARGOS_CORTO && CARGOS_CORTO[t.cargo]) || t.cargo}</span>
            {t.dni && (
              <span style={{ fontSize: '10px', color: BASE.muted, fontFamily: 'monospace' }}>
                DNI {t.dni}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inputs HN / HE — 1 columna en mobile, 2 en desktop. minmax(0,...) evita overflow. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '10px',
        marginBottom: '10px',
      }}>
        {[
          { lab: 'HN', sub: 'Normales', key: 'hn', color: BASE.navy, bg: BASE.navy + '0d' },
          { lab: 'HE', sub: 'Extras',   key: 'he', color: BASE.gold, bg: BASE.gold + '15' },
        ].map(({ lab, sub, key, color, bg }) => (
          <div key={key} style={{
            background: bg,
            borderRadius: '10px',
            padding: '8px 6px 6px',
            border: `1.5px solid ${t[key] > 0 ? color : 'transparent'}`,
            minWidth: 0,
          }}>
            <div style={{ textAlign: 'center', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color, letterSpacing: '0.5px' }}>{lab}</span>
              <span style={{ fontSize: '9px', color: BASE.muted, marginLeft: '4px' }}>{sub}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <button type="button"
                onClick={() => updTareo(actividadActivaId, t.nombre, key, (t[key] || 0) - 0.5)}
                style={{
                  width: '44px', height: '44px', borderRadius: '8px',
                  border: 'none', background: '#fff',
                  color: color, fontSize: '22px', fontWeight: '800',
                  cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  boxShadow: BASE.shadowSm,
                }}>−</button>
              <input
                type="number" step="0.5" min="0" inputMode="decimal"
                value={t[key]}
                onChange={e => updTareo(actividadActivaId, t.nombre, key, e.target.value)}
                style={{
                  flex: 1, minWidth: 0, width: '100%', textAlign: 'center',
                  fontWeight: '900', color, fontSize: '22px',
                  border: 'none', background: 'transparent', outline: 'none',
                  padding: '0',
                }}
              />
              <button type="button"
                onClick={() => updTareo(actividadActivaId, t.nombre, key, (t[key] || 0) + 0.5)}
                style={{
                  width: '44px', height: '44px', borderRadius: '8px',
                  border: 'none', background: color, color: '#fff',
                  fontSize: '22px', fontWeight: '800',
                  cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                  boxShadow: BASE.shadowSm,
                }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Saldo + desglose HE */}
      <div style={{
        fontSize: '11px',
        padding: '8px 10px',
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
