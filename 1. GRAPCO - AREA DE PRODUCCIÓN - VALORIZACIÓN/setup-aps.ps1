# setup-aps.ps1 - Configuracion segura de credenciales Autodesk APS para GRAPCO
# Usa el formato moderno: functions/.env (params package).
# Las credenciales NO se postean a chat ni a un repo (.env queda solo local).

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " GRAPCO - Configuracion APS (Autodesk Platform Services)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que estamos en el directorio del proyecto
if (-not (Test-Path "firebase.json")) {
  Write-Host "ERROR: ejecuta este script desde la raíz de la plataforma (1. GRAPCO - AREA DE PRODUCCIÓN - VALORIZACIÓN)" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path "functions")) {
  Write-Host "ERROR: no existe la carpeta functions/" -ForegroundColor Red
  exit 1
}

# 2. Verificar firebase CLI
try {
  $fbVer = firebase --version 2>$null
  Write-Host "Firebase CLI version: $fbVer" -ForegroundColor Green
} catch {
  Write-Host "ERROR: firebase CLI no esta instalado. npm install -g firebase-tools" -ForegroundColor Red
  exit 1
}

# 3. Pedir credenciales al usuario
Write-Host ""
Write-Host "--- DATOS DE TU APP AUTODESK APS ---" -ForegroundColor Yellow
Write-Host "Si no tienes la App APS aun: https://aps.autodesk.com -> My Apps -> Create App" -ForegroundColor DarkGray
Write-Host "Tipo: Server-to-Server. APIs: Data Mgmt + Model Derivative + OSS." -ForegroundColor DarkGray
Write-Host ""

$clientId = Read-Host -Prompt "Client ID"
if ([string]::IsNullOrWhiteSpace($clientId)) {
  Write-Host "Client ID vacio, abortando." -ForegroundColor Red
  exit 1
}
$clientId = $clientId.Trim()

# Client secret como SecureString (no se ve al teclear)
$secretSecure = Read-Host -Prompt "Client Secret (no se mostrara al teclear)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
$clientSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
if ([string]::IsNullOrWhiteSpace($clientSecret)) {
  Write-Host "Client Secret vacio, abortando." -ForegroundColor Red
  exit 1
}
$clientSecret = $clientSecret.Trim()

$bucketDefault = "grapco-models-2026-fjros"
$bucketKey = Read-Host -Prompt "Bucket key APS (Enter para usar '$bucketDefault')"
if ([string]::IsNullOrWhiteSpace($bucketKey)) {
  $bucketKey = $bucketDefault
}
$bucketKey = $bucketKey.ToLower().Trim()
# Validar bucket (lowercase, sin espacios)
if ($bucketKey -notmatch '^[a-z0-9._-]{3,128}$') {
  Write-Host "Bucket key invalido. Usa solo a-z 0-9 . _ - (3-128 chars)." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "--- RESUMEN ---" -ForegroundColor Yellow
Write-Host "Client ID:     $clientId"
Write-Host "Client Secret: ******** (oculto, $($clientSecret.Length) chars)"
Write-Host "Bucket Key:    $bucketKey"
Write-Host ""
$confirm = Read-Host -Prompt "Continuar y desplegar? (s/N)"
if ($confirm -ne 's' -and $confirm -ne 'S') {
  Write-Host "Cancelado." -ForegroundColor Yellow
  $clientSecret = $null
  exit 0
}

# 4. Escribir functions/.env (Firebase v5+ lo lee automaticamente al deploy)
Write-Host ""
Write-Host "Escribiendo functions/.env (solo local, no se sube al hosting)..." -ForegroundColor Cyan
$envPath = "functions/.env"
$envContent = @"
# Generado por setup-aps.ps1 - NO commitear este archivo
# Firebase Functions v5+ carga estas variables como process.env automaticamente al deploy
APS_CLIENT_ID=$clientId
APS_CLIENT_SECRET=$clientSecret
APS_BUCKET_KEY=$bucketKey
"@
$envContent | Out-File -FilePath $envPath -Encoding ascii -Force

# 5. Limpiar la variable en memoria (best-effort)
$clientSecret = $null
$envContent = $null
[System.GC]::Collect()

# 6. Asegurar que functions/.env esta en .gitignore
$gitignorePath = "functions/.gitignore"
$ignoreLine = ".env"
if (Test-Path $gitignorePath) {
  $cur = Get-Content $gitignorePath -Raw
  if ($cur -notmatch '(?m)^\.env\s*$') {
    Add-Content $gitignorePath "`n.env"
    Write-Host "Agregado .env a $gitignorePath" -ForegroundColor DarkGray
  }
} else {
  Set-Content $gitignorePath "$ignoreLine`nnode_modules/`n*.log`n"
  Write-Host "Creado $gitignorePath" -ForegroundColor DarkGray
}

# 7. Desplegar functions
Write-Host ""
Write-Host "Desplegando funciones (esto toma 1-3 min)..." -ForegroundColor Cyan
firebase deploy --only functions
$deployExit = $LASTEXITCODE
if ($deployExit -ne 0) {
  Write-Host "ERROR al desplegar (exit $deployExit). Revisa el log arriba." -ForegroundColor Red
  exit 1
}

# 8. Verificar que el endpoint responde
Write-Host ""
Write-Host "Verificando endpoint apsObtenerUrlSubida..." -ForegroundColor Cyan
try {
  $url = "https://us-central1-control-productividad-franklin.cloudfunctions.net/apsObtenerUrlSubida"
  # OPTIONS preflight (no autenticado, debe responder 204)
  $resp = Invoke-WebRequest -Uri $url -Method OPTIONS -TimeoutSec 10 -ErrorAction SilentlyContinue
  if ($resp.StatusCode -eq 204 -or $resp.StatusCode -eq 200) {
    Write-Host "Endpoint responde correctamente (CORS preflight OK)." -ForegroundColor Green
  } else {
    Write-Host "Endpoint respondio $($resp.StatusCode)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "(No se pudo hacer preflight, puede ser normal. Continua con la prueba.)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " LISTO. Modelo BIM configurado." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prueba ahora:"
Write-Host "  1. Ve a https://control-productividad-franklin.web.app"
Write-Host "  2. Login -> Modelo BIM (sidebar)"
Write-Host "  3. Pestania 'Subir Modelo a APS'"
Write-Host "  4. Arrastra un .rvt o haz click para elegir archivo"
Write-Host ""
Write-Host "Si vuelve a fallar 'Failed to fetch', abre DevTools (F12) -> Network"
Write-Host "y mira la respuesta de apsObtenerUrlSubida. Pasame el error y lo arreglamos."
Write-Host ""
Write-Host "Tu archivo functions/.env contiene las credenciales. Esta en .gitignore"
Write-Host "asi que no se sube si haces git. Si quieres rotar credenciales, vuelve a"
Write-Host "correr este script."
Write-Host ""
