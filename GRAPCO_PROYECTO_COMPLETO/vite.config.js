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
    include: ['xlsx', 'recharts', 'firebase/firestore'],
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
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'vendor-charts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          // ExcelJS (~0.9 MB) → chunk AISLADO. Solo se descarga al exportar el
          // Tareo F13 con estilos (lazy import), NO en el arranque.
          if (id.includes('exceljs') || id.includes('/archiver') || id.includes('unzipper')
            || id.includes('fast-csv') || id.includes('saxes') || id.includes('/jszip')) return 'vendor-exceljs';
          // html2pdf + html2canvas + jspdf (~0.5 MB) → chunk AISLADO. Solo al
          // generar/ver el Tareo en PDF (lazy), NO en el arranque.
          if (id.includes('html2pdf') || id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-html2pdf';
          // TensorFlow + face-api → mismo chunk AISLADO (~0.6 MB). Solo se descarga al
          // abrir asistencia/reconocimiento facial (lazy), NO en el arranque.
          if (id.includes('face-api.js') || id.includes('@tensorflow') || id.includes('tfjs') || id.includes('seedrandom')) return 'vendor-faceapi';
          // @react-pdf/renderer + motor PDF (pdfkit/fontkit/yoga ~1.5 MB) → chunk
          // AISLADO. Solo se descarga al generar PDFs de protocolos (lazy), NO al inicio.
          if (id.includes('@react-pdf') || id.includes('yoga-layout') || id.includes('fontkit')
            || id.includes('pdfkit') || id.includes('restructure') || id.includes('bidi-js')
            || id.includes('png-js') || id.includes('linebreak') || id.includes('unicode-properties')
            || id.includes('unicode-trie') || id.includes('tiny-inflate') || id.includes('/brotli')
            || id.includes('/dfa/')) return 'vendor-pdf';
          return 'vendor';
        },
      },
    },
  },
});
