# GRAPCO Produc-App

> Plataforma de control de productividad de obra para construcción con integración VDC, Last Planner System® y BIM.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange.svg)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-installable-blueviolet.svg)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)

---

## ✨ Qué es esto

GRAPCO Produc-App es una **PWA (Progressive Web App)** que digitaliza el control diario de productividad en obras de construcción civil. Reemplaza Excel + planillas físicas por un sistema integrado que captura datos en campo y produce métricas EVM, LPS y BIM en tiempo real.

**Tres roles, un sistema:**
- 👷 **Capataz** — registra producción diaria desde el celular en obra (móvil-first)
- 📊 **Ingeniero** — analiza CPI, EAC, curvas-S, planifica con Last Planner, vincula con BIM
- 🛡️ **Admin** — gestiona usuarios, audita operaciones, ajusta configuración

## 🎯 Características principales

| Categoría | Capacidades |
|---|---|
| 📋 **Producción** | Reporte diario móvil · Carta Balance · Tareo · Auditoría |
| 📊 **Análisis EVM** | CPI/SPI/EAC en tiempo real · Curva-S · Tendencias · Gráficos |
| ✍️ **Planificación** | Last Planner System completo (LAP, Lookahead, Programación, Compromisos, PPC, RNC, Lecciones) |
| 🏗️ **BIM** | Subida directa de .rvt a Autodesk APS · Visor 3D embebido · Vinculación WBS↔elementos |
| 🛡️ **Seguridad** | Roles (capataz/ingeniero/admin) · Reglas Firestore · Rate limiting · Auditoría append-only |
| 🎨 **UX** | Dark mode · WCAG AA · PWA installable · Cmd+K palette · Tooltips |
| 🔧 **Admin** | Panel con CRUD usuarios · Visor auditoría · Health checks · Config global |

## 🚀 Quick start

### Requisitos
- Node.js 20+
- Cuenta Firebase (plan Blaze para Cloud Functions)
- Cuenta Autodesk APS (opcional, solo para módulo BIM)

### Instalación

```bash
# 1. Clonar repo
git clone <tu-repo-url>
cd grapco-produc-app

# 2. Instalar dependencias
npm install

# 3. Copiar y completar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales Firebase

# 4. Levantar dev server
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

### Primer admin (única vez)

Para que el sistema reconozca al primer admin, hazlo manualmente desde Firebase Console:

1. Crea tu usuario normalmente con email/password en la app
2. Firebase Console → Firestore → crea colección **`Usuarios`** (capital U)
3. Document ID = el UID que ves en Authentication → Users
4. Agrega campos:
   ```
   email:    "tu@email.com"  (string)
   nombre:   "Tu Nombre"      (string)
   rol:      "admin"          (string)
   activo:   true             (boolean)
   ```
5. Cierra sesión y vuelve a entrar. Ya eres admin y desde el panel puedes crear más usuarios.

## 📁 Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── AlertasPanel.jsx
│   ├── BimUploader.jsx       # Subir RVT a APS
│   ├── BimViewerAPS.jsx      # Visor 3D Autodesk
│   ├── CommandPalette.jsx    # Cmd+K
│   ├── EmptyState.jsx
│   ├── ErrorBoundary.jsx
│   ├── FotoUploader.jsx
│   ├── Modal.jsx
│   ├── Navbar.jsx
│   ├── PwaInstallPrompt.jsx
│   ├── RoleGuard.jsx         # Control de acceso por rol
│   ├── SkeletonLoader.jsx
│   ├── StatusChip.jsx
│   ├── ThemeToggle.jsx
│   └── Tooltip.jsx
├── context/
│   ├── AuthContext.jsx        # Auth + carga de rol
│   ├── NotificationContext.jsx # Sistema de notificaciones rico
│   └── ThemeContext.jsx       # Light/Dark/System
├── hooks/
│   └── useFirebaseData.js     # Hooks de Firestore
├── utils/
│   ├── adminClient.js         # Llamadas Cloud Functions admin
│   ├── apsClient.js           # Llamadas APS
│   ├── excelExport.js
│   ├── functionsClient.js     # HTTP client unificado
│   ├── helpers.js             # 1500+ líneas de business logic
│   ├── pdfExport.js
│   ├── seguridad.js           # Validadores + audit
│   └── styles.js              # Design tokens
├── views/
│   ├── admin/                 # Panel administración
│   │   ├── AdminPanel.jsx
│   │   ├── ResumenAdmin.jsx
│   │   ├── GestionUsuarios.jsx
│   │   ├── VisorAuditoria.jsx
│   │   ├── ConfigSistema.jsx
│   │   └── SaludSistema.jsx
│   ├── ingeniero/             # Vistas analíticas
│   │   ├── BIM.jsx
│   │   ├── VDC.jsx            # Last Planner System
│   │   └── ...
│   ├── Capataz.jsx
│   ├── CartaBalance.jsx
│   ├── Ingeniero.jsx          # Dashboard analítico
│   └── Login.jsx
├── App.jsx
├── firebaseConfig.js
├── main.jsx
└── index.css

functions/
├── index.js                   # Cloud Functions APS
├── admin.js                   # Cloud Functions admin
└── package.json

public/
├── sw.js                      # Service Worker
├── manifest.json              # PWA manifest
└── icons/

firestore.rules                # Reglas de seguridad Firestore
firestore.indexes.json         # Índices compuestos
storage.rules                  # Reglas de seguridad Storage
firebase.json                  # Config Firebase + headers HTTP
```

## 🔐 Despliegue a producción

### 1. Firebase setup

```bash
# CLI
npm install -g firebase-tools
firebase login

# Inicializar (si no se hizo)
firebase init
```

### 2. Configurar credenciales APS (Cloud Functions)

```bash
firebase functions:config:set \
  aps.client_id="TU_CLIENT_ID_DE_APS" \
  aps.client_secret="TU_CLIENT_SECRET" \
  aps.bucket_key="grapco-models-prod"
```

### 3. Desplegar

```bash
# Reglas de seguridad (CRÍTICO antes que el frontend)
firebase deploy --only firestore:rules,firestore:indexes,storage

# Cloud Functions
firebase deploy --only functions

# Frontend
npm run build
firebase deploy --only hosting
```

### 4. Verificar

- ✅ Login funciona
- ✅ Capataz puede crear registro
- ✅ Ingeniero ve dashboard con datos
- ✅ Admin ve panel de gestión
- ✅ Cmd+K abre la paleta
- ✅ Service Worker registrado (DevTools → Application)

## 📚 Documentación

El proyecto incluye **13 capítulos HTML** que documentan cada bloque de desarrollo:

| Capítulo | Contenido |
|---|---|
| `Plan_Implementacion_VDC.html` | Roadmap VDC inicial |
| `Informe_Estado_Plataforma.html` | Estado tras Bloque 3 |
| `Dossier_KPIs_y_Adopcion.html` | ROI 14.6× + plan 90 días |
| `Guia_Rediseno_UI.html` | Rediseño dashboard |
| `Integracion_BIM.html` | Arquitectura BIM 4 capas |
| `Resumen_Bloque_8.html` | Fotos + BIM Fase 1+2 + PDF |
| `Setup_APS.html` | **Guía paso a paso APS** |
| `Capitulo_10_Sistema_Diseno.html` | Design system formal |
| `Capitulo_11_UX_Avanzada.html` | Accesibilidad + dark mode + PWA |
| `Storybook_Componentes.html` | Catálogo visual de componentes |
| `Capitulo_12_Seguridad.html` | Reglas Firestore + Storage + roles |
| `Capitulo_13_Admin_Panel.html` | Panel admin completo |
| `Manual_Usuario.html` | **Manual operativo por rol** |

## 🛠️ Stack técnico

- **Frontend**: React 18 + Vite + JSX puro (sin TypeScript)
- **Backend**: Firebase (Firestore + Auth + Storage + Functions + Hosting)
- **3D**: Autodesk Platform Services (APS) Viewer 7
- **PWA**: Service Worker custom con estrategias diferenciadas
- **Estado**: React Context (Auth, Theme, Notifications)
- **Forms**: Estado local con validación cliente-servidor
- **Charts**: Recharts (en componentes específicos)

## 🤝 Roles y permisos

| Acción | Capataz | Ingeniero | Admin |
|---|:---:|:---:|:---:|
| Reportar producción | ✅ | — | ✅ |
| Ver dashboard analítico | — | ✅ | ✅ |
| Editar configuración global | — | ✅ | ✅ |
| Subir modelo BIM | — | ✅ | ✅ |
| Crear usuarios | — | — | ✅ |
| Cambiar roles | — | — | ✅ |
| Eliminar registros | — | — | ✅ |
| Ver auditoría | — | — | ✅ |

## 🐛 Reportar bugs

Si encuentras un bug:
1. En la app, presiona Cmd+K → "Copiar error" si es un crash
2. Abre un issue con: pasos para reproducir, screenshot, versión del navegador

## 📝 Licencia

Proyecto académico desarrollado para tesis de ingeniería · GRAPCO SAC · 2026

## 🙏 Créditos

- Framework: [React](https://react.dev) + [Vite](https://vitejs.dev)
- Backend: [Firebase](https://firebase.google.com)
- BIM: [Autodesk Platform Services](https://aps.autodesk.com)
- Iconos: emojis nativos del sistema
- Design system: inspirado en Linear, Notion, Stripe

---

**Construido con ❤️ en Lima, Perú · Mayo 2026**
