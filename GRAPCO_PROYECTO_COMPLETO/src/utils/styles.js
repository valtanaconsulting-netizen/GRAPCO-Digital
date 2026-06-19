// src/utils/styles.js — Estilos base y constantes UI compartidas
// Paleta corporativa GRAPCO: navy del isotipo + dorado/amarillo de los edificios

// Logos oficiales GRAPCO (provistos por el cliente, hospedados localmente):
//   LOGO        → versión cuadrada (Logo Grapco SAC.jpeg) → favicon, navbar, cards
//   LOGO_WIDE   → versión banner (grapco-logo.png) → headers anchos / hero
//   LOGO_FALLBACK → versión ancha como respaldo si el cuadrado falla
// Logo oficial GRAPCO (re-renderizado desde el JPEG original a /brand/ con
// sharp + lanczos para que se vea nítido en navbar/cards a cualquier tamaño).
// La ruta /brand/ es nueva — el service worker no la tenía cacheada → se
// descarga fresca en el próximo deploy.
export const LOGO          = "/brand/grapco-192.png";
export const LOGO_WIDE     = "/grapco-logo-wide.png";
export const LOGO_FALLBACK = "/brand/grapco-128.png";
// Logo de Valtana Consultoría & Construcción — empresa que desarrolla y opera la
// plataforma. Se muestra como co-marca en la cabecera del hub (proveedor del servicio).
export const LOGO_VALTANA  = "/brand/valtana-logo.png";

export const LETRAS  = ['A','B','C','D','E','F'];
export const CARGOS  = ['Capataz','Operario','Oficial','Ayudante'];
// Staff técnico — solo para el registro de personal y filtros; NO entra en
// cálculos de costo de HH-obrero (mano de obra directa) ni en cuadrillas.
export const CARGOS_STAFF = ['Ingeniero Residente','Ingeniero Oficina Técnica','Ingeniero de Producción','Ingeniero de Calidad'];
export const CARGOS_CORTO = {
  'Capataz':'CAP','Operario':'OP','Oficial':'OF','Ayudante':'AY',
  'Ingeniero Residente':'IR','Ingeniero Oficina Técnica':'IOT','Ingeniero de Producción':'IPR','Ingeniero de Calidad':'IC',
};
export const ESPECIALIDADES = ['Albañilería','Encofrado','Acero','Concreto','Instalaciones','Movimiento de Tierras','General'];
export const CB_COL  = { TP:'#16a34a', TC:'#d97706', TNC:'#dc2626' };

// ── Paleta de GRÁFICOS unificada (cohesión visual en toda la plataforma) ──
// CHART: colores SEMÁNTICOS para series fijas (real/meta/presupuesto/cpi/proyección).
// CHART_PALETTE: paleta CATEGÓRICA armonizada (tonos profundos, NO arcoíris saturado)
// para gráficos con N categorías (cuadrillas, personas, partidas). Mismos tonos que
// las tarjetas premium del selector de áreas → todo se siente de una sola plataforma.
export const CHART = {
  real:     '#0F2A47',  // navy — ejecutado/real
  meta:     '#10B981',  // emerald — meta
  ppto:     '#E5A82F',  // gold — presupuesto
  cpi:      '#4F46E5',  // indigo — CPI (más sobrio que el violeta saturado)
  forecast: '#0E7490',  // cyan profundo — proyección/forecast
};
export const CHART_PALETTE = [
  '#0F2A47', '#E5A82F', '#0E7490', '#7E22CE', '#047857',
  '#1D4ED8', '#BE123C', '#B45309', '#0F766E', '#475569',
  '#9333EA', '#0891B2',
];

export const DEFAULT_TP  = [{cod:'ACE',desc:'Armado de acero'},{cod:'AMA',desc:'Amarrando acero'},{cod:'ENC',desc:'Encofrado'},{cod:'DES',desc:'Desencofrado'},{cod:'VAC',desc:'Vaciado concreto'},{cod:'VIB',desc:'Vibrado concreto'},{cod:'HAB',desc:'Habilitado acero'}];
export const DEFAULT_TC  = [{cod:'AM',desc:'Acarreo materiales'},{cod:'AP',desc:'Aplomado/Alineado'},{cod:'SA',desc:'Subiendo material'},{cod:'MD',desc:'Midiendo distancias'},{cod:'COO',desc:'Coordinación'},{cod:'CA',desc:'Cortando material'},{cod:'AA',desc:'Armado andamio'},{cod:'CI',desc:'Col. instrumentos'}];
export const DEFAULT_TNC = [{cod:'VI',desc:'Viaje'},{cod:'BA',desc:'Baño'},{cod:'ES',desc:'Espera'},{cod:'DE',desc:'Descanso'},{cod:'CO',desc:'Conversación'},{cod:'TR',desc:'Trabajo Rehecho'}];

// ── PALETA GRAPCO 2026 — TONO PREMIUM ──
// Marca alineada al logo oficial (navy del isotipo + ámbar de los edificios).
// Neutros: gama cool gris-azulada inspirada en Stripe/Linear (lectura larga sin fatiga).
// Estados: emerald + rose en vez de slime/fire-engine (paleta más sofisticada).
export const BASE = {
  font: '"IBM Plex Sans",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',

  // ── Marca — exactos al logo oficial GRAPCO ──
  navy:       '#0F2A47',     // fondo del isotipo
  navyDark:   '#081A2E',     // hover / shadows
  navyLight:  '#1E4674',     // accent dentro del navy
  navySoft:   '#E3EAF3',     // navy muy claro (bandas / fila highlight)

  gold:       '#E5A82F',     // ámbar de los edificios del logo (refinado vs naranja antes)
  goldDark:   '#B07D1B',     // bronce profundo
  goldLight:  '#FCEFC9',     // crema suave
  goldSoft:   '#FBF6E5',     // casi blanco con tinte cálido

  // ── Estados — emerald + rose (paleta tasteful) ──
  green:      '#10B981',     // emerald 500 — más elegante que slime
  greenDark:  '#047857',     // emerald 700
  greenLight: '#D1FAE5',     // emerald 100

  red:        '#E11D48',     // rose 600 — más sofisticado que alert red
  redDark:    '#9F1239',     // rose 800
  redLight:   '#FFE4E6',     // rose 100

  // ── LPS (alineados al Excel maestro — sin tocar) ──
  lpsHeader:    '#fbbf24',
  lpsBand:      '#0F2A47',
  lpsBandSoft:  '#E3EAF3',
  lpsBandSofter:'#FBF6E5',
  lpsS0:        '#67e8f9',
  lpsS0Text:    '#0c4a6e',
  lpsS1:        '#fde047',
  lpsS1Text:    '#713f12',
  lpsS2:        '#ef4444',
  lpsS2Text:    '#7f1d1d',
  lpsCompletado:'#86efac',
  lpsPendiente: '#fca5a5',
  lpsBloqueado: '#94a3b8',
  lpsRealizado: '#bbf7d0',
  lpsEnProceso: '#fde68a',
  lpsPendienteR:'#fecaca',

  // Heredado (compatibilidad — apunta al nuevo gold premium)
  orange:     '#E5A82F',

  // ── Neutros — gama cool-blue stripe-like (no slate genérico) ──
  bg:         '#F6F8FB',     // canvas sutil con tinte azul
  bgSoft:     '#FCFCFD',     // casi blanco
  white:      '#FFFFFF',
  border:     '#E5E9F0',     // borde apenas visible (premium feel)
  borderSoft: '#EFF2F6',
  text:       '#0F172A',     // navy-tinted near-black (richer que slate puro)
  muted:      '#5B6878',     // gris medio con calor sutil
  mutedSoft:  '#9AA5B5',

  // ── Elevación — sombras layered estilo macOS / Linear ──
  shadowSm:    '0 1px 2px rgba(15,23,42,0.05), 0 1px 1px rgba(15,23,42,0.03)',
  shadowMd:    '0 4px 16px -2px rgba(15,23,42,0.08), 0 2px 6px -2px rgba(15,23,42,0.04)',
  shadowLg:    '0 24px 48px -12px rgba(15,23,42,0.18), 0 8px 20px -8px rgba(15,23,42,0.06)',
  shadowFocus: '0 0 0 3px rgba(229,168,47,0.30)',  // halo dorado al foco
};

export const inp = (extra={}) => ({
  width:'100%', padding:'10px 12px', borderRadius:'8px',
  border:'1.5px solid #e2e8f0', fontSize:'13px', color:BASE.text,
  background:'#f8fafc', outline:'none', boxSizing:'border-box', ...extra,
});

// ════════════════════════════════════════════════════════════════
// DESIGN SYSTEM v2 — Bloque 10
// Tokens formales para tipografía, spacing, radius, animaciones.
// Reemplazan paulatinamente los valores hardcodeados.
// ════════════════════════════════════════════════════════════════

export const SPACING = {
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '24px',
  '2xl': '32px',
  '3xl': '48px',
};

export const TYPOGRAPHY = {
  // Tamaños
  size: {
    micro: '10px',  // labels, micro-text
    xs:    '11px',  // captions, metadata
    sm:    '12px',  // small body, buttons
    base:  '13px',  // body principal
    md:    '14px',  // subtítulos
    lg:    '16px',  // título secciones
    xl:    '20px',  // KPI values
    '2xl': '28px',  // títulos hero
    '3xl': '36px',  // CPI mega
  },
  // Pesos
  weight: {
    normal:   400,
    medium:   600,
    semibold: 700,
    bold:     800,
    black:    900,
  },
  // Letter spacing para mayúsculas
  tracking: {
    normal: '0',
    tight:  '-0.3px',
    wide:   '0.4px',
    wider:  '0.6px',
    widest: '1.2px',  // para badges/labels en MAYÚSCULAS
  },
  // Line height
  leading: {
    tight:   1.2,
    snug:    1.4,
    normal:  1.55,
    relaxed: 1.7,
  },
};

export const RADIUS = {
  sm:    '6px',
  md:    '8px',
  lg:    '10px',
  xl:    '12px',
  '2xl': '14px',
  '3xl': '18px',
  full:  '9999px',
};

export const ANIMATION = {
  duration: {
    fast:   '0.15s',
    base:   '0.25s',
    slow:   '0.4s',
  },
  easing: {
    inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
    out:      'cubic-bezier(0, 0, 0.2, 1)',
    in:       'cubic-bezier(0.4, 0, 1, 1)',
    bounce:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

export const Z_INDEX = {
  dropdown:  100,
  sticky:    200,
  modal:     500,
  toast:     1000,
  tooltip:   1100,
};

// ── Helper: aplicar tipografía rápido ──
// Uso: ...font('lg', 'bold', BASE.navy)
export const font = (size = 'base', weight = 'medium', color, extra = {}) => ({
  fontSize: TYPOGRAPHY.size[size] || size,
  fontWeight: TYPOGRAPHY.weight[weight] || weight,
  ...(color && { color }),
  fontFamily: BASE.font,
  ...extra,
});

// ── Helper: card consistente ──
export const cardStyle = (extra = {}) => ({
  background: BASE.white,
  borderRadius: RADIUS.xl,
  border: `1px solid ${BASE.border}`,
  boxShadow: BASE.shadowSm,
  ...extra,
});

// ── Helper: button consistente ──
export const buttonStyle = (variant = 'primary', size = 'md', extra = {}) => {
  const base = {
    border: 'none',
    cursor: 'pointer',
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: BASE.font,
    transition: `all ${ANIMATION.duration.fast} ${ANIMATION.easing.out}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.sm,
    whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: TYPOGRAPHY.size.xs, borderRadius: RADIUS.md },
    md: { padding: '9px 16px', fontSize: TYPOGRAPHY.size.sm, borderRadius: RADIUS.md },
    lg: { padding: '12px 22px', fontSize: TYPOGRAPHY.size.base, borderRadius: RADIUS.lg },
  };
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${BASE.navy}, ${BASE.navyDark})`,
      color: '#fff',
      boxShadow: `0 4px 12px rgba(30,58,95,0.25)`,
    },
    secondary: {
      background: BASE.white,
      color: BASE.navy,
      border: `1.5px solid ${BASE.border}`,
    },
    gold: {
      background: `linear-gradient(135deg, ${BASE.gold}, ${BASE.goldDark})`,
      color: '#fff',
      boxShadow: `0 4px 12px rgba(245,158,11,0.3)`,
    },
    ghost: {
      background: BASE.bgSoft,
      color: BASE.navy,
    },
    danger: {
      background: '#fee2e2',
      color: BASE.red,
    },
  };
  return { ...base, ...sizes[size], ...variants[variant], ...extra };
};
