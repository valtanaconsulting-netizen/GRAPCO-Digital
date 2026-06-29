// src/views/materiales/TipoCambioView.jsx — Gestion de TC SUNAT (Fase 2)
//
// Lista TCs cacheados, permite forzar fetch SUNAT y registro manual.

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerTCDelDia, guardarTCManual } from '../../utils/tipoCambioClient';
import EmptyState from '../../components/EmptyState';
import DatePickerPremium from '../../components/DatePickerPremium';

export default function TipoCambioView({ showToast }) {
  const { user } = useAuth();
  const [tcs, setTCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [formManual, setFormManual] = useState({ fecha: new Date().toISOString().split('T')[0], compra: '', venta: '' });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'TipoCambio'), orderBy('fecha', 'desc'), limit(60)),
      (snap) => { setTCs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.warn('[TC]', e); setLoading(false); });
    return () => unsub();
  }, []);

  const fetchTC = async () => {
    setBusy(true);
    try {
      const tc = await obtenerTCDelDia(fechaConsulta);
      if (tc) {
        showToast?.(`✅ TC ${fechaConsulta}: compra ${tc.compra} · venta ${tc.venta} (${tc.fuente})`, 'success');
      } else {
        showToast?.('⚠️ No se pudo obtener el TC. Registralo manual.', 'error');
      }
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const guardarManual = async () => {
    const compra = parseFloat(formManual.compra);
    const venta = parseFloat(formManual.venta);
    if (!formManual.fecha || !compra || !venta) {
      showToast?.('Fecha, compra y venta son obligatorios', 'error');
      return;
    }
    setBusy(true);
    try {
      await guardarTCManual(formManual.fecha, compra, venta, user?.email || 'sistema');
      showToast?.('✅ TC manual guardado', 'success');
      setManualOpen(false);
      setFormManual({ fecha: new Date().toISOString().split('T')[0], compra: '', venta: '' });
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando TCs...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '18px 22px',
        borderLeft: `5px solid ${BASE.navy}`,
      }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.6px' }}>
          TIPO DE CAMBIO · SUNAT (PEN / USD)
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginTop: '4px' }}>
          Paridad Soles / Dolares
        </h3>
        <p style={{ fontSize: '11.5px', color: BASE.muted, marginTop: '4px' }}>
          Intenta TC oficial <strong>SUNAT</strong>; si no responde, usa tipo de cambio de <strong>MERCADO</strong> (USD/PEN) como referencia.
          Para feriados o un valor exacto, usa el registro manual. La fuente queda marcada en cada registro.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
          <DatePickerPremium value={fechaConsulta || ''} onChange={iso => setFechaConsulta(iso)} />
          <button onClick={fetchTC} disabled={busy} style={{
            padding: '9px 18px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
          }}>
            {busy ? '⏳ Consultando...' : '🔄 OBTENER TIPO DE CAMBIO'}
          </button>
          <button onClick={() => setManualOpen(!manualOpen)} style={{
            padding: '9px 18px', borderRadius: '8px',
            background: BASE.white, color: BASE.navy,
            border: `1.5px solid ${BASE.border}`, fontSize: '12px', fontWeight: '800', cursor: 'pointer',
          }}>
            ✏️ Registro manual
          </button>
        </div>

        {manualOpen && (
          <div style={{
            marginTop: '14px', padding: '14px', borderRadius: '10px',
            background: BASE.bgSoft, border: `1px solid ${BASE.border}`,
          }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: BASE.navy, marginBottom: '10px' }}>
              REGISTRO MANUAL (feriados / cuando SUNAT no publica)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <Field label="Fecha *">
                <DatePickerPremium value={formManual.fecha || ''} onChange={iso => setFormManual({...formManual, fecha: iso})} />
              </Field>
              <Field label="Compra *">
                <input type="number" step="0.001" value={formManual.compra} onChange={e => setFormManual({...formManual, compra: e.target.value})} placeholder="3.756" style={inpS} />
              </Field>
              <Field label="Venta *">
                <input type="number" step="0.001" value={formManual.venta} onChange={e => setFormManual({...formManual, venta: e.target.value})} placeholder="3.762" style={inpS} />
              </Field>
              <button onClick={guardarManual} disabled={busy} style={{
                padding: '9px 16px', borderRadius: '8px',
                background: BASE.green, color: '#fff', border: 'none',
                fontSize: '12px', fontWeight: '900', cursor: 'pointer',
              }}>💾 GUARDAR</button>
            </div>
          </div>
        )}
      </div>

      {tcs.length === 0 ? (
        <EmptyState icono="💱" titulo="Sin tipos de cambio" descripcion="Consulta el TC SUNAT del dia o registra uno manual." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Fecha</th>
                  <th style={th({ textAlign: 'right' })}>Compra</th>
                  <th style={th({ textAlign: 'right' })}>Venta</th>
                  <th style={th()}>Fuente</th>
                  <th style={th()}>Obtenido</th>
                </tr>
              </thead>
              <tbody>
                {tcs.map((tc, i) => (
                  <tr key={tc.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontWeight: '800', color: BASE.navy }}>{tc.fecha}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', color: '#16a34a' }}>{tc.compra?.toFixed(4)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', color: '#dc2626' }}>{tc.venta?.toFixed(4)}</td>
                    <td style={td()}>
                      <span style={{
                        background: tc.fuente === 'SUNAT' ? BASE.navySoft : BASE.goldLight,
                        color: tc.fuente === 'SUNAT' ? BASE.navy : BASE.goldDark,
                        padding: '3px 9px', borderRadius: '10px',
                        fontSize: '10px', fontWeight: '900',
                      }}>{tc.fuente}</span>
                    </td>
                    <td style={{ ...td(), fontSize: '10px', color: BASE.muted }}>
                      {tc.obtenidoEn ? new Date(tc.obtenidoEn).toLocaleString('es-PE') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

const inpS = { padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff', width: '100%' };
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, ...extra });
