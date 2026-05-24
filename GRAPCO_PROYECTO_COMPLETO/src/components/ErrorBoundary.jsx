// src/components/ErrorBoundary.jsx — v2 (Bloque 14)
// Mejoras:
//   - Loguea errores no-recuperables a colección Auditoria_Seguridad (best-effort)
//   - UX mejorada: muestra qué hacer + canal de soporte
//   - Botón para copiar el error al portapapeles (útil para reportes)

import React from 'react';
import { db, auth } from '../firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ errorInfo: info });

    // Log a Firebase (best-effort, no rompe si falla)
    try {
      await addDoc(collection(db, 'Auditoria_Seguridad'), {
        uid: auth.currentUser?.uid || 'anon',
        accion: 'error_no_capturado',
        detalles: {
          mensaje: String(error?.message || error).slice(0, 500),
          stack: String(error?.stack || '').slice(0, 1500),
          componentStack: String(info?.componentStack || '').slice(0, 1000),
          url: window.location.href,
        },
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent.slice(0, 200),
      });
    } catch (e) {
      console.warn('[ErrorBoundary] No se pudo loguear a Firebase:', e.message);
    }
  }

  reset = () => this.setState({ hasError: false, error: null, errorInfo: null });

  copiar = async () => {
    const txt = `GRAPCO Error Report
Fecha: ${new Date().toISOString()}
URL: ${window.location.href}
Mensaje: ${String(this.state.error?.message || this.state.error)}

Stack:
${this.state.error?.stack || '—'}

Component stack:
${this.state.errorInfo?.componentStack || '—'}`;
    try {
      await navigator.clipboard.writeText(txt);
      alert('✅ Error copiado al portapapeles. Pégalo en un email/Slack para reporte.');
    } catch (_) {
      alert('No se pudo copiar. Toma screenshot.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', background: 'linear-gradient(135deg,#1e3a5f,#152a47)',
          fontFamily: '"Inter","Segoe UI",sans-serif',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '36px',
            maxWidth: '520px', width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            borderTop: '5px solid #f59e0b',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚠️</div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a5f', marginBottom: '8px' }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: 1.6 }}>
              Ocurrió un error inesperado. Tus datos están seguros en Firebase. El error fue
              registrado automáticamente para que el equipo lo revise.
            </p>
            <details style={{
              textAlign: 'left', background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
              fontSize: '11px', color: '#991b1b',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '700' }}>Ver detalle técnico</summary>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                marginTop: '8px', fontSize: '10px', maxHeight: '160px', overflowY: 'auto',
              }}>
                {String(this.state.error?.message || this.state.error)}
                {this.state.error?.stack && '\n\nSTACK:\n' + this.state.error.stack.slice(0, 600)}
              </pre>
            </details>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={this.reset} style={{
                flex: '1 1 130px', padding: '12px', background: '#1e3a5f', color: '#fff',
                border: 'none', borderRadius: '10px', fontWeight: '700',
                cursor: 'pointer', fontSize: '13px',
              }}>🔄 Reintentar</button>
              <button onClick={() => window.location.reload()} style={{
                flex: '1 1 130px', padding: '12px',
                background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
                border: 'none', borderRadius: '10px', fontWeight: '700',
                cursor: 'pointer', fontSize: '13px',
              }}>🚀 Recargar app</button>
              <button onClick={this.copiar} style={{
                flex: '1 1 130px', padding: '12px', background: '#f1f5f9', color: '#1e3a5f',
                border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: '700',
                cursor: 'pointer', fontSize: '13px',
              }}>📋 Copiar error</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
