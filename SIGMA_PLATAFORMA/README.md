# 🦺 SIGMA — Plataforma de Seguridad, Salud y Medio Ambiente

Plataforma **independiente** de SSOMA (antes vivía dentro de GRAPCO). Es una app aparte
con su propio Firebase, su propio build y su propio deploy. **No comparte nada** con GRAPCO.

## Qué incluye (módulos SSOMA)
- **Dashboard de Seguridad** — indicadores y hallazgos.
- **ATS** (Análisis de Trabajo Seguro) — galería con firmas y foto.
- **Inspecciones de Seguridad**.
- **Historial** — reportes (NCs) e inspecciones.
- **Reporte de Incidencias**.

## Puesta en marcha (una sola vez)
1. **Crea un proyecto Firebase** (gratis, plan Spark, sin tarjeta): https://console.firebase.google.com
   - Agrega una **app Web**, activa **Firestore** (modo producción) y **Storage**.
2. **Configura las credenciales**: copia `.env.example` a `.env` y pega los valores de tu app web
   (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
3. En `.firebaserc`, reemplaza `tu-proyecto-sigma` por el **projectId** real.
4. Instala y corre:
   ```bash
   npm install
   npm run dev      # desarrollo local
   npm run build    # compila a dist/
   npm run deploy   # build + firebase deploy --only hosting (necesita firebase-cli y login)
   ```

## Notas
- **Identidad**: por ahora se pide nombre/correo y se guarda local (sin login Firebase) para
  poder arrancar. Para login corporativo real, cablear Firebase Auth en `src/contexts/AuthContext.jsx`
  (las vistas no cambian: solo usan `user.email` / `user.uid`).
- **Obras**: el selector de obra lee la colección `Proyectos` de TU Firestore; si está vacía,
  usa una "Obra general". Crea proyectos en esa colección para separar por obra.
- **Reglas de Firestore/Storage**: define las tuyas en la consola de Firebase (lectura/escritura
  según tus usuarios). Esta plataforma escribe en: `ATS`, `InspeccionesSeguridad`,
  `NoConformidades`, `Incidencias`, `Proyectos`.
- Generado el 2026-06-15 extrayendo el módulo SSOMA de GRAPCO (que ya lo retiró de su menú).
