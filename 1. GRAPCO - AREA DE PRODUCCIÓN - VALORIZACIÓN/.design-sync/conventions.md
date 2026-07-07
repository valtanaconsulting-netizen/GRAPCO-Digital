# GRAPCO Design System — cómo construir con él

UI de gestión de obra (VDC / construcción) de GRAPCO S.A.C. Lenguaje **navy + oro** sobre fondo claro, tipografía IBM Plex. Componentes presentacionales (sin estado de datos): reciben todo por props.

## Setup (sin provider)

No hay provider ni theme-context: cada componente trae sus estilos *inline* y lee los **tokens de marca como CSS custom properties** definidas en `:root` (se entregan en `styles.css`, que el diseño ya recibe). Solo asegúrate de que `styles.css` esté cargado — sin él, los `var(--grapco-*)` caen a su fallback y el color/tipografía de marca se pierde. Las fuentes (**IBM Plex Sans** para UI, **IBM Plex Mono** para cifras/HH/montos) llegan por `@import` remoto dentro de `styles.css`.

```jsx
import { VistaHeader, EmptyState } from '<pkg>'; // = window.GRAPCO.*
<VistaHeader icono="ruler" eyebrow="Oficina Técnica"
  titulo="Contrato · Ejecución · Facturación"
  subtitulo="RDO automático desde tareos + LPS." />
```

## Idioma de estilo: tokens CSS, NO clases utilitarias

GRAPCO **no** usa un sistema de clases (no hay Tailwind ni BEM). Se estiliza con **estilos inline + variables CSS de marca**. Para tu propio layout/glue, usa SIEMPRE estos tokens (no inventes hex):

| Token | Uso |
|---|---|
| `var(--grapco-navy)` `--grapco-navy-deep` `--grapco-navy-light` | azul de marca: cabeceras, sidebars, texto fuerte, fondos oscuros |
| `var(--grapco-gold)` `--grapco-gold-deep` | oro de marca: acentos, estado activo, filos |
| `var(--grapco-green)` `--grapco-red` | estados ok / alerta (emerald / rose) |
| `var(--grapco-purple)` `--grapco-blue` `--grapco-pink` `--grapco-teal` | acentos por categoría/módulo |
| `var(--grapco-text)` `--grapco-muted` | texto primario / secundario |
| `var(--grapco-bg)` `--grapco-bg-soft` `--grapco-white` `--grapco-border` | canvas, tarjetas, bordes |
| `var(--grapco-font-ui)` | tipografía UI (IBM Plex Sans) |
| `var(--grapco-font-mono)` | cifras/montos/HH (IBM Plex Mono) |

Patrón de tarjeta típico: fondo `--grapco-white`, `border: 1px solid var(--grapco-border)`, `border-radius: 12–14px`, y un filo/acento de color por la izquierda o arriba. Cifras siempre en `--grapco-font-mono`.

## Componentes

- **`Icon`** — set SVG de marca. Prop `name` (string, p.ej. `dashboard`, `trendingUp`, `fileText`, `coins`, `layers`, `cube`, `ruler`, `hardhat`, `target`, `building`, `barChart3`); `size`, `color` (usa los tokens), `strokeWidth`.
- **`VistaHeader`** — cabecera "hero" navy con chip de icono dorado. `eyebrow` + `titulo` + `subtitulo`, y `derecha` para KPIs/acciones. Úsala como encabezado de toda vista.
- **`EmptyState`** — placeholder amigable cuando no hay datos. `variante`: `default | success | warning | bim`; `accion` opcional `{label, onClick}`.
- **`AreaSidebar`** — menú lateral navy de un área. `grupos` = `{ GRUPO: [{key,label,iconName,color}] }`, `activeKey`, `onSelect`. Es `position:fixed` (vive bajo un topbar de 60px); para incrustarlo, envuélvelo en un contenedor con `transform: translateZ(0)`.

## Dónde está la verdad

- `styles.css` → los tokens `--grapco-*` (léelo antes de estilizar).
- `components/<grupo>/<Name>/<Name>.d.ts` → contrato de props · `<Name>.prompt.md` → uso.
