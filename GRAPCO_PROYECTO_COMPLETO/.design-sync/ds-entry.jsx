// .design-sync/ds-entry.jsx — entrada curada del Design System de GRAPCO.
// Re-exporta SOLO los componentes presentacionales reutilizables (sin acoplamiento
// a Firebase ni a los contextos de la app), para que el bundle de Claude Design
// contenga exactamente estos y no toda la aplicación.
export { default as Icon } from '../src/components/Icon.jsx';
export { default as VistaHeader } from '../src/components/VistaHeader.jsx';
export { default as EmptyState } from '../src/components/EmptyState.jsx';
export { default as AreaSidebar } from '../src/components/AreaSidebar.jsx';
