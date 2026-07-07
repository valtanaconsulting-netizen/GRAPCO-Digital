# Gestión de Calidad · Plataforma GRAPCO

App **independiente** extraída de GRAPCO (24/06/2026). Es el "Bloque 20" de Calidad:

- **Dashboard** — KPIs de liberación, NCs abiertas, ensayos.
- **Protocolos** — Pre-Vaciado (CAL-FOR-006), por elemento (concreto, acero, encofrado…) y CAL-FOR (trazo/replanteo) con firmas digitales.
- **PETs** — Procedimientos Escritos de Trabajo (10 secciones) con editor y PDF.
- **No Conformidades** — ciclo abierta → tratamiento → cerrada → verificada.
- **Ensayos** — resultados de laboratorio con cumplimiento automático.
- **Planos** — biblioteca por frente (PDF/imágenes).
- **Archivo** — PDFs firmados por Frente/Semana, con **archivado automático a Google Drive**.
- **Modelo BIM** — visor APS + vínculos por partida (transversal).

Comparte el **chasis** de GRAPCO (login, contexts, shell, offline-first PWA, Capacitor)
pero con su **propio Firebase** y su **Cloud Function** de sincronización a Drive.

## Stack
React 19 + Vite · Firebase (Auth/Firestore/Storage + Functions) · jsPDF/html2canvas · Recharts · Google Drive (OAuth + Service Account) · PWA + Capacitor.

## Desarrollo
```bash
npm install
npm run dev
```

## Provisionar Firebase (app con proyecto propio)
Crear el proyecto **`grapco-calidad-2026`** (Spark $0; **Functions requieren plan Blaze**
si se quiere el archivado automático a Drive — ver nota):

1. Crear `grapco-calidad-2026` en la consola de Firebase.
2. Habilitar **Authentication** (Email/Password), **Firestore** y **Storage** (región `us-east1` para el bucket, coincide con la function).
3. Completar `.env.production` (o `.env.local`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=grapco-calidad-2026.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=grapco-calidad-2026
   VITE_FIREBASE_STORAGE_BUCKET=grapco-calidad-2026.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_GOOGLE_OAUTH_CLIENT_ID=...   # para subir a Drive desde el frontend
   VITE_USE_EMULATOR=false
   ```
4. Reglas: `firebase deploy --only firestore:rules,storage --project grapco-calidad-2026`.

### Colecciones Firestore que usa
`Usuarios`, `Proyectos`, `Frentes`, `Protocolos`, `ProtocolosCALFOR`,
`NoConformidades`, `Ensayos`, `PETs`. **Storage:** `protocolos-firmados/`, `planos/`.

## Cloud Function — Archivado a Google Drive
`functions/protocolosArchivado.js` reacciona al subir un PDF firmado a Storage
(`protocolos-firmados/...`) y lo sube a Drive (SA **protocolos-bot**, carpeta «1. PROTOCOLOS»).

Requisitos para desplegarla:
- Plan **Blaze** del proyecto (las Functions v2 lo exigen; el uso real es $0 dentro del free tier).
- Secrets: `firebase functions:secrets:set GOOGLE_SA_KEY` y `DRIVE_ROOT_FOLDER_ID`.
- Compartir la carpeta «1. PROTOCOLOS» de Drive con el email del SA `protocolos-bot`.
- Bucket de la function: `grapco-calidad-2026.firebasestorage.app` (override con env `STORAGE_BUCKET`).
- `firebase deploy --only functions --project grapco-calidad-2026`.

> `functions/index.js` son las funciones APS (visor BIM/Forge). Solo necesarias si se
> usa la pestaña **Modelo BIM**; requieren credenciales APS. Añadir `grapco-calidad-2026`
> a `PROYECTOS_PERMITIDOS` si se activan.

## Build y deploy
```bash
npm run build
firebase deploy --only hosting --project grapco-calidad-2026
```

## App nativa (Capacitor)
`appId`: `com.grapco.calidad`. `npx cap add android && npx cap sync`.
