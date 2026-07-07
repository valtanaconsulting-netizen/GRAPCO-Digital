// src/config/proyecto.js
// Fuente ÚNICA de identificadores de proyecto que el sistema entiende como "legacy CREDITEX"
// (no tienen doc en Catalogo_WBS → usan el catálogo hardcoded / fecha de inicio fija).
// Módulo HOJA (sin otras dependencias) para que cualquiera lo importe sin ciclos.
// 'default-ptari' (proyecto demo "GRAPCO Demo") fue ELIMINADO el 2026-06-13; queda solo creditex-ptar.
export const LEGACY_CREDITEX_IDS = ['creditex-ptar'];

// Fecha de inicio (lunes de la semana 1) de los proyectos legacy CREDITEX.
export const FECHA_INICIO_LEGACY = '2025-11-03';
