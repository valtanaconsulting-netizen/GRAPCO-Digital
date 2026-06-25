// src/context/ThemeContext.jsx
// Sistema de temas: light | dark | system (sigue preferencia del SO)
// Persiste en localStorage. Aplica data-theme al <html> para CSS condicional.

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { BASE } from '../utils/styles';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'grapco_theme';

// Paletas adaptativas
const TEMAS = {
  light: {
    bg:        '#f1f5f9',
    bgSoft:    '#f8fafc',
    white:     '#ffffff',
    surface:   '#ffffff',
    border:    '#e2e8f0',
    borderSoft:'#f1f5f9',
    text:      '#1e293b',
    textInv:   '#ffffff',
    muted:     '#64748b',
    mutedSoft: '#94a3b8',
    navy:      '#1e3a5f',
    navyDark:  '#152a47',
    gold:      '#f59e0b',
    goldDark:  '#d97706',
    goldLight: '#fef3c7',
    green:     '#16a34a',
    greenDark: '#15803d',
    red:       '#dc2626',
  },
  dark: {
    bg:        '#0f172a',
    bgSoft:    '#1e293b',
    white:     '#1e293b',     // surfaces "blancas" pasan a dark
    surface:   '#1e293b',
    border:    '#334155',
    borderSoft:'#1e293b',
    text:      '#e2e8f0',
    textInv:   '#0f172a',
    muted:     '#94a3b8',
    mutedSoft: '#64748b',
    navy:      '#3b82f6',     // navy se vuelve más brillante en dark
    navyDark:  '#1e40af',
    gold:      '#fbbf24',     // dorado más luminoso
    goldDark:  '#f59e0b',
    goldLight: '#451a03',     // amarillo se vuelve marrón oscuro
    green:     '#22c55e',
    greenDark: '#16a34a',
    red:       '#ef4444',
  },
};

export function ThemeProvider({ children }) {
  // Lee preferencia guardada o sigue al sistema
  const [modo, setModo] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) || 'system';
  });

  const [sistemaDark, setSistemaDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Detecta cambio de preferencia del SO
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSistemaDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Determina tema activo: si modo='system', usa preferencia del SO
  const temaActivo = modo === 'system' ? (sistemaDark ? 'dark' : 'light') : modo;

  // Aplica data-theme al <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', temaActivo);
  }, [temaActivo]);

  // Cambiar modo
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    localStorage.setItem(STORAGE_KEY, nuevoModo);
  };

  // Toggle rápido (light ↔ dark, ignora system)
  const toggleTema = () => {
    cambiarModo(temaActivo === 'dark' ? 'light' : 'dark');
  };

  const valor = useMemo(() => ({
    modo,             // 'light' | 'dark' | 'system'
    temaActivo,       // 'light' | 'dark' (efectivo)
    paleta: TEMAS[temaActivo],
    cambiarModo,
    toggleTema,
    esDark: temaActivo === 'dark',
  }), [modo, temaActivo, sistemaDark]);

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

// Hook helper que devuelve el valor de BASE pero adaptado al tema actual
// Permite migración progresiva: viejo `BASE.navy` sigue funcionando,
// componentes nuevos pueden usar `useThemedBase().navy` para dark mode automático.
export function useThemedBase() {
  const { paleta } = useTheme();
  return useMemo(() => ({ ...BASE, ...paleta }), [paleta]);
}
