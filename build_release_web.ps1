$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root "dist_release"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist -Force | Out-Null

# Copiar estructura base excluyendo archivos de desarrollo
Get-ChildItem -Path $root -File | Where-Object { $_.Extension -in @(".html",".json",".svg",".ico") } | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $dist $_.Name) -Force
}
if (Test-Path (Join-Path $root "css")) {
    Copy-Item (Join-Path $root "css") (Join-Path $dist "css") -Recurse -Force
}

# Compactar JS eliminando comentarios y líneas vacías (si tienes terser/javascript-obfuscator lo usa automáticamente)
$jsOut = Join-Path $dist "js"
New-Item -ItemType Directory -Path $jsOut -Force | Out-Null
$hasObf = [bool](Get-Command javascript-obfuscator -ErrorAction SilentlyContinue)

Get-ChildItem -Path (Join-Path $root "js") -Recurse -Filter "*.js" | ForEach-Object {
    $rel = $_.FullName.Substring((Join-Path $root "js").Length + 1)
    $target = Join-Path $jsOut $rel
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    if ($hasObf) {
        & javascript-obfuscator $_.FullName --output $target --compact true --string-array true | Out-Null
    } else {
        $txt = Get-Content $_.FullName -Raw
        $txt = [regex]::Replace($txt, '(?s)/\*.*?\*/', '')
        $txt = [regex]::Replace($txt, '(?m)^\s*//.*$', '')
        $txt = [regex]::Replace($txt, '(?m)^\s*\r?\n', '')
        Set-Content -Path $target -Value $txt -Encoding UTF8
    }
}
Write-Host "Build web protegido generado en: $dist" -ForegroundColor Green
