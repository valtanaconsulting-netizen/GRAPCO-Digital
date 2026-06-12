// src/views/ingeniero/Tareo.jsx
import React, { useState, useMemo } from 'react';
import { BASE, inp } from '../utils/styles';
import { hoy, fmtFecha } from '../utils/helpers';
import VistaHeader from '../components/VistaHeader';
import { crearResolverNombre } from '../utils/nombresCanonicos';
// TareoPDFHtml se importa DINÁMICO en el handler: html2pdf (~0.5 MB) solo se
// descarga cuando el usuario exporta, no al abrir el área.

export default function Tareo({ historial, filtrados, personalDB, cuadrillasActivas, isMobile, showToast, fDesde, fHasta, fCapataz }) {
  // Resolver de nombres compartido — el MISMO obrero escrito distinto cuenta
  // como UNA persona (ej. Marcelino con/sin espacio en el apellido) en el
  // tareo, en la exportación y en el resumen de pago.
  const resolverNombre = useMemo(
    () => crearResolverNombre(historial || [], personalDB || []),
    [historial, personalDB],
  );
  const [tareoZona,       setTareoZona]       = useState('');
  const [tareoSector,     setTareoSector]     = useState('');
  const [tareoNivel,      setTareoNivel]      = useState('');
  const [tareoJornada,    setTareoJornada]    = useState('8.5h');
  const [tareoRefrigerio, setTareoRefrigerio] = useState('30min');
  const [tareoHoraIni,    setTareoHoraIni]    = useState('07:30');
  const [tareoHoraFin,    setTareoHoraFin]    = useState('17:00');
  const [tareoSupervisor, setTareoSupervisor] = useState('');

  // LOS FILTROS DEL DASHBOARD MANDAN: el Tareo exporta exactamente lo que
  // está filtrado arriba (semana, partida, actividad, capataz, desde/hasta).
  // Si no llega `filtrados` (compatibilidad), cae al filtro propio de fechas.
  const tareoRegistros = useMemo(() => {
    if (Array.isArray(filtrados)) return filtrados.filter(Boolean);
    const ini = fDesde || hoy(), fin = fHasta || hoy();
    return (historial || []).filter(r => {
      if (!r) return false;
      if (r.fecha < ini || r.fecha > fin) return false;
      if (fCapataz && r.capataz !== fCapataz) return false;
      return true;
    });
  }, [filtrados, historial, fDesde, fHasta, fCapataz]);

  // Rango real del resultado filtrado (para nombres de archivo y el subtítulo)
  const { tareoFechaIni, tareoFechaFin } = useMemo(() => {
    const fechas = tareoRegistros.map(r => r.fecha).filter(Boolean).sort();
    return {
      tareoFechaIni: fDesde || fechas[0] || hoy(),
      tareoFechaFin: fHasta || fechas[fechas.length - 1] || hoy(),
    };
  }, [tareoRegistros, fDesde, fHasta]);

  const tareoStats = useMemo(() => {
    const trabajadores = new Set();
    const capataces = new Set();
    let totHH = 0;
    const fechas = new Set();
    const actividades = new Set();
    tareoRegistros.forEach(r => {
      capataces.add(r.capataz);
      fechas.add(r.fecha);
      actividades.add(r._actividadCanonica || r.actividad);
      (r.detalleTareo || []).forEach(t => {
        if (t?.nombre) {
          trabajadores.add(resolverNombre(t.nombre));
          totHH += (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
        }
      });
    });
    return {
      registros: tareoRegistros.length,
      trabajadores: trabajadores.size,
      capataces: capataces.size,
      dias: fechas.size,
      actividades: actividades.size,
      totHH: totHH.toFixed(1),
    };
  }, [tareoRegistros]);

  // ✅ EXPORTAR TAREO DIARIO (Excel IDÉNTICO al F13_MPO oficial — usa el
  // propio archivo F13 como plantilla: estilos, grises, colores y logo exactos)
  const exportarTareoDiario = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');
      showToast('Generando Excel formato F13...', 'info');

      // Agrupar por fecha + capataz (una hoja por día/cuadrilla)
      const registrosPorDia = {};
      tareoRegistros.forEach(r => {
        const key = `${r.fecha}__${r.capataz}`;
        if (!registrosPorDia[key]) registrosPorDia[key] = [];
        registrosPorDia[key].push(r);
      });

      // Import dinámico: exceljs solo se carga al exportar
      const { generarExcelTareoF13 } = await import('../utils/tareoExcelF13');
      const hojas = await generarExcelTareoF13(registrosPorDia, personalDB, tareoSupervisor || 'DIRAC');
      showToast(`✅ Tareo F13 exportado — ${hojas} hoja(s)`, 'success');
    } catch (err) {
      console.error('[exportarTareoDiario]', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // ✅ EXPORTAR PDF TAREO (formato profesional GRAPCO - una página por día/capataz)
  const exportarTareoPDF = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');

      showToast('Generando PDF en LANDSCAPE A4...', 'info');

      // Agrupar por fecha + capataz
      const registrosPorDia = {};
      tareoRegistros.forEach(r => {
        const key = `${r.fecha}__${r.capataz}`;
        if (!registrosPorDia[key]) registrosPorDia[key] = [];
        registrosPorDia[key].push(r);
      });

      const { generarPDFTareoHtml } = await import('../components/TareoPDFHtml');
      await generarPDFTareoHtml(registrosPorDia, personalDB, '20203071702', tareoSupervisor || 'DIRAC');

      showToast(`✅ PDF generado — ${Object.keys(registrosPorDia).length} páginas en landscape A4`, 'success');
    } catch (err) {
      console.error('[exportarTareoPDF]', err);
      showToast(`Error generando PDF: ${err.message}`, 'error');
    }
  };

  // ✅ EXPORTAR TAREO ADMIN — Excel con: HH por día (semanas L-D, HN /
  // HE 60% / HE 100%, totales por día, semana y mes), HH por partida y
  // actividad (matriz semanal trabajadores × actividades) y Resumen de Pago.
  // Las 2 primeras horas extra del día pagan +60%; de la 3.ª en adelante +100%.
  const exportarTareoAdmin = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');
      showToast('Generando Tareo Admin...', 'info');
      const { generarTareoAdminExcel } = await import('../utils/tareoAdminExcel');
      const res = await generarTareoAdminExcel(tareoRegistros, personalDB, tareoFechaIni, tareoFechaFin);
      showToast(`✅ Tareo admin exportado — ${res.trabajadores} trabajadores · ${res.semanas} semana(s)`, 'success');
    } catch (err) {
      console.error('[exportarTareoAdmin]', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

      <VistaHeader icono="clock" eyebrow="Gestión"
        titulo="Tareo"
        subtitulo="Horas-hombre por trabajador y exportación de planilla semanal" />

      {/* Los filtros se controlan desde FILTROS DEL DASHBOARD arriba */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'14px',fontSize:'12px',color:BASE.muted}}>
        <p style={{margin:0}}>El tareo exporta exactamente lo filtrado en <strong>FILTROS DEL DASHBOARD</strong> 👆 — semana, partida, actividad, capataz y fechas. Sin filtros, exporta todo el historial.</p>
      </div>

      {/* Datos del encabezado */}
      <div style={{background:BASE.white,borderRadius:'12px',border:`1px solid ${BASE.border}`,padding:'18px'}}>
        <h4 style={{fontSize:'13px',fontWeight:'800',color:BASE.navy,borderLeft:`4px solid ${BASE.orange}`,paddingLeft:'10px',marginBottom:'14px'}}>📋 DATOS DEL ENCABEZADO</h4>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px'}}>
          {[
            ['SUPERVISOR',tareoSupervisor,setTareoSupervisor,'text','Nombre del supervisor'],
            ['ZONA / OBRA',tareoZona,setTareoZona,'text','Zona de trabajo'],
            ['SECTOR',tareoSector,setTareoSector,'text','Sector'],
            ['NIVEL',tareoNivel,setTareoNivel,'text','Nivel'],
            ['JORNADA',tareoJornada,setTareoJornada,'text','8.5h'],
            ['REFRIGERIO',tareoRefrigerio,setTareoRefrigerio,'text','30min'],
            ['HORA INICIO',tareoHoraIni,setTareoHoraIni,'time'],
            ['HORA FIN',tareoHoraFin,setTareoHoraFin,'time'],
          ].map(([lab,val,set,type,ph])=>(
            <div key={lab}>
              <label style={{fontSize:'10px',fontWeight:'700',color:BASE.muted,letterSpacing:'0.5px',display:'block',marginBottom:'4px'}}>{lab}</label>
              <input type={type} value={val} placeholder={ph||''} onChange={e=>set(e.target.value)} style={inp({fontSize:'12px',padding:'8px 10px'})}/>
            </div>
          ))}
        </div>
      </div>

      {/* Vista previa stats */}
      <div style={{background:BASE.navy,borderRadius:'12px',padding:'18px',color:'#fff'}}>
        <p style={{fontSize:'11px',opacity:0.7,fontWeight:'700',letterSpacing:'1px',marginBottom:'10px'}}>📊 VISTA PREVIA DEL RANGO SELECCIONADO</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:'10px'}}>
          {[
            ['REGISTROS',tareoStats.registros],
            ['DÍAS',tareoStats.dias],
            ['CUADRILLAS',tareoStats.capataces],
            ['TRABAJADORES',tareoStats.trabajadores],
            ['ACTIVIDADES',tareoStats.actividades],
            ['HH TOTAL',tareoStats.totHH],
          ].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,0.12)',borderRadius:'10px',padding:'12px 8px',textAlign:'center'}}>
              <p style={{fontSize:'9px',fontWeight:'700',opacity:0.75,letterSpacing:'0.6px'}}>{l}</p>
              <p style={{fontSize:'22px',fontWeight:'900',marginTop:'4px'}}>{v}</p>
            </div>
          ))}
        </div>
        <p style={{fontSize:'12px',opacity:0.85,marginTop:'12px',textAlign:'center'}}>
          Período: <strong>{fmtFecha(tareoFechaIni)}</strong> al <strong>{fmtFecha(tareoFechaFin)}</strong>
        </p>
      </div>

      {/* Botones de exportación */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:'12px'}}>
        <button onClick={exportarTareoPDF} disabled={!tareoStats.registros}
          style={{padding:'18px',background:tareoStats.registros?'#3B82F6':'#cbd5e1',color:'#fff',border:'none',borderRadius:'12px',fontWeight:'800',cursor:tareoStats.registros?'pointer':'not-allowed',fontSize:'14px',boxShadow:tareoStats.registros?'0 4px 12px rgba(59,130,246,0.3)':'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'24px'}}>📄</span>
          <span>DESCARGAR PDF</span>
          <span style={{fontSize:'11px',fontWeight:'500',opacity:0.9}}>A4 Landscape listo para firmar e imprimir</span>
        </button>
        <button onClick={exportarTareoDiario} disabled={!tareoStats.registros}
          style={{padding:'18px',background:tareoStats.registros?BASE.green:'#cbd5e1',color:'#fff',border:'none',borderRadius:'12px',fontWeight:'800',cursor:tareoStats.registros?'pointer':'not-allowed',fontSize:'14px',boxShadow:tareoStats.registros?'0 4px 12px rgba(22,163,74,0.3)':'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'24px'}}>📋</span>
          <span>TAREO DIARIO (EXCEL)</span>
          <span style={{fontSize:'11px',fontWeight:'500',opacity:0.9}}>Formato F13 oficial — idéntico al PDF, con logo</span>
        </button>
        <button onClick={exportarTareoAdmin} disabled={!tareoStats.registros}
          style={{padding:'18px',background:tareoStats.registros?BASE.orange:'#cbd5e1',color:'#fff',border:'none',borderRadius:'12px',fontWeight:'800',cursor:tareoStats.registros?'pointer':'not-allowed',fontSize:'14px',boxShadow:tareoStats.registros?'0 4px 12px rgba(234,88,12,0.3)':'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'24px'}}>💰</span>
          <span>TAREO ADMIN PARA PAGO</span>
          <span style={{fontSize:'11px',fontWeight:'500',opacity:0.9}}>HH por día (semanas, HE 60%/100%) · Por Partida-Actividad · Resumen Pago</span>
        </button>
      </div>
    </div>
  );
}