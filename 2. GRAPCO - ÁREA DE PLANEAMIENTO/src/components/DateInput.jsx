// src/components/DateInput.jsx
//
// COMPAT SHIM → delega en DatePickerPremium (variant="rich").
// Antes este componente abría el calendario NATIVO del navegador (un input date nativo
// oculto). Ahora conserva su mismo campo «rico» (label + badge «Sem. N» + atajo HOY +
// borde verde si es hoy) pero el popup pasa a ser el CALENDARIO PREMIUM navy+gold único
// del ecosistema. Misma API → los call-sites existentes no cambian.
//   Props: { label, value, onChange, getSemana, large, max, min }
//   · max: por compatibilidad histórica, si no se pasa se limita a HOY (sin fechas futuras).
import React from 'react';
import { hoy } from '../utils/helpers';
import DatePickerPremium from './DatePickerPremium';

export default function DateInput({ label, value, onChange, getSemana, large = false, max = null, min = null }) {
  return (
    <DatePickerPremium
      variant="rich"
      label={label}
      value={value}
      onChange={onChange}
      getSemana={getSemana}
      large={large}
      max={max !== null ? max : hoy()}
      min={min || null}
    />
  );
}
