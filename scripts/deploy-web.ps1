# Publica o site Vite no Firebase Hosting (HTTPS, acessivel de qualquer lugar)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy — Deploy do site (Firebase Hosting) ===" -ForegroundColor Cyan

$vars = & (Join-Path $PSScriptRoot "load-production-env.ps1")
if (-not $vars) { exit 1 }

# Vite le .env.production automaticamente com --mode production
Write-Host ""
Write-Host "Gerando build de producao..." -ForegroundColor Cyan
npm run build -- --mode production
if ($LASTEXITCODE -ne 0) { exit 1 }

$firebase = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebase) {
  Write-Host "[ERRO] Firebase CLI nao instalada. Rode: npm install -g firebase-tools" -ForegroundColor Red
  Write-Host "  Depois: firebase login" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Publicando no Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "[OK] Site publicado em: $($vars['EXPO_PUBLIC_WEB_APP_URL'])" -ForegroundColor Green
