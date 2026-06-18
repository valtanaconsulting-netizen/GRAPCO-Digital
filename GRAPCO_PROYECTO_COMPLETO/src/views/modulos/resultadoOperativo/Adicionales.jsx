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
      subtitulo="Estatus de adicionales (F05): CD/GG/U, estado de ejecución, aprobación y abono. Los APROBADOS ajustan el BAC del RO."
      color="#16a34a"
      icono="➕"
      showToast={showToast}
    />
  );
}
