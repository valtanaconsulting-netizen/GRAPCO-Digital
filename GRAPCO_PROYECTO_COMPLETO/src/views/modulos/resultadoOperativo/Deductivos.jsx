// src/views/modulos/resultadoOperativo/Deductivos.jsx
// Hoja "DEDUCTIVOS" del formato GP-GCE-FOR-F06.

import React from 'react';
import PartidasExtras from './PartidasExtras';

export default function Deductivos({ showToast }) {
  return (
    <PartidasExtras
      tipo="deductivos"
      coleccion="Deductivos"
      titulo="DEDUCTIVOS"
      subtitulo="Estatus de deductivos (F05): CD/GG/U y estados. Los APROBADOS reducen el BAC del RO."
      color="#ef4444"
      icono="➖"
      showToast={showToast}
    />
  );
}
