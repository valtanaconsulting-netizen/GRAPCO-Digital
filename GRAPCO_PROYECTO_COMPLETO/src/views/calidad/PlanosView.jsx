// src/views/calidad/PlanosView.jsx
// Pestaña "📐 Planos" de Gestión de Calidad — biblioteca de planos POR FRENTE.
// Eliges un frente del proyecto activo y ves/subes sus planos (PDF/imagen) sin
// entrar a un protocolo. Reutiliza <BibliotecaPlanos> (mismo Storage que los
// protocolos → planos/{proyecto}/{frente}/), así lo que subes aquí también
// aparece dentro de cada protocolo de ese frente, y viceversa.

import React, { useEffect, useState } from 'react';
import { useProyectoActivo } from '../../contexts/ProyectoActivoContext';
import { codigoFrente } from '../../utils/calidadOTAnalytics';
import { BASE } from '../../utils/styles';
import { BibliotecaPlanos } from '../../components/VisorPlanos';

export default function PlanosView({ showToast }) {
  const { proyectoActivoId, frentesDelProyecto, frenteActivo } = useProyectoActivo();
  const [frenteCodigo, setFrenteCodigo] = useState('');

  // Preselecciona el frente activo (o el primero del proyecto).
  useEffect(() => {
    if (frenteCodigo) return;
    const inicial = frenteActivo
      ? codigoFrente(frenteActivo)
      : (frentesDelProyecto && frentesDelProyecto[0] ? codigoFrente(frentesDelProyecto[0]) : '');
    if (inicial) setFrenteCodigo(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frenteActivo, frentesDelProyecto]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={toolbar}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 900, color: BASE.gold, letterSpacing: 1.4 }}>
            GESTIÓN DE CALIDAD · PLANOS
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: BASE.navy, marginTop: 2 }}>
            Biblioteca de planos por frente
          </h2>
          <p style={{ fontSize: 11, color: BASE.muted, marginTop: 2 }}>
            Sube planos (PDF/imagen) a un frente y consúltalos aquí o desde cualquier protocolo de ese frente.
          </p>
        </div>
        <div>
          <label style={lbl}>FRENTE</label>
          <select value={frenteCodigo} onChange={(e) => setFrenteCodigo(e.target.value)} style={sel}>
            <option value="">— Selecciona frente —</option>
            {(frentesDelProyecto || []).map((f) => {
              const c = codigoFrente(f);
              return <option key={f.id} value={c}>{f.nombre} ({c})</option>;
            })}
          </select>
        </div>
      </div>

      <div style={card}>
        {frenteCodigo ? (
          <BibliotecaPlanos proyectoId={proyectoActivoId} frenteCodigo={frenteCodigo} showToast={showToast} />
        ) : (
          <p style={{ fontSize: 13, color: BASE.muted, padding: 16 }}>
            Selecciona un frente arriba para ver y subir sus planos.
          </p>
        )}
      </div>
    </div>
  );
}

const toolbar = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
  background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14,
  padding: '14px 18px', boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const card = {
  background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: 14,
  padding: '14px 16px', boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
};
const lbl = { fontSize: 9.5, fontWeight: 900, color: BASE.muted, letterSpacing: 0.6, display: 'block', marginBottom: 4 };
const sel = {
  padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BASE.border}`,
  fontSize: 12.5, fontWeight: 700, background: '#fff', color: BASE.text, minWidth: 220,
};
