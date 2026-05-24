// src/views/modulos/resultadoOperativo/PartidasExtras.jsx
// Vista compartida para Adicionales y Deductivos. Replica el formato GP-GCE-FOR-F06:
// FRENTE | PARTIDA | DESCRIPCIÓN | PRESUPUESTO (PQ-01 / PQ-02 / Total)
//                                | AVANCE PROGRAMADO (PQ-01 / PQ-02 / Total)
//                                | AVANCE VALORIZADO (PQ-01 / PQ-02 / Total)

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { BASE } from '../../../utils/styles';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';

const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FORM_INICIAL = {
  frente: '',
  partida: '',
  descripcion: '',
  presupuestoPQ01: 0,
  presupuestoPQ02: 0,
  programadoPQ01: 0,
  programadoPQ02: 0,
  valorizadoPQ01: 0,
  valorizadoPQ02: 0,
};

export default function PartidasExtras({
  tipo,           // 'adicionales' | 'deductivos'
  coleccion,      // colección Firestore
  titulo,
  subtitulo,
  color,
  icono,
  showToast,
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const q = query(collection(db, coleccion), orderBy('partida', 'asc'));
    const unsub = onSnapshot(q,
      (snap) => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.warn(`[${coleccion}]`, err.message); setLoading(false); }
    );
    return () => unsub();
  }, [coleccion]);

  const totales = useMemo(() => {
    return items.reduce((a, it) => ({
      pres01: a.pres01 + Number(it.presupuestoPQ01 || 0),
      pres02: a.pres02 + Number(it.presupuestoPQ02 || 0),
      prog01: a.prog01 + Number(it.programadoPQ01  || 0),
      prog02: a.prog02 + Number(it.programadoPQ02  || 0),
      val01:  a.val01  + Number(it.valorizadoPQ01  || 0),
      val02:  a.val02  + Number(it.valorizadoPQ02  || 0),
    }), { pres01: 0, pres02: 0, prog01: 0, prog02: 0, val01: 0, val02: 0 });
  }, [items]);

  const sumar = (a, b) => Number(a || 0) + Number(b || 0);

  const abrirNuevo = () => { setEditando(null); setForm(FORM_INICIAL); setModalAbierto(true); };
  const abrirEdicion = (it) => {
    setEditando(it);
    setForm({
      frente: it.frente || '',
      partida: it.partida || '',
      descripcion: it.descripcion || '',
      presupuestoPQ01: it.presupuestoPQ01 || 0,
      presupuestoPQ02: it.presupuestoPQ02 || 0,
      programadoPQ01: it.programadoPQ01 || 0,
      programadoPQ02: it.programadoPQ02 || 0,
      valorizadoPQ01: it.valorizadoPQ01 || 0,
      valorizadoPQ02: it.valorizadoPQ02 || 0,
    });
    setModalAbierto(true);
  };
  const cerrar = () => { setModalAbierto(false); setEditando(null); setForm(FORM_INICIAL); };

  const guardar = async () => {
    if (!form.partida || !form.descripcion) {
      showToast?.('Completa partida y descripción', 'error');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        presupuestoPQ01: Number(form.presupuestoPQ01) || 0,
        presupuestoPQ02: Number(form.presupuestoPQ02) || 0,
        programadoPQ01: Number(form.programadoPQ01) || 0,
        programadoPQ02: Number(form.programadoPQ02) || 0,
        valorizadoPQ01: Number(form.valorizadoPQ01) || 0,
        valorizadoPQ02: Number(form.valorizadoPQ02) || 0,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: user?.email || 'desconocido',
      };
      if (editando) {
        await updateDoc(doc(db, coleccion, editando.id), payload);
        showToast?.('Actualizado', 'success');
      } else {
        await addDoc(collection(db, coleccion), {
          ...payload, creadoEn: serverTimestamp(), creadoPor: user?.email || 'desconocido',
        });
        showToast?.('Creado', 'success');
      }
      cerrar();
    } catch (e) {
      showToast?.('Error al guardar: ' + e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (it) => {
    if (!confirm(`¿Eliminar la partida ${it.partida}?`)) return;
    try {
      await deleteDoc(doc(db, coleccion, it.id));
      showToast?.('Eliminado', 'success');
    } catch (e) {
      showToast?.('Error: ' + e.message, 'error');
    }
  };

  if (loading) {
    return <p style={{ color: BASE.muted, fontSize: '12px', padding: '20px' }}>Cargando…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        background: BASE.white, border: `1px solid ${BASE.border}`,
        borderRadius: '14px', padding: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
      }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '900', color, letterSpacing: '0.5px' }}>
            {icono} {titulo}
          </p>
          <p style={{ fontSize: '11px', color: BASE.muted, marginTop: '2px' }}>{subtitulo}</p>
        </div>
        <button onClick={abrirNuevo} style={{
          background: color, color: '#fff', border: 'none', padding: '10px 18px',
          borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
          boxShadow: `0 4px 14px ${color}55`,
        }}>
          + Agregar
        </button>
      </div>

      {!items.length ? (
        <EmptyState
          icono={icono}
          titulo={`Sin ${tipo}`}
          descripcion={`Pulsa "Agregar" para registrar ${tipo} con sus presupuestos PQ-01 / PQ-02 y avances.`}
        />
      ) : (
        <div style={{
          background: BASE.white, border: `1px solid ${BASE.border}`,
          borderRadius: '14px', overflow: 'auto', boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '1280px' }}>
            <thead>
              <tr style={{ background: BASE.navy, color: '#fff' }}>
                <th rowSpan={2} style={th()}>Frente</th>
                <th rowSpan={2} style={th()}>Partida</th>
                <th rowSpan={2} style={{ ...th(), textAlign: 'left', minWidth: '220px' }}>Descripción</th>
                <th colSpan={3} style={{ ...th(), background: '#3b82f6' }}>PRESUPUESTO</th>
                <th colSpan={3} style={{ ...th(), background: '#a855f7' }}>AVANCE PROGRAMADO</th>
                <th colSpan={3} style={{ ...th(), background: '#16a34a' }}>AVANCE VALORIZADO</th>
                <th rowSpan={2} style={th()}></th>
              </tr>
              <tr style={{ background: BASE.navyDark, color: '#fff' }}>
                <th style={thSmall()}>PQ-01</th><th style={thSmall()}>PQ-02</th><th style={thSmall()}>Total S/.</th>
                <th style={thSmall()}>PQ-01</th><th style={thSmall()}>PQ-02</th><th style={thSmall()}>Total S/.</th>
                <th style={thSmall()}>PQ-01</th><th style={thSmall()}>PQ-02</th><th style={thSmall()}>Total S/.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} style={{
                  background: i % 2 === 0 ? '#fff' : '#f8fafc',
                  borderBottom: `1px solid ${BASE.border}`,
                }}>
                  <td style={td()}>{it.frente || '—'}</td>
                  <td style={{ ...td(), fontWeight: 700, color: BASE.navy }}>{it.partida}</td>
                  <td style={td('left')}>{it.descripcion}</td>
                  <td style={td('right')}>{fmt(it.presupuestoPQ01)}</td>
                  <td style={td('right')}>{fmt(it.presupuestoPQ02)}</td>
                  <td style={{ ...td('right'), background: '#dbeafe', fontWeight: 700 }}>{fmt(sumar(it.presupuestoPQ01, it.presupuestoPQ02))}</td>
                  <td style={td('right')}>{fmt(it.programadoPQ01)}</td>
                  <td style={td('right')}>{fmt(it.programadoPQ02)}</td>
                  <td style={{ ...td('right'), background: '#f3e8ff', fontWeight: 700 }}>{fmt(sumar(it.programadoPQ01, it.programadoPQ02))}</td>
                  <td style={td('right')}>{fmt(it.valorizadoPQ01)}</td>
                  <td style={td('right')}>{fmt(it.valorizadoPQ02)}</td>
                  <td style={{ ...td('right'), background: '#dcfce7', fontWeight: 700 }}>{fmt(sumar(it.valorizadoPQ01, it.valorizadoPQ02))}</td>
                  <td style={{ ...td(), textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirEdicion(it)} style={btn('#0ea5e9')}>✎</button>
                    <button onClick={() => eliminar(it)}    style={btn(BASE.red)}>✕</button>
                  </td>
                </tr>
              ))}
              <tr style={{ background: BASE.navySoft, fontWeight: 900, color: BASE.navy }}>
                <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right' }}>TOTAL COSTO DE OBRA</td>
                <td style={td('right')}>{fmt(totales.pres01)}</td>
                <td style={td('right')}>{fmt(totales.pres02)}</td>
                <td style={{ ...td('right'), background: '#bfdbfe' }}>{fmt(totales.pres01 + totales.pres02)}</td>
                <td style={td('right')}>{fmt(totales.prog01)}</td>
                <td style={td('right')}>{fmt(totales.prog02)}</td>
                <td style={{ ...td('right'), background: '#e9d5ff' }}>{fmt(totales.prog01 + totales.prog02)}</td>
                <td style={td('right')}>{fmt(totales.val01)}</td>
                <td style={td('right')}>{fmt(totales.val02)}</td>
                <td style={{ ...td('right'), background: '#bbf7d0' }}>{fmt(totales.val01 + totales.val02)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <Modal onClose={cerrar} title={editando ? `Editar ${tipo.slice(0, -1)}` : `Nuevo ${tipo.slice(0, -1)}`} maxW="720px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Campo label="Frente">
              <input type="text" value={form.frente} onChange={(e) => setForm({ ...form, frente: e.target.value })} style={inp()} placeholder="FA01" />
            </Campo>
            <Campo label="Partida *">
              <input type="text" value={form.partida} onChange={(e) => setForm({ ...form, partida: e.target.value })} style={inp()} placeholder="1.01" />
            </Campo>
            <Campo label="Descripción *">
              <input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={inp()} placeholder="Trabajos preliminares" />
            </Campo>
          </div>

          <Bloque titulo="PRESUPUESTO" color="#3b82f6">
            <Numero label="PQ-01" value={form.presupuestoPQ01} onChange={v => setForm({ ...form, presupuestoPQ01: v })} />
            <Numero label="PQ-02" value={form.presupuestoPQ02} onChange={v => setForm({ ...form, presupuestoPQ02: v })} />
            <Total value={sumar(form.presupuestoPQ01, form.presupuestoPQ02)} />
          </Bloque>

          <Bloque titulo="AVANCE PROGRAMADO" color="#a855f7">
            <Numero label="PQ-01" value={form.programadoPQ01} onChange={v => setForm({ ...form, programadoPQ01: v })} />
            <Numero label="PQ-02" value={form.programadoPQ02} onChange={v => setForm({ ...form, programadoPQ02: v })} />
            <Total value={sumar(form.programadoPQ01, form.programadoPQ02)} />
          </Bloque>

          <Bloque titulo="AVANCE VALORIZADO" color="#16a34a">
            <Numero label="PQ-01" value={form.valorizadoPQ01} onChange={v => setForm({ ...form, valorizadoPQ01: v })} />
            <Numero label="PQ-02" value={form.valorizadoPQ02} onChange={v => setForm({ ...form, valorizadoPQ02: v })} />
            <Total value={sumar(form.valorizadoPQ01, form.valorizadoPQ02)} />
          </Bloque>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button onClick={cerrar} disabled={guardando} style={{ ...btnLg('#94a3b8') }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btnLg(color) }}>
              {guardando ? 'Guardando…' : (editando ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const th = () => ({ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: '10.5px', letterSpacing: '0.4px', borderBottom: `2px solid ${BASE.gold}` });
const thSmall = () => ({ padding: '8px 6px', fontWeight: 700, fontSize: '10px', textAlign: 'center', borderBottom: `1px solid #fff` });
const td = (align = 'left') => ({ padding: '8px', textAlign: align });
const btn = (c) => ({ background: c, color: '#fff', border: 'none', padding: '4px 8px', margin: '0 2px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 });
const btnLg = (c) => ({ background: c, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' });
const inp = () => ({ width: '100%', padding: '8px 10px', border: `1px solid ${BASE.border}`, borderRadius: '8px', fontSize: '12px', fontFamily: BASE.font });

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: BASE.muted, marginBottom: '4px', letterSpacing: '0.4px' }}>{label}</label>
      {children}
    </div>
  );
}

function Bloque({ titulo, color, children }) {
  return (
    <div style={{ marginTop: '14px', border: `1.5px solid ${color}33`, borderRadius: '10px', padding: '10px 12px', background: `${color}08` }}>
      <p style={{ fontSize: '10.5px', fontWeight: 900, color, letterSpacing: '0.6px', marginBottom: '8px' }}>{titulo}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

function Numero({ label, value, onChange }) {
  return (
    <Campo label={label}>
      <input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} style={inp()} />
    </Campo>
  );
}

function Total({ value }) {
  return (
    <Campo label="Total S/.">
      <div style={{ padding: '8px 10px', borderRadius: '8px', background: '#f1f5f9', fontWeight: 800, fontSize: '12px', color: BASE.navy, textAlign: 'right' }}>
        {fmt(value)}
      </div>
    </Campo>
  );
}
