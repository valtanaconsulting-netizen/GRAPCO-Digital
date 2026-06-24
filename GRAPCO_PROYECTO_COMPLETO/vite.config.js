import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// SWC: compilador rapido en Rust. Para que NO falle con emojis raros,
// el codigo debe evitar Variation Selectors (U+FE0F) en atributos JSX.
// El archivo CartaBalanceAnalisis.jsx ya viene corregido sin emojis problematicos.
export default defineConfig({
  plugins: [react()],
  // ID único por build → fuerza actualización del Service Worker en cada deploy.
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  esbuild: {
    target: 'es2020',
    legalComments: 'none',
  },
  optimizeDeps: {
    // xlsx/recharts NO van aquí: son lazy (chunks aislados, no precargados en prod).
    // Pre-bundlearlos solo ralentiza el cold-start del dev server.
    include: ['firebase/firestore'],
  },
  server: {
    hmr: { overlay: true },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    // No PRECARGAR los chunks pesados opcionales (PDF, reconocimiento facial, Excel)
    // en el arranque: se descargan SOLO cuando se abre la función que los usa.
    modulePreload: {
      resolveDependencies: (url, deps) => deps.filter(d => !/vendor-(pdf|faceapi|xlsx|exceljs|html2pdf)/.test(d)),
    },
    rollupOptions: {
      output: {
        // Vendors en chunks separados → se cachean entre deploys y cargan en
        // paralelo. El usuario no re-descarga React/Firebase/Recharts cada vez.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          // @capacitor: el arranque (nativo.js / backButton.js) lo importa SOLO para
          // detectar si corremos en la app nativa. Era el ÚNICO gancho eager hacia el
          // 'vendor' genérico → arrastraba sus ~500 KB (lodash, deps de recharts, jspdf,
          // etc.) a la carga inicial pese a ser código 100% lazy. Aislándolo en su propio
          // chunk (pequeño), el 'vendor' genérico deja de ser eager y NO bloquea el boot.
          // Verificar tras build: 'vendor-*.js' (catch-all) ya NO aparece en el
          // modulepreload de index.html.
          if (id.includes('@capacitor')) return 'vendor-capacitor';
          // react-is / prop-types: micro-libs COMPARTIDAS entre el código eager y recharts.
          // Si caen dentro de 'vendor-charts', el arranque (que las usa transitivamente)
          // arrastra TODO recharts (~109 KB gz) pese a que ningún panel con gráficos se
          // abrió. En su propio chunk (pocos KB) el arranque solo baja eso y 'vendor-charts'
          // queda lazy. Esta regla DEBE ir antes que la de recharts.
          if (id.includes('/react-is/') || id.includes('/prop-types/') || id.includes('/object-assign/')) return 'vendor-react-is';
          // recharts + d3 + lodash (recharts trae lodash INLINEADO vía babel-plugin-lodash):
          // NO los forzamos a un chunk nombrado. Nombrar 'vendor-charts' creaba una arista
          // ESTÁTICA entry→vendor-charts (un helper compartido quedaba dentro del chunk y el
          // arranque lo importaba) → se bajaban ~109 KB gz de gráficos en el boot pese a que
          // TODAS las vistas con recharts son lazy (React.lazy). Devolviendo undefined,
          // Rolldown los aísla como chunk(s) DINÁMICO(s) sin arista eager — mismo truco que
          // ya se usa abajo con @react-pdf y html2pdf. Verificar: 0 'vendor-charts' en el
          // modulepreload de index.html tras el build.
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')
            || id.includes('/lodash/') || id.includes('react-smooth') || id.includes('recharts-scale')
            || id.includes('internmap') || id.includes('fast-equals') || id.includes('eventemitter3')) return;
          if (id.includes('xlsx')) return 'vendor-xlsx';
          // ExcelJS (~0.9 MB) → chunk AISLADO. Solo se descarga al exportar el
          // Tareo F13 con estilos (lazy import), NO en el arranque.
          if (id.includes('exceljs') || id.includes('/archiver') || id.includes('unzipper')
            || id.includes('fast-csv') || id.includes('saxes') || id.includes('/jszip')) return 'vendor-exceljs';
          // html2pdf + html2canvas + jspdf (~0.5 MB): NO los forzamos a un chunk
          // nombrado. Hacerlo creaba una arista ESTATICA entry→vendor-html2pdf y se
          // descargaban en el arranque (~150 KB gz) pese a ser 100% lazy. Devolviendo
          // undefined, Rolldown los aisla solo como chunk DINAMICO (await import desde
          // TareoPDFHtml). Verificar tras build: 0 imports de ese chunk en index-*.js.
          // jspdf y sus deps de imagen/compresión (fast-png, iobuffer, pako): igual que
          // arriba, en chunk DINÁMICO. fast-png filtraba ~19 KB gz al arranque pese a que
          // jspdf solo se alcanza vía await import (export PDF).
          if (id.includes('html2pdf') || id.includes('html2canvas') || id.includes('jspdf')
            || id.includes('/fast-png') || id.includes('/iobuffer') || id.includes('/pako')) return;
          // TensorFlow + face-api → mismo chunk AISLADO (~0.6 MB). Solo se descarga al
          // abrir asistencia/reconocimiento facial (lazy), NO en el arranque.
          if (id.includes('face-api.js') || id.includes('@tensorflow') || id.includes('tfjs') || id.includes('seedrandom')) return 'vendor-faceapi';
          // @react-pdf/renderer + motor PDF (pdfkit/fontkit/yoga ~1.5 MB): NO los
          // forzamos a un chunk nombrado. Hacerlo creaba una arista ESTATICA
          // entry→vendor-pdf y se descargaban ~418 KB gz en el arranque pese a ser
          // 100% lazy (solo se alcanzan via await import desde ProtocoloPreVaciadoPDF).
          // Con undefined, Rolldown los aisla como chunk DINAMICO. Verificar: 0 imports
          // de ese chunk en index-*.js tras el build.
          if (id.includes('@react-pdf') || id.includes('yoga-layout') || id.includes('fontkit')
            || id.includes('pdfkit') || id.includes('restructure') || id.includes('bidi-js')
            || id.includes('png-js') || id.includes('linebreak') || id.includes('unicode-properties')
            || id.includes('unicode-trie') || id.includes('tiny-inflate') || id.includes('/brotli')
            || id.includes('/dfa/')) return;
          // Catch-all: UN chunk POR PAQUETE en vez de un monolito 'vendor' de ~420 KB.
          // Antes, cualquier módulo del arranque que tocara UNA sola lib de ese bucket
          // (react-is, etc.) arrastraba los 420 KB enteros a la carga inicial. Con un
          // chunk por paquete, el arranque solo baja los paquetes que realmente usa
          // (pequeños) y el resto (DOMPurify, pako, etc.) queda lazy en su propio chunk.
          const tras = id.split('node_modules/').pop();
          const seg = tras.split('/');
          const pkg = seg[0].startsWith('@') ? `${seg[0]}/${seg[1]}` : seg[0];
          return `vendor-${pkg.replace(/^@/, '').replace(/[/.]/g, '-')}`;
        },
      },
    },
  },
});
