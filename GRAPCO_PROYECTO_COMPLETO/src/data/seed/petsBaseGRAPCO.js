// src/data/seed/petsBaseGRAPCO.js
// Catálogo base de PETs (Procedimientos Escritos de Trabajo Seguro) GRAPCO SAC
// Transcritos de los PDFs originales del SGC para que se puedan cargar/editar desde la plataforma.
// Mantiene la estructura del editor PETEditor.jsx (10 secciones + cabecera).

const APROBACIONES_STD = (fecha = '2025-11-03') => ([
  { rol: 'ELABORÓ',  nombre: 'Nicole Huatay Gonzales',    cargo: 'Ing. de Calidad',     fecha },
  { rol: 'ELABORÓ',  nombre: 'Adderly Gonzales Rojas',    cargo: 'Ing. de Producción',  fecha },
  { rol: 'REVISÓ',   nombre: 'Luis Enrique Martinez Herrera', cargo: 'Jefe SSOMA',      fecha },
  { rol: 'APROBÓ',   nombre: 'Guido Gonzales Gutierrez',  cargo: 'Ing. Residente',      fecha },
  { rol: 'APROBÓ',   nombre: 'José Teixeira Velit',       cargo: 'Gerente General',     fecha },
]);

const REFERENCIAS_STD = [
  'Ley Nº 29783, Ley de Seguridad y Salud en el trabajo y su modificatoria Ley Nº 30222',
  'D.S. Nº 005-2012-TR: Reglamento de la Ley Nº 29783 y su modificatoria D.S. Nº 006-2014-TR',
  'D.S. Nº 011-2019-TR — Reglamento de seguridad y salud en el trabajo para sector construcción',
  'D.S. Nº 003-98-SA — Normas técnicas del Seguro Complementario de Trabajo de Riesgo',
  'R.M. Nº 375-2008-TR — Norma básica de ergonomía y procedimiento de evaluación de riesgos disergonómicos',
  'Norma G.050 — Seguridad Durante la Construcción',
  'Normas Técnicas de Prevención (NTP) del Instituto Nacional de Seguridad e Higiene en el Trabajo',
  'D.S. Nº 015-2015-SA — Límites permisibles para agentes químicos',
  'D.S. Nº 014-2017 MINAM — Reglamento de la ley de gestión integral de residuos sólidos',
  'RS 021-83-TR — Normas básicas de Seguridad e Higiene en obras de edificación',
  'Reglamento Nacional de Edificaciones (RNE)',
  'Especificaciones técnicas y memoria descriptiva del proyecto',
];

const RESP_RESIDENTE = {
  cargo: 'Residente de Obra',
  items: [
    'Liderar, organizar, coordinar y supervisar la adecuada implementación del presente procedimiento. Asignar todos los recursos e insumos necesarios para la realización de este trabajo.',
    'Comunicar oportunamente al Cliente a través de sus representantes el inicio de las operaciones correspondientes, así como de las restricciones y riesgos que amenacen las metas y objetivos de las labores.',
  ],
};

const RESP_PRODUCCION = {
  cargo: 'Ingeniero de Producción',
  items: [
    'Verificar que todo el personal a su cargo tenga conocimiento de este procedimiento, difundirlo y hacerlo cumplir durante el tiempo que se desarrollen las actividades.',
    'Realizar la capacitación correspondiente a todo el personal involucrado para la correcta aplicación de las políticas y estándares de prevención de riesgos, gestión ambiental y calidad.',
    'Coordinar las solicitudes de materiales, recursos o permisos que pudieran necesitarse.',
    'Verificar que se haya elaborado el ATS de todas las actividades, describiendo los pasos, peligros/riesgos y medidas de control.',
    'Verificar la ejecución de los trabajos bajo el enfoque de cumplimiento del Plan de Seguridad y Plan de Calidad presentados.',
  ],
};

const RESP_OFICINA_TECNICA = {
  cargo: 'Oficina Técnica',
  items: [
    'Brindar a los miembros del Staff los planos vigentes, especificaciones técnicas, metrados, listado de materiales, equipos y recursos estimados debidamente revisados y aprobados por el cliente. Llevar el control de los reportes y demás información técnica requerida por el cliente.',
  ],
};

const RESP_CALIDAD = {
  cargo: 'Ingeniero de Calidad',
  items: [
    'Realizar la capacitación correspondiente a todo el personal involucrado para la correcta aplicación de las políticas y estándares de calidad.',
    'Revisión en campo de los planos de todas las especialidades. Verificar que el staff, capataces y trabajadores tengan conocimiento del procedimiento.',
    'En coordinación con el Ingeniero de Producción, realizar el análisis de las actividades operativas para evitar la ocurrencia de no conformidades.',
    'Realizar el control de las actividades según el procedimiento de trabajo y especificaciones técnicas.',
    'Revisión y aprobación del protocolo correspondiente a este trabajo.',
    'Verificar que el producto entregado cumpla con las expectativas del cliente y la supervisión, reflejadas en las especificaciones técnicas y otros documentos del proyecto.',
  ],
};

const RESP_SSOMA = {
  cargo: 'Ingeniero de SSOMA',
  items: [
    'Coordinar el proceso de formulación del Plan Anual de Seguridad, Salud y Medio Ambiente, asegurando la participación de las áreas operativas.',
    'Asegurar el cumplimiento del Reglamento Interno de Seguridad y Salud en el Trabajo en las actividades diarias y demás normas legales aplicables.',
    'Evaluar, analizar y emitir informes situacionales respecto a exposición a riesgos laborales y seguridad física de las instalaciones; evaluar alternativas para mitigar los riesgos.',
    'En coordinación con producción, realizar el análisis de riesgos y las medidas de control respectivas para evitar accidentes.',
    'Realizar junto con el Prevencionista de Riesgo supervisión en los diferentes frentes durante la ejecución de las actividades.',
    'Coordinar el cronograma de desarrollo e informes de análisis de seguridad de trabajo y procedimientos seguros.',
    'Administrar y supervisar el levantamiento de observaciones en aspectos de seguridad, salud y medio ambiente.',
    'Revisar y reevaluar el Reglamento Interno de Seguridad y Salud en el Trabajo del proyecto.',
    'Difundir los lineamientos de seguridad del presente procedimiento previo al inicio de trabajos.',
  ],
};

const RESP_MAESTRO = {
  cargo: 'Maestro General',
  items: [
    'Tener en campo el procedimiento de trabajo.',
    'En coordinación con el Ingeniero de Campo, difundir y hacer cumplir este procedimiento a todo el personal en el área de trabajo.',
    'En coordinación con el Ingeniero de Campo, verificar el buen estado y correcto uso de los equipos de protección personal.',
  ],
};

const RESP_OPERATIVO = {
  cargo: 'Personal Operativo',
  items: [
    'Conocer y cumplir estrictamente con los detalles descritos en este procedimiento.',
    'El incumplimiento de este procedimiento será considerado como falta grave, por lo cual se procederá a aplicar una sanción disciplinaria.',
  ],
};

const RESPONSABILIDADES_STD = [
  RESP_RESIDENTE, RESP_PRODUCCION, RESP_OFICINA_TECNICA,
  RESP_CALIDAD, RESP_SSOMA, RESP_MAESTRO, RESP_OPERATIVO,
];

const ANEXOS_STD = [
  'Matriz IPER',
  'G.SG.S.C.02.F — Análisis de Trabajo Seguro (ATS)',
  'I.SG.S.C.02.A — Permiso para trabajos en altura',
  'G.SG.S.C.02B — Permiso de trabajo en caliente',
];

// ════════════════════════════════════════════════════════════════════════════
// PETs base GRAPCO
// ════════════════════════════════════════════════════════════════════════════

export const PETS_BASE_GRAPCO = [
  // 1) PETS-001 — TRAZO, NIVEL Y REPLANTEO
  {
    codigo: 'SGC-CAL-PETS-001',
    titulo: 'TRAZO, NIVEL Y REPLANTEO',
    version: '01',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-01-02'),
    proposito: 'Establecer el procedimiento que define el método establecido para normalizar las actividades TRAZO, NIVEL Y REPLANTEO, además de los controles de seguridad y salud ocupacional respectivos.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de TRAZO, NIVEL Y REPLANTEO que se requieran durante la ejecución del proyecto.',
    referencias: [
      ...REFERENCIAS_STD,
      'Ley 28611 — Ley general del ambiente',
      'RNE E.060 "Topografía"',
      'NTP 399.010 — Cálculo de obras de infraestructura vial, determinación del terreno',
      'NTP 399.011 — Levantamiento topográfico para obras viales',
      'NTP 399.022 — Topografía en la construcción: Procedimientos y equipos de levantamiento',
      'Norma ISO 9001 — Sistemas de gestión de la calidad',
    ],
    definiciones: [
      { termino: 'Aseguramiento y control de calidad', descripcion: 'Combinación del Aseguramiento de la Calidad (procesos para medir y asegurar la calidad de un producto) y del Control de Calidad (estándares de cumplimiento del producto a las expectativas del cliente y lineamientos del SGC).' },
      { termino: 'ATS', descripcion: 'Análisis de Trabajo Seguro, formato que se desarrolla antes del inicio de las actividades para analizar los riesgos y peligros y tomar medidas de control.' },
      { termino: 'Bench Mark (B.M.)', descripcion: 'Hito topográfico de concreto con placa metálica monumentado dentro del área de la obra que sirve como medida patrón de coordenadas y cotas internas.' },
      { termino: 'Chequeo de equipos de topografía', descripcion: 'Operaciones de campo para determinar posibles errores en los equipos topográficos.' },
      { termino: 'Cota', descripcion: 'Elevación de un punto respecto al nivel del mar o a un Bench Mark.' },
      { termino: 'Estación total', descripcion: 'Instrumento de medición que indica la posición y elevación de un punto en la tierra (X, Y, Z) usando rebote de señal a través de prisma.' },
      { termino: 'GPS (Tiempo Real)', descripcion: 'Instrumento de medición que indica la posición y elevación de un punto en la tierra (X, Y, Z) usando ondas de radio de satélite.' },
      { termino: 'Implantación de Ejes', descripcion: 'Colocar hitos de concreto para alinear los ejes necesarios y fijar los niveles de cotas de los elementos a ejecutar en la obra.' },
      { termino: 'Levantamiento Topográfico', descripcion: 'Traslado de puntos del terreno a un plano.' },
      { termino: 'Replanteo Topográfico', descripcion: 'Traslado de los puntos de un plano al terreno.' },
      { termino: 'Trazo', descripcion: 'Delimitación del replanteo topográfico.' },
      { termino: 'SGC', descripcion: 'Sistema de Gestión de Calidad.' },
    ],
    epp: [
      'Uniforme con cintas reflectantes', 'Casco', 'Barbiquejo',
      'Lentes de seguridad claros', 'Guantes multiflex',
      'Botas de seguridad con punta de acero', 'Protector auditivo / orejeras',
      'Arnés de seguridad con doble línea de enganche',
      'Señalizaciones e indicativos (conos, paletas, brazos retráctiles)',
      'Cachacos', 'Señaléticas',
    ],
    equipos: [
      'Nivel óptico o láser', 'Plomada', 'Niveles de burbuja', 'Cal o yeso en polvo', 'Tiralíneas',
      'Estación total', 'Teodolito', 'GPS de tiempo real', 'Wincha calibrada (medida patrón)',
    ],
    procedimiento: {
      consideracionesIniciales: 'Todos los indicadores a revisar se registrarán en los protocolos aprobados por supervisión (registro de control: SGS-CAL-FOR-001 TRAZO, NIVEL Y REPLANTEO). Tener todos los equipos topográficos operativos y calibrados para minimizar los errores de trazado y replanteo. Verificar el funcionamiento del equipo en campo una vez llegado al proyecto. El área de producción revisa planos y expediente técnico antes de iniciar. El área de calidad identifica especificaciones técnicas, planos aprobados y normas aplicables.\n\nSEGURIDAD — CHARLAS Y PERMISOS PREVIOS: equipo calificado y capacitado, personal habilitado por SSOMA con inducción general/específica, charla diaria, ATS y permisos (altura, caliente según corresponda), inspección de andamios cuando aplique, EPP en buen estado, identificación de vías de evacuación, inspección de equipos antes de uso, área ordenada y limpia.',
      desarrollo: [
        { titulo: 'Revisión y selección de equipos', descripcion: 'Verificar los Certificados de Calibración y/o calibración de los equipos que se emplearán en la actividad, de esta manera se evitarán no conformidades en las mediciones.' },
        { titulo: 'Revisión de nivel topográfico', descripcion: 'Ubicar 02 miras a una longitud máxima de 80 m. Estacionar el nivel a la mitad y tomar las primeras lecturas en ambos extremos; calcular su diferencia (primer valor). Reestacionar a unos 3 m de uno de los niveles y tomar segundas lecturas (segundo valor). La diferencia entre ambos valores indica el error de lectura del nivel en 80 m, que debe ser ≤ 5 mm para que el equipo no necesite calibrarse. Chequeo semanal.' },
        { titulo: 'Revisión de estación total y teodolito', descripcion: 'Posicionar el instrumento en un punto 1 y ubicar un punto 2 (200–500 m). Tomar primera lectura de ángulos H y V, girar la tornamesa y bascular el lente, tomar nuevas lecturas. Diferencia de ángulos horizontales debe ser 180°; suma de ángulos verticales debe ser 360°. Chequear distancia contra wincha calibrada; error permitido según fabricante. Revisión mínima mensual o luego de un golpe al equipo.' },
        { titulo: 'Replanteo inicial (antes de construir)', descripcion: 'Validar los Bench Mark (B.M.) del proyecto con la supervisión previa liberación mediante protocolo. Ubicado el BM, iniciar el trazo y replanteo verificando las cotas según planos y especificaciones técnicas. Anotar coordenadas en libreta de campo y trasladar al protocolo. Señalizar puntos de referencia con pintura indeleble o láminas en estacas.' },
        { titulo: 'Replanteo continuo (durante la construcción)', descripcion: 'Verificar el correcto estacado y lineamiento del trazo de los límites del área de trabajo mediante el protocolo de reporte topográfico. Antes de iniciar la siguiente actividad, ejecutar trazo y replanteo para confirmar puntos y niveles. Toda actualización se refleja en planos.' },
        { titulo: 'Replanteo final (As Built)', descripcion: 'Verificar que las cotas y niveles al final de la ejecución sean los requeridos. Todo cambio o modificación se reflejará en los planos As Built del proyecto.' },
        { titulo: 'Mediciones para valorización', descripcion: 'En función del tipo de actividad se podrán utilizar formatos de control para evaluar los métodos a valorar.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: [...ANEXOS_STD, 'CID-FO-TOP-001 — Protocolo de trazo y replanteo'],
  },

  // 2) PETS-002 — EXCAVACIÓN Y CORTE DE TERRENO
  {
    codigo: 'SGC-CAL-PETS-002',
    titulo: 'EXCAVACIÓN Y CORTE DE TERRENO',
    version: '01',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-11-03'),
    proposito: 'Establecer el procedimiento de ejecución para el desarrollo de los trabajos de EXCAVACIÓN Y CORTE DE TERRENO.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de EXCAVACIÓN Y CORTE DE TERRENO que se requieran durante la ejecución del proyecto.',
    referencias: [...REFERENCIAS_STD, 'Ley 28611 — Ley general del ambiente'],
    definiciones: [
      { termino: 'Aseguramiento y control de calidad', descripcion: 'Combinación de Aseguramiento de la Calidad y Control de Calidad según lineamientos del SGC.' },
      { termino: 'ATS', descripcion: 'Análisis de Trabajo Seguro: formato previo al inicio de actividades para analizar riesgos y peligros.' },
      { termino: 'Desniveles', descripcion: 'Diferencia de cota o altitud entre dos puntos específicos de la superficie terrestre, expresada en metros.' },
      { termino: 'Movimiento de tierras', descripcion: 'Conjunto de operaciones de excavación, carga, transporte, compactación y nivelación de materiales del suelo para modificar la morfología del terreno.' },
      { termino: 'Perfilado', descripcion: 'Conformación y acabado de una superficie mediante remoción, redistribución o compactación de materiales, hasta alcanzar la geometría y pendiente especificadas.' },
      { termino: 'Replanteo Topográfico', descripcion: 'Traslado de los puntos de un plano al terreno.' },
      { termino: 'Trazo', descripcion: 'Delimitación del replanteo topográfico.' },
      { termino: 'Registro de control', descripcion: 'Documento que sirve para controlar el proceso de ejecución del trabajo según lo especificado.' },
      { termino: 'SGC', descripcion: 'Sistema de Gestión de Calidad.' },
    ],
    epp: [
      'Uniforme con cintas reflectantes', 'Casco', 'Barbiquejo',
      'Lentes de seguridad claros', 'Guantes de badana',
      'Botas de seguridad con punta de acero', 'Protector auditivo / orejeras',
      'Respirador / Mascarilla', 'Malla naranja de seguridad', 'Cachacos',
      'Paletas para vigía', 'Cinta de señalización amarillo/rojo',
      'Soga de 5/8" (línea de vida)', 'Arnés de seguridad', 'Señaléticas', 'Protecciones colectivas',
    ],
    equipos: [
      'Lampa', 'Pico', 'Barretas', 'Martillo eléctrico',
      'Esmeriles de diversos tamaños (disco para metal y concreto)',
      'Carretilla tipo Buggy', 'Wincha', 'Yeso',
      'Equipo de excavación (Excavadora, Retroexcavadora, Minicargador)',
      'Equipo de oxicorte', 'Volquetes',
    ],
    procedimiento: {
      consideracionesIniciales: 'Indicadores se registran en SGS-CAL-FOR-002 EXCAVACIÓN Y CORTE DE TERRENO. Solicitar control topográfico y colocación de niveles para las compactaciones por capas. El material de relleno contará con el certificado correspondiente según especificaciones técnicas.\n\nSEGURIDAD: equipo calificado, zona señalizada con escalera arriostrada como acceso, personal habilitado por SSOMA, charla diaria, ATS y permisos (altura/caliente), herramientas y EPP en buenas condiciones, vías de evacuación identificadas, inspección de equipos antes de uso. EPP siempre puesto. Área de influencia delimitada con cachacos, malla y cinta de seguridad color rojo; presencia de vigía durante la jornada laboral. Interferencias identificadas y comunicadas al responsable.',
      desarrollo: [
        { titulo: 'Inspección y delimitación del área', descripcion: 'Antes de ejercer cualquier actividad, la empresa contratante realiza una inspección en campo para detallar ajustes y reprogramación. Se delimita y señaliza la zona de trabajo con mallas de seguridad, cachacos, conos, letreros (advertencia/prevención/prohibición), bastones luminosos y cilindros con cinta reflectiva.' },
        { titulo: 'Movimiento de tierras con equipos móviles', descripcion: 'Se procede al movimiento de tierras con los siguientes equipos: cargador frontal, volquetes, rodillo y minicargador. Se coordinan maniobras con señalista y zona de seguridad perimetral.' },
        { titulo: 'Consideraciones después de las actividades', descripcion: 'Realizar la desconexión de todos los equipos eléctricos. Limpieza general de obra. Guardar en lugar adecuado el equipo de oxicorte y balones. Señalizar las zonas que generen peligro como ductos expuestos y desniveles.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: [
      'Matriz IPER',
      'G.SG.S.C.02.F — Análisis de Trabajo Seguro (ATS)',
      'I.SG.S.C.02.A — Permiso para trabajos en altura',
      'G.SG.S.C.02B — Permiso de trabajo en caliente',
      'G.SG.S.C.02.C — Permiso de excavaciones y zanjas',
    ],
  },

  // 3) PETS-003 — NIVELACIÓN, RELLENO Y COMPACTACIÓN
  {
    codigo: 'SGC-CAL-PETS-003',
    titulo: 'NIVELACIÓN, RELLENO Y COMPACTACIÓN',
    version: '01',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-11-03'),
    proposito: 'Establecer el procedimiento de ejecución para el desarrollo de los trabajos de NIVELACIÓN, RELLENO Y COMPACTACIÓN.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de NIVELACIÓN, RELLENO Y COMPACTACIÓN que se requieran durante la ejecución del proyecto.',
    referencias: [
      ...REFERENCIAS_STD,
      'Estudio de mecánica de suelos del proyecto',
      'Planos As Built del proyecto',
    ],
    definiciones: [
      { termino: 'ATS', descripcion: 'Análisis de Trabajo Seguro.' },
      { termino: 'Compactación', descripcion: 'Proceso mecánico mediante el cual se incrementa la densidad de un suelo o material granular mediante la aplicación de energía externa (impacto, vibración, amasado o presión estática).' },
      { termino: 'Nivelación', descripcion: 'Determinar y ajustar la altura relativa de un terreno o superficie para garantizar una base uniforme y estable para la ejecución de obras.' },
      { termino: 'Relleno', descripcion: 'Proceso de adición y compactación de material (tierra, arena, grava o seleccionado) en un área determinada para alcanzar la cota o nivel requerido.' },
      { termino: 'QA & QC', descripcion: 'Aseguramiento y Control de Calidad según lineamientos del SGC.' },
      { termino: 'Registro de control', descripcion: 'Documento que controla el proceso de ejecución del trabajo según lo especificado.' },
      { termino: 'SGC', descripcion: 'Sistema de Gestión de Calidad.' },
      { termino: 'Trazo', descripcion: 'Delimitación del replanteo topográfico.' },
    ],
    epp: [
      'Uniforme con cintas reflectantes', 'Casco', 'Barbiquejo',
      'Lentes de seguridad claros', 'Guantes de badana',
      'Botas de seguridad con punta de acero', 'Protector auditivo / orejeras',
      'Respirador / Mascarilla', 'Malla naranja de seguridad', 'Cachacos',
      'Paletas para vigía', 'Cinta de señalización amarillo/rojo',
      'Soga de 5/8" (línea de vida)', 'Arnés de seguridad', 'Protecciones colectivas', 'Señaléticas',
    ],
    equipos: [
      'Material de préstamo', 'Material propio', 'Volquetes',
      'Rodillo compactador', 'Minicargador',
      'Compactador de placa vibratoria', 'Tiralíneas con cal',
      'Manguera', 'Agua',
    ],
    procedimiento: {
      consideracionesIniciales: 'Indicadores registrados en CAL-FOR-003: NIVELACIÓN, RELLENO Y COMPACTACIÓN. Solicitar control topográfico y colocación de niveles para compactaciones por capas. El material de relleno contará con certificado según especificaciones técnicas.\n\nSEGURIDAD: equipo calificado, zona señalizada, personal habilitado por SSOMA, charla diaria, ATS y permisos antes del inicio, EPP en buen estado, inspección de equipos antes de uso, identificación de vías de evacuación. Área de influencia delimitada con cachacos, malla y cinta de seguridad color rojo; presencia de vigía durante la jornada. Interferencias identificadas, señalizadas y comunicadas al responsable.',
      desarrollo: [
        { titulo: 'Relleno y compactación — clasificación por grado de compactación', descripcion: 'RELLENO A VOLTEO: material colocado en el sitio sin compactación alguna. RELLENO COMPACTADO: al material se le aplica un proceso para aumentar su peso volumétrico (eliminación de vacíos) con el objeto de incrementar resistencia y disminuir compresibilidad.' },
        { titulo: 'Relleno y compactación — clasificación por tipo de material', descripcion: 'MATERIAL PRODUCTO DE LA EXCAVACIÓN: cuando el material sobre el cual se construye es resistente, estable, cohesivo y no contaminado, se reutiliza para rellenar. MATERIAL DE PRÉSTAMO O DE CANTERA: cuando el suelo no es apropiado, se sustituye por material inerte, libre de contaminación y de granulometría uniforme proveniente de banco/cantera de préstamo cercana a la obra.' },
        { titulo: 'Método de medición', descripcion: 'La base se medirá en metros cúbicos (m³), conformada y compactada en su posición final, según planos de secciones transversales y aceptación del Supervisor.' },
        { titulo: 'Controles de calidad — antes y durante', descripcion: 'Verificación previa del trazo y replanteo (registro SGC-RC-CAL-MT01: Protocolo de Trazo y Replanteo). Revisión de niveles de piso actuales para conocer la profundidad del relleno. Verificar parámetros del material de préstamo en laboratorio aprobados por supervisión/cliente.' },
        { titulo: 'Aceptación del producto terminado', descripcion: 'Verificación de espesor de capas de relleno. Verificación visual de humedad del material. Control de compactación de capas: registrar densidad seca de campo, contenido de humedad y porcentaje de compactación en el registro GT-SGC-RC-MT-03: COLOCACIÓN BASE GRANULAR, aprobado por supervisión.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: ANEXOS_STD,
  },

  // 4) PETS-005 — CALZADURAS
  {
    codigo: 'SGC-CAL-PETS-005',
    titulo: 'CALZADURAS',
    version: '00',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-11-03'),
    proposito: 'Establecer el procedimiento de ejecución para el desarrollo de los trabajos de CALZADURAS.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de CALZADURAS que se requieran durante la ejecución del proyecto.',
    referencias: [
      ...REFERENCIAS_STD,
      'D.S. Nº 085-2003-PCM — Reglamento de Estándares Nacionales de Calidad Ambiental para Ruido',
      'Norma ISO 45001 — Sistemas de Gestión de la Seguridad y Salud en el Trabajo',
      'D.L. Nº 1278 — Ley de Gestión Integral de Residuos Sólidos',
      'Norma ISO 9001 — Sistemas de Gestión de la Calidad',
      'Resolución Ministerial Nº 111-2013-MEM/DM — Código Nacional de Electricidad - Suministro 2011',
      'Estudio de mecánica de suelos del proyecto',
      'Planos As Built del proyecto',
    ],
    definiciones: [
      { termino: 'ATS', descripcion: 'Análisis de Trabajo Seguro.' },
      { termino: 'QA & QC', descripcion: 'Aseguramiento y Control de Calidad.' },
      { termino: 'Registro de control', descripcion: 'Documento para controlar la ejecución del trabajo.' },
      { termino: 'SGC', descripcion: 'Sistema de Gestión de Calidad.' },
      { termino: 'Calzadura', descripcion: 'Procedimiento constructivo de reforzamiento temporal o permanente de una cimentación existente. Consiste en la excavación de un tramo de terreno por debajo del nivel de la cimentación adyacente y rellenarlo con concreto simple o armado, para proteger la estabilidad de la estructura vecina durante una excavación más profunda.' },
      { termino: 'Paño de Calzadura', descripcion: 'Sección o tramo de terreno que se excava y rellena de forma consecutiva. Las calzaduras se ejecutan por paños alternados para no desestabilizar la cimentación existente.' },
      { termino: 'Talud', descripcion: 'Inclinación de las paredes de la excavación. Crítico para evitar deslizamientos o derrumbes en calzaduras.' },
      { termino: 'Apuntalamiento', descripcion: 'Estructura temporal (madera, metal o combinación) que sostiene las paredes de una excavación o estructura adyacente para prevenir su colapso.' },
      { termino: 'Excavación', descripcion: 'Retiro de material del terreno (manual o mecánico) para alcanzar la profundidad requerida para la calzadura.' },
      { termino: 'Falla de Terreno', descripcion: 'Pérdida de la capacidad de soporte del suelo, que puede llevar al asentamiento o colapso de la estructura colindante. Principal riesgo a mitigar con calzaduras.' },
      { termino: 'Nivel Freático', descripcion: 'Nivel superior del agua subterránea en el terreno. Su presencia puede requerir bombeo para trabajar de forma segura.' },
      { termino: 'Monitoreo de Asentamientos', descripcion: 'Medición y registro periódico de posibles movimientos o asentamientos de la estructura colindante durante la ejecución de las calzaduras.' },
    ],
    epp: [
      'Uniforme con cintas reflectantes', 'Casco', 'Barbiquejo',
      'Lentes de seguridad claros', 'Guantes de badana',
      'Botas de seguridad con punta de acero', 'Protector auditivo / orejeras',
      'Respirador / Mascarilla', 'Malla naranja de seguridad', 'Cachacos',
      'Paletas para vigía', 'Cinta de señalización amarillo/rojo',
      'Soga de 5/8" (línea de vida)', 'Arnés de seguridad', 'Protecciones colectivas', 'Señaléticas',
    ],
    equipos: [
      'Material de préstamo', 'Material propio', 'Volquetes',
      'Rodillo compactador', 'Minicargador',
      'Compactador de placa vibratoria', 'Tiralíneas con cal',
      'Manguera', 'Agua',
    ],
    procedimiento: {
      consideracionesIniciales: 'Indicadores registrados en CAL-FOR-005: Registro de Vaciado de Calzaduras. Excavación y vaciado en paños alternados según planos estructurales. Monitoreo topográfico y visual de asentamientos y fisuras en la estructura adyacente antes, durante y después de los trabajos. El concreto debe cumplir con la resistencia especificada y contar con certificados de calidad y ensayos de control de vaciado.\n\nSEGURIDAD: equipo calificado, zona señalizada con barreras físicas y letreros "Peligro: Excavación" y "Prohibido el paso". Personal habilitado por SSOMA. Charla diaria enfocada en los riesgos específicos del paño de calzadura. ATS y Permiso de Trabajo en Zanja o Excavación obligatorios. Protocolo de monitoreo de la estructura vecina con puntos de referencia para asentamientos, revisado diariamente. Equipos inspeccionados según norma G.050.\n\nSEÑALIZACIÓN: barreras físicas rígidas (barandas o cercos perimetrales), malla y cinta de seguridad con letreros "PELIGRO - EXCAVACIÓN PROFUNDA" y "ÁREA RESTRINGIDA". Vigía toda la jornada. Material excavado acopiado a ≥ 1.0 m del borde para evitar sobrecargas. Iluminación artificial y señalización reflectiva para trabajos nocturnos.',
      desarrollo: [
        { titulo: 'Excavación por paños alternados', descripcion: 'Método más seguro y común. Dividir la cimentación a calzar en paños pequeños y no consecutivos para evitar desestabilizar toda la estructura. Excavar un primer paño y solo después de rellenarlo y asegurarlo, excavar uno adyacente, dejando siempre un paño sin excavar entre los trabajados. Mantiene la capacidad de soporte del terreno en todo momento.' },
        { titulo: 'Vaciado y relleno de la calzadura', descripcion: 'Rellenar el vacío con concreto simple o armado según especificaciones. Asegurar que el material de relleno compacte bien contra la cimentación existente para garantizar contacto total. Si se requiere, usar concreto con alto contenido de cemento o concreto ciclópeo para asegurar buena transferencia de carga.' },
        { titulo: 'Control de tiempos y fraguado', descripcion: 'Después del vaciado de cada paño, respetar el tiempo de fraguado para que el concreto alcance la resistencia mínima requerida antes de excavar el paño adyacente. Los tiempos los determinan el proyectista estructural y la supervisión.' },
        { titulo: 'Método de medición', descripcion: 'Medición en metros cúbicos (m³) de concreto u hormigón de cemento utilizado para el relleno de los paños, aceptado por el supervisor. En algunos casos por metros lineales (ml) de calzadura terminada.' },
        { titulo: 'Controles de calidad', descripcion: 'Verificación de trazo y replanteo (SGC-CAL-PETS-005 CALZADURAS). Revisión de niveles de cimentación existente y monitoreo constante de asentamientos en estructura vecina. Material de relleno (concreto o concreto ciclópeo) con resistencia f\'c según planos, certificados y ensayos de laboratorio (probetas) aprobados por supervisión/cliente.' },
        { titulo: 'Aceptación del producto terminado', descripcion: 'Verificación de espesor de capas, características de humedad del relleno, control de compactación (densidad seca, humedad, % de compactación) registrado en GT-SGC-RC-MT-03: COLOCACIÓN BASE GRANULAR.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: [
      'Matriz IPER',
      'G.SG.S.C.02.F — Análisis de Trabajo Seguro (ATS)',
      'I.SG.S.C.02.A — Permiso para trabajos en altura',
      'G.SG.S.C.02B — Permiso de trabajo en caliente',
    ],
  },

  // 5) PETS-006 — ARMADO DE ANDAMIOS MULTIDIRECCIONALES
  {
    codigo: 'SGC-CAL-PETS-006',
    titulo: 'ARMADO DE ANDAMIOS MULTIDIRECCIONALES',
    version: '01',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-11-03'),
    proposito: 'Establecer el procedimiento que define el método establecido para las actividades de ARMADO DE ANDAMIOS MULTIDIRECCIONALES del proyecto, satisfaciendo necesidades y requerimientos de Calidad, Seguridad y Medio Ambiente.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de ARMADO DE ANDAMIOS MULTIDIRECCIONALES que se requieran durante la ejecución del proyecto.',
    referencias: [
      'NTP 400.034 — Norma Técnica Peruana: requisitos generales de los andamios empleados en construcción',
      'Ley Nº 29783 — Ley de Seguridad y Salud en el Trabajo',
      'D.S. Nº 011-2019-TR — Reglamento de Seguridad y Salud en el Trabajo para el Sector Construcción',
    ],
    definiciones: [
      { termino: 'Andamio Multidireccional', descripcion: 'Sistema de andamiaje que permite la conexión de sus componentes en múltiples direcciones, facilitando la adaptación a diversas geometrías y necesidades en la construcción.' },
      { termino: 'Arriostramiento', descripcion: 'Refuerzo de la estructura del andamio mediante elementos diagonales o transversales para aumentar su estabilidad y resistencia.' },
      { termino: 'Base Niveladora', descripcion: 'Componente ajustable que se coloca en la base del andamio para asegurar su nivelación y estabilidad, especialmente en terrenos irregulares.' },
      { termino: 'Certificación de Andamios', descripcion: 'Proceso mediante el cual se verifica y documenta que un andamio cumple con las normativas y estándares de seguridad aplicables.' },
      { termino: 'Elemento Horizontal (Larguero)', descripcion: 'Componente horizontal del andamio que conecta los elementos verticales (montantes) y soporta las plataformas de trabajo.' },
      { termino: 'Elemento Vertical (Montante)', descripcion: 'Componente vertical del andamio que soporta la carga y transmite el peso a la base.' },
      { termino: 'Evaluación de Riesgos', descripcion: 'Proceso sistemático para identificar, analizar y evaluar los riesgos asociados con el armado y uso de andamios.' },
      { termino: 'Plataforma de Trabajo', descripcion: 'Superficie horizontal segura y resistente sobre la cual los trabajadores realizan sus tareas en el andamio.' },
      { termino: 'Rodapié', descripcion: 'Barrera de protección colocada en los bordes de la plataforma de trabajo para evitar la caída de herramientas y materiales.' },
      { termino: 'Sistema de Acceso', descripcion: 'Método seguro para acceder a las plataformas de trabajo del andamio (escaleras internas o externas).' },
    ],
    epp: [
      'Uniforme con cintas reflectantes', 'Casco de seguridad', 'Gafas de seguridad',
      'Guantes de trabajo (resistentes al corte y agarre)',
      'Arnés de seguridad de cuerpo completo',
      'Calzado de seguridad con puntera reforzada',
      'Protectores auditivos (en ambientes ruidosos)',
      'Ropa de trabajo de alta visibilidad', 'Barandillas de seguridad',
      'Redes de seguridad', 'Señalización de seguridad (letreros, conos, cintas)',
      'Líneas de vida horizontales o verticales', 'Sistemas de anclaje certificados',
      'Plataformas de trabajo con rodapiés', 'Escaleras de acceso seguras',
    ],
    equipos: [
      'Acero corrugado (varillas)', 'Llaves de apriete (fijas, ajustables, de carraca)',
      'Nivel de burbuja', 'Plomada', 'Cinta métrica',
      'Martillo de goma', 'Taladro atornillador',
      'Cuerda de seguridad', 'Mosquetones', 'Eslingas',
      'Andamio multidireccional (componentes completos)',
      'Equipo de elevación (grúa pequeña o polipasto)',
      'Equipo de comunicación (radios)',
      'Equipo de iluminación (para trabajos nocturnos)',
    ],
    procedimiento: {
      consideracionesIniciales: 'TÉCNICAS: terreno nivelado y capaz de soportar el peso total. Componentes en perfectas condiciones, sin deformaciones, óxido o daños. Usar bases niveladoras para garantizar verticalidad. Respetar las especificaciones del fabricante en carga máxima admisible. Instalar arriostramientos diagonales. Fijar plataformas de trabajo. Colocar barandillas y rodapiés. Usar sistemas de acceso seguros. Inspecciones periódicas. Conectar a tierra si hay riesgo de contacto con líneas eléctricas.\n\nSEGURIDAD — PROTECCIÓN COLECTIVA Y SEÑALIZACIÓN: las mismas consideraciones técnicas aplican como medida de seguridad. Personal capacitado para trabajos en altura, EPP completo (incluido arnés de cuerpo completo), tarjeta de operatividad del andamio (verde/amarilla/roja). Tránsito inferior delimitado y libre.',
      desarrollo: [
        { titulo: 'Verificación del terreno y componentes', descripcion: 'Verificar que el terreno donde se va a montar el andamio esté nivelado y sea capaz de soportar el peso total (estructura + personal + materiales). Asegurar que todos los componentes estén en perfectas condiciones, sin deformaciones, óxido o daños.' },
        { titulo: 'Nivelación y verticalidad', descripcion: 'Utilizar bases niveladoras para ajustar la altura de los montantes y garantizar que el andamio esté perfectamente vertical y estable. Verificar verticalidad con plomada o nivel en cada etapa del montaje.' },
        { titulo: 'Conexiones y arriostramiento', descripcion: 'Respetar las especificaciones del fabricante en carga máxima admisible por plataforma y por la estructura completa. Instalar los arriostramientos diagonales según indicaciones del fabricante para asegurar rigidez y estabilidad lateral. Confirmar que los sistemas de bloqueo eviten desplazamientos accidentales.' },
        { titulo: 'Plataformas, barandillas y rodapiés', descripcion: 'Fijar las plataformas de trabajo de forma segura para evitar desplazamientos accidentales. Colocar barandillas de seguridad y rodapiés en todas las plataformas para prevenir caídas de personas y objetos.' },
        { titulo: 'Acceso, inspección y puesta a tierra', descripcion: 'Utilizar sistemas de acceso seguros (escaleras internas con barandilla). Realizar inspecciones periódicas del andamio durante su uso. Asegurarse de que el andamio esté conectado a tierra si existe riesgo de contacto con líneas eléctricas.' },
        { titulo: 'Control de colocación y liberación final', descripcion: 'Verificar que el terreno esté nivelado y compactado, el área libre de obstrucciones y cables eléctricos, y la señalización adecuada. Inspeccionar visualmente cada componente, verificar certificación y usar componentes correctos según diseño. Verificar bases niveladoras, husillos, crucetas, montantes verticales, conexiones, largueros, diagonales, plataformas, barandillas, rodapiés y puntos de anclaje. Inspección final completa antes del uso. Documentar inspecciones y colocar etiqueta/señalización de andamio inspeccionado y seguro.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: [
      'Matriz IPER',
      'G.SG.S.C.02.F — Análisis de Trabajo Seguro (ATS)',
      'I.SG.S.C.02.A — Permiso para trabajos en altura',
      'G.SG.S.C.02B — Permiso de trabajo en caliente',
      'G.SG.S.C.02.C — Permiso de excavaciones y zanjas',
      'FO-SST-011 — Inspección de andamio',
      'FO-SST-012 — Inspección de arnés de seguridad',
      'G.SG.S.C.03.C — Inspección de herramientas manuales',
    ],
  },

  // 6) PETS-023 — DEMOLICIÓN
  {
    codigo: 'SGC-CAL-PETS-023',
    titulo: 'DEMOLICIÓN',
    version: '01',
    estado: 'vigente',
    aprobaciones: APROBACIONES_STD('2025-11-03'),
    proposito: 'Establecer el procedimiento que define el método establecido para las actividades de DEMOLICIÓN del proyecto, satisfaciendo necesidades y requerimientos de Calidad, Seguridad y Medio Ambiente.',
    alcance: 'Este procedimiento es aplicable a todos los trabajos de DEMOLICIÓN que se requieran durante la ejecución del proyecto.',
    referencias: [...REFERENCIAS_STD, 'Ley 28611 — Ley general del ambiente'],
    definiciones: [
      { termino: 'Andamio', descripcion: 'Estructura fija, suspendida o móvil que sirve de soporte a trabajadores, equipos, herramientas y materiales instalada a más de 1.50 m de altura. Debe contar con certificación y planos de modulación.' },
      { termino: 'Aseguramiento y control de calidad', descripcion: 'Combinación de Aseguramiento de la Calidad y Control de Calidad según lineamientos del SGC.' },
      { termino: 'ATS', descripcion: 'Análisis de Trabajo Seguro.' },
      { termino: 'Cinceles', descripcion: 'Herramientas manuales utilizadas para cortar, desbastar o dar forma a materiales como piedra, concreto, metal y madera. Comunes en albañilería, herrería y carpintería para trabajos de precisión o demolición.' },
      { termino: 'Registro de control', descripcion: 'Documento que controla el proceso de ejecución del trabajo.' },
      { termino: 'SGC', descripcion: 'Sistema de Gestión de Calidad.' },
    ],
    epp: [
      'Casco', 'Respirador / Mascarilla', 'Arnés de seguridad',
      'Tapones auditivos', 'Barbiquejo', 'Lentes de seguridad',
      'Botas con puntera de acero', 'Guantes de cuero', 'Chaleco reflectivo',
      'Áreas delimitadas y señalizadas', 'Protecciones colectivas',
      'Línea de vida', 'Conos y brazos plásticos de delimitación',
    ],
    equipos: [
      'Excavadora de ruedas (excavaciones masivas, eliminación de desmonte, conformación de pendientes)',
      'Retroexcavadora (demoler estructuras existentes, eliminación de desmonte)',
      'Volquetes (eliminación de desmonte, acarreo de afirmado y asfaltado)',
      'Minicargador con accesorios (martillo neumático, conformación de subrasante, subbase y base)',
      'Cisterna de agua (humedecer subbase y vías para control de polvo)',
      'Rotomartillos manuales', 'Equipo de oxicorte',
      'Compresor de aire con martillos neumáticos', 'Barretas',
      'Extensiones eléctricas', 'Martillo demoledor eléctrico o neumático',
      'Cortadora de concreto', 'Wincha', 'Yeso',
    ],
    procedimiento: {
      consideracionesIniciales: 'SEGURIDAD — CHARLAS Y PERMISOS PREVIOS: analizar el método de demolición con Oficina Técnica/Ingeniería. Equipo calificado y capacitado. Instalar protecciones colectivas, tablones, redes de seguridad y accesos de tránsito seguro. Limitar zona de tránsito del público, señalizar/cerrar puntos de descarga y carguío de desmonte. Personal habilitado por SSOMA con inducción general y específica. Charla diaria. ATS, permiso en altura, permiso en caliente. Herramientas, materiales, equipos y EPP en perfectas condiciones. Vías de evacuación y sistemas de comunicación de emergencia identificados. Antes de demoler losa aligerada, encapsular con malla rachell el área para evitar proyección de partículas. Instalar líneas de vida alrededor del área.\n\nUSO DE EPP: todos los trabajadores con EPP en buen estado. EPP adicionales obligatorios en trabajos puntuales de alto riesgo. Arnés de seguridad obligatorio para trabajos en altura. No iniciar sin permisos firmados. EPP nunca se retira.\n\nSEÑALIZACIÓN Y USO DE ANDAMIOS: delimitar y señalizar el área de influencia. Interferencias identificadas y comunicadas. Andamios armados por personal calificado, inspeccionados por prevención de riesgos, identificados con tarjeta de operatividad (verde, amarilla, roja). Parte inferior delimitada y con accesos libres. Charla específica para trabajos en altura previa al inicio.',
      desarrollo: [
        { titulo: 'Inspección del área de trabajo', descripcion: 'Evaluación previa del área a demoler, identificando riesgos estructurales, eléctricos, sanitarios y de seguridad. Delimitar y señalizar la zona para restringir acceso. Verificar instalaciones activas (agua, desagüe, gas, cableado eléctrico) y desconectar si es necesario. Inspeccionar estabilidad de estructuras contiguas para evitar daños colaterales. Determinar puntos críticos para definir la secuencia segura de demolición. Garantizar EPP completo: casco, guantes, lentes, botas con puntera de acero, mascarilla contra polvo. Asignar un responsable de seguridad para supervisar y detener la actividad en caso de condiciones peligrosas.' },
        { titulo: 'Demolición de muros perimetrales existentes', descripcion: 'Demolición progresiva desde la parte superior hacia la base para evitar colapsos incontrolados. Herramientas manuales o mecánicas según tipo de muro: comba, cincel, martillo percutor o retroexcavadora con martillo hidráulico. Con maquinaria pesada: establecer zona de seguridad perimetral y señalista para coordinar maniobras. Aplicar agua pulverizada para minimizar polvo y mejorar visibilidad. Asegurar que escombros caigan en áreas controladas. Evaluar continuamente la estabilidad del muro; detener si hay fisuras o riesgo de colapso inesperado.' },
        { titulo: 'Acopio de escombros', descripcion: 'Retiro continuo de escombros para evitar acumulaciones (riesgo de tropiezos o colapsos secundarios). Área específica y señalizada para acopio temporal sin bloquear accesos ni rutas de evacuación. Uso de carretillas, minicargadores y retroexcavadoras para el traslado. Segregación de residuos por tipo (hormigón, ladrillo, madera, metal) para facilitar disposición final o reciclaje. No contaminar el ambiente ni afectar tránsito peatonal/vehicular. Residuos peligrosos (asbesto u otros) gestionados según normativa ambiental. Transporte a punto de disposición final autorizado.' },
        { titulo: 'Consideraciones para terminar el trabajo', descripcion: 'Inspección final del área para verificar que no quedan elementos en riesgo de colapso ni residuos comprometan la seguridad. Limpieza del área de trabajo. Retiro de señalización temporal y barreras una vez segura la zona. Verificación de que no haya daños en estructuras adyacentes; documentar cualquier incidencia y aplicar medidas correctivas. Retiro ordenado de herramientas y equipos. Registro en formatos de actividades realizadas, riesgos identificados y acciones correctivas. Charla de cierre con el equipo para evaluar cumplimiento y detectar mejoras.' },
        { titulo: 'Aceptación del terminado (Control de Calidad)', descripcion: 'Perímetro de la excavación según trazo liberado. Verificación de retiro total o parcial de estructuras demolidas hasta un nivel suficiente donde no representen un riesgo para la seguridad del personal del proyecto.' },
      ],
    },
    responsabilidades: RESPONSABILIDADES_STD,
    controlCambios: [],
    anexos: [
      'Matriz IPER',
      'G.SG.S.C.02.F — Análisis de Trabajo Seguro (ATS)',
      'I.SG.S.C.02.A — Permiso para trabajos en altura',
      'FO-SST-011 — Inspección de andamio',
      'FO-SST-012 — Inspección de arnés de seguridad',
      'G.SG.S.C.03.C — Inspección de herramientas manuales',
    ],
  },
];
