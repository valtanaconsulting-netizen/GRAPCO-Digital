// src/components/CommandPalette.jsx
// Command Palette estilo Linear/Notion abierto con Cmd+K (Mac) o Ctrl+K (Windows).
// Permite búsqueda fuzzy de comandos + ejecución con teclado.
//
// Uso desde fuera:
//   <CommandPalette comandos={[
//     { id, label, atajo, icono, accion, grupo }
//   ]} />

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function CommandPalette({ comandos = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(0);
  const inputRef = useRef(null);
  const listaRef = useRef(null);
  const { esDark } = useTheme();

  // Escuchar Cmd+K / Ctrl+K + Esc
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const triggerKey = isMac ? e.metaKey : e.ctrlKey;
      if (triggerKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierto((v) => !v);
        return;
      }
      if (e.key === 'Escape' && abierto) {
        e.preventDefault();
        setAbierto(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [abierto]);

  // Auto focus + reset al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setBusqueda('');
      setSeleccionado(0);
    }
  }, [abierto]);

  // Filtrado fuzzy básico (busca todas las letras en orden)
  const resultados = useMemo(() => {
    if (!busqueda.trim()) return comandos;
    const q = busqueda.toLowerCase();
    return comandos.filter((c) => {
      const txt = `${c.label} ${c.grupo || ''} ${c.descripcion || ''}`.toLowerCase();
      // Match si todas las letras de q aparecen en orden
      let pos = 0;
      for (const ch of q) {
        pos = txt.indexOf(ch, pos);
        if (pos === -1) return false;
        pos++;
      }
      return true;
    });
  }, [busqueda, comandos]);

  // Reset seleccionado si cambia búsqueda
  useEffect(() => { setSeleccionado(0); }, [busqueda]);

  // Navegación con flechas / Enter
  const onKeyDownInput = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSeleccionado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSeleccionado((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[seleccionado]) {
      e.preventDefault();
      ejecutar(resultados[seleccionado]);
    }
  };

  const ejecutar = (cmd) => {
    setAbierto(false);
    setTimeout(() => cmd.accion?.(), 50);
  };

  // Auto-scroll item seleccionado a la vista
  useEffect(() => {
    if (!listaRef.current) return;
    const item = listaRef.current.querySelector(`[data-idx="${seleccionado}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [seleccionado]);

  if (!abierto) return null;

  // Agrupar por grupo
  const agrupados = resultados.reduce((acc, cmd) => {
    const g = cmd.grupo || 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(cmd);
    return acc;
  }, {});

  let idxGlobal = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '100px',
        animation: 'fadeIn 0.15s ease-out',
      }}>
      <div
        className="anim-scale-in"
        style={{
          background: esDark ? '#1e293b' : '#fff',
          color: esDark ? '#e2e8f0' : '#1e293b',
          borderRadius: '14px',
          border: `1px solid ${esDark ? '#334155' : '#e2e8f0'}`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          width: 'min(620px, 92vw)',
          maxHeight: '60vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
        {/* Input */}
        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${esDark ? '#334155' : '#e2e8f0'}`,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onKeyDownInput}
            placeholder="¿Qué quieres hacer? (Esc para cerrar)"
            aria-label="Buscar comando"
            style={{
              flex: 1, padding: '8px 0', background: 'transparent',
              border: 'none', outline: 'none',
              color: 'inherit', fontSize: '15px', fontWeight: '600',
            }}
          />
          <kbd style={{
            padding: '4px 10px',
            background: esDark ? '#334155' : '#f1f5f9',
            color: esDark ? '#94a3b8' : '#64748b',
            border: `1px solid ${esDark ? '#475569' : '#e2e8f0'}`,
            borderRadius: '6px',
            fontSize: '10px', fontWeight: '700', fontFamily: 'monospace',
          }}>Esc</kbd>
        </div>

        {/* Lista */}
        <div ref={listaRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {resultados.length === 0 ? (
            <p style={{
              padding: '40px 20px', textAlign: 'center',
              color: esDark ? '#94a3b8' : '#64748b',
              fontSize: '13px', fontStyle: 'italic',
            }}>
              Sin resultados para "<strong>{busqueda}</strong>"
            </p>
          ) : (
            Object.entries(agrupados).map(([grupo, cmds]) => (
              <div key={grupo} style={{ marginBottom: '4px' }}>
                <p style={{
                  padding: '6px 12px',
                  fontSize: '10px', fontWeight: '900',
                  color: esDark ? '#94a3b8' : '#64748b',
                  letterSpacing: '1.2px',
                }}>{grupo.toUpperCase()}</p>
                {cmds.map((cmd) => {
                  idxGlobal++;
                  const activo = seleccionado === idxGlobal;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idxGlobal}
                      onClick={() => ejecutar(cmd)}
                      onMouseEnter={() => setSeleccionado(idxGlobal)}
                      role="option"
                      aria-selected={activo}
                      style={{
                        width: '100%', padding: '10px 14px',
                        background: activo ? (esDark ? '#334155' : '#f1f5f9') : 'transparent',
                        color: 'inherit',
                        border: 'none', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        cursor: 'pointer', textAlign: 'left',
                        marginBottom: '2px',
                        transition: 'background 0.1s',
                      }}>
                      <span style={{ fontSize: '17px', width: '24px', textAlign: 'center' }}>{cmd.icono}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '700' }}>{cmd.label}</p>
                        {cmd.descripcion && (
                          <p style={{ fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{cmd.descripcion}</p>
                        )}
                      </div>
                      {cmd.atajo && (
                        <kbd style={{
                          padding: '3px 8px',
                          background: esDark ? '#0f172a' : '#fff',
                          color: esDark ? '#94a3b8' : '#64748b',
                          border: `1px solid ${esDark ? '#475569' : '#e2e8f0'}`,
                          borderRadius: '5px',
                          fontSize: '10px', fontWeight: '700', fontFamily: 'monospace',
                        }}>{cmd.atajo}</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px',
          borderTop: `1px solid ${esDark ? '#334155' : '#e2e8f0'}`,
          fontSize: '10px',
          color: esDark ? '#94a3b8' : '#64748b',
          display: 'flex', justifyContent: 'space-between',
          fontWeight: '600',
        }}>
          <span>↑↓ navegar · ↵ ejecutar</span>
          <span>{resultados.length} {resultados.length === 1 ? 'comando' : 'comandos'}</span>
        </div>
      </div>
    </div>
  );
}
