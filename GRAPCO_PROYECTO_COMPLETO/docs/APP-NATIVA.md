# GRAPCO como aplicación nativa (Capacitor)

GRAPCO ahora corre de tres formas con **el mismo código React**:

1. **Web** (https://grapco-demo-2026.web.app) — el navegador de siempre.
2. **PWA instalable** — "Agregar a pantalla de inicio".
3. **App nativa** — APK de Android e app de iOS, vía **Capacitor 8**.

La app nativa es la única forma de **ocultar por completo la barra de estado del
sistema** (hora / WiFi / batería) y sentir la plataforma como una app de verdad,
también en iPhone (donde la web no lo permite).

- **appId:** `com.grapco.plataforma`
- **appName:** `GRAPCO`
- El arranque nativo (ocultar barra de estado + splash) está en
  [`src/nativo.js`](../src/nativo.js); en web no hace nada.

---

## Requisitos ya instalados en esta PC

- **JDK 21** (`JAVA_HOME` = `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`)
- **Android SDK** en `C:\Users\fjros\Android\Sdk` (fuera de OneDrive a propósito;
  `android/local.properties` apunta ahí). Paquetes: `platform-tools`,
  `platforms;android-36`, `build-tools;36.0.0`.

> El SDK NO está en el repo ni en OneDrive. Si clonas en otra PC, instala el
> Android SDK y crea `android/local.properties` con `sdk.dir=<ruta del SDK>`.

---

## Reconstruir el APK de Android (tras cambios en la web)

```bash
# 1. Compilar la web
npm run build
# 2. Copiar la web + plugins al proyecto Android
npx cap sync android
# 3. Compilar el APK
cd android
./gradlew assembleDebug
```

APK resultante (debug, instalable directo):

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Instalarlo en un teléfono Android

1. Pasa el `app-debug.apk` al teléfono (WhatsApp, Drive, cable USB).
2. Ábrelo; Android pedirá permitir **"instalar apps de orígenes desconocidos"**
   para esa app → aceptar.
3. Listo: ícono GRAPCO en el cajón de apps, a pantalla completa.

> **Debug vs Release:** `assembleDebug` sirve para repartir internamente a la
> cuadrilla (gratis, sin firma de Play). Para Google Play hace falta un
> `assembleRelease` firmado con un keystore propio (cuenta Play = $25 único).

---

## Compilar para iPhone (requiere una Mac)

iOS **solo se compila/firma en macOS** con Xcode. No se puede desde Windows.
En una Mac con el repo clonado:

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios   # abre el proyecto en Xcode
```

En Xcode: seleccionar el equipo (Apple Developer, **$99/año**), conectar el
iPhone y darle a *Run* (o *Archive* para distribuir).

- Capacitor 8 usa **Swift Package Manager** (no CocoaPods): el proyecto
  `ios/App` ya está listo, sin pasos extra de `pod install`.

---

## Notas técnicas

- **Service Worker:** no se registra en nativo (la app ya empaqueta todo);
  guard en [`src/main.jsx`](../src/main.jsx).
- **Barra de estado:** se oculta con `@capacitor/status-bar` (`StatusBar.hide()`)
  + `overlaysWebView: true`. Si en algún flujo con teclado vuelve a aparecer un
  instante, es comportamiento de Android; se puede cambiar a modo "overlay
  transparente" (barra visible pero con el navy detrás) editando `src/nativo.js`.
- **Costo:** el APK de Android es **$0**. iOS requiere el programa de Apple
  ($99/año + una Mac).
