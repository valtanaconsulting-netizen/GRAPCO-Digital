# Planeamiento · Plataforma GRAPCO

App **independiente** extraída de GRAPCO (24/06/2026). Cubre el ciclo de
planeamiento Lean / Last Planner System:

- **Flujo de Planeamiento** — hub del proceso (línea base → programación → colaborativo → Last Planner → control).
- **Cronograma de Obra** — motor CPM editable (FS/SS/FF/SF, ruta crítica, Gantt, línea base, % avance) con import/export Excel.
- **Normal Tecnológica** — secuencia y precedencias constructivas.
- **Pull Planning** — planificación colaborativa de fases + tren de actividades.
- **Last Planner System** — Lookahead (LAP) 6 semanas, Análisis de Restricciones, Plan Semanal, PPC + CNC.
- **Plan de Vaciado** — tren de vaciado de concreto por sector con HH/MO meta.

Comparte el **chasis** de GRAPCO (login, contexts de Auth/Proyecto/Tema/Notificaciones,
shell navy, offline-first PWA, Capacitor) pero con su **propio Firebase**.

## Stack
React 19 + Vite · Firebase (Auth/Firestore/Storage, offline-first IndexedDB) · Recharts · ExcelJS · PWA + Capacitor (Android/iOS).

## Desarrollo
```bash
npm install
npm run dev            # usa el emulator de Firebase si está en localhost
```

## Provisionar Firebase (app con proyecto propio)
Esta app NO comparte el Firebase de GRAPCO. Crear su proyecto (plan Spark, $0):

1. Crear el proyecto **`grapco-planeamiento-2026`** en la consola de Firebase.
2. Habilitar **Authentication** (Email/Password), **Firestore** y **Storage**.
3. Copiar las credenciales web a un `.env.production` (o `.env.local`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=grapco-planeamiento-2026.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=grapco-planeamiento-2026
   VITE_FIREBASE_STORAGE_BUCKET=grapco-planeamiento-2026.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_USE_EMULATOR=false
   ```
4. Desplegar reglas: `firebase deploy --only firestore:rules,storage --project grapco-planeamiento-2026`.
5. Crear el primer admin (bootstrap): registrarse desde el Login; el primer usuario se promueve a admin.

### Colecciones Firestore que usa
`Usuarios`, `Proyectos`, `Frentes`, `Cronogramas/{proyectoId}`, `LPS/{proyectoId}`,
`VDC_Restricciones`, `VDC_Lecciones`, `VDC_Evidencias`, `Planes_Diarios`,
`Configuracion/lap*_{proyectoId}`.

> **Migración de datos (opcional):** si quieres traer el histórico de planeamiento
> desde `grapco-demo-2026`, exporta esas colecciones con `firebase-admin` y reimpórtalas
> en `grapco-planeamiento-2026`. Sin migrar, la app arranca limpia y se llena con el uso.

## Build y deploy
```bash
npm run build
firebase deploy --only hosting --project grapco-planeamiento-2026
```

## App nativa (Capacitor)
```bash
npm run build
npx cap add android      # requiere Android SDK (C:\Users\fjros\Android\Sdk)
npx cap sync
npx cap open android
```
`appId`: `com.grapco.planeamiento`.
