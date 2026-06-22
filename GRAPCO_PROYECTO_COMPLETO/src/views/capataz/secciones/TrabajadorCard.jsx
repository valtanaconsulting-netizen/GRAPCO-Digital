// src/views/capataz/secciones/TrabajadorCard.jsx
// Tarjeta de tareo HN/HE por trabajador. Extraído de Capataz.jsx (Fase 1 de refactor).
//
// IMPORTANTE: este archivo DEBE quedarse a nivel de módulo. La advertencia original
// en Capataz.jsx era contra definir el componente DENTRO del padre (referencia nueva
// en cada render → React desmontaba los nodos y se perdía focus/scroll). Aquí, como
// es export por defecto desde su propio archivo, la referencia es estable → seguro.
//
// REGLAS DE HORAS (tope = limiteHN del día: 8.5 L-V · 5.5 sáb · 0 dom):
//   · HN no puede pasar del tope del día.
//   · HE solo se habilita cuando las HN del día ya están COMPLETAS (= al tope).
//   · Domingo (tope 0): HN bloqueada, solo HE.
import React, { useState } from 'react';
import { BASE, CARGOS_CORTO } from '../../../utils/styles';
import { clasificarHE } from '../../../utils/helpers';

const EPS = 0.001;
const aMedios = (n) => Math.round(n * 2) / 2; // múltiplos de 0.5

// Campo "− valor +" de horas. Teclea limpio (sin cero a la izquierda), respeta
// el tope `max` (redondeo a 0.5) y puede ir deshabilitado (HE bloqueada / domingo).
function CampoHora({ lab, sub, color, bg, value, max, disabled, onChange, isMobile }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState('');
  const btn = isMobile ? 36 : 44;

  const tope  = Number.isFinite(max) ? max : Infinity;
  const clamp = (n) => Math.min(tope, Math.max(0, aMedios(n)));
  const num   = Number(value) || 0;

  const step = (delta) => {
    if (disabled) return;
    onChange(clamp(num + delta));
  };

  // Mientras se edita se muestra lo tecleado tal cual; si no, el número SIN
  // ceros a la izquierda (6 → "6", 6.5 → "6.5", 0 → "0").
  const display = editando ? draft : String(num);

  return (
    <div style={{
      background: bg,
      borderRadius: '10px',
      padding: isMobile ? '9px 7px 8px' : '10px 8px 8px',
      border: `1.5px solid ${num > 0 ? color : 'transparent'}`,
      minWidth: 0,
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ textAlign: 'center', marginBottom: '7px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color, letterSpacing: '0.5px' }}>{lab}</span>
        <span style={{ fontSize: '9px', color: BASE.muted, marginLeft: '4px' }}>{sub}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '5px' : '6px', minWidth: 0 }}>
        <button type="button" disabled={disabled}
          onClick={() => step(-0.5)}
          style={{
            width: btn, height: btn, borderRadius: '8px',
            border: 'none', background: '#fff',
            color, fontSize: isMobile ? '20px' : '22px', fontWeight: '800',
            cursor: disabled ? 'default' : 'pointer', lineHeight: 1, flexShrink: 0,
            boxShadow: BASE.shadowSm, opacity: disabled ? 0.6 : 1,
          }}>−</button>
        <input
          // type="text" + inputMode decimal: en iPad/PWA `type=number` NO permite
          // select() ni resetea "06" → "6"; con texto controlamos el string exacto.
          type="text" inputMode="decimal"
          disabled={disabled}
          value={display}
          onFocus={(e) => {
            setEditando(true);
            // En 0 arranca vacío (la 1ª tecla no deja "0…"); si trae valor, lo
            // precarga y selecciona todo para reemplazarlo de un tecleo.
            setDraft(num === 0 ? '' : String(num));
            requestAnimationFrame(() => { try { e.target.select(); } catch (_) {} });
          }}
          onChange={(e) => {
            // Solo dígitos y un punto decimal.
            let v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
            const p = v.split('.');
            if (p.length > 2) v = p[0] + '.' + p.slice(1).join('');
            setDraft(v);
            const n = parseFloat(v);
            onChange(Number.isFinite(n) ? clamp(n) : 0);
          }}
          onBlur={() => {
            setEditando(false);
            const n = parseFloat(draft);
            onChange(Number.isFinite(n) ? clamp(n) : 0);
          }}
          style={{
            flex: 1, minWidth: 0, width: '100%', textAlign: 'center',
            fontWeight: '900', color, fontSize: isMobile ? '18px' : '22px',
            border: 'none', background: 'transparent', outline: 'none',
            padding: '0',
          }}
        />
        <button type="button" disabled={disabled}
          onClick={() => step(0.5)}
          style={{
            width: btn, height: btn, borderRadius: '8px',
            border: 'none', background: color, color: '#fff',
            fontSize: isMobile ? '20px' : '22px', fontWeight: '800',
            cursor: disabled ? 'default' : 'pointer', lineHeight: 1, flexShrink: 0,
            boxShadow: BASE.shadowSm, opacity: disabled ? 0.6 : 1,
          }}>+</button>
      </div>
    </div>
  );
}

export default function TrabajadorCard({
  t,
  idx,
  isMobile,
  acumHN,
  acumHE,
  limiteHN,          // tope de HN del día: 8.5 (L-V) | 5.5 (sáb) | 0 (dom)
  actividadActivaId,
  updTareo,
}) {
  const esDomingo = limiteHN <= 0;
  // `acumHN` suma las HN del trabajador en TODAS las actividades del día (incluye
  // esta tarjeta). Las de OTRAS actividades acotan cuánto cabe aún en este campo.
  const otrasHN     = Math.max(0, (acumHN || 0) - (Number(t.hn) || 0));
  const maxHNCampo  = Math.max(0, limiteHN - otrasHN);
  const hnCompleta  = limiteHN > 0 ? acumHN >= limiteHN - EPS : true;
  const heHabilitada = esDomingo ? true : hnCompleta; // HE solo tras completar HN
  const saldo       = limiteHN - acumHN;
  const excedido    = acumHN > limiteHN + EPS;

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
          HN topada al límite del día; HE bloqueada hasta completar las HN. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: isMobile ? '10px' : '12px',
        marginBottom: '10px',
      }}>
        <CampoHora
          lab="HN" sub="Normales" color={BASE.navy} bg={BASE.navy + '0d'}
          value={t.hn} max={maxHNCampo} disabled={esDomingo}
          isMobile={isMobile}
          onChange={(n) => updTareo(actividadActivaId, t.nombre, 'hn', n)}
        />
        <CampoHora
          lab="HE" sub="Extras" color={BASE.gold} bg={BASE.gold + '15'}
          value={t.he} max={Infinity} disabled={!heHabilitada}
          isMobile={isMobile}
          onChange={(n) => updTareo(actividadActivaId, t.nombre, 'he', n)}
        />
      </div>

      {/* Estado del día + desglose HE */}
      <div style={{
        fontSize: '11px',
        padding: '7px 11px',
        background: excedido ? BASE.redLight : BASE.bgSoft,
        borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
      }}>
        <span style={{
          color: excedido ? BASE.red : (esDomingo || hnCompleta || saldo > 0) ? BASE.greenDark : BASE.muted,
          fontWeight: '700',
        }}>
          {esDomingo
            ? '🟡 Domingo · solo HE'
            : excedido
              ? `⚠️ Excede ${(acumHN - limiteHN).toFixed(1)}h`
              : hnCompleta
                ? '✓ HN completas · HE habilitada'
                : `✓ Saldo HN: ${saldo.toFixed(1)}h`}
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
