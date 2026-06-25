// src/views/planeamiento/ControlObra.jsx — Control LPS / EVM
// Envuelve las vistas de control del Last Planner y Earned Value que antes
// vivían en el dashboard de Producción de GRAPCO (Ingeniero.jsx) y que se
// movieron a Planeamiento (2026-06-24): VDC / Lookahead (LAP), Programación
// Diaria (F06), CPI/EAC y Curva S (EVM). Toma toda su data de useDatosObra
// (historial enriquecido + WBS desde Registros_Campo + Catalogo_WBS).

import React from 'react';
import { useDatosObra } from '../../hooks/useDatosObra';
import { useNotifications } from '../../contexts/NotificationContext';
import VDC from '../VDC';
import CurvaS from '../CurvaS';
import PlanDiario from '../PlanDiario';

export default function ControlObra({ vista, isMobile }) {
  const datos = useDatosObra();
  const { notify } = useNotifications();
  const showToast = (msg, type = 'success') =>
    notify({ tipo: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'success', titulo: msg });

  if (vista === 'vdc') {
    return (
      <VDC
        cuadrillasActivas={datos.cuadrillasActivas}
        cuadrillasDB={datos.cuadrillasDB}
        planesDiarios={datos.planesDiarios}
        historial={datos.historial}
        isMobile={isMobile}
        showToast={showToast}
      />
    );
  }
  if (vista === 'plandiario') {
    return (
      <PlanDiario
        planesDiarios={datos.planesDiarios}
        cuadrillasActivas={datos.cuadrillasActivas}
        cuadrillasDB={datos.cuadrillasDB}
        historial={datos.historial}
        isMobile={isMobile}
        showToast={showToast}
      />
    );
  }
  // CPI / EAC (el ISP) se movió COMPLETAMENTE a Producción/GRAPCO (2026-06-25).
  if (vista === 'curvas') {
    return <CurvaS historialEnriquecido={datos.historial} />;
  }
  return null;
}
