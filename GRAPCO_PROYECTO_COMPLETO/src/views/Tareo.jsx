// src/views/ingeniero/Tareo.jsx
import React, { useState, useMemo } from 'react';
import { loadXLSX } from '../utils/xlsxLazy';
import { BASE, inp } from '../utils/styles';
import { hoy, fmtFecha } from '../utils/helpers';
import DateInput from '../components/DateInput';
import VistaHeader from '../components/VistaHeader';
import { crearResolverNombre } from '../utils/nombresCanonicos';
import { generarPDFTareo } from '../components/TareoPDF';

export default function Tareo({ historial, personalDB, cuadrillasActivas, isMobile, showToast, fDesde, fHasta, fCapataz, setFDesde, setFHasta, setFCapataz }) {
  // Resolver de nombres compartido — el MISMO obrero escrito distinto cuenta
  // como UNA persona (ej. Marcelino con/sin espacio en el apellido) en el
  // tareo, en la exportación y en el resumen de pago.
  const resolverNombre = useMemo(
    () => crearResolverNombre(historial || [], personalDB || []),
    [historial, personalDB],
  );
  // Ficha de Personal indexada por nombre canónico (para que la búsqueda de
  // DNI/cargo funcione aunque el detalleTareo guarde una variante del nombre).
  const fichaPorCanonico = useMemo(() => {
    const m = {};
    (personalDB || []).forEach(p => {
      if (!p?.nombre) return;
      const c = resolverNombre(p.nombre);
      if (c && !m[c]) m[c] = p;
    });
    return m;
  }, [personalDB, resolverNombre]);
  const [tareoZona,       setTareoZona]       = useState('');
  const [tareoSector,     setTareoSector]     = useState('');
  const [tareoNivel,      setTareoNivel]      = useState('');
  const [tareoJornada,    setTareoJornada]    = useState('8.5h');
  const [tareoRefrigerio, setTareoRefrigerio] = useState('30min');
  const [tareoHoraIni,    setTareoHoraIni]    = useState('07:30');
  const [tareoHoraFin,    setTareoHoraFin]    = useState('17:00');
  const [tareoSupervisor, setTareoSupervisor] = useState('');

  // Inicializar filtros globales si no hay
  const tareoFechaIni = fDesde || hoy();
  const tareoFechaFin = fHasta || hoy();
  const tareoCapataz = fCapataz || '';

  const tareoRegistros = useMemo(() => {
    return historial.filter(r => {
      if (!r) return false;
      if (r.fecha < tareoFechaIni || r.fecha > tareoFechaFin) return false;
      if (tareoCapataz && r.capataz !== tareoCapataz) return false;
      return true;
    });
  }, [historial, tareoFechaIni, tareoFechaFin, tareoCapataz]);

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

  // Atajos de fecha — actualiza filtros globales
  const setRangoRapido = tipo => {
    const h = new Date();
    if (tipo === 'hoy') { setFDesde(hoy()); setFHasta(hoy()); }
    else if (tipo === 'ayer') {
      const a = new Date(h); a.setDate(a.getDate() - 1);
      const aIso = a.toISOString().split('T')[0];
      setFDesde(aIso); setFHasta(aIso);
    }
    else if (tipo === 'semana') {
      const ini = new Date(h); ini.setDate(h.getDate() - h.getDay() + 1);
      setFDesde(ini.toISOString().split('T')[0]); setFHasta(hoy());
    }
    else if (tipo === '7dias') {
      const ini = new Date(h); ini.setDate(h.getDate() - 6);
      setFDesde(ini.toISOString().split('T')[0]); setFHasta(hoy());
    }
    else if (tipo === 'mes') {
      const ini = new Date(h.getFullYear(), h.getMonth(), 1);
      setFDesde(ini.toISOString().split('T')[0]); setFHasta(hoy());
    }
  };

  // ✅ EXPORTAR TAREO DIARIO (formato GRAPCO original)
  const exportarTareoDiario = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');
      const XLSX = await loadXLSX();

      // Agrupar por fecha + capataz
      const grupos = {};
      tareoRegistros.forEach(r => {
        const key = `${r.fecha}__${r.capataz}`;
        if (!grupos[key]) grupos[key] = { fecha: r.fecha, capataz: r.capataz, registros: [] };
        grupos[key].registros.push(r);
      });

      const wb = XLSX.utils.book_new();

      Object.values(grupos).forEach(g => {
        const aoa = [];
        // Encabezado
        aoa.push(['Supervisor:', tareoSupervisor, '', '', '', '', 'ZONA:', tareoZona, '', '', '', '', 'HORARIO DE TRABAJO']);
        aoa.push(['CUADRILLA', g.capataz, '', '', '', '', 'SECTOR:', tareoSector, '', '', '', 'INICIO', tareoHoraIni, 'FIN', tareoHoraFin]);
        aoa.push(['ESPECIALIDAD', '', '', '', '', '', 'NIVEL:', tareoNivel, '', '', '', 'Jornada:', tareoJornada]);
        aoa.push(['JEFE GRUPO', g.capataz, '', '', '', '', '', '', '', '', '', 'Refrigerio:', tareoRefrigerio]);
        aoa.push([]);
        aoa.push(['', '', '', '', '', '', '', '', 'CUENTA DE COSTO (Fase)', '', '', '', '', 'Uni', 'Avance', 'Rendim.']);

        // 14 actividades
        const acts = [...new Set(g.registros.map(r => r._actividadCanonica || r.actividad))].slice(0, 14);
        for (let i = 0; i < 14; i++) {
          const reg = g.registros.find(r => (r._actividadCanonica || r.actividad) === acts[i]);
          aoa.push([`Act. ${i + 1}`, '', '', '', '', '', '', '', acts[i] || '', '', '', '', '', reg?.unidad || '', reg?.metrado || '', reg?.ipReal || '']);
        }
        aoa.push([]);
        aoa.push(['', '', '', '', '', 'REFERENCIAS', '', '', '', '', '', '', '', 'ACTIVIDADES', '', '', '', '', '', '', '', '', '', '', 'HORAS REALES']);
        aoa.push(['CODIGO', 'CAR.', 'OCUPACION', 'DNI', 'TRABAJADORES', 'Hora Ingreso', 'FIRMA INGRESO', 'Hora Salida', 'FIRMA SALIDA',
          '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'N', '0.6', '1.0', 'TOT.']);

        // Trabajadores — se agrupan por nombre canónico (no por la variante
        // exacta) para que el MISMO obrero no salga 2 veces si fue escrito
        // distinto en algún día.
        const trabajadoresMap = {};
        g.registros.forEach((r, idx) => {
          (r.detalleTareo || []).forEach(t => {
            if (!t?.nombre) return;
            const nomKey = resolverNombre(t.nombre);
            if (!trabajadoresMap[nomKey]) {
              const ficha = fichaPorCanonico[nomKey];
              trabajadoresMap[nomKey] = {
                nombre: nomKey, dni: ficha?.dni || '', cargo: ficha?.cargo || 'OP',
                actividades: {}, totHN: 0, totHE: 0,
              };
            }
            const actIdx = acts.indexOf(r._actividadCanonica || r.actividad);
            if (actIdx >= 0) {
              trabajadoresMap[nomKey].actividades[actIdx] = (trabajadoresMap[nomKey].actividades[actIdx] || 0) + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
            }
            trabajadoresMap[nomKey].totHN += parseFloat(t.hn) || 0;
            trabajadoresMap[nomKey].totHE += parseFloat(t.he) || 0;
          });
        });
        const trabajadoresArr = Object.values(trabajadoresMap);
        trabajadoresArr.forEach((t, i) => {
          const row = [i + 1, t.cargo.slice(0, 3).toUpperCase(), t.cargo.toUpperCase(), t.dni, t.nombre, '', '', '', ''];
          for (let j = 0; j < 12; j++) row.push(t.actividades[j] ? t.actividades[j].toFixed(1) : '');
          row.push(t.totHN.toFixed(1));
          row.push((t.totHE * 0.6).toFixed(1));
          row.push(t.totHE.toFixed(1));
          row.push((t.totHN + t.totHE).toFixed(1));
          aoa.push(row);
        });

        // Pie firmas
        aoa.push([]);
        aoa.push(['', '', '', '', '', '', '', '', '', '', '', '', '', 'Número de Trabajadores Parte', '', trabajadoresArr.length]);
        aoa.push(['', '', '', tareoSupervisor, '', '', '', '', tareoSupervisor, '', '', '', '', '', '']);
        aoa.push(['', '', '', 'MAESTRO', '', '', '', '', 'INGENIERO DE PRODUCCIÓN', '', '', '', 'INGENIERO RESIDENTE']);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 7 }, { wch: 6 }, { wch: 13 }, { wch: 11 }, { wch: 34 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 14 },
          ...Array(12).fill({ wch: 5 }),
          { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 7 }
        ];

        const sheetName = `${g.fecha}_${(g.capataz || '').split(' ')[0] || 'Cuad'}`.replace(/[^\w\d_]/g, '').slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      XLSX.writeFile(wb, `Tareo_Diario_${tareoFechaIni}_a_${tareoFechaFin}.xlsx`);
      showToast(`✅ Tareo diario exportado — ${Object.keys(grupos).length} hojas`, 'success');
    } catch (err) {
      console.error('[exportarTareoDiario]', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // ✅ EXPORTAR PDF TAREO (formato profesional GRAPCO - una página por día/capataz)
  const exportarTareoPDF = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');

      // Agrupar por fecha + capataz
      const registrosPorDia = {};
      tareoRegistros.forEach(r => {
        const key = `${r.fecha}__${r.capataz}`;
        if (!registrosPorDia[key]) registrosPorDia[key] = [];
        registrosPorDia[key].push(r);
      });

      const blob = await generarPDFTareo(registrosPorDia, personalDB, '20203071702', 'GRAPCO');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tareo_PDF_${tareoFechaIni}_a_${tareoFechaFin}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`✅ PDF de tareo generado — ${Object.keys(registrosPorDia).length} páginas`, 'success');
    } catch (err) {
      console.error('[exportarTareoPDF]', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // ✅ EXPORTAR TAREO ADMIN (3 hojas: Resumen Pago, Por Actividad, Detalle Diario)
  const exportarTareoAdmin = async () => {
    try {
      if (!tareoRegistros.length) return showToast('No hay registros en el rango', 'warning');
      const XLSX = await loadXLSX();

      // Acumular por trabajador — clave canónica para que el resumen de pago
      // no duplique al mismo obrero por una variante del nombre.
      const acum = {};
      tareoRegistros.forEach(r => {
        (r.detalleTareo || []).forEach(t => {
          if (!t?.nombre) return;
          const nomKey = resolverNombre(t.nombre);
          const ficha = fichaPorCanonico[nomKey] || {};
          if (!acum[nomKey]) {
            acum[nomKey] = {
              nombre: nomKey, dni: ficha.dni || '',
              cargo: ficha.cargo || '', capataces: new Set(),
              totHN: 0, totHE: 0, fechas: new Set(),
              actividades: {},
            };
          }
          const hn = parseFloat(t.hn) || 0, he = parseFloat(t.he) || 0;
          acum[nomKey].totHN += hn; acum[nomKey].totHE += he;
          acum[nomKey].fechas.add(r.fecha); acum[nomKey].capataces.add(resolverNombre(r.capataz));
          acum[nomKey].actividades[r._actividadCanonica || r.actividad] = (acum[nomKey].actividades[r._actividadCanonica || r.actividad] || 0) + hn + he;
        });
      });
      const arr = Object.values(acum).sort((a, b) => a.nombre.localeCompare(b.nombre));

      // ═════ HOJA 1: Resumen Pago ═════
      const aoa1 = [];
      aoa1.push(['TAREO CONSOLIDADO PARA PAGO']);
      aoa1.push([`Período: ${tareoFechaIni} al ${tareoFechaFin}`]);
      aoa1.push([`Total trabajadores: ${arr.length} · Generado: ${new Date().toLocaleString('es-PE')}`]);
      aoa1.push([]);
      aoa1.push(['#', 'DNI', 'APELLIDOS Y NOMBRES', 'CARGO', 'CUADRILLA', 'DÍAS', 'HH NORMAL', 'HH EXTRA', 'HH TOTAL', 'HE 60%', 'HE 100%', 'OBSERVACIÓN']);
      let totalHN = 0, totalHE = 0, totalHHTOT = 0;
      arr.forEach((t, i) => {
        const cuadrillas = Array.from(t.capataces).join(' / ');
        const tot = t.totHN + t.totHE;
        totalHN += t.totHN; totalHE += t.totHE; totalHHTOT += tot;
        aoa1.push([i + 1, t.dni || '-', t.nombre, t.cargo || '—', cuadrillas, t.fechas.size, t.totHN.toFixed(1), t.totHE.toFixed(1), tot.toFixed(1), (t.totHE * 0.6).toFixed(1), t.totHE.toFixed(1), '']);
      });
      aoa1.push([]);
      aoa1.push(['', '', '', '', 'TOTALES:', arr.reduce((s, t) => s + t.fechas.size, 0), totalHN.toFixed(1), totalHE.toFixed(1), totalHHTOT.toFixed(1), (totalHE * 0.6).toFixed(1), totalHE.toFixed(1), '']);

      const ws1 = XLSX.utils.aoa_to_sheet(aoa1);
      ws1['!cols'] = [{ wch: 5 }, { wch: 11 }, { wch: 38 }, { wch: 13 }, { wch: 30 }, { wch: 7 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 20 }];
      ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } }];

      // ═════ HOJA 2: Por Actividad ═════
      const todasActs = new Set();
      arr.forEach(t => Object.keys(t.actividades).forEach(a => todasActs.add(a)));
      const actsArr = Array.from(todasActs).sort();

      const aoa2 = [];
      aoa2.push(['DETALLE DE HORAS POR ACTIVIDAD']);
      aoa2.push([`Período: ${tareoFechaIni} al ${tareoFechaFin}`]);
      aoa2.push([]);
      aoa2.push(['#', 'DNI', 'TRABAJADOR', 'CARGO', ...actsArr, 'TOTAL HH']);
      arr.forEach((t, i) => {
        const row = [i + 1, t.dni || '-', t.nombre, t.cargo || '—'];
        let suma = 0;
        actsArr.forEach(a => {
          const h = t.actividades[a] || 0;
          suma += h;
          row.push(h ? parseFloat(h.toFixed(1)) : '');
        });
        row.push(parseFloat(suma.toFixed(1)));
        aoa2.push(row);
      });
      const totalRow = ['', '', 'TOTAL POR ACTIVIDAD', '—'];
      let granTotal = 0;
      actsArr.forEach(a => {
        const sumAct = arr.reduce((s, t) => s + (t.actividades[a] || 0), 0);
        granTotal += sumAct;
        totalRow.push(parseFloat(sumAct.toFixed(1)));
      });
      totalRow.push(parseFloat(granTotal.toFixed(1)));
      aoa2.push([]);
      aoa2.push(totalRow);

      const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
      ws2['!cols'] = [{ wch: 5 }, { wch: 11 }, { wch: 36 }, { wch: 13 }, ...actsArr.map(() => ({ wch: 16 })), { wch: 11 }];
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 + actsArr.length } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 + actsArr.length } }];

      // ═════ HOJA 3: Detalle Diario ═════
      const aoa3 = [];
      aoa3.push(['DETALLE DIARIO POR TRABAJADOR']);
      aoa3.push([`Período: ${tareoFechaIni} al ${tareoFechaFin}`]);
      aoa3.push([]);
      aoa3.push(['FECHA', 'DNI', 'TRABAJADOR', 'CAPATAZ', 'ACTIVIDAD', 'PARTIDA', 'HN', 'HE', 'TOTAL HH']);
      tareoRegistros.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).forEach(r => {
        (r.detalleTareo || []).forEach(t => {
          if (!t?.nombre) return;
          const nomKey = resolverNombre(t.nombre);
          const ficha = fichaPorCanonico[nomKey] || {};
          const hn = parseFloat(t.hn) || 0, he = parseFloat(t.he) || 0;
          aoa3.push([r.fecha, ficha.dni || '-', nomKey, resolverNombre(r.capataz), r.actividad, r.partida,
            parseFloat(hn.toFixed(1)), parseFloat(he.toFixed(1)), parseFloat((hn + he).toFixed(1))]);
        });
      });

      const ws3 = XLSX.utils.aoa_to_sheet(aoa3);
      ws3['!cols'] = [{ wch: 11 }, { wch: 11 }, { wch: 36 }, { wch: 30 }, { wch: 42 }, { wch: 24 }, { wch: 7 }, { wch: 7 }, { wch: 11 }];
      ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Pago');
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Actividad');
      XLSX.utils.book_append_sheet(wb, ws3, 'Detalle Diario');

      XLSX.writeFile(wb, `Tareo_Admin_${tareoFechaIni}_a_${tareoFechaFin}.xlsx`);
      showToast(`✅ Tareo admin exportado — ${arr.length} trabajadores · 3 hojas`, 'success');
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
        <p style={{margin:0}}>Los filtros de fecha y capataz se aplican desde <strong>FILTROS DEL DASHBOARD</strong> arriba 👆</p>
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
          <span>TAREO DIARIO</span>
          <span style={{fontSize:'11px',fontWeight:'500',opacity:0.9}}>Formato GRAPCO original (Excel)</span>
        </button>
        <button onClick={exportarTareoAdmin} disabled={!tareoStats.registros}
          style={{padding:'18px',background:tareoStats.registros?BASE.orange:'#cbd5e1',color:'#fff',border:'none',borderRadius:'12px',fontWeight:'800',cursor:tareoStats.registros?'pointer':'not-allowed',fontSize:'14px',boxShadow:tareoStats.registros?'0 4px 12px rgba(234,88,12,0.3)':'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'24px'}}>💰</span>
          <span>TAREO ADMIN PARA PAGO</span>
          <span style={{fontSize:'11px',fontWeight:'500',opacity:0.9}}>3 hojas: Resumen, Por Actividad, Detalle</span>
        </button>
      </div>
    </div>
  );
}