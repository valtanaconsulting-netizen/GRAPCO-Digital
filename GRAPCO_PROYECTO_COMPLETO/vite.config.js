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
          if (id.includes('face-api.js')) return 'vendor-faceapi';
          return 'vendor';
        },
      },
    },
  },
});
