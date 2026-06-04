// src/utils/xlsxLazy.js
// Carga PEREZOSA de la librería xlsx (~142 KB gzip). Se importa SOLO cuando el
// usuario exporta/importa Excel, no al cargar la vista. Cachea el módulo tras el
// primer uso. Uso: const XLSX = await loadXLSX();
let _xlsx = null;
export async function loadXLSX() {
  if (!_xlsx) _xlsx = await import('xlsx');
  return _xlsx;
}
