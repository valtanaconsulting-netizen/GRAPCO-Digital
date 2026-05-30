# Setup · Sincronización Protocolos → Google Drive + Sheets

Guía paso a paso para conectar la Cloud Function `protocoloPdfFirmadoSync` con tu Google Drive y tu Sheet de control. Una sola vez.

**Proyecto Firebase:** `grapco-demo-2026`
**Tiempo total:** ~15 min

---

## 1. Crear la Service Account

La Service Account es un "usuario robot" que la Cloud Function usará para escribir en Drive y Sheets en tu nombre.

1. Abre **Google Cloud Console** en tu proyecto:
   👉 https://console.cloud.google.com/iam-admin/serviceaccounts?project=grapco-demo-2026

2. Click **`+ CREATE SERVICE ACCOUNT`**.

3. Llena:
   - **Service account name:** `protocolos-bot`
   - **Service account ID:** se autogenera → algo como `protocolos-bot@grapco-demo-2026.iam.gserviceaccount.com`
   - **Description:** `Bot para archivado de protocolos en Drive y Sheets`

4. Click **`CREATE AND CONTINUE`** → **`DONE`** (no le des ningún rol IAM, no hace falta).

5. Click sobre la SA recién creada → pestaña **`KEYS`** → **`ADD KEY`** → **`Create new key`** → **JSON** → **`CREATE`**.

   Se descarga un archivo `grapco-demo-2026-XXXXX.json`. **Guárdalo bien**, no se puede volver a descargar.

6. Copia el **email** de la SA (lo necesitarás 2 veces abajo). Ej:
   ```
   protocolos-bot@grapco-demo-2026.iam.gserviceaccount.com
   ```

---

## 2. Habilitar Drive API + Sheets API

Las APIs vienen apagadas por defecto. Las prendes una vez:

1. **Drive API:**
   👉 https://console.cloud.google.com/apis/library/drive.googleapis.com?project=grapco-demo-2026
   → Click **`ENABLE`**.

2. **Sheets API:**
   👉 https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=grapco-demo-2026
   → Click **`ENABLE`**.

---

## 3. Compartir la carpeta de Drive con la SA

1. Abre la carpeta raíz que ya tienes en Google Drive (la que será el "techo" de la jerarquía Tipo/Frente/Semana).

2. Click derecho → **Share** (Compartir).

3. Pega el **email de la SA** (el del paso 1.6).

4. Permiso: **Editor**.

5. **Importante:** desactiva la casilla "Notify people" (no le mandes mail a un robot 😄).

6. Click **Share**.

7. Copia el **ID de la carpeta**: está en la URL cuando la abres. Ej:
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567
                                          ↑↑↑ esto ↑↑↑
   ```

---

## 4. Compartir el Sheet de control con la SA

1. Abre el Google Sheet de control que ya manejas.

2. Botón **Share** (arriba derecha).

3. Pega el **email de la SA**.

4. Permiso: **Editor**.

5. Click **Share**.

6. Copia el **ID del Sheet** (también de la URL):
   ```
   https://docs.google.com/spreadsheets/d/1ABCDefghijKLMNOPqrstuVWXyz1234567/edit
                                          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
   ```

7. **Asegúrate de que el Sheet tenga una pestaña llamada exactamente `Protocolos`** con estas 14 columnas en A1..N1 (encabezado):

   | A | B | C | D | E | F | G | H | I | J | K | L | M | N |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | N° Registro | Tipo | Frente | Semana ISO | Elemento | Ejes | Nivel | Sector | f'c | Volumen | Fecha vaciado | Estado | URL Storage | URL Drive |

   Si tu Sheet tiene otra estructura, dime el nombre de la pestaña y el orden de columnas y lo ajusto.

---

## 5. Guardar los 3 secrets en Firebase

Abre una terminal en la raíz del proyecto y corre estos 3 comandos. Te pedirá pegar cada valor — pega y presiona Enter.

```bash
cd "c:\Users\fjros\OneDrive\Escritorio\PROYECTOS_FRANKLIN2025\PROYECTO GRAPCO 2026\GRAPCO_PROYECTO_COMPLETO"

# Secret 1: ID de la carpeta raíz de Drive
firebase functions:secrets:set DRIVE_ROOT_FOLDER_ID --project grapco-demo-2026
# Pega el ID del paso 3.7 y Enter

# Secret 2: ID del Sheet de control
firebase functions:secrets:set SHEET_CONTROL_ID --project grapco-demo-2026
# Pega el ID del paso 4.6 y Enter

# Secret 3: JSON completo de la Service Account
firebase functions:secrets:set GOOGLE_SA_KEY --project grapco-demo-2026 --data-file="C:\ruta\a\tu\grapco-demo-2026-XXXXX.json"
# (apuntando al JSON que descargaste en el paso 1.5)
```

> Si el comando `--data-file` no funciona, ábrelo en notepad, copia TODO el contenido y usa el comando sin `--data-file` — te dejará pegarlo.

---

## 6. Desplegar la Cloud Function

```bash
firebase deploy --only functions:protocoloPdfFirmadoSync --project grapco-demo-2026
```

Debería tardar ~2 min. Cuando termine, verás:
```
✔ functions[protocoloPdfFirmadoSync(us-central1)] Successful create operation.
```

---

## 7. Probar end-to-end

1. Abre GRAPCO → **Calidad → Pre-Vaciado → Nuevo**.
2. Llena un protocolo de prueba (Frente, Semana, datos básicos).
3. **Generar PDF** → descarga.
4. Imprime (o simula: vuelve y sube cualquier PDF).
5. **Arrastra el PDF firmado** a la zona de drop.
6. En 5-15 segundos:
   - ✅ Firebase Storage: aparece en `protocolos-firmados/...`
   - ✅ Google Drive: aparece en tu carpeta raíz, dentro de `Pre-Vaciado/F03/2026-W22/`
   - ✅ Google Sheet: nueva fila en la pestaña `Protocolos`
   - ✅ Plataforma: los 3 puntitos del archivo se ponen verdes 🟢🟢🟢

Si algo falla, revisa logs:
```bash
firebase functions:log --project grapco-demo-2026 --only protocoloPdfFirmadoSync
```

---

## Troubleshooting

**"Permission denied" al subir a Drive**
→ La SA no tiene acceso a la carpeta. Revisa paso 3.

**"API not enabled"**
→ Falta habilitar Drive o Sheets API. Revisa paso 2.

**"Unable to parse range: Protocolos!A:N"**
→ Falta la pestaña `Protocolos` en el Sheet. Créala o dime cómo se llama la tuya.

**Los 3 puntitos no se ponen verdes pero el archivo está en Drive**
→ Posible delay de Firestore. Refresca la página después de 30s.

**Failed después de 3 reintentos**
→ Firestore guarda `archivado.error` con el mensaje. Aparece en el editor del protocolo. Lee el mensaje y arregla la causa (suele ser permisos).
