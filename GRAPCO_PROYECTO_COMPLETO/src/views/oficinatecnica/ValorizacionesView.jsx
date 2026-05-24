// src/views/oficinatecnica/ValorizacionesView.jsx — Valorizaciones al cliente (B20)
// Calcula automaticamente desde produccion + partidas contractuales

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { BASE } from '../../utils/styles';
import { useAuth } from '../../contexts/AuthContext';
import { calcularValorizacion, fmtSoles, fmtNumero } from '../../utils/calidadOTAnalytics';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

export default function ValorizacionesView({ showToast }) {
  const { user } = useAuth();
  const [valorizaciones, setValorizaciones] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [calculando, setCalculando] = useState(false);

  // Form de creacion
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState(new Date().toISOString().split('T')[0]);
  const [porcAdelanto, setPorcAdelanto] = useState(10);
  const [factorReajuste, setFactorReajuste] = useState(1.0);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'ValorizacionesContractuales'), orderBy('numeroValorizacion', 'desc')),
        (snap) => { setValorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'PartidasContractuales'),
        (snap) => setPartidas(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'Historial'), orderBy('fecha', 'desc')),
        (snap) => setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const proximoNumero = useMemo(() =>
    Math.max(0, ...valorizaciones.map(v => v.numeroValorizacion || 0)) + 1
  , [valorizaciones]);

  const calcularYCrear = async () => {
    if (!partidas.length) {
      showToast?.('Primero carga las partidas contractuales', 'error');
      return;
    }
    if (!periodoHasta) {
      showToast?.('Indica el periodo de la valorizacion', 'error');
      return;
    }

    setCalculando(true);
    try {
      const calculo = calcularValorizacion({
        historial,
        partidasContractuales: partidas,
        periodo: {
          desde: periodoDesde ? new Date(periodoDesde) : null,
          hasta: new Date(periodoHasta),
        },
        porcAdelanto: parseFloat(porcAdelanto) || 0,
        factorReajuste: parseFloat(factorReajuste) || 1.0,
        numeroValorizacion: proximoNumero,
      });

      const data = {
        ...calculo,
        periodo: {
          desde: periodoDesde ? new Date(periodoDesde) : null,
          hasta: new Date(periodoHasta),
        },
        estado: 'borrador',
        creadoEn: serverTimestamp(),
        creadoPor: user?.email || 'desconocido',
      };

      const docRef = await addDoc(collection(db, 'ValorizacionesContractuales'), data);
      showToast?.(`✅ Valorizacion V-${proximoNumero} creada: ${fmtSoles(calculo.total)}`, 'success');
      setCreando(false);
      setEditando({ id: docRef.id, ...data });
    } catch (e) {
      console.error(e);
      showToast?.('Error: ' + e.message, 'error');
    } finally { setCalculando(false); }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'ValorizacionesContractuales', id), {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
        ...(nuevoEstado === 'pagada' ? { fechaPago: serverTimestamp() } : {}),
      });
      showToast?.(`✅ Valorizacion → ${nuevoEstado}`, 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: 'center', color: BASE.muted }}>⏳ Cargando valorizaciones...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontSize: '13px', fontWeight: '900', color: BASE.navy }}>💰 Valorizaciones Contractuales</p>
            <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>
              {valorizaciones.length} emitidas · Total: <strong>{fmtSoles(valorizaciones.reduce((s, v) => s + (v.total || 0), 0))}</strong>
            </p>
          </div>
          <button onClick={() => {
            const ultima = valorizaciones.find(v => v.numeroValorizacion === proximoNumero - 1);
            if (ultima?.periodo?.hasta) {
              const f = ultima.periodo.hasta.toDate ? ultima.periodo.hasta.toDate() : new Date(ultima.periodo.hasta);
              const desde = new Date(f);
              desde.setDate(desde.getDate() + 1);
              setPeriodoDesde(desde.toISOString().split('T')[0]);
            } else {
              setPeriodoDesde('');
            }
            setCreando(true);
          }} style={{
            padding: '10px 20px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
            color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: `0 4px 12px ${BASE.gold}55`,
          }}>
            🤖 NUEVA VALORIZACION (CALCULAR)
          </button>
        </div>
        <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '8px', fontStyle: 'italic' }}>
          🤖 La valorizacion se calcula AUTOMATICAMENTE desde Producción × Precio Unitario contractual.
        </p>
      </div>

      {valorizaciones.length === 0 ? (
        <EmptyState icono="💰" titulo="Sin valorizaciones"
          descripcion="Genera la primera valorizacion. La plataforma calcula avance × precio unitario × reajuste − adelanto + IGV." />
      ) : (
        <div style={{ background: BASE.white, border: `1px solid ${BASE.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>N°</th>
                  <th style={th()}>Periodo</th>
                  <th style={th({ textAlign: 'right' })}>Subtotal Bruto</th>
                  <th style={th({ textAlign: 'right' })}>Reajuste</th>
                  <th style={th({ textAlign: 'right' })}>Adelanto</th>
                  <th style={th({ textAlign: 'right' })}>IGV</th>
                  <th style={th({ textAlign: 'right' })}>TOTAL</th>
                  <th style={th({ textAlign: 'center' })}>Estado</th>
                  <th style={th({ textAlign: 'center' })}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {valorizaciones.map((v, i) => {
                  const desde = v.periodo?.desde?.toDate ? v.periodo.desde.toDate() : (v.periodo?.desde ? new Date(v.periodo.desde) : null);
                  const hasta = v.periodo?.hasta?.toDate ? v.periodo.hasta.toDate() : (v.periodo?.hasta ? new Date(v.periodo.hasta) : null);
                  const estadoColor = v.estado === 'pagada' ? BASE.green : v.estado === 'aprobada' ? '#2563eb' : v.estado === 'enviada' ? '#7c3aed' : '#f59e0b';
                  return (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                      <td style={{ ...td(), fontWeight: '900', color: BASE.navy, fontFamily: 'monospace' }}>V-{v.numeroValorizacion}</td>
                      <td style={{ ...td(), fontSize: '11px', fontFamily: 'monospace' }}>
                        {desde ? desde.toLocaleDateString('es-PE') : '—'} a {hasta ? hasta.toLocaleDateString('es-PE') : '—'}
                      </td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(v.subtotalBruto)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontSize: '11px' }}>×{fmtNumero(v.factorReajuste, 4)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.red }}>-{fmtSoles(v.amortizacionAdelanto)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(v.igv)}</td>
                      <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: BASE.navy, fontSize: '13px' }}>{fmtSoles(v.total)}</td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <span style={{
                          background: estadoColor, color: '#fff',
                          padding: '3px 9px', borderRadius: '10px',
                          fontSize: '9.5px', fontWeight: '900', letterSpacing: '0.4px',
                        }}>{(v.estado || 'borrador').toUpperCase()}</span>
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => setEditando({ id: v.id, ...v })} style={btnAct(BASE.navy)}>VER</button>
                          {v.estado === 'borrador' && (
                            <button onClick={() => cambiarEstado(v.id, 'enviada')} style={btnAct('#7c3aed')}>ENVIAR</button>
                          )}
                          {v.estado === 'enviada' && (
                            <button onClick={() => cambiarEstado(v.id, 'aprobada')} style={btnAct('#2563eb')}>APROBAR</button>
                          )}
                          {v.estado === 'aprobada' && (
                            <button onClick={() => cambiarEstado(v.id, 'pagada')} style={btnAct(BASE.green)}>PAGAR</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de creacion */}
      {creando && (
        <Modal onClose={() => setCreando(false)}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            🤖 Nueva Valorizacion V-{proximoNumero}
          </h3>
          <p style={{ fontSize: '12.5px', color: BASE.muted, marginBottom: '16px' }}>
            La plataforma calculara automaticamente avance × precio unitario contractual × reajuste, descontara adelanto y aplicara IGV.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Periodo desde">
              <input type="date" value={periodoDesde} onChange={e => setPeriodoDesde(e.target.value)} style={inpS} />
            </Field>
            <Field label="Periodo hasta *">
              <input type="date" value={periodoHasta} onChange={e => setPeriodoHasta(e.target.value)} style={inpS} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="% Adelanto a amortizar">
              <input type="number" step="0.01" value={porcAdelanto} onChange={e => setPorcAdelanto(e.target.value)} style={inpS} />
            </Field>
            <Field label="Factor reajuste polinomico">
              <input type="number" step="0.0001" value={factorReajuste} onChange={e => setFactorReajuste(e.target.value)} style={inpS} />
            </Field>
          </div>

          <div style={{
            background: '#dbeafe', border: '1px solid #2563eb55',
            borderLeft: '4px solid #2563eb', borderRadius: '10px',
            padding: '12px 16px', marginBottom: '12px',
          }}>
            <p style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700', lineHeight: 1.5 }}>
              💡 Formula: <code>(Avance del periodo × Precio Unitario × Factor Reajuste) − Adelanto + IGV</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setCreando(false)} style={btnCancel}>Cancelar</button>
            <button onClick={calcularYCrear} disabled={calculando} style={{
              padding: '11px 22px', borderRadius: '8px',
              background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
              color: '#fff', border: 'none', fontSize: '12px', fontWeight: '900',
              cursor: calculando ? 'not-allowed' : 'pointer', letterSpacing: '0.4px',
              opacity: calculando ? 0.5 : 1,
              boxShadow: `0 4px 12px ${BASE.gold}55`,
            }}>
              {calculando ? '⏳ Calculando...' : '🤖 CALCULAR Y CREAR'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de detalle */}
      {editando && (
        <Modal onClose={() => setEditando(null)} maxWidth="800px">
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: BASE.navy, marginBottom: '14px' }}>
            💰 Valorizacion V-{editando.numeroValorizacion}
          </h3>

          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <Resumen label="Subtotal bruto" valor={fmtSoles(editando.subtotalBruto)} />
            <Resumen label="Reajustado" valor={fmtSoles(editando.montoReajustado)} />
            <Resumen label="Adelanto" valor={`-${fmtSoles(editando.amortizacionAdelanto)}`} color={BASE.red} />
            <Resumen label="Subtotal neto" valor={fmtSoles(editando.subtotalNeto)} />
            <Resumen label="IGV" valor={fmtSoles(editando.igv)} />
            <Resumen label="TOTAL" valor={fmtSoles(editando.total)} color={BASE.gold} bold />
          </div>

          {/* Tabla de partidas */}
          <p style={lblSec}>📋 PARTIDAS VALORIZADAS ({editando.partidasValorizadas?.length || 0})</p>
          <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: BASE.navy, color: '#fff' }}>
                  <th style={th()}>Codigo</th>
                  <th style={th()}>Descripcion</th>
                  <th style={th({ textAlign: 'center' })}>Und</th>
                  <th style={th({ textAlign: 'right' })}>Metr. Contr.</th>
                  <th style={th({ textAlign: 'right' })}>P.U.</th>
                  <th style={th({ textAlign: 'right' })}>Av. Anterior</th>
                  <th style={th({ textAlign: 'right' })}>Av. Periodo</th>
                  <th style={th({ textAlign: 'right' })}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {editando.partidasValorizadas?.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? BASE.white : BASE.bgSoft, borderBottom: `1px solid ${BASE.border}` }}>
                    <td style={{ ...td(), fontFamily: 'monospace', fontSize: '10.5px', fontWeight: '900', color: BASE.navy }}>{p.codigo}</td>
                    <td style={{ ...td(), fontSize: '11px' }}>{p.descripcion}</td>
                    <td style={{ ...td(), textAlign: 'center', fontFamily: 'monospace' }}>{p.unidad}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtNumero(p.metradoContractual, 2)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace' }}>{fmtSoles(p.precioUnitario)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', color: BASE.muted }}>{fmtNumero(p.avanceAcumAnterior, 2)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{fmtNumero(p.avancePeriodo, 2)}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: '900', color: BASE.navy }}>{fmtSoles(p.montoBruto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditando(null)} style={btnCancel}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={lblS}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

function Resumen({ label, valor, color, bold }) {
  return (
    <div style={{
      background: BASE.bgSoft, padding: '10px 12px', borderRadius: '8px',
      border: `1px solid ${BASE.border}`, ...(bold ? { borderLeft: `4px solid ${color || BASE.gold}` } : {}),
    }}>
      <p style={{ fontSize: '9px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
      <p style={{
        fontSize: bold ? '15px' : '13px', fontWeight: '900',
        color: color || BASE.navy, marginTop: '3px', fontFamily: 'monospace',
      }}>{valor}</p>
    </div>
  );
}

const lblS = { fontSize: '9.5px', fontWeight: '900', color: BASE.muted, letterSpacing: '0.6px', display: 'block', marginBottom: '4px' };
const lblSec = { fontSize: '11px', fontWeight: '900', color: BASE.navy, letterSpacing: '0.6px', marginBottom: '8px' };
const inpS = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${BASE.border}`, fontSize: '12.5px', fontWeight: '600', background: '#fff' };
const btnCancel = { padding: '11px 22px', borderRadius: '8px', background: BASE.bgSoft, color: BASE.muted, border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer' };
const btnAct = (color) => ({
  padding: '4px 10px', borderRadius: '6px', background: color, color: '#fff',
  border: 'none', fontSize: '9.5px', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.4px',
});
const th = (extra = {}) => ({ padding: '11px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: '900', letterSpacing: '0.4px', whiteSpace: 'nowrap', ...extra });
const td = (extra = {}) => ({ padding: '10px 14px', fontSize: '12px', color: BASE.text, verticalAlign: 'top', ...extra });
