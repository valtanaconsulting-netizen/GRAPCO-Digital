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
      subtitulo="Partidas deductivas (PQ-01 / PQ-02) con presupuesto, programado y valorizado."
      color="#ef4444"
      icono="➖"
      showToast={showToast}
    />
  );
}
