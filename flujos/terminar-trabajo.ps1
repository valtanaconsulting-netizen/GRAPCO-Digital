# ============================================================================
# GRAPCO — Terminar sesion de trabajo (filosofia cloud-only)
# ----------------------------------------------------------------------------
# Sube los cambios pendientes a GitHub y (opcionalmente) borra la copia local
# para dejar la maquina limpia. La plataforma vive SOLO en GitHub.
#
# Uso, desde la raiz del clon:
#   .\flujos\terminar-trabajo.ps1                    # commit + push, conserva el clon
#   .\flujos\terminar-trabajo.ps1 -Mensaje "..."     # mensaje de commit explicito
#   .\flujos\terminar-trabajo.ps1 -Limpiar           # ademas borra la copia local
#
# En PowerShell 5.1 los ejecutables nativos (git) NO lanzan excepcion al
# fallar: cada paso critico verifica $LASTEXITCODE explicitamente.
# ============================================================================

param(
    [string]$Mensaje = '',
    [switch]$Limpiar
)

# El repo se deriva de la ubicacion de ESTE script (flujos/..), no del CWD:
# ejecutado desde cualquier otra carpeta o repo, sigue operando sobre GRAPCO.
$Repo = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $Repo '.git'))) {
    Write-Error "No encuentro el repo en $Repo."
    exit 1
}
$remoto = git -C $Repo remote get-url origin
if ($LASTEXITCODE -ne 0 -or $remoto -notmatch 'GRAPCO-Digital') {
    Write-Error "El remoto de $Repo no es GRAPCO-Digital (es: $remoto). No hago nada."
    exit 1
}

# Guard 1: nada de serviceAccount en el working tree
$estado = git -C $Repo status --porcelain
if ($estado -match 'serviceAccount') {
    Write-Error 'Hay un serviceAccount visible para git. Revisa el .gitignore antes de subir.'
    exit 1
}

if ($estado) {
    Write-Host 'Cambios pendientes:' -ForegroundColor Cyan
    git -C $Repo status --short
    if (-not $Mensaje) {
        $fecha = Get-Date -Format 'yyyy-MM-dd'
        $Mensaje = "Sesion de trabajo $fecha"
    }
    git -C $Repo add -A
    git -C $Repo commit -m $Mensaje
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git commit fallo (codigo $LASTEXITCODE). NADA fue subido; revisa el mensaje de git (user.name/user.email configurados?)."
        exit 1
    }
} else {
    Write-Host 'No hay cambios locales por commitear.' -ForegroundColor Green
}

# Guard 2: nada de serviceAccount en los commits que estan por viajar
$porSubir = git -C $Repo diff --name-only origin/main..HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Error 'No pude comparar contra origin/main; no subo nada por seguridad.'
    exit 1
}
if ($porSubir -match 'serviceAccount') {
    Write-Error 'Hay un serviceAccount en commits sin subir. Eliminalo del historial antes de hacer push (el repo es PUBLICO).'
    exit 1
}

git -C $Repo push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push fallo (codigo $LASTEXITCODE). Los cambios NO estan en GitHub; NO borres la copia local."
    exit 1
}
Write-Host 'Cambios subidos a GitHub.' -ForegroundColor Green

if ($Limpiar) {
    # Solo borrar si NO queda nada local: working tree limpio, ninguna rama
    # local con commits fuera del remoto, y ningun stash guardado.
    $pendientes = git -C $Repo status --porcelain
    $sinPush = git -C $Repo log --branches --not --remotes --oneline
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'No pude verificar commits sin push; no borro la copia local.'
        exit 1
    }
    $stashes = git -C $Repo stash list
    if ($pendientes -or $sinPush -or $stashes) {
        Write-Error 'Aun hay trabajo local (cambios, commits en otras ramas o stashes); no borro la copia local.'
        exit 1
    }
    Set-Location (Split-Path $Repo -Parent)
    Remove-Item -Recurse -Force $Repo
    Write-Host "Copia local borrada ($Repo). Escritorio libre." -ForegroundColor Green
}
