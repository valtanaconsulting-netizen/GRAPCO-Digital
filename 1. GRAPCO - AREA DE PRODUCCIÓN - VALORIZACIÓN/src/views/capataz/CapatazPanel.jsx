// src/views/capataz/CapatazPanel.jsx
// Wrapper para el rol Capataz. El banner dorado superior se eliminó para ganar
// espacio en pantalla (campo / móvil): el capataz va directo a sus 2 módulos
// (Tareo y Metrado). El propio panel ya muestra el contexto del día.
import React from 'react';
import Capataz from '../Capataz';

export default function CapatazPanel(props) {
  return (
    <div className="anim-fade-in">
      <Capataz {...props} />
    </div>
  );
}
