// src/views/CartaBalance.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import { CATALOGO_MASTER } from '../utils/constants';
import { CATALOGOS, TIPOS } from './ImportarCartaBalance';
import {
  BASE, LOGO, inp, LETRAS, CB_COL, CARGOS_CORTO,
  DEFAULT_TP, DEFAULT_TC, DEFAULT_TNC
} from '../utils/styles';
import { hoy } from '../utils/helpers';
import DateInput from '../components/DateInput';
import Modal from '../components/Modal';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function CartaBalance({ cuadrillasActivas, personalDB = [], isMobile, showToast }) {
  const { proyectoActivoId } = useProyectoActivo();
  const [cbPhase,           setCbPhase]           = useState('setup');
  const [cbObra,            setCbObra]            = useState('CREDITEX PTARI');
  const [cbFecha,           setCbFecha]           = useState(hoy());
  const [cbHoraInicio,      setCbHoraInicio]      = useState('08:00');
  const [cbHoraFin,         setCbHoraFin]         = useState('09:00');
  const [cbUbicacion,       setCbUbicacion]       = useState('Av. Los Hornos 185, Ate.');
  const [cbPartida,         setCbPartida]         = useState('');
  const [cbSubpartida,      setCbSubpartida]      = useState('');
  const [cbActividad,       setCbActividad]       = useState('');
  const [cbActividadTexto,  setCbActividadTexto]  = useState('');
  const [cbNumTrab,         setCbNumTrab]         = useState(4);
  const [cbTrabajadores,    setCbTrabajadores]    = useState(LETRAS.map(()=>({nombre:'',cargo:'OP'})));
  const [cbCuadrillaOrigen, setCbCuadrillaOrigen] = useState('');
  const [cbTP,              setCbTP]              = useState(DEFAULT_TP);
  const [cbTC,              setCbTC]              = useState(DEFAULT_TC);
  const [cbTNC,             setCbTNC]             = useState(DEFAULT_TNC);
  const [cbTipo,            setCbTipo]            = useState('');
  const [cbNumMed,          setCbNumMed]          = useState(60);
  const [cbMediciones,      setCbMediciones]      = useState([]);
  const [cbActiveCell,      setCbActiveCell]      = useState(null);
  const [cbNewTP,           setCbNewTP]           = useState({cod:'',desc:''});
  const [cbNewTC,           setCbNewTC]           = useState({cod:'',desc:''});
  const [cbNewTNC,          setCbNewTNC]          = useState({cod:'',desc:''});
  const [cbGuardandoDb,     setCbGuardandoDb]     = useState(false);
  const [cbGuardadoOk,      setCbGuardadoOk]      = useState(false);

  // ── Cronómetro de la medición ─────────────────────────────────
  // running: si está corriendo · startedAt: timestamp del último start · elapsedMs: acumulado pausado
  const [crono, setCrono] = useState({ running: false, startedAt: null, elapsedMs: 0 });
  const [, setTick] = useState(0); // fuerza re-render cada segundo cuando corre

  useEffect(() => {
    if (!crono.running) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [crono.running]);

  const cronoElapsed = () => crono.elapsedMs + (crono.running && crono.startedAt ? Date.now() - crono.startedAt : 0);
  const cronoFmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };
  const cronoPlay  = () => setCrono(c => c.running ? c : { ...c, running: true, startedAt: Date.now() });
  const cronoPause = () => setCrono(c => !c.running ? c : { running: false, startedAt: null, elapsedMs: c.elapsedMs + (Date.now() - c.startedAt) });
  const cronoReset = () => setCrono({ running: false, startedAt: null, elapsedMs: 0 });

  useEffect(() => { setCbSubpartida(''); setCbActividad(''); }, [cbPartida]);
  useEffect(() => { setCbActividad(''); }, [cbSubpartida]);

  // Carga los códigos TP/TC/TNC del catálogo REAL según el tipo de actividad.
  // (Genérico = vuelve a los códigos por defecto.) El usuario puede editarlos luego.
  const aplicarTipo = (tipo) => {
    setCbTipo(tipo);
    const cat = CATALOGOS[tipo];
    if (cat) {
      setCbTP(cat.TP ? [...cat.TP] : []);
      setCbTC(cat.TC ? [...cat.TC] : []);
      setCbTNC(cat.TNC ? [...cat.TNC] : []);
    } else {
      setCbTP(DEFAULT_TP); setCbTC(DEFAULT_TC); setCbTNC(DEFAULT_TNC);
    }
  };

  const getCellStyle = cod => {
    if (!cod) return {bg:'#f8fafc',text:'#d1d5db',bord:'#e2e8f0'};
    const u = cod.toUpperCase();
    if (cbTP.some(t=>t.cod.toUpperCase()===u))  return {bg:'#dcfce7',text:'#15803d',bord:'#86efac'};
    if (cbTC.some(t=>t.cod.toUpperCase()===u))  return {bg:'#fef3c7',text:'#b45309',bord:'#fcd34d'};
    if (cbTNC.some(t=>t.cod.toUpperCase()===u)) return {bg:'#fee2e2',text:'#b91c1c',bord:'#fca5a5'};
    return {bg:'#f1f5f9',text:'#64748b',bord:'#cbd5e1'};
  };

  const assignCell = cod => {
    if (!cbActiveCell) return;
    const {row,col} = cbActiveCell;
    setCbMediciones(prev => {
      const next = [...prev];
      next[row] = {...next[row], [LETRAS[col]]:cod};
      return next;
    });
    setCbActiveCell(null);
  };

  const iniciarMedicion = () => {
    if (!cbActividad && !cbActividadTexto) return showToast('Selecciona la actividad a medir','warning');
    setCbMediciones(Array(cbNumMed).fill(null).map(()=>({})));
    setCrono({ running: true, startedAt: Date.now(), elapsedMs: 0 });
    setCbPhase('measure');
  };

  const cbTotals = useMemo(() => {
    if (!cbMediciones.length) return null;
    const cols = LETRAS.slice(0, cbNumTrab);
    const tpSet = new Set(cbTP.map(t => t.cod.toUpperCase()));
    const tcSet = new Set(cbTC.map(t => t.cod.toUpperCase()));
    let gTP=0, gTC=0, gTNC=0, gTotal=0;
    const pw = {};
    cols.forEach(c => { pw[c] = {tp:0, tc:0, tnc:0, total:0, byCod:{}}; });
    cbMediciones.forEach(m => {
      cols.forEach(c => {
        const cod = (m[c]||'').toUpperCase();
        if (cod) {
          pw[c].total++;
          pw[c].byCod[cod] = (pw[c].byCod[cod]||0)+1;
          if (tpSet.has(cod))      { pw[c].tp++; gTP++; }
          else if (tcSet.has(cod)) { pw[c].tc++; gTC++; }
          else                     { pw[c].tnc++; gTNC++; }
          gTotal++;
        }
      });
    });
    return {
      pw, gTP, gTC, gTNC, gTotal,
      pctTP:  gTotal ? Math.round(gTP/gTotal*100)  : 0,
      pctTC:  gTotal ? Math.round(gTC/gTotal*100)  : 0,
      pctTNC: gTotal ? Math.round(gTNC/gTotal*100) : 0,
    };
  }, [cbMediciones, cbTP, cbTC, cbTNC, cbNumTrab]);

  const cbFilled = useMemo(() =>
    cbMediciones.reduce((s,m) => s + LETRAS.slice(0, cbNumTrab).filter(c => m && m[c]).length, 0),
  [cbMediciones, cbNumTrab]);

  const cbProgress = cbNumMed * cbNumTrab > 0
    ? Math.round(cbFilled / (cbNumMed * cbNumTrab) * 100)
    : 0;

  const guardarCB = async () => {
    setCbGuardandoDb(true);
    try {
      // ── NUEVO (Bloque 16): construir formato analítico ──
      // Personas con ID estable (letra) y nombre opcional del input
      const personas = cbTrabajadores.slice(0, cbNumTrab).map((t, i) => ({
        id: LETRAS[i],
        nombre: t.nombre?.trim() || `Trabajador ${LETRAS[i]}`,
        cargo: t.cargo || 'OP',
      }));

      // Aplanar la matriz de mediciones a un array de observaciones
      // Cada celda: cbMediciones[fila][letraTrabajador] = código TP/TC/TNC
      const observaciones = [];
      cbMediciones.forEach((fila, idxFila) => {
        if (!fila) return;
        for (let col = 0; col < cbNumTrab; col++) {
          const letra = LETRAS[col];
          const cod = fila[letra];
          if (!cod) continue;
          // Determinar categoría TP/TC/TNC mirando los catálogos
          let categoria = null;
          let subcategoria = null;
          let descripcion = null;
          if (cbTP.find(x => x.cod === cod))      { categoria = 'TP';  descripcion = cbTP.find(x => x.cod === cod)?.desc;  }
          else if (cbTC.find(x => x.cod === cod)) { categoria = 'TC';  subcategoria = cod; descripcion = cbTC.find(x => x.cod === cod)?.desc; }
          else if (cbTNC.find(x => x.cod === cod)){ categoria = 'TNC'; subcategoria = cod; descripcion = cbTNC.find(x => x.cod === cod)?.desc; }
          if (!categoria) continue;
          observaciones.push({
            personaId: letra,
            categoria,
            subcategoria,
            codigo: cod,
            descripcion,
            tiempo: idxFila,  // índice temporal (0, 1, 2, ...)
          });
        }
      });

      const duracionMs = cronoElapsed();
      await addDoc(collection(db, 'Cartas_Balance'), {
        // ── Aislamiento por proyecto ──
        proyectoId: proyectoActivoId,
        // ── Formato legacy (compatibilidad hacia atrás) ──
        obra: cbObra, fecha: cbFecha, horaInicio: cbHoraInicio, horaFin: cbHoraFin,
        ubicacion: cbUbicacion, actividad: cbActividad || cbActividadTexto,
        trabajadores: cbTrabajadores.slice(0, cbNumTrab),
        tp: cbTP, tc: cbTC, tnc: cbTNC,
        mediciones: cbMediciones, totales: cbTotals,
        timestamp: new Date(),
        // ── Cronómetro ──
        duracionMs,
        duracionFmt: cronoFmt(duracionMs),
        // ── Formato nuevo Bloque 16 (analytics consume estos) ──
        personas,
        observaciones,
        formatoVersion: 2,
        uidAutor: undefined,  // se llena desde reglas si hay auth
      });
      setCbGuardadoOk(true);
      setTimeout(() => setCbGuardadoOk(false), 3000);
      showToast('Carta Balance guardada en Firebase', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setCbGuardandoDb(false);
    }
  };

  return (
    <div style={{maxWidth:'900px',margin:'0 auto'}}>
      {/* Modal celda */}
      {cbActiveCell && (
        <Modal title={`Medición ${cbActiveCell.row+1} — Trabajador ${LETRAS[cbActiveCell.col]}`} onClose={() => setCbActiveCell(null)}>
          {[
            {label:'⚡ TRABAJO PRODUCTIVO (TP)',list:cbTP,color:CB_COL.TP},
            {label:'🔧 TRABAJO CONTRIBUTORIO (TC)',list:cbTC,color:CB_COL.TC},
            {label:'❌ NO CONTRIBUTORIO (TNC)',list:cbTNC,color:CB_COL.TNC},
          ].map(({label, list, color}) => (
            <div key={label} style={{marginBottom:'16px'}}>
              <p style={{fontSize:'11px',fontWeight:'800',color,marginBottom:'8px'}}>{label}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {list.map(t => {
                  const active = cbMediciones[cbActiveCell.row]?.[LETRAS[cbActiveCell.col]] === t.cod;
                  return (
                    <button key={t.cod} onClick={() => assignCell(t.cod)}
                      style={{padding:'7px 12px',background:active?color:color+'18',border:`1.5px solid ${color}`,borderRadius:'8px',color:active?'#fff':color,fontWeight:'700',cursor:'pointer',fontSize:'12px'}}>
                      <strong>{t.cod}</strong> <span style={{fontWeight:'400',opacity:0.85}}>— {t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button onClick={() => assignCell('')}
            style={{width:'100%',padding:'10px',background:BASE.bgSoft,border:`1px solid ${BASE.border}`,borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:BASE.muted,fontWeight:'600'}}>
            🗑️ Limpiar celda
          </button>
        </Modal>
      )}

      {/* Stepper */}
      <div style={{display:'flex',gap:'4px',marginBottom:'16px',background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'4px'}}>
        {[{id:'setup',n:'1',l:'Configuración'},{id:'measure',n:'2',l:'Medición'},{id:'results',n:'3',l:'Resultados'}].map((s,i) => {
          const phases = ['setup','measure','results'];
          const active = cbPhase === s.id;
          const done = phases.indexOf(cbPhase) > i;
          return (
            <button key={s.id} onClick={() => done ? setCbPhase(s.id) : null}
              style={{flex:1,padding:'10px 8px',border:'none',borderRadius:'8px',background:active?BASE.orange:done?BASE.goldLight:'transparent',color:active?'#fff':done?BASE.orange:BASE.muted,fontWeight:'700',fontSize:'12px',cursor:done?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
              <span style={{width:'20px',height:'20px',borderRadius:'50%',background:active?'rgba(255,255,255,0.25)':done?BASE.orange+'33':BASE.bgSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:0,color:active?'#fff':done?BASE.orange:BASE.muted}}>{done&&!active?'✓':s.n}</span>
              {!isMobile && s.l}
            </button>
          );
        })}
      </div>

      {/* SETUP */}
      {cbPhase === 'setup' && (
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {/* Info general */}
          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
            <h3 style={{fontSize:'14px',fontWeight:'800',color:BASE.navy,borderLeft:`4px solid ${BASE.orange}`,paddingLeft:'12px',marginBottom:'16px'}}>INFORMACIÓN GENERAL</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>OBRA</label>
                <input type="text" value={cbObra} placeholder="Nombre de la obra..." onChange={e => setCbObra(e.target.value)} style={inp()}/>
              </div>
              <DateInput label="FECHA" value={cbFecha} onChange={setCbFecha}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {[['HORA INICIO ⏰',cbHoraInicio,setCbHoraInicio],['HORA FIN 🏁',cbHoraFin,setCbHoraFin]].map(([lab,val,set]) => (
                  <div key={lab}>
                    <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>{lab}</label>
                    <input type="time" value={val} onChange={e => set(e.target.value)} style={inp({fontSize:'15px',fontWeight:'600',color:BASE.navy,cursor:'pointer'})}/>
                  </div>
                ))}
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>UBICACIÓN</label>
                <input type="text" value={cbUbicacion} placeholder="Dirección / frente..." onChange={e => setCbUbicacion(e.target.value)} style={inp()}/>
              </div>
            </div>
          </div>

          {/* Actividad */}
          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
            <h3 style={{fontSize:'14px',fontWeight:'800',color:BASE.navy,borderLeft:`4px solid ${BASE.orange}`,paddingLeft:'12px',marginBottom:'16px'}}>ACTIVIDAD A MEDIR</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>📚 TIPO DE ACTIVIDAD · carga los códigos del catálogo real</label>
                <select value={cbTipo} onChange={e => aplicarTipo(e.target.value)} style={inp()}>
                  <option value="">— Genérico (códigos por defecto) —</option>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {cbTipo && <p style={{fontSize:'10.5px',color:'#15803d',marginTop:'6px',fontWeight:'700'}}>✓ Códigos cargados del catálogo «{TIPOS.find(t=>t.id===cbTipo)?.label}». Puedes ajustarlos abajo.</p>}
              </div>
              {[
                {l:'PARTIDA',val:cbPartida,set:setCbPartida,opts:Object.keys(CATALOGO_MASTER)},
                cbPartida && {l:'SUBPARTIDA',val:cbSubpartida,set:setCbSubpartida,opts:Object.keys(CATALOGO_MASTER[cbPartida])},
                cbPartida && cbSubpartida && CATALOGO_MASTER[cbPartida]?.[cbSubpartida]?.length > 0 &&
                  {l:'ACTIVIDAD',val:cbActividad,set:setCbActividad,opts:CATALOGO_MASTER[cbPartida][cbSubpartida]},
              ].filter(Boolean).map((f,i) => (
                <div key={i}>
                  <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>{f.l}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)} style={inp()}>
                    <option value="">Seleccionar...</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {!cbActividad && (
                <div>
                  <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>O ESCRIBE ACTIVIDAD MANUALMENTE</label>
                  <input type="text" value={cbActividadTexto} onChange={e => setCbActividadTexto(e.target.value)} placeholder="Ej: COLOCACIÓN DE ACERO..." style={inp()}/>
                </div>
              )}
              {(cbActividad || cbActividadTexto) && (
                <div style={{background:BASE.goldLight,border:`1px solid ${BASE.gold}55`,borderRadius:'8px',padding:'10px 12px'}}>
                  <p style={{fontSize:'12px',fontWeight:'700',color:BASE.orange}}>✅ {cbActividad || cbActividadTexto}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cuadrilla */}
          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
            <h3 style={{fontSize:'14px',fontWeight:'800',color:BASE.navy,borderLeft:`4px solid ${BASE.orange}`,paddingLeft:'12px',marginBottom:'16px'}}>CUADRILLA</h3>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>N° DE TRABAJADORES</label>
                <select value={cbNumTrab} onChange={e => setCbNumTrab(parseInt(e.target.value))} style={inp()}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} trabajador{n>1?'es':''}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>CARGAR CUADRILLA MAESTRA</label>
                <select value={cbCuadrillaOrigen} onChange={e => {
                  setCbCuadrillaOrigen(e.target.value);
                  if (e.target.value) {
                    const nombres = cuadrillasActivas[e.target.value] || [];
                    // Buscar cargo real de cada miembro en personalDB
                    const miembros = nombres.map(n => {
                      const ficha = personalDB.find(p => p.nombre === n);
                      const cargoLargo = ficha?.cargo || 'Operario';
                      return { nombre: n, cargo: CARGOS_CORTO[cargoLargo] || 'OP' };
                    });
                    setCbTrabajadores(LETRAS.map((_,i) => ({nombre:miembros[i]?.nombre||'', cargo:miembros[i]?.cargo||'OP'})));
                    setCbNumTrab(Math.min(Math.max(miembros.length, 1), 6));
                  }
                }} style={inp()}>
                  <option value="">Cargar desde...</option>
                  {Object.keys(cuadrillasActivas).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'8px'}}>
              {LETRAS.slice(0, cbNumTrab).map((letra, i) => (
                <div key={letra} style={{display:'flex',alignItems:'center',gap:'8px',background:BASE.bgSoft,borderRadius:'8px',padding:'10px 12px'}}>
                  <span style={{width:'22px',height:'22px',borderRadius:'50%',background:BASE.orange,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',flexShrink:0}}>{letra}</span>
                  <input type="text" value={cbTrabajadores[i].nombre}
                    list={`personal-list-${i}`}
                    onChange={e => {
                      const valor = e.target.value;
                      const n = [...cbTrabajadores];
                      // Si el nombre coincide exactamente con uno de personalDB, autocargar cargo
                      const ficha = personalDB.find(p => p.nombre.toUpperCase() === valor.toUpperCase());
                      if (ficha) {
                        const cargoLargo = ficha.cargo || 'Operario';
                        n[i] = { nombre: ficha.nombre, cargo: CARGOS_CORTO[cargoLargo] || 'OP' };
                      } else {
                        n[i] = { ...n[i], nombre: valor };
                      }
                      setCbTrabajadores(n);
                    }}
                    placeholder="Nombre..." style={{flex:1,padding:'6px 8px',borderRadius:'6px',border:`1px solid ${BASE.border}`,fontSize:'12px',outline:'none'}}/>
                  <datalist id={`personal-list-${i}`}>
                    {personalDB.map(p => (
                      <option key={p.id} value={p.nombre}>{p.cargo}</option>
                    ))}
                  </datalist>
                  <select value={cbTrabajadores[i].cargo}
                    onChange={e => { const n = [...cbTrabajadores]; n[i] = {...n[i], cargo:e.target.value}; setCbTrabajadores(n); }}
                    style={{width:'60px',padding:'6px 4px',borderRadius:'6px',border:`1px solid ${BASE.border}`,fontSize:'11px',outline:'none'}}>
                    {['CAP','OP','OF','AY'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {personalDB.length > 0 && (
              <p style={{fontSize:'10px',color:BASE.muted,marginTop:'8px',fontStyle:'italic'}}>
                💡 Al escribir un nombre que ya está registrado en Personal, el cargo se autocompleta.
              </p>
            )}
          </div>

          {/* TP / TC / TNC */}
          {[
            {title:'⚡ TRABAJO PRODUCTIVO (TP)', list:cbTP, setList:setCbTP, color:CB_COL.TP, newS:cbNewTP, setNew:setCbNewTP},
            {title:'🔧 TRABAJO CONTRIBUTORIO (TC)', list:cbTC, setList:setCbTC, color:CB_COL.TC, newS:cbNewTC, setNew:setCbNewTC},
            {title:'❌ NO CONTRIBUTORIO (TNC)', list:cbTNC, setList:setCbTNC, color:CB_COL.TNC, newS:cbNewTNC, setNew:setCbNewTNC},
          ].map(({title, list, setList, color, newS, setNew}) => (
            <div key={title} style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
              <h3 style={{fontSize:'13px',fontWeight:'800',color,borderLeft:`4px solid ${color}`,paddingLeft:'12px',marginBottom:'14px'}}>{title}</h3>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
                {list.map(t => (
                  <div key={t.cod} style={{display:'flex',alignItems:'center',gap:'4px',background:color+'18',border:`1.5px solid ${color}`,borderRadius:'8px',padding:'5px 10px'}}>
                    <strong style={{fontSize:'12px',color}}>{t.cod}</strong>
                    <span style={{fontSize:'11px',color:BASE.muted}}>— {t.desc}</span>
                    <button onClick={() => setList(prev => prev.filter(x => x.cod !== t.cod))}
                      style={{background:'none',border:'none',color,cursor:'pointer',fontSize:'14px',padding:'0 0 0 4px'}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <input type="text" value={newS.cod}
                  onChange={e => setNew(p => ({...p, cod: e.target.value.toUpperCase().slice(0,5)}))}
                  placeholder="COD" maxLength={5}
                  style={{width:'72px',padding:'8px 10px',borderRadius:'7px',border:`1px solid ${color}44`,fontSize:'12px',fontWeight:'700',outline:'none',color}}/>
                <input type="text" value={newS.desc}
                  onChange={e => setNew(p => ({...p, desc: e.target.value}))}
                  placeholder="Descripción..."
                  style={{flex:1,padding:'8px 10px',borderRadius:'7px',border:`1px solid ${BASE.border}`,fontSize:'12px',outline:'none'}}/>
                <button onClick={() => {
                  if (!newS.cod || !newS.desc) return;
                  setList(prev => [...prev, {cod:newS.cod, desc:newS.desc}]);
                  setNew({cod:'', desc:''});
                }} style={{padding:'8px 16px',background:color,color:'#fff',border:'none',borderRadius:'7px',fontWeight:'700',cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}>+ Agregar</button>
              </div>
            </div>
          ))}

          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'16px 18px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'8px'}}>⏱️ DURACIÓN DE LA MEDICIÓN (1 observación por minuto)</label>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {[
                  {min:60,  l:'1 hora',  desc:'60 mediciones'},
                  {min:120, l:'2 horas', desc:'120 mediciones'},
                  {min:180, l:'3 horas', desc:'180 mediciones'},
                ].map(opt => {
                  const activa = cbNumMed === opt.min;
                  return (
                    <button key={opt.min} type="button" onClick={() => setCbNumMed(opt.min)}
                      style={{
                        flex:'1 1 130px', padding:'12px 14px',
                        background: activa ? BASE.orange : BASE.bgSoft,
                        color: activa ? '#fff' : BASE.navy,
                        border: `2px solid ${activa ? BASE.orange : BASE.border}`,
                        borderRadius:'10px', cursor:'pointer',
                        fontSize:'13px', fontWeight:'800',
                        boxShadow: activa ? `0 4px 12px ${BASE.orange}55` : 'none',
                        transition: 'all 0.15s',
                        textAlign:'center',
                      }}>
                      <div style={{fontSize:'15px', fontWeight:'900'}}>{opt.l}</div>
                      <div style={{fontSize:'10px', fontWeight:'600', opacity: activa ? 0.9 : 0.7, marginTop:'2px'}}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <p style={{fontSize:'12px',color:BASE.muted, paddingTop:'4px', borderTop:`1px solid ${BASE.borderSoft}`}}>
              Total celdas: <strong style={{color:BASE.navy}}>{cbNumMed*cbNumTrab}</strong>
              <span style={{margin:'0 6px', opacity:0.4}}>·</span>
              Trabajadores: <strong style={{color:BASE.navy}}>{cbNumTrab}</strong>
              <span style={{margin:'0 6px', opacity:0.4}}>·</span>
              Tiempo total: <strong style={{color:BASE.navy}}>{cbNumMed} min</strong>
            </p>
          </div>

          <button onClick={iniciarMedicion} style={{width:'100%',padding:'18px',background:BASE.orange,color:'#fff',border:'none',borderRadius:'12px',fontSize:'16px',fontWeight:'800',cursor:'pointer',boxShadow:'0 6px 20px rgba(234,88,12,0.35)'}}>
            📊 INICIAR MEDICIÓN →
          </button>
        </div>
      )}

      {/* MEDICIÓN */}
      {cbPhase === 'measure' && (
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'14px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px',marginBottom:'10px'}}>
              <div>
                <p style={{fontSize:'11px',color:BASE.muted,fontWeight:'700',letterSpacing:'0.5px'}}>ACTIVIDAD MUESTREADA</p>
                <p style={{fontSize:'14px',fontWeight:'800',color:BASE.navy}}>{cbActividad || cbActividadTexto}</p>
                <p style={{fontSize:'11px',color:BASE.muted}}>{cbObra} · {cbFecha} · {cbHoraInicio}–{cbHoraFin}</p>
              </div>

              {/* CRONÓMETRO */}
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
                background: crono.running ? BASE.navyDark : BASE.navy, color:'#fff',
                padding:'10px 16px', borderRadius:'12px',
                boxShadow: crono.running ? `0 0 0 2px ${BASE.orange}55, 0 4px 14px rgba(15,23,42,0.25)` : '0 2px 8px rgba(15,23,42,0.15)',
                minWidth:'180px',
              }}>
                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                  <span style={{
                    width:'8px', height:'8px', borderRadius:'50%',
                    background: crono.running ? '#16a34a' : '#94a3b8',
                    boxShadow: crono.running ? '0 0 0 4px #16a34a33' : 'none',
                    animation: crono.running ? 'pulse 1.4s ease-in-out infinite' : 'none',
                  }}/>
                  <span style={{fontSize:'9.5px', fontWeight:'800', letterSpacing:'1px', opacity:0.85}}>
                    {crono.running ? 'EN CURSO' : (crono.elapsedMs > 0 ? 'PAUSADO' : 'LISTO')}
                  </span>
                </div>
                <p style={{fontSize:'26px', fontWeight:'900', fontFamily:'var(--grapco-font-mono, monospace)', letterSpacing:'1px', lineHeight:1}}>
                  {cronoFmt(cronoElapsed())}
                </p>
                <div style={{display:'flex', gap:'4px'}}>
                  {!crono.running ? (
                    <button onClick={cronoPlay} title="Reanudar"
                      style={{padding:'4px 10px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'800', cursor:'pointer'}}>
                      ▶ {crono.elapsedMs > 0 ? 'Reanudar' : 'Iniciar'}
                    </button>
                  ) : (
                    <button onClick={cronoPause} title="Pausar"
                      style={{padding:'4px 10px', background:'#d97706', color:'#fff', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'800', cursor:'pointer'}}>
                      ⏸ Pausar
                    </button>
                  )}
                  <button onClick={cronoReset} title="Reiniciar a 00:00:00"
                    style={{padding:'4px 10px', background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'6px', fontSize:'10px', fontWeight:'700', cursor:'pointer'}}>
                    ↺
                  </button>
                </div>
              </div>

              <div style={{textAlign:'right'}}>
                <p style={{fontSize:'24px',fontWeight:'900',color:BASE.orange}}>{cbProgress}%</p>
                <p style={{fontSize:'11px',color:BASE.muted}}>{cbFilled}/{cbNumMed*cbNumTrab} celdas</p>
              </div>
            </div>
            <div style={{background:BASE.bgSoft,borderRadius:'20px',height:'8px',overflow:'hidden',marginBottom:'10px'}}>
              <div style={{width:`${cbProgress}%`,height:'100%',background:`linear-gradient(90deg,${BASE.orange},${BASE.goldDark})`,borderRadius:'20px',transition:'width 0.3s'}}/>
            </div>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              {[{l:'TP — Productivo',c:CB_COL.TP},{l:'TC — Contributorio',c:CB_COL.TC},{l:'TNC — No Contributorio',c:CB_COL.TNC}].map(x => (
                <div key={x.l} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'12px',height:'12px',borderRadius:'3px',background:x.c+'40',border:`2px solid ${x.c}`}}/>
                  <span style={{fontSize:'10px',color:BASE.muted,fontWeight:'600'}}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`}}>
            <div style={{maxHeight:'65vh', overflow:'auto', WebkitOverflowScrolling:'touch', borderRadius:'12px'}}>
              <table style={{borderCollapse:'separate',borderSpacing:0,minWidth:`${80+cbNumTrab*88}px`,width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{padding:'10px 12px',color:'#fff',fontSize:'11px',fontWeight:'700',textAlign:'center',width:'55px',background:BASE.navy,position:'sticky',top:0,left:0,zIndex:4,boxShadow:'2px 2px 4px rgba(0,0,0,0.08)'}}>Nº</th>
                    {LETRAS.slice(0, cbNumTrab).map((l,i) => (
                      <th key={l} style={{padding:'10px 8px',color:'#fff',fontSize:'11px',fontWeight:'700',textAlign:'center',minWidth:'84px',background:BASE.navy,position:'sticky',top:0,zIndex:3,boxShadow:'0 2px 4px rgba(0,0,0,0.08)'}}>
                        <span style={{display:'block',fontSize:'15px',fontWeight:'900'}}>{l}</span>
                        <span style={{fontSize:'9px',fontWeight:'400',opacity:0.75,display:'block'}}>{cbTrabajadores[i].nombre.split(' ')[0]||'—'} ({cbTrabajadores[i].cargo})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cbMediciones.map((m,ri) => (
                    <tr key={ri} style={{background:ri%2===0?BASE.white:BASE.bgSoft}}>
                      <td style={{padding:'3px 8px',textAlign:'center',fontSize:'11px',fontWeight:'700',color:BASE.muted,borderBottom:`1px solid ${BASE.border}`,position:'sticky',left:0,background:ri%2===0?BASE.white:BASE.bgSoft,zIndex:1}}>{ri+1}</td>
                      {LETRAS.slice(0, cbNumTrab).map((l,ci) => {
                        const cod = m[l] || '';
                        const cs = getCellStyle(cod);
                        return (
                          <td key={l} onClick={() => setCbActiveCell({row:ri, col:ci})} style={{padding:'3px 4px',textAlign:'center',borderBottom:`1px solid ${BASE.border}`,cursor:'pointer'}}>
                            <div style={{background:cs.bg,border:`1.5px solid ${cs.bord}`,borderRadius:'6px',padding:'5px 4px',minHeight:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',color:cs.text,userSelect:'none'}}>
                              {cod || <span style={{fontSize:'18px',color:'#d1d5db',fontWeight:'300'}}>+</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:BASE.bgSoft,borderTop:`2px solid ${BASE.border}`}}>
                    <td style={{padding:'10px 8px',textAlign:'center',fontSize:'10px',fontWeight:'800',color:BASE.navy,position:'sticky',left:0,background:BASE.bgSoft}}>TOTAL</td>
                    {LETRAS.slice(0, cbNumTrab).map(l => {
                      const w = cbTotals?.pw[l];
                      if (!w || !w.total) return <td key={l} style={{padding:'10px 8px',textAlign:'center',fontSize:'11px',color:BASE.muted}}>—</td>;
                      const tot = w.total;
                      return (
                        <td key={l} style={{padding:'8px 6px',textAlign:'center'}}>
                          <div style={{fontSize:'10px',fontWeight:'800',color:CB_COL.TP}}>TP {Math.round(w.tp/tot*100)}%</div>
                          <div style={{fontSize:'10px',color:CB_COL.TC}}>TC {Math.round(w.tc/tot*100)}%</div>
                          <div style={{fontSize:'10px',color:CB_COL.TNC}}>TNC {Math.round(w.tnc/tot*100)}%</div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button onClick={() => { cronoPause(); setCbPhase('results'); }}
            style={{width:'100%',padding:'16px',background:BASE.orange,color:'#fff',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'800',cursor:'pointer',boxShadow:'0 4px 16px rgba(234,88,12,0.3)'}}>
            📈 VER RESULTADOS →
          </button>
        </div>
      )}

      {/* RESULTADOS */}
      {cbPhase === 'results' && cbTotals && (
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          <div style={{background:BASE.navy,borderRadius:'12px',padding:'18px 20px',color:'#fff'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <p style={{fontSize:'20px',fontWeight:'900'}}>CARTA BALANCE</p>
                <p style={{fontSize:'13px',opacity:0.8,marginTop:'4px'}}>{cbActividad || cbActividadTexto}</p>
                <p style={{fontSize:'11px',opacity:0.6,marginTop:'2px'}}>{cbObra} · {cbFecha} · {cbHoraInicio}–{cbHoraFin} · {cbUbicacion}</p>
                {crono.elapsedMs > 0 && (
                  <p style={{fontSize:'11px',opacity:0.85,marginTop:'4px',fontFamily:'var(--grapco-font-mono, monospace)'}}>
                    ⏱️ Duración real: <strong>{cronoFmt(cronoElapsed())}</strong>
                  </p>
                )}
              </div>
              <img src={LOGO} alt="GRAPCO" style={{width:'48px',height:'48px',borderRadius:'10px',objectFit:'cover',opacity:0.9}}/>
            </div>
            <div style={{display:'flex',gap:'6px',marginTop:'12px',flexWrap:'wrap'}}>
              {LETRAS.slice(0, cbNumTrab).map((l,i) => (
                <span key={l} style={{background:'rgba(255,255,255,0.15)',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>
                  {l}: {cbTrabajadores[i].nombre || '—'} ({cbTrabajadores[i].cargo})
                </span>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
            {[
              {label:'TRABAJO PRODUCTIVO',pct:cbTotals.pctTP,count:cbTotals.gTP,color:CB_COL.TP},
              {label:'TRABAJO CONTRIBUTORIO',pct:cbTotals.pctTC,count:cbTotals.gTC,color:CB_COL.TC},
              {label:'NO CONTRIBUTORIO',pct:cbTotals.pctTNC,count:cbTotals.gTNC,color:CB_COL.TNC},
            ].map(s => (
              <div key={s.label} style={{background:BASE.white,borderRadius:'12px',borderTop:`4px solid ${s.color}`,border:`1px solid ${s.color}33`,padding:isMobile?'12px 8px':'16px',textAlign:'center'}}>
                <p style={{fontSize:isMobile?'30px':'38px',fontWeight:'900',color:s.color,lineHeight:1}}>{s.pct}%</p>
                <p style={{fontSize:isMobile?'8px':'10px',fontWeight:'700',color:BASE.muted,marginTop:'6px',lineHeight:1.3}}>{s.label}</p>
                <p style={{fontSize:'11px',color:BASE.muted,marginTop:'4px'}}>{s.count} obs.</p>
              </div>
            ))}
          </div>

          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'16px'}}>
            <h3 style={{fontSize:'13px',fontWeight:'700',color:BASE.navy,marginBottom:'14px'}}>RESULTADOS GENERALES</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={[
                  {name:`TP — ${cbTotals.pctTP}%`,value:cbTotals.pctTP||0.1},
                  {name:`TC — ${cbTotals.pctTC}%`,value:cbTotals.pctTC||0.1},
                  {name:`TNC — ${cbTotals.pctTNC}%`,value:cbTotals.pctTNC||0.1},
                ]} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                  label={({name,value}) => value > 3 ? name : ''} labelLine>
                  {[CB_COL.TP, CB_COL.TC, CB_COL.TNC].map((color,i) => <Cell key={i} fill={color}/>)}
                </Pie>
                <Tooltip formatter={v => `${v}%`}/>
                <Legend wrapperStyle={{fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'16px'}}>
            <h3 style={{fontSize:'13px',fontWeight:'700',color:BASE.navy,marginBottom:'14px'}}>DISTRIBUCIÓN POR TRABAJADOR</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={LETRAS.slice(0, cbNumTrab).map((l,i) => {
                const w = cbTotals.pw[l];
                const tot = w?.total || 1;
                return {
                  name: `${l}${cbTrabajadores[i].nombre.split(' ')[0]?': '+cbTrabajadores[i].nombre.split(' ')[0]:''}`,
                  TP:  w?.total > 0 ? Math.round(w.tp /tot*100) : 0,
                  TC:  w?.total > 0 ? Math.round(w.tc /tot*100) : 0,
                  TNC: w?.total > 0 ? Math.round(w.tnc/tot*100) : 0,
                };
              })} margin={{top:5,right:20,left:0,bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:BASE.muted}} angle={-20} textAnchor="end"/>
                <YAxis tick={{fontSize:11,fill:BASE.muted}} domain={[0,100]} unit="%"/>
                <Tooltip formatter={v => `${v}%`}/>
                <Legend wrapperStyle={{fontSize:'12px'}}/>
                <Bar dataKey="TP" fill={CB_COL.TP} stackId="s"/>
                <Bar dataKey="TC" fill={CB_COL.TC} stackId="s"/>
                <Bar dataKey="TNC" fill={CB_COL.TNC} stackId="s" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
            <h3 style={{fontSize:'13px',fontWeight:'700',color:BASE.navy,marginBottom:'10px'}}>OBSERVACIONES AUTOMÁTICAS</h3>
            {[
              {label:`1. Trabajo Productivo (TP — ${cbTotals.pctTP}%)`,color:CB_COL.TP,
               text: cbTotals.pctTP >= 60
                 ? `El TP supera el 60% indicando buena productividad de la cuadrilla en la actividad de ${cbActividad||cbActividadTexto}.`
                 : `El TP (${cbTotals.pctTP}%) está por debajo del 60% ideal. Se recomienda analizar las causas de TC y TNC para mejorar la eficiencia.`},
              {label:`2. Trabajo Contributorio (TC — ${cbTotals.pctTC}%)`,color:CB_COL.TC,
               text: `El TC representa el ${cbTotals.pctTC}% del tiempo observado. ${cbTotals.pctTC > 35 ? 'Este porcentaje es elevado; revisar si los trabajos de soporte pueden optimizarse.' : 'El nivel de trabajo contributorio es aceptable.'}`},
              {label:`3. No Contributorio (TNC — ${cbTotals.pctTNC}%)`,color:CB_COL.TNC,
               text: `El TNC alcanzó ${cbTotals.pctTNC}%. ${cbTotals.pctTNC > 15 ? 'Este valor supera el 15% recomendado. Se deben identificar y eliminar las causas principales.' : 'El nivel de tiempo no contributorio está dentro del rango aceptable.'}`},
            ].map((obs,i) => (
              <div key={i} style={{background:obs.color+'0d',border:`1px solid ${obs.color}33`,borderLeft:`4px solid ${obs.color}`,borderRadius:'8px',padding:'12px 14px',marginBottom:'10px'}}>
                <p style={{fontSize:'12px',fontWeight:'700',color:obs.color,marginBottom:'4px'}}>{obs.label}</p>
                <p style={{fontSize:'12px',color:BASE.text,lineHeight:1.5}}>{obs.text}</p>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'10px'}}>
            <button onClick={guardarCB} disabled={cbGuardandoDb}
              style={{padding:'16px',background:cbGuardandoDb?'#94a3b8':BASE.green,color:'#fff',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:cbGuardandoDb?'not-allowed':'pointer'}}>
              {cbGuardandoDb?'⏳ Guardando...':cbGuardadoOk?'✅ Guardado!':'💾 GUARDAR EN FIREBASE'}
            </button>
            <button onClick={() => { setCbPhase('setup'); setCbMediciones([]); }}
              style={{padding:'16px',background:'transparent',color:BASE.orange,border:`2px solid ${BASE.orange}`,borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
              🔄 NUEVA CARTA BALANCE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}