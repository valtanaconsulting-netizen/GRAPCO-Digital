# ============================================================================
# GRAPCO — Iniciar sesion de trabajo (filosofia cloud-only)
# ----------------------------------------------------------------------------
# Clona (o actualiza) la plataforma en una ruta CORTA fuera de OneDrive y deja
# todo listo para trabajar. El escritorio queda libre: al terminar, usa
# terminar-trabajo.ps1 para subir los cambios y borrar la copia local.
#
# Primera vez (sin clon local), pegalo en PowerShell:
#   iwr -useb https://raw.githubusercontent.com/valtanaconsulting-netizen/GRAPCO-Digital/main/flujos/iniciar-trabajo.ps1 | iex
#
# Nota: sin $ErrorActionPreference global (este script corre via iex en la
# sesion del usuario y no debe alterarla); cada paso critico verifica
# $LASTEXITCODE porque en PowerShell 5.1 los ejecutables nativos no lanzan.
# ============================================================================

# Ruta corta: los nombres de carpeta del repo son largos y Windows limita a
# 260 caracteres; NO usar OneDrive ni el Escritorio.
$Base = Join-Path $env:USERPROFILE 'gw'
$Repo = Join-Path $Base 'GRAPCO-Digital'
$Url  = 'https://github.com/valtanaconsulting-netizen/GRAPCO-Digital.git'

if (-not (Test-Path $Base)) { New-Item -ItemType Directory -Force $Base | Out-Null }

if (Test-Path (Join-Path $Repo '.git')) {
    Write-Host "Actualizando clon existente en $Repo ..." -ForegroundColor Cyan
    git -C $Repo pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        throw "git pull fallo (codigo $LASTEXITCODE). El clon quedo como estaba; revisa el mensaje de git antes de trabajar."
    }
} else {
    Write-Host "Clonando la plataforma en $Repo ..." -ForegroundColor Cyan
    git -c core.longpaths=true clone $Url $Repo
    if ($LASTEXITCODE -ne 0) {
        throw "git clone fallo (codigo $LASTEXITCODE). Revisa red/credenciales y vuelve a intentar."
    }
    git -C $Repo config core.longpaths true
}

Set-Location $Repo
Write-Host ''
Write-Host 'Listo. Comandos utiles:' -ForegroundColor Green
Write-Host '  .\grapco                      # ver todos los flujos'
Write-Host '  .\grapco doctor               # revisar el entorno'
Write-Host '  .\grapco instalar todas       # dependencias (primera vez)'
Write-Host '  .\grapco dev produccion       # servidor local'
Write-Host ''
Write-Host 'Al terminar: .\flujos\terminar-trabajo.ps1' -ForegroundColor Yellow
