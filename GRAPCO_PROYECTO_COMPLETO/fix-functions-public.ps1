# fix-functions-public.ps1 - Hace las 9 Cloud Functions accesibles publicamente
# La autenticacion la maneja el codigo adentro (Firebase ID token).
# Sin este fix: el endpoint devuelve 403 antes de ejecutar la funcion.

$ErrorActionPreference = 'Continue'
# gcloud escribe warnings/info a stderr, lo cual PowerShell trataria como error.
# Por eso usamos 'Continue' y validamos exit codes manualmente.
$global:ProgressPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " GRAPCO - Hacer Cloud Functions publicas" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "control-productividad-franklin"
$REGION = "us-central1"
$FUNCIONES = @(
  "apsObtenerUrlSubida",
  "apsCompletarSubida",
  "apsConsultarManifest",
  "apsTokenViewer",
  "apsEliminarModelo",
  "adminCrearUsuario",
  "adminCambiarRol",
  "adminDesactivarUsuario",
  "adminEliminarUsuario"
)

# 1. Verificar gcloud
$gcloudExe = $null
try {
  $gcloudExe = (Get-Command gcloud -ErrorAction SilentlyContinue).Source
  if ($gcloudExe) {
    $ver = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "gcloud encontrado: $ver" -ForegroundColor Green
  }
} catch { $gcloudExe = $null }

if (-not $gcloudExe) {
  Write-Host ""
  Write-Host "gcloud NO esta instalado. Necesitamos instalarlo (1 vez)." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Opcion A (recomendado): instala con winget" -ForegroundColor Cyan
  Write-Host "  winget install --id Google.CloudSDK" -ForegroundColor White
  Write-Host ""
  Write-Host "Opcion B: descarga manual" -ForegroundColor Cyan
  Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor White
  Write-Host ""
  $instalar = Read-Host -Prompt "Instalar ahora con winget? (s/N)"
  if ($instalar -eq 's' -or $instalar -eq 'S') {
    winget install --id Google.CloudSDK --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Error al instalar. Instalalo manualmente y vuelve a correr este script." -ForegroundColor Red
      exit 1
    }
    Write-Host ""
    Write-Host "INSTALADO. CIERRA ESTA TERMINAL y abre una NUEVA, luego corre el script otra vez." -ForegroundColor Green
    Write-Host "(Es necesario para que PATH refresque y gcloud sea encontrado)." -ForegroundColor Yellow
    exit 0
  } else {
    Write-Host "Instala gcloud manualmente y vuelve a correr este script." -ForegroundColor Yellow
    exit 0
  }
}

# 2. Verificar autenticacion gcloud
Write-Host ""
Write-Host "Verificando autenticacion gcloud..." -ForegroundColor Cyan

# Usamos cmd /c para evitar que stderr de gcloud rompa PowerShell.
# Pedimos solo la cuenta ACTIVA en formato value (sin headers).
$cuentaActiva = (cmd /c "gcloud auth list --filter=status:ACTIVE --format=value(account) 2>nul" | Out-String).Trim()

if ([string]::IsNullOrWhiteSpace($cuentaActiva)) {
  Write-Host "No hay cuenta activa en gcloud." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Vamos a hacer login en modo MANUAL (copy-paste, sin localhost)." -ForegroundColor Cyan
  Write-Host "Esto evita el error 400 que sale cuando localhost:8085 esta bloqueado." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
  Write-Host "  1. gcloud te mostrara una URL larga. COPIALA y pegala en tu browser."
  Write-Host "  2. Eliges fjrosash@gmail.com y autorizas."
  Write-Host "  3. Google te dara un CODIGO. Lo pegas de vuelta en esta terminal."
  Write-Host ""
  cmd /c "gcloud auth login --no-launch-browser"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Login fallo (exit $LASTEXITCODE)." -ForegroundColor Red
    exit 1
  }
  $cuentaActiva = (cmd /c "gcloud auth list --filter=status:ACTIVE --format=value(account) 2>nul" | Out-String).Trim()
}

if ([string]::IsNullOrWhiteSpace($cuentaActiva)) {
  Write-Host "No se pudo determinar la cuenta activa. Aborto." -ForegroundColor Red
  exit 1
}
Write-Host "Cuenta gcloud activa: $cuentaActiva" -ForegroundColor Green

# 3. Setear el proyecto
Write-Host "Configurando proyecto activo: $PROJECT_ID" -ForegroundColor Cyan
cmd /c "gcloud config set project $PROJECT_ID 2>nul" | Out-Null

# 4. Hacer publicas las 9 funciones
Write-Host ""
Write-Host "Haciendo publicas las 9 funciones (allUsers como Cloud Functions Invoker):" -ForegroundColor Cyan
Write-Host ""

$exitos = 0
$fallos = 0
foreach ($fn in $FUNCIONES) {
  Write-Host "  $fn ..." -NoNewline
  # En gcloud SDK 567+, el flag --gen2 es booleano (presente/ausente).
  # No lo pasamos: gcloud detecta automaticamente la generacion de la funcion.
  $cmdLine = "gcloud functions add-iam-policy-binding $fn --region=$REGION --member=allUsers --role=roles/cloudfunctions.invoker 1>nul 2>&1 && echo OK || echo FAIL"
  $resultado = cmd /c $cmdLine 2>&1
  if ($resultado -match 'OK') {
    Write-Host " OK" -ForegroundColor Green
    $exitos++
  } else {
    Write-Host " FALLO" -ForegroundColor Red
    # Reintento con output visible para diagnostico
    $verbose = cmd /c "gcloud functions add-iam-policy-binding $fn --region=$REGION --member=allUsers --role=roles/cloudfunctions.invoker 2>&1"
    Write-Host "    $verbose" -ForegroundColor DarkRed
    $fallos++
  }
}

Write-Host ""
Write-Host "Resultado: $exitos exitos, $fallos fallos" -ForegroundColor $(if ($fallos -eq 0) { 'Green' } else { 'Yellow' })

# 5. Verificar que apsObtenerUrlSubida ya responde
Write-Host ""
Write-Host "Probando endpoint apsObtenerUrlSubida..." -ForegroundColor Cyan
Start-Sleep -Seconds 5  # esperar propagacion IAM
try {
  $resp = Invoke-WebRequest `
    -Uri "https://$REGION-$PROJECT_ID.cloudfunctions.net/apsObtenerUrlSubida" `
    -Method POST `
    -Body '{"nombreArchivo":"test.rvt"}' `
    -ContentType "application/json" `
    -ErrorAction SilentlyContinue `
    -SkipHttpErrorCheck
  $code = $resp.StatusCode
  if ($code -eq 401 -or $code -eq 400) {
    Write-Host "Endpoint responde $code (correcto: ya no es 403, ahora pide auth)" -ForegroundColor Green
  } elseif ($code -eq 403) {
    Write-Host "Sigue 403. La propagacion IAM puede tardar 1-2 min mas. Espera y prueba en la app." -ForegroundColor Yellow
  } else {
    Write-Host "Codigo $code (puede ser OK)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "(no se pudo hacer test, prueba directo en la app)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " LISTO. Funciones publicas." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora prueba subir tu modelo .rvt en https://control-productividad-franklin.web.app"
Write-Host ""
