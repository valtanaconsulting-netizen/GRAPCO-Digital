// src/views/modulos/resultadoOperativo/Adicionales.jsx
// Hoja "ADICIONALES" del formato GP-GCE-FOR-F06.

import React from 'react';
import PartidasExtras from './PartidasExtras';

export default function Adicionales({ showToast }) {
  return (
    <PartidasExtras
      tipo="adicionales"
      coleccion="Adicionales"
      titulo="ADICIONALES"
      subtitulo="Partidas adicionales aprobadas (PQ-01 / PQ-02) con presupuesto, programado y valorizado."
      color="#16a34a"
      icono="➕"
      showToast={showToast}
    />
  );
}
