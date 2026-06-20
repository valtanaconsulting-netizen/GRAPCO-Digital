# Cataloga TODO el contenido de "05. Gestion Costos": dumpea cada Excel (en vivo, sin
# problema de acento) a un catalogo de texto por categoria. Los no-Excel se listan por nombre.
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\fjros\OneDrive\Escritorio\PROYECTOS_FRANKLIN2025\PROYECTO GRAPCO 2026'
$gc = (Get-ChildItem -LiteralPath $root -Directory | Where-Object { $_.Name -like '05.*Costos' } | Select-Object -First 1).FullName
$dump = Join-Path $root 'GRAPCO_PROYECTO_COMPLETO\scripts\_xlsx_dump.cjs'
$outDir = Join-Path $root 'GRAPCO_PROYECTO_COMPLETO\scripts\_costos_catalog'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$cats = Get-ChildItem -LiteralPath $gc -Directory | Sort-Object Name
$total = 0
foreach ($cat in $cats) {
  $safe = ($cat.Name -replace '[^0-9A-Za-z]', '_')
  $out = Join-Path $outDir ($safe + '.txt')
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("================ CATEGORIA: " + $cat.Name + " ================")
  $files = Get-ChildItem -LiteralPath $cat.FullName -Recurse -File | Sort-Object FullName
  foreach ($f in $files) {
    $total++
    $rel = $f.FullName.Substring($gc.Length)
    $kb = [math]::Round($f.Length / 1KB)
    $ext = $f.Extension.ToLower()
    $lines.Add("")
    $lines.Add("########## ARCHIVO: " + $rel + "  (" + $kb + " KB) ##########")
    if ($ext -eq '.xlsx' -or $ext -eq '.xls' -or $ext -eq '.xlsm') {
      try {
        $txt = & node $dump $f.FullName 10 2>&1 | Out-String
        $lines.Add($txt.Trim())
      } catch {
        $lines.Add("[ERROR dump: " + $_.Exception.Message + "]")
      }
    } else {
      $lines.Add("[" + $ext + " - no-Excel: catalogar por nombre/proposito]")
    }
  }
  Set-Content -Path $out -Value $lines -Encoding utf8
  Write-Output ("OK [" + $files.Count + " files] -> " + $safe + ".txt")
}
Write-Output ("CATALOGO COMPLETO. Total archivos: " + $total)
