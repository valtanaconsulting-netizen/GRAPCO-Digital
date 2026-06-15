// _specs.cjs — especificaciones de los diagramas GRAPCO (nodos + aristas)
const GOLD='#E5A82F', TEAL='#0E8AA0', GREEN='#1f9d57', RED='#c0392b';

const PLANIFICACION = {
  id:'planificacion', title:'Planificación — de arriba hacia abajo (cómo se define el plan)', w:900, nodeW:300, vGap:46,
  legend:[{type:'proc',label:'Módulo / proceso'},{type:'src',label:'Fuente única'},{type:'coll',label:'Colección (base de datos)'}],
  layers:[
    [{id:'editor',type:'proc',title:'EditorWbsIsp.jsx',sub:'Oficina Técnica ingresa partidas, metrados e IP meta'}],
    [{id:'cat',type:'src',title:'Catálogo WBS',sub:'FUENTE ÚNICA · estructura + metas',tag:'Catalogo_WBS'}],
    [{id:'auto',type:'proc',title:'autoprograma.js',sub:'metrado × IP = HH → duración por cuadrilla (tren SS+lag)'}],
    [{id:'cpm',type:'proc',title:'CronogramaPro + cpm.js',sub:'CPM (ES/EF, ruta crítica, holguras) · línea base · Curva S'}],
    [{id:'crono',type:'coll',title:'Cronograma del proyecto',tag:'Cronogramas'}],
    [{id:'lpp',type:'proc',title:'Last Planner (LastPlannerPro)',sub:'Lookahead 4 sem · plan semanal · PPC / CNC'},
     {id:'pd',type:'proc',title:'PlanDiario.jsx',sub:'metrado × IP = HH programado del día'}],
    [{id:'lps',type:'coll',title:'Compromisos semanales',tag:'LPS'},
     {id:'vdc',type:'proc',title:'VDC.jsx',sub:'restricciones · cierre semanal · Pareto'}],
  ],
  edges:[
    {from:'editor',to:'cat',label:'escribe',color:GOLD},
    {from:'cat',to:'auto',label:'lee'},
    {from:'auto',to:'cpm',label:'genera'},
    {from:'cpm',to:'crono',label:'escribe',color:GOLD},
    {from:'crono',to:'lpp',label:'lee'},
    {from:'crono',to:'pd',label:'lee'},
    {from:'lpp',to:'lps',label:'escribe',color:GOLD},
    {from:'lps',to:'vdc',label:'alimenta'},
  ],
};

const PRODUCCION = {
  id:'produccion', title:'Producción — de abajo hacia arriba (el campo retroalimenta el avance)', w:980, nodeW:300, vGap:50,
  legend:[{type:'proc',label:'Módulo / proceso'},{type:'src',label:'Fuente única (la “sangre”)'},{type:'coll',label:'Colección'},{type:'out',label:'Tablero / salida'}],
  layers:[
    [{id:'marc',type:'proc',title:'MarcadorAsistencia.jsx',sub:'cámara: rostro → identidad + hora real'},
     {id:'cap',type:'proc',title:'Capataz.jsx',sub:'cuadrilla · WBS · metrado · HN/HE por trabajador'}],
    [{id:'asis',type:'coll',title:'Asistencia diaria',sub:'entrada/salida real + normalizada',tag:'Asistencia_Diaria'},
     {id:'reg',type:'src',title:'Registros de Campo  ·  LA “SANGRE”',sub:'metrado ejecutado + HH reales (una sola vez)',tag:'Registros_Campo'}],
    [{id:'sync',type:'proc',title:'sincronizarAvance()',sub:'% = metrado ejecutado ÷ metrado total → Curva S'},
     {id:'ing',type:'proc',title:'Ingeniero.jsx',sub:'auditoría · CPI/SPI semanal · IP real vs meta'}],
    [{id:'cronoup',type:'out',title:'Cronograma actualizado',sub:'avance real en el Gantt y la Curva S'},
     {id:'ro',type:'out',title:'Resultado Operativo / Tableros',sub:'CPI/SPI · márgenes · semáforos'}],
  ],
  edges:[
    {from:'marc',to:'asis',label:'escribe',color:GOLD},
    {from:'cap',to:'reg',label:'escribe',color:GOLD},
    {from:'asis',to:'cap',label:'importa HH',dash:'5 4',color:'#8aa0bb'},
    {from:'reg',to:'sync',label:'lee'},
    {from:'reg',to:'ing',label:'lee'},
    {from:'sync',to:'cronoup',color:TEAL},
    {from:'ing',to:'ro',color:TEAL},
  ],
};

const RO = {
  id:'ro', title:'Resultado Operativo (EVM) — ¿de dónde sale cada sol?', w:1080, vGap:54,
  legend:[{type:'coll',label:'Datos que entran (colecciones)'},{type:'hub',label:'useRO (motor de carga)'},{type:'proc',label:'Cálculo'},{type:'out',label:'Vistas de salida'}],
  layers:[
    [{id:'g1',type:'coll',title:'Plan & Precios',sub:'PlanMaestro · APUs (metrado, PU, costo teórico)',w:236},
     {id:'g2',type:'coll',title:'Costo Real (AC) — 4 patas',sub:'Registros_Campo×S/25.5 · Kardex · Facturas · Subcontratos',tag:'→ AC',w:248},
     {id:'g3',type:'coll',title:'Ingresos (EV)',sub:'ValorizacionesContractuales (valorizado al cliente)',w:236},
     {id:'g4',type:'coll',title:'Ajustes & GG',sub:'Adicionales/Deductivos (F05) · GG_Oficina',w:236}],
    [{id:'usero',type:'hub',title:'useRO.js  —  carga 11 colecciones EN VIVO (onSnapshot)',sub:'entrega los arrays ya filtrados por proyecto al motor',w:620}],
    [{id:'motor',type:'proc',title:'calcularROMensual()  (planMaestroAnalytics.js)',sub:'AC = HH×25.5 + Kardex + Facturas + Subcontr.  ·  BAC = metrado×PU  ·  EV = valorizado  ·  PV = BAC×%tiempo  ·  CPI=EV÷AC  SPI=EV÷PV  EAC=BAC÷CPI',w:760}],
    [{id:'oficial',type:'out',title:'RO Oficial (F06)',sub:'tabla EVM + KPIs + PDF',w:230},
     {id:'cr',type:'out',title:'Control de Registros',sub:'desglosa el AC en sus 4 patas',w:240},
     {id:'rof',type:'out',title:'RO por Frentes',sub:'compara F1 vs F2',w:230}],
  ],
  edges:[
    {from:'g1',to:'usero'},{from:'g2',to:'usero'},{from:'g3',to:'usero'},{from:'g4',to:'usero'},
    {from:'usero',to:'motor',label:'alimenta',color:GOLD,w:2.4},
    {from:'motor',to:'oficial',color:TEAL},{from:'motor',to:'cr',color:TEAL},{from:'motor',to:'rof',color:TEAL},
  ],
};

const GLOBAL = {
  id:'global', title:'El viaje del dato: una sola tubería del plan a la obra y al resultado', w:900, nodeW:520, vGap:46,
  bands:[{from:0,to:0,label:'SE PLANEA  (arriba → abajo)',fill:'#f3f7fb'},{from:1,to:4,label:'SE EJECUTA Y SE MIDE  (la obra retroalimenta)',fill:'#fbf7ef'}],
  legend:[{type:'proc',label:'Personas / módulos'},{type:'src',label:'Fuentes únicas'},{type:'out',label:'Resultado'}],
  layers:[
    [{id:'plan',type:'proc',title:'Oficina Técnica / Planeamiento',sub:'define el QUÉ y el CUÁNDO: WBS, metrados, metas y cronograma',w:520}],
    [{id:'fcat',type:'src',title:'Catálogo WBS',sub:'estructura + metas',tag:'Catalogo_WBS',w:240},
     {id:'fpm',type:'src',title:'Plan Maestro',sub:'ejecución mensual valorizada',tag:'PlanMaestro',w:240}],
    [{id:'campo',type:'proc',title:'El CAMPO ejecuta — Capataz + Marcador facial',sub:'registra lo que DE VERDAD pasó: tareo, metrado y asistencia',w:560}],
    [{id:'sangre',type:'src',title:'Registros de Campo  —  la “sangre” que lo une todo',sub:'metrado ejecutado + horas reales (HH)',tag:'Registros_Campo',w:560}],
    [{id:'res',type:'out',title:'RESULTADO OPERATIVO · TABLEROS',sub:'avance, CPI/SPI, Curva S y semáforos verde/rojo (¿ganamos o perdemos?)',w:560}],
  ],
  edges:[
    {from:'plan',to:'fcat',label:'define',color:GOLD},{from:'plan',to:'fpm',label:'define',color:GOLD},
    {from:'fcat',to:'campo',label:'baja a la obra'},{from:'fpm',to:'campo'},
    {from:'campo',to:'sangre',label:'escribe',color:GOLD},
    {from:'sangre',to:'res',label:'alimenta',color:TEAL,w:2.4},
  ],
};

const F05 = {
  id:'f05', title:'Adicionales y Deductivos (F05): cómo cambian el contrato', w:680, nodeW:240, vGap:48,
  layers:[
    [{id:'f',type:'proc',title:'PartidasExtras.jsx  (F05)',sub:'cambios de orden formalizados',w:340}],
    [{id:'adi',type:'good',title:'ADICIONAL  ( + )',sub:'trabajo nuevo aprobado',w:230},
     {id:'ded',type:'coll',title:'DEDUCTIVO  ( − )',sub:'trabajo retirado del alcance',w:230}],
    [{id:'bac',type:'src',title:'BAC  y  EV  del contrato',sub:'Presupuesto y Valor Ganado',w:340}],
  ],
  edges:[
    {from:'f',to:'adi'},{from:'f',to:'ded'},
    {from:'adi',to:'bac',label:'+ incrementa',color:GREEN},
    {from:'ded',to:'bac',label:'− reduce',color:RED},
  ],
};

const LPS = {
  id:'lps', title:'Ciclo Last Planner® (cómo se asegura el cumplimiento semanal)', w:880, nodeW:300, vGap:46,
  legend:[{type:'coll',label:'Plan'},{type:'proc',label:'Proceso semanal'},{type:'out',label:'Indicador'}],
  layers:[
    [{id:'cpm',type:'coll',title:'Cronograma CPM',sub:'tareas con fechas (Cronogramas)',w:300}],
    [{id:'look',type:'proc',title:'Lookahead 4 semanas',sub:'explosiona tareas y libera restricciones (AR)',w:340}],
    [{id:'sem',type:'proc',title:'Plan semanal / compromisos',sub:'el último planificador se compromete con lo que SÍ se puede',w:380}],
    [{id:'ppc',type:'out',title:'PPC',sub:'% Plan Cumplido = cumplidas ÷ comprometidas',w:260},
     {id:'cnc',type:'note',title:'CNC',sub:'Causas de No Cumplimiento (Pareto) → aprender',w:300}],
  ],
  edges:[
    {from:'cpm',to:'look',label:'genera'},
    {from:'look',to:'sem',label:'libera'},
    {from:'sem',to:'ppc',label:'mide',color:GOLD},
    {from:'sem',to:'cnc',label:'analiza'},
    {from:'cnc',to:'look',label:'mejora',dash:'5 4',color:'#8aa0bb'},
  ],
};

const BALANZA = {
  id:'balanza', title:'El Resultado Operativo es una balanza: GANAMOS vs GASTAMOS', w:840, nodeW:360, vGap:54,
  layers:[
    [{id:'gan',type:'good',title:'GANAMOS  →  BAC / EV',sub:'la venta al cliente (valorizaciones contractuales)',w:360},
     {id:'gas',type:'coll',title:'GASTAMOS  →  AC + GG',sub:'costo real: 4 patas (MO·materiales·equipos·subcontratos) + Gastos Generales',w:360}],
    [{id:'margen',type:'src',title:'MARGEN = Ganamos − Gastamos',sub:'EV > AC → ganando (CPI > 1)   ·   EV < AC → perdiendo (CPI < 1)',w:520}],
  ],
  edges:[
    {from:'gan',to:'margen',color:GREEN,w:2.4},
    {from:'gas',to:'margen',color:RED,w:2.4},
  ],
};

module.exports = { PLANIFICACION, PRODUCCION, RO, GLOBAL, F05, LPS, BALANZA };
