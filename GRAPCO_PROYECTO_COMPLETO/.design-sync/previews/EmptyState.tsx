import React from 'react';
import { EmptyState } from 'vite-react-starter';

// Estado vacío por defecto.
export const PorDefecto = () => (
  <EmptyState
    icono="📋"
    titulo="No hay datos aún"
    descripcion="Registra avance y costos del proyecto para llenar esta sección."
  />
);

// Variante BIM (navy) — usada en módulos técnicos.
export const VarianteBIM = () => (
  <EmptyState
    variante="bim"
    icono="📑"
    titulo="El RO se calcula en vivo"
    descripcion="Se arma cruzando Plan Maestro + APUs + Tareos (ISP) + Almacén + Valorizaciones."
  />
);

// Con llamada a la acción (variante warning).
export const ConAccion = () => (
  <EmptyState
    variante="warning"
    icono="🧾"
    titulo="Sube el ISP para ver el CR y el CHH"
    descripcion="El Costo Real y el Control de HH se arman directamente del ISP que ya tienes."
    accion={{ label: '📤 Subir ISP (.xlsx)', onClick: () => {} }}
  />
);
