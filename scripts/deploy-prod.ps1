# Publica site + orienta API + gera APK (fluxo completo de producao)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy — Deploy producao (internet) ===" -ForegroundColor Cyan
Write-Host ""

& (Join-Path $PSScriptRoot "load-production-env.ps1") | Out-Null
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Passo 1/3 — Site (Firebase Hosting)" -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "deploy-web.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Passo 2/3 — API na nuvem" -ForegroundColor Yellow
Write-Host "  Se ainda nao publicou a API, siga DEPLOY-PRODUCAO.md (Render + Docker)." -ForegroundColor White
Write-Host "  Teste: curl https://SUA-API.onrender.com/health" -ForegroundColor White
Write-Host ""
$continue = Read-Host "API ja esta no ar e .env.production atualizado? (s/N)"
if ($continue -notmatch '^[sS]') {
  Write-Host "Atualize .env.production e rode: npm run build:apk:prod" -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Passo 3/3 — APK producao" -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "build-apk-production.ps1")
