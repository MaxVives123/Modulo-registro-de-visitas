# Ejecuta el seed contra la base de Railway desde tu PC.
# La URL interna (postgres.railway.internal) NO suele funcionar desde casa: usa DATABASE_PUBLIC_URL
# del servicio Postgres en Railway (Variables) o la cadena "Connect" / TCP público.
#
# Uso en PowerShell:
#   $env:DATABASE_URL = "postgresql://..."   # pegar la URL completa
#   .\scripts\seed-railway.ps1
#
# El seed hace sync(force) y BORRA tablas antes de insertar demo. No uses en BD con datos que quieras conservar.

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
  Write-Host "ERROR: Define primero DATABASE_URL, por ejemplo:" -ForegroundColor Red
  Write-Host '  $env:DATABASE_URL = "postgresql://usuario:clave@host:puerto/railway"' -ForegroundColor Yellow
  Write-Host "En Railway: Postgres -> Variables -> DATABASE_PUBLIC_URL (o copiar desde Connect)." -ForegroundColor Yellow
  exit 1
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "backend")
if (-not (Test-Path "package.json")) {
  Write-Host "No se encuentra backend/package.json" -ForegroundColor Red
  exit 1
}

$env:NODE_ENV = "production"
Write-Host "Instalando dependencias (npm ci)..." -ForegroundColor Cyan
npm ci
Write-Host "Ejecutando seed..." -ForegroundColor Cyan
npm run seed
Write-Host "Listo. Prueba login: admin / admin123" -ForegroundColor Green
