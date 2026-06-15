// src/views/ingeniero/Personal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import {
  CARGOS, CARGOS_STAFF, CARGOS_CORTO, ESPECIALIDADES, LETRAS, BASE, inp
} from '../utils/styles';
import { COSTO_HORA_DEFAULT } from '../utils/helpers';
import { useProyectoActivo } from '../contexts/ProyectoActivoContext';
import Modal from '../components/Modal';
import PersonalBaseDatos from './PersonalBaseDatos';

export default function Personal({ cuadrillasDB: cuadrillasTodas, personalDB: personalTodos, configuracion, showToast }) {
  const { proyectoActivoId, filtrarPorContexto, proyectos } = useProyectoActivo();
  // `personalDB` = SOLO el personal de ESTE proyecto (un proyecto nuevo arranca vacío).
  // `personalTodos` = roster GLOBAL de GRAPCO (todos los que han trabajado), para el
  // buscador "base de datos" que permite traer gente de otras obras a este proyecto.
  const personalDB = useMemo(() => filtrarPorContexto(personalTodos || []), [personalTodos, filtrarPorContexto]);
  // `cuadrillasDB` = SOLO las cuadrillas de ESTE proyecto. Las cuadrillas vienen globales
  // del hook; sin filtrar, un proyecto nuevo (TEXTIL) mostraba cuadrillas de otro (CREDITEX).
  // filtrarPorContexto trabaja sobre arrays → convertimos objeto↔array. Una cuadrilla legacy
  // sin proyectoId solo se ve en el proyecto default (creditex-ptar).
  const cuadrillasDB = useMemo(() => {
    const lista = Object.entries(cuadrillasTodas || {}).map(([id, c]) => ({ id, ...(c || {}) }));
    const out = {};
    // Guardamos el valor ORIGINAL (sin inyectar `id`) para no contaminar el doc al re-guardar.
    filtrarPorContexto(lista).forEach(c => { out[c.id] = cuadrillasTodas[c.id]; });
    return out;
  }, [cuadrillasTodas, filtrarPorContexto]);
  const [modalBaseDatos, setModalBaseDatos] = useState(false);
  const [gTab,            setGTab]            = useState('trabajadores');
  const [modalCuadrilla,  setModalCuadrilla]  = useState(null);
  const [modalTrabajador, setModalTrabajador] = useState(null);
  const [modalTarifas,    setModalTarifas]    = useState(false);
  const [formCuadrilla,   setFormCuadrilla]   = useState({capatazId:'',especialidad:'Albañilería',miembros:[]});
  const [formTrabajador,  setFormTrabajador]  = useState({nombre:'',dni:'',telefono:'',fechaNac:'',cargo:'Operario',cuadrillaId:'',fechaIngreso:'',fechaSalida:'',fechaLiquidacion:''});
  const [formTarifas,     setFormTarifas]     = useState({});
  const [savingTarifas,   setSavingTarifas]   = useState(false);
  const [filtroCargo,     setFiltroCargo]     = useState('');
  const [busqTrab,        setBusqTrab]        = useState('');
  const [busqCuadModal,   setBusqCuadModal]   = useState('');
  const [filtroCargTrab,  setFiltroCargTrab]  = useState('');
  const [filtroTipo,      setFiltroTipo]      = useState('todos'); // todos | obrero | staff

  // Deriva el tipo de trabajador a partir del cargo (única regla, reutilizable)
  const tipoDeCargo = cargo => CARGOS_STAFF.includes(cargo) ? 'staff' : 'obrero';

  // Sincronizar tarifas desde configuracion al abrir modal
  useEffect(() => {
    if (modalTarifas) {
      const tarifasActuales = configuracion?.tarifas || {};
      const merged = {};
      CARGOS.forEach(c => {
        merged[c] = tarifasActuales[c] != null
          ? tarifasActuales[c]
          : COSTO_HORA_DEFAULT[c] || 0;
      });
      setFormTarifas(merged);
    }
  }, [modalTarifas, configuracion]);

  const guardarTarifas = async () => {
    setSavingTarifas(true);
    try {
      // Validar números válidos
      const tarifasLimpias = {};
      for (const [cargo, valor] of Object.entries(formTarifas)) {
        const num = parseFloat(valor);
        if (isNaN(num) || num < 0) {
          showToast(`Tarifa inválida para ${cargo}`, 'warning');
          setSavingTarifas(false);
          return;
        }
        tarifasLimpias[cargo] = num;
      }
      await setDoc(doc(db, 'Configuracion', 'global'), {
        tarifas: tarifasLimpias,
        updatedAt: new Date(),
      }, { merge: true });
      showToast('💰 Tarifas actualizadas. Se aplicarán en el próximo Excel.', 'success');
      setModalTarifas(false);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSavingTarifas(false);
    }
  };


  // ── Helper: encontrar la cuadrilla actual de un trabajador ──
  const cuadrillaDeTrab = (nombreTrab) => {
    return Object.entries(cuadrillasDB).find(([_, c]) =>
      (c.miembros || []).some(m => m.nombre === nombreTrab)
    );
  };

  // ── Cuadrilla CRUD ──
  const guardarCuadrilla = async () => {
    if (!formCuadrilla.capatazId) return showToast('Selecciona un capataz', 'warning');
    try {
      const cap = personalDB.find(p => p.id === formCuadrilla.capatazId);
      const id = modalCuadrilla === 'nuevo' ? `cuadrilla_${Date.now()}` : modalCuadrilla.id;
      await setDoc(doc(db, 'Cuadrillas', id), {
        capataz: cap?.nombre || '',
        capatazId: formCuadrilla.capatazId,
        especialidad: formCuadrilla.especialidad,
        miembros: formCuadrilla.miembros,
        proyectoId: proyectoActivoId || null,
      }, { merge: true });
      showToast(modalCuadrilla === 'nuevo' ? '✅ Cuadrilla creada' : '✅ Cuadrilla actualizada', 'success');
      setModalCuadrilla(null);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const eliminarCuadrilla = async id => {
    if (!window.confirm('¿Eliminar esta cuadrilla?')) return;
    try {
      await deleteDoc(doc(db, 'Cuadrillas', id));
      showToast('Cuadrilla eliminada', 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const abrirModalCuadrilla = item => {
    if (item === 'nuevo') {
      setFormCuadrilla({capatazId:'',especialidad:'Albañilería',miembros:[]});
    } else {
      setFormCuadrilla({capatazId:item.capatazId||'',especialidad:item.especialidad||'General',miembros:[...(item.miembros||[])]});
    }
    setFiltroCargo('');
    setBusqCuadModal('');
    setModalCuadrilla(item);
  };

  // ── Trabajador CRUD con asignación de cuadrilla ──
  const guardarTrabajador = async () => {
    if (!formTrabajador.nombre.trim()) return showToast('Ingresa el nombre', 'warning');
    try {
      const id = modalTrabajador === 'nuevo' ? `personal_${Date.now()}` : modalTrabajador.id;
      const nombreFinal = formTrabajador.nombre.trim().toUpperCase();
      const oldNombre = modalTrabajador?.nombre;

      await setDoc(doc(db, 'Personal', id), {
        nombre: nombreFinal,
        dni: formTrabajador.dni.trim(),
        telefono: (formTrabajador.telefono || '').trim(),
        fechaNac: formTrabajador.fechaNac,
        cargo: formTrabajador.cargo,
        tipo: tipoDeCargo(formTrabajador.cargo),
        fechaIngreso: formTrabajador.fechaIngreso || '',
        fechaSalida: formTrabajador.fechaSalida || '',
        fechaLiquidacion: formTrabajador.fechaLiquidacion || '',
        proyectoId: proyectoActivoId || null,
      }, { merge: true });

      // Si se asignó/cambió cuadrilla, actualizar la(s) cuadrilla(s)
      const cuadActualEntry = oldNombre ? cuadrillaDeTrab(oldNombre) : null;
      const nuevaCuadId = formTrabajador.cuadrillaId;

      // Quitar de la cuadrilla anterior si existe y es distinta
      if (cuadActualEntry && cuadActualEntry[0] !== nuevaCuadId) {
        const [cId, cuad] = cuadActualEntry;
        const newMiembros = (cuad.miembros || []).filter(m => m.nombre !== oldNombre);
        await setDoc(doc(db, 'Cuadrillas', cId), { ...cuad, miembros: newMiembros });
      }
      // Añadir a la nueva cuadrilla
      if (nuevaCuadId && (!cuadActualEntry || cuadActualEntry[0] !== nuevaCuadId)) {
        const cuad = cuadrillasDB[nuevaCuadId];
        if (cuad && formTrabajador.cargo !== 'Capataz') {
          const yaExiste = (cuad.miembros || []).some(m => m.nombre === nombreFinal);
          if (!yaExiste) {
            const nuevosMiembros = [...(cuad.miembros || []), { nombre: nombreFinal, cargo: formTrabajador.cargo }];
            await setDoc(doc(db, 'Cuadrillas', nuevaCuadId), { ...cuad, miembros: nuevosMiembros });
          }
        }
      }
      // Si se cambió el nombre de un trabajador que ya estaba en una cuadrilla, actualizar
      if (oldNombre && oldNombre !== nombreFinal && cuadActualEntry && cuadActualEntry[0] === nuevaCuadId) {
        const [cId, cuad] = cuadActualEntry;
        const newMiembros = (cuad.miembros || []).map(m =>
          m.nombre === oldNombre ? { ...m, nombre: nombreFinal, cargo: formTrabajador.cargo } : m
        );
        await setDoc(doc(db, 'Cuadrillas', cId), { ...cuad, miembros: newMiembros });
      }

      showToast(modalTrabajador === 'nuevo' ? '✅ Trabajador registrado' : '✅ Trabajador actualizado', 'success');
      setModalTrabajador(null);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const eliminarTrabajador = async id => {
    const trab = personalDB.find(p => p.id === id);
    if (!window.confirm(`¿Eliminar a ${trab?.nombre || 'este trabajador'}?`)) return;
    try {
      // Quitar de su cuadrilla si está
      if (trab) {
        const cuadEntry = cuadrillaDeTrab(trab.nombre);
        if (cuadEntry) {
          const [cId, cuad] = cuadEntry;
          const newMiembros = (cuad.miembros || []).filter(m => m.nombre !== trab.nombre);
          await setDoc(doc(db, 'Cuadrillas', cId), { ...cuad, miembros: newMiembros });
        }
      }
      await deleteDoc(doc(db, 'Personal', id));
      showToast('Trabajador eliminado', 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const abrirModalTrabajador = item => {
    if (item === 'nuevo') {
      setFormTrabajador({nombre:'',dni:'',telefono:'',fechaNac:'',cargo:'Operario',cuadrillaId:'',fechaIngreso:'',fechaSalida:'',fechaLiquidacion:''});
    } else {
      const cuadEntry = cuadrillaDeTrab(item.nombre);
      setFormTrabajador({
        nombre: item.nombre,
        dni: item.dni||'',
        telefono: item.telefono||'',
        fechaNac: item.fechaNac||'',
        cargo: item.cargo||'Operario',
        cuadrillaId: cuadEntry ? cuadEntry[0] : '',
        fechaIngreso: item.fechaIngreso||'',
        fechaSalida: item.fechaSalida||'',
        fechaLiquidacion: item.fechaLiquidacion||'',
      });
    }
    setModalTrabajador(item);
  };

  // ── Disponibles para agregar a cuadrilla (en modal cuadrilla) ──
  const disponibles = useMemo(() => personalDB.filter(p => {
    if (p.cargo === 'Capataz') return false;
    if (formCuadrilla.miembros.find(m => m.nombre === p.nombre)) return false;
    if (filtroCargo && p.cargo !== filtroCargo) return false;
    if (busqCuadModal && !p.nombre.toLowerCase().includes(busqCuadModal.toLowerCase())) return false;
    return true;
  }), [personalDB, formCuadrilla.miembros, filtroCargo, busqCuadModal]);

  // Lista de cuadrillas para el selector en formTrabajador
  const cuadrillasParaSelect = useMemo(() => Object.entries(cuadrillasDB).map(([id, c]) => ({
    id,
    label: `${c.capataz || 'Sin capataz'} — ${c.especialidad || 'General'} (${(c.miembros||[]).length})`,
  })), [cuadrillasDB]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

      {/* MODAL TARIFAS POR CARGO */}
      {modalTarifas && (
        <Modal title="Configurar Tarifas por Cargo (S/. por hora)" onClose={()=>setModalTarifas(false)} maxW="520px">
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            <div style={{background:BASE.navySoft,borderRadius:'8px',padding:'12px 14px',border:`1px solid ${BASE.border}`}}>
              <p style={{fontSize:'12px',color:BASE.navy,fontWeight:'600',lineHeight:1.5}}>
                Estas tarifas aplican a todos los trabajadores en los cálculos de costos del Excel
                (HN, HE 60%, HE 100%). Si un trabajador tiene una tarifa individual configurada
                en su ficha, esa prevalece.
              </p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {CARGOS.map(cargo => {
                const numTrabs = personalDB.filter(p => p.cargo === cargo).length;
                const valorDefault = COSTO_HORA_DEFAULT[cargo] || 0;
                const valorActual = formTarifas[cargo] ?? valorDefault;
                const esCustom = (configuracion?.tarifas?.[cargo] != null);
                return (
                  <div key={cargo} style={{display:'grid',gridTemplateColumns:'1fr 130px',gap:'10px',alignItems:'center',padding:'10px 12px',background:BASE.bgSoft,borderRadius:'8px',border:`1px solid ${BASE.border}`}}>
                    <div>
                      <p style={{fontSize:'13px',fontWeight:'700',color:BASE.navy}}>{cargo}</p>
                      <p style={{fontSize:'10px',color:BASE.muted,marginTop:'2px'}}>
                        {numTrabs} trabajador{numTrabs!==1?'es':''}
                        {!esCustom && <span style={{marginLeft:'6px',color:BASE.mutedSoft}}>· default S/ {valorDefault.toFixed(2)}</span>}
                        {esCustom && <span style={{marginLeft:'6px',color:BASE.green,fontWeight:'700'}}>✓ personalizado</span>}
                      </p>
                    </div>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',color:BASE.muted,fontWeight:'700'}}>S/</span>
                      <input
                        type="number" min="0" step="0.5"
                        value={valorActual}
                        onChange={e => setFormTarifas(p => ({...p, [cargo]: e.target.value}))}
                        style={{width:'100%',padding:'8px 10px 8px 32px',borderRadius:'7px',border:`1.5px solid ${BASE.border}`,fontSize:'14px',fontWeight:'700',color:BASE.navy,outline:'none',boxSizing:'border-box',textAlign:'right'}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={guardarTarifas} disabled={savingTarifas}
                style={{flex:2,padding:'14px',background:savingTarifas?BASE.mutedSoft:BASE.navy,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:savingTarifas?'not-allowed':'pointer',fontSize:'14px'}}>
                {savingTarifas ? '⏳ Guardando...' : '💾 Guardar Tarifas'}
              </button>
              <button onClick={()=>setModalTarifas(false)} style={{flex:1,padding:'14px',background:BASE.bgSoft,color:BASE.muted,border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL CUADRILLA */}
      {modalCuadrilla && (
        <Modal title={modalCuadrilla==='nuevo'?'➕ Nueva Cuadrilla':'✏️ Editar Cuadrilla'} onClose={()=>setModalCuadrilla(null)} maxW="640px">
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>
                CAPATAZ <span style={{color:BASE.mutedSoft,fontWeight:'400'}}>(solo trabajadores con cargo Capataz)</span>
              </label>
              {personalDB.filter(p=>p.cargo==='Capataz').length===0 ? (
                <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:'8px',padding:'10px 14px'}}>
                  <p style={{fontSize:'12px',color:'#dc2626',fontWeight:'600'}}>⚠️ No hay trabajadores con cargo "Capataz" registrados.</p>
                </div>
              ) : (
                <select value={formCuadrilla.capatazId} onChange={e=>setFormCuadrilla(p=>({...p,capatazId:e.target.value}))}
                  style={inp({fontSize:'14px',fontWeight:'600',color:BASE.navy})}>
                  <option value="">Seleccionar capataz...</option>
                  {personalDB.filter(p=>p.cargo==='Capataz').map(p=>(
                    <option key={p.id} value={p.id}>{p.nombre}{p.dni?` — DNI: ${p.dni}`:''}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>ESPECIALIDAD</label>
              <select value={formCuadrilla.especialidad} onChange={e=>setFormCuadrilla(p=>({...p,especialidad:e.target.value}))} style={inp()}>
                {ESPECIALIDADES.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Miembros actuales */}
            <div style={{background:BASE.bgSoft,borderRadius:'10px',border:`1px solid ${BASE.border}`,padding:'14px'}}>
              <p style={{fontSize:'11px',fontWeight:'700',color:BASE.navy,marginBottom:'10px',letterSpacing:'0.5px'}}>👷 MIEMBROS ({formCuadrilla.miembros.length})</p>
              {formCuadrilla.miembros.length === 0 ? (
                <p style={{fontSize:'11px',color:BASE.mutedSoft,fontStyle:'italic'}}>Aún no hay miembros. Selecciónalos abajo.</p>
              ) : (
                formCuadrilla.miembros.map((m,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',borderBottom:`1px solid ${BASE.borderSoft}`}}>
                    <span style={{width:'24px',height:'24px',borderRadius:'50%',background:BASE.navy,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:0}}>{LETRAS[i]||i+1}</span>
                    <span style={{flex:1,fontSize:'12px',fontWeight:'600',color:BASE.text}}>{m.nombre}</span>
                    <span style={{fontSize:'11px',color:BASE.muted,background:BASE.border,padding:'2px 8px',borderRadius:'20px'}}>{CARGOS_CORTO[m.cargo]||m.cargo}</span>
                    <button onClick={()=>setFormCuadrilla(p=>({...p,miembros:p.miembros.filter((_,j)=>j!==i)}))}
                      style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',padding:'3px 8px',cursor:'pointer',fontSize:'12px',fontWeight:'700'}}>✕</button>
                  </div>
                ))
              )}
            </div>

            {/* Disponibles para agregar */}
            <div style={{background:BASE.navySoft,borderRadius:'10px',border:`1px solid ${BASE.border}`,padding:'14px'}}>
              <p style={{fontSize:'11px',fontWeight:'700',color:BASE.navy,marginBottom:'10px',letterSpacing:'0.5px'}}>➕ AGREGAR TRABAJADORES</p>
              <div style={{display:'flex',gap:'8px',marginBottom:'10px',flexWrap:'wrap'}}>
                <input type="text" value={busqCuadModal} onChange={e=>setBusqCuadModal(e.target.value)}
                  placeholder="🔍 Buscar..."
                  style={{flex:2,minWidth:'140px',padding:'8px 10px',borderRadius:'7px',border:`1px solid ${BASE.border}`,fontSize:'12px',outline:'none',background:'#fff'}}/>
                <select value={filtroCargo} onChange={e=>setFiltroCargo(e.target.value)}
                  style={{flex:1,minWidth:'130px',padding:'8px 10px',borderRadius:'7px',border:`1px solid ${BASE.border}`,fontSize:'12px',fontWeight:'700',outline:'none',background:'#fff',color:BASE.navy}}>
                  <option value="">Todos los cargos</option>
                  {CARGOS.filter(c=>c!=='Capataz').map(c=>(
                    <option key={c} value={c}>{c} ({personalDB.filter(p=>p.cargo===c&&!formCuadrilla.miembros.find(m=>m.nombre===p.nombre)).length})</option>
                  ))}
                </select>
              </div>
              <div style={{maxHeight:'220px',overflowY:'auto'}}>
                {disponibles.length === 0 ? (
                  <p style={{fontSize:'11px',color:BASE.muted,fontStyle:'italic',textAlign:'center',padding:'14px'}}>No hay trabajadores disponibles con este filtro</p>
                ) : (
                  disponibles.map(p => (
                    <div key={p.id} onClick={()=>setFormCuadrilla(prev=>({...prev,miembros:[...prev.miembros,{nombre:p.nombre,cargo:p.cargo}]}))}
                      style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 12px',background:'#fff',borderRadius:'7px',marginBottom:'5px',cursor:'pointer',border:`1px solid ${BASE.border}`,transition:'0.15s'}}>
                      <span style={{flex:1,fontSize:'12px',fontWeight:'600',color:BASE.text}}>{p.nombre}</span>
                      {p.dni && <span style={{fontSize:'10px',color:BASE.muted,fontFamily:'monospace'}}>{p.dni}</span>}
                      <span style={{fontSize:'10px',color:BASE.muted,background:BASE.bgSoft,padding:'2px 7px',borderRadius:'20px'}}>{CARGOS_CORTO[p.cargo]||p.cargo}</span>
                      <span style={{fontSize:'14px',color:BASE.green,fontWeight:'800'}}>+</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={guardarCuadrilla} style={{flex:2,padding:'14px',background:BASE.navy,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>
                💾 {modalCuadrilla==='nuevo'?'Crear Cuadrilla':'Guardar Cambios'}
              </button>
              <button onClick={()=>setModalCuadrilla(null)} style={{flex:1,padding:'14px',background:BASE.bgSoft,color:BASE.muted,border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL TRABAJADOR — con asignación de cuadrilla */}
      {modalTrabajador && (
        <Modal title={modalTrabajador==='nuevo'?'➕ Nuevo Trabajador':'✏️ Editar Trabajador'} onClose={()=>setModalTrabajador(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>NOMBRE COMPLETO *</label>
              <input type="text" value={formTrabajador.nombre} placeholder="Apellidos y nombres" onChange={e=>setFormTrabajador(p=>({...p,nombre:e.target.value}))} style={inp()}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>DNI</label>
                <input type="text" value={formTrabajador.dni} placeholder="Número de DNI" onChange={e=>setFormTrabajador(p=>({...p,dni:e.target.value}))} style={inp()}/>
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>📱 TELÉFONO</label>
                <input type="tel" inputMode="numeric" value={formTrabajador.telefono} placeholder="Celular de contacto" onChange={e=>setFormTrabajador(p=>({...p,telefono:e.target.value}))} style={inp()}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'6px'}}>
                FECHA DE NACIMIENTO
                {formTrabajador.fechaNac && (() => {
                  const edad = Math.floor((new Date()-new Date(formTrabajador.fechaNac))/31557600000);
                  return <span style={{marginLeft:'8px',color:BASE.green,fontWeight:'800'}}>{edad} años</span>;
                })()}
              </label>
              <div style={{position:'relative',cursor:'pointer'}} onClick={()=>{
                const el=document.getElementById('fechaNacInput');
                if(el){el.focus();try{el.showPicker();}catch(e){}}
              }}>
                <div style={{background:BASE.bgSoft,border:`1.5px solid ${formTrabajador.fechaNac?BASE.navy:BASE.border}`,borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <p style={{fontSize:'15px',fontWeight:'700',color:formTrabajador.fechaNac?BASE.navy:BASE.mutedSoft}}>
                    {formTrabajador.fechaNac ? (() => {
                      const [y,m,d]=formTrabajador.fechaNac.split('-');
                      const MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                      return `${parseInt(d)} ${MESES[parseInt(m)-1]} ${y}`;
                    })() : 'Seleccionar fecha de nacimiento...'}
                  </p>
                  <span style={{fontSize:'20px'}}>🎂</span>
                  <input id="fechaNacInput" type="date" value={formTrabajador.fechaNac}
                    max={new Date(new Date().setFullYear(new Date().getFullYear()-14)).toISOString().split('T')[0]}
                    onChange={e=>setFormTrabajador(p=>({...p,fechaNac:e.target.value}))}
                    style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:0,cursor:'pointer',fontSize:'16px'}}
                  />
                </div>
              </div>
            </div>
            <div>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>CARGO</label>
              <select value={formTrabajador.cargo} onChange={e=>{
                const newCargo = e.target.value;
                // Si cambia a Capataz, quitar la cuadrilla asignada (capataces lideran cuadrillas, no son miembros)
                setFormTrabajador(p=>({...p,cargo:newCargo,cuadrillaId:newCargo==='Capataz'?'':p.cuadrillaId}));
              }} style={inp()}>
                <optgroup label="Mano de obra">
                  {CARGOS.map(c=><option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Staff técnico">
                  {CARGOS_STAFF.map(c=><option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>

            {/* Fechas de gestión del trabajador (todas opcionales) */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'10px'}}>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>Fecha de ingreso</label>
                <input type="date" value={formTrabajador.fechaIngreso} onChange={e=>setFormTrabajador(p=>({...p,fechaIngreso:e.target.value}))} style={inp()}/>
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>Fecha de salida</label>
                <input type="date" value={formTrabajador.fechaSalida} onChange={e=>setFormTrabajador(p=>({...p,fechaSalida:e.target.value}))} style={inp()}/>
              </div>
              <div>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.6px',display:'block',marginBottom:'5px'}}>Fecha de liquidación</label>
                <input type="date" value={formTrabajador.fechaLiquidacion} onChange={e=>setFormTrabajador(p=>({...p,fechaLiquidacion:e.target.value}))} style={inp()}/>
              </div>
            </div>

            {/* NUEVO: Selector de cuadrilla — solo si cargo NO es Capataz */}
            {formTrabajador.cargo !== 'Capataz' && (
              <div style={{background:BASE.navySoft,borderRadius:'10px',border:`1px solid ${BASE.border}`,padding:'14px'}}>
                <label style={{fontSize:'10px',fontWeight:'700',color:BASE.navy,letterSpacing:'0.6px',display:'block',marginBottom:'6px'}}>
                  👥 ASIGNAR A CUADRILLA <span style={{color:BASE.mutedSoft,fontWeight:'400'}}>(opcional)</span>
                </label>
                <select value={formTrabajador.cuadrillaId} onChange={e=>setFormTrabajador(p=>({...p,cuadrillaId:e.target.value}))}
                  style={{...inp({fontSize:'13px'}),background:'#fff'}}>
                  <option value="">— Sin cuadrilla asignada —</option>
                  {cuadrillasParaSelect.map(c=>(
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <p style={{fontSize:'10px',color:BASE.muted,marginTop:'6px',fontStyle:'italic'}}>
                  💡 Al guardar, será añadido automáticamente a la cuadrilla. También aparecerá en Carta Balance.
                </p>
              </div>
            )}
            {formTrabajador.cargo === 'Capataz' && (
              <div style={{background:'#fff7ed',borderRadius:'10px',border:'1px solid #fed7aa',padding:'10px 14px'}}>
                <p style={{fontSize:'11px',color:'#c2410c',fontWeight:'600'}}>
                  ⓘ Los capataces lideran cuadrillas. Crea/edita una cuadrilla en la pestaña <strong>Cuadrillas</strong> para asignarle miembros.
                </p>
              </div>
            )}

            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button onClick={guardarTrabajador} style={{flex:2,padding:'14px',background:BASE.navy,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>
                💾 {modalTrabajador==='nuevo'?'Registrar':'Guardar'}
              </button>
              <button onClick={()=>setModalTrabajador(null)} style={{flex:1,padding:'14px',background:BASE.bgSoft,color:BASE.muted,border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px'}}>
        {[{id:'trabajadores',l:'🪪 Trabajadores'},{id:'cuadrillas',l:'👷 Cuadrillas'}].map(t=>(
          <button key={t.id} onClick={()=>setGTab(t.id)} style={{
            padding:'10px 20px',borderRadius:'8px',border:'none',
            background:gTab===t.id?BASE.gold:BASE.bgSoft,
            color:gTab===t.id?'#fff':BASE.muted,
            fontSize:'13px',fontWeight:'700',cursor:'pointer'
          }}>{t.l}</button>
        ))}
      </div>

      {/* TRABAJADORES */}
      {gTab === 'trabajadores' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:BASE.navy}}>Registro de Trabajadores</h3>
              <p style={{fontSize:'12px',color:BASE.muted,marginTop:'2px'}}>{personalDB.length} trabajador{personalDB.length!==1?'es':''} registrado{personalDB.length!==1?'s':''}</p>
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <button onClick={()=>setModalBaseDatos(true)} style={{padding:'10px 16px',background:'#fff',color:BASE.navy,border:`2px solid ${BASE.gold}`,borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                🔎 Base de datos GRAPCO
              </button>
              <button onClick={()=>setModalTarifas(true)} style={{padding:'10px 16px',background:'#fff',color:BASE.navy,border:`2px solid ${BASE.navy}`,borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                💰 Tarifas
              </button>
              <button onClick={()=>abrirModalTrabajador('nuevo')} style={{padding:'10px 18px',background:BASE.navy,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                ➕ Nuevo Trabajador
              </button>
            </div>
          </div>

          {/* Segmented: separar obreros vs staff */}
          <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap'}}>
            {[
              {id:'todos', l:'Todos', n:personalDB.length},
              {id:'obrero',l:'Obreros',n:personalDB.filter(p=>tipoDeCargo(p.cargo)==='obrero').length},
              {id:'staff', l:'Staff',  n:personalDB.filter(p=>tipoDeCargo(p.cargo)==='staff').length},
            ].map(t=>(
              <button key={t.id} onClick={()=>setFiltroTipo(t.id)} style={{
                padding:'7px 16px',borderRadius:'8px',border:`1.5px solid ${filtroTipo===t.id?BASE.navy:BASE.border}`,
                background:filtroTipo===t.id?BASE.navy:BASE.white,
                color:filtroTipo===t.id?'#fff':BASE.muted,
                fontSize:'12px',fontWeight:'700',cursor:'pointer'
              }}>{t.l} <span style={{opacity:0.7,fontWeight:'600'}}>({t.n})</span></button>
            ))}
          </div>

          <div style={{display:'flex',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
            <input type="text" value={busqTrab} onChange={e=>setBusqTrab(e.target.value)}
              placeholder="🔍 Buscar por nombre o DNI..."
              style={{flex:2,minWidth:'200px',padding:'9px 14px',borderRadius:'8px',border:`1px solid ${BASE.border}`,fontSize:'12px',outline:'none'}}
            />
            <select value={filtroCargTrab} onChange={e=>setFiltroCargTrab(e.target.value)}
              style={{flex:1,minWidth:'140px',padding:'9px 12px',borderRadius:'8px',border:`1px solid ${BASE.border}`,fontSize:'12px',outline:'none',fontWeight:'600'}}>
              <option value="">Todos los cargos</option>
              <optgroup label="Mano de obra">
                {CARGOS.map(c=><option key={c} value={c}>{c} ({personalDB.filter(p=>p.cargo===c).length})</option>)}
              </optgroup>
              <optgroup label="Staff técnico">
                {CARGOS_STAFF.map(c=><option key={c} value={c}>{c} ({personalDB.filter(p=>p.cargo===c).length})</option>)}
              </optgroup>
            </select>
          </div>

          {personalDB.length === 0 ? (
            <div style={{background:BASE.white,borderRadius:'12px',border:`2px dashed ${BASE.border}`,padding:'48px',textAlign:'center'}}>
              <p style={{fontSize:'32px',marginBottom:'12px'}}>🪪</p>
              <p style={{fontSize:'14px',fontWeight:'700',color:BASE.navy,marginBottom:'20px'}}>No hay trabajadores registrados aún</p>
              <button onClick={()=>abrirModalTrabajador('nuevo')} style={{padding:'12px 24px',background:BASE.navy,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>
                ➕ Registrar Primer Trabajador
              </button>
            </div>
          ) : (
            <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'600px'}}>
                  <thead>
                    <tr>{['Nombre','DNI','Cargo','Cuadrilla','F. Nacimiento',''].map((h,i)=>(
                      <th key={i} style={{padding:'11px 12px',background:BASE.navy,color:'#fff',textAlign:'left',fontSize:'11px',fontWeight:'700',whiteSpace:'nowrap'}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {personalDB.filter(p=>{
                      if (busqTrab && !p.nombre.toLowerCase().includes(busqTrab.toLowerCase()) && !p.dni?.includes(busqTrab)) return false;
                      if (filtroCargTrab && p.cargo!==filtroCargTrab) return false;
                      if (filtroTipo!=='todos' && tipoDeCargo(p.cargo)!==filtroTipo) return false;
                      return true;
                    }).map((p,idx)=>{
                      const cuad = Object.values(cuadrillasDB).find(c=>c.miembros?.some(m=>m.nombre===p.nombre)) || null;
                      const edad = p.fechaNac ? Math.floor((new Date()-new Date(p.fechaNac))/31557600000) : null;
                      const esStaff = tipoDeCargo(p.cargo)==='staff';
                      return (
                        <tr key={p.id} style={{background:idx%2===0?BASE.white:BASE.bgSoft,borderBottom:`1px solid ${BASE.border}`}}>
                          <td style={{padding:'10px 12px',fontWeight:'600',color:BASE.text}}>{p.nombre}</td>
                          <td style={{padding:'10px 12px',color:BASE.muted,fontFamily:'monospace'}}>{p.dni||'—'}</td>
                          <td style={{padding:'10px 12px'}}>
                            <span style={{background:BASE.border,color:BASE.text,padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}}>{CARGOS_CORTO[p.cargo]||p.cargo}</span>
                            <span style={{marginLeft:'6px',background:esStaff?BASE.navy+'18':BASE.gold+'18',color:esStaff?BASE.navy:BASE.gold,padding:'2px 8px',borderRadius:'20px',fontSize:'10px',fontWeight:'700'}}>{esStaff?'Staff':'Obrero'}</span>
                          </td>
                          <td style={{padding:'10px 12px',color:cuad?BASE.navy:BASE.muted,fontSize:'11px',fontWeight:cuad?'600':'400'}}>
                            {cuad ? `${cuad.capataz} (${cuad.especialidad||'General'})` : <span style={{color:BASE.mutedSoft}}>Sin cuadrilla</span>}
                          </td>
                          <td style={{padding:'10px 12px',color:BASE.muted,fontSize:'11px'}}>
                            {p.fechaNac||'—'}{edad?<span style={{marginLeft:'6px',color:BASE.mutedSoft}}>({edad} años)</span>:''}
                          </td>
                          <td style={{padding:'10px 12px',display:'flex',gap:'6px'}}>
                            <button onClick={()=>abrirModalTrabajador({id:p.id,...p})} style={{padding:'4px 10px',background:BASE.navySoft,color:BASE.navy,border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:'700'}}>✏️</button>
                            <button onClick={()=>eliminarTrabajador(p.id)} style={{padding:'4px 10px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:'700'}}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CUADRILLAS */}
      {gTab === 'cuadrillas' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:BASE.navy}}>Cuadrillas del Proyecto</h3>
              <p style={{fontSize:'12px',color:BASE.muted,marginTop:'2px'}}>Los cambios se reflejan inmediatamente en el formulario del capataz y en Carta Balance</p>
            </div>
            <button onClick={()=>abrirModalCuadrilla('nuevo')} style={{padding:'10px 18px',background:BASE.orange,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
              ➕ Nueva Cuadrilla
            </button>
          </div>

          {Object.keys(cuadrillasDB).length === 0 ? (
            <div style={{background:BASE.white,borderRadius:'12px',border:`2px dashed ${BASE.border}`,padding:'48px',textAlign:'center'}}>
              <p style={{fontSize:'32px',marginBottom:'12px'}}>👷</p>
              <p style={{fontSize:'14px',fontWeight:'700',color:BASE.navy,marginBottom:'6px'}}>No hay cuadrillas creadas aún</p>
              <p style={{fontSize:'12px',color:BASE.muted,marginBottom:'20px'}}>Primero registra trabajadores con cargo "Capataz", luego crea cuadrillas</p>
              <button onClick={()=>abrirModalCuadrilla('nuevo')} style={{padding:'12px 24px',background:BASE.orange,color:'#fff',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'14px'}}>
                ➕ Crear Primera Cuadrilla
              </button>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'12px'}}>
              {Object.entries(cuadrillasDB).map(([id,c])=>(
                <div key={id} style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div>
                      <p style={{fontSize:'15px',fontWeight:'800',color:BASE.navy}}>
                        {c.capataz || personalDB.find(p=>p.id===c.capatazId)?.nombre || 'Sin capataz'}
                      </p>
                      <span style={{display:'inline-block',background:BASE.orange+'18',color:BASE.orange,border:`1px solid ${BASE.orange}33`,borderRadius:'20px',padding:'2px 10px',fontSize:'11px',fontWeight:'700',marginTop:'4px'}}>
                        🔧 {c.especialidad||'General'}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={()=>abrirModalCuadrilla({id,...c})} style={{padding:'6px 12px',background:BASE.navySoft,color:BASE.navy,border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:'700'}}>✏️ Editar</button>
                      <button onClick={()=>eliminarCuadrilla(id)} style={{padding:'6px 12px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:'700'}}>🗑️</button>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    {(c.miembros||[]).length===0
                      ? <p style={{fontSize:'12px',color:BASE.mutedSoft,fontStyle:'italic'}}>Sin miembros asignados</p>
                      : (c.miembros||[]).map((m,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:BASE.bgSoft,borderRadius:'7px'}}>
                          <span style={{width:'20px',height:'20px',borderRadius:'50%',background:BASE.navy,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'800',flexShrink:0}}>{LETRAS[i]||i+1}</span>
                          <span style={{flex:1,fontSize:'12px',fontWeight:'600',color:BASE.text}}>{m.nombre}</span>
                          <span style={{fontSize:'10px',color:BASE.muted,background:BASE.border,padding:'2px 7px',borderRadius:'20px'}}>{CARGOS_CORTO[m.cargo]||m.cargo}</span>
                        </div>
                      ))}
                  </div>
                  <p style={{fontSize:'11px',color:BASE.muted,marginTop:'10px',textAlign:'right'}}>{(c.miembros||[]).length} miembro{(c.miembros||[]).length!==1?'s':''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalBaseDatos && (
        <PersonalBaseDatos
          personalTodos={personalTodos}
          cuadrillasDB={cuadrillasTodas}
          proyectos={proyectos}
          proyectoActivoId={proyectoActivoId}
          onClose={() => setModalBaseDatos(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}