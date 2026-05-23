# Gera APK Android (EAS Build) com IP da Wi-Fi atual no WebView
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy — Build APK (rede local) ===" -ForegroundColor Cyan

# 1) Atualiza IP em .env e eas.json
& "$PSScriptRoot\sync-lan-ip.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

$mobileEnv = Join-Path $root "mobile\.env"
$webUrl = "http://192.168.0.16:5173"
$apiUrl = "http://192.168.0.16:3000"
if (Test-Path $mobileEnv) {
  foreach ($line in Get-Content $mobileEnv) {
    if ($line -match '^EXPO_PUBLIC_WEB_APP_URL=(.+)$') { $webUrl = $matches[1].Trim() }
    if ($line -match '^EXPO_PUBLIC_API_URL=(.+)$') { $apiUrl = $matches[1].Trim() }
  }
}

$easPath = Join-Path $root "mobile\eas.json"
& (Join-Path $PSScriptRoot "set-eas-env.ps1") -Profile preview -WebUrl $webUrl -ApiUrl $apiUrl -EasPath $easPath
Write-Host "[OK] eas.json preview -> $webUrl" -ForegroundColor Green

# 2) Login EAS (se necessário)
$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Faca login no Expo (conta gratuita):" -ForegroundColor Yellow
  Write-Host "  eas login" -ForegroundColor White
  Write-Host ""
  Write-Host "Depois rode de novo: npm run build:apk" -ForegroundColor Yellow
  exit 1
}
Write-Host "[OK] Expo: $whoami" -ForegroundColor Green

# 3) Vincular projeto (primeira vez)
Set-Location (Join-Path $root "mobile")
if (-not (Test-Path "app.json") -and -not (Select-String -Path "app.config.js" -Pattern "projectId" -Quiet)) {
  Write-Host "Vinculando projeto EAS (primeira vez)..." -ForegroundColor Cyan
  eas init 2>&1 | Out-Host
}

Write-Host ""
Write-Host "Iniciando build na nuvem (APK). Pode levar 10–20 min..." -ForegroundColor Cyan
Write-Host "O APK abrira o site em: $webUrl" -ForegroundColor Yellow
Write-Host "(PC e celular na mesma Wi-Fi, com npm run dev + dev:api rodando)" -ForegroundColor Yellow
Write-Host ""

eas build --platform android --profile preview --non-interactive

Write-Host ""
Write-Host "Quando terminar, baixe o APK pelo link que aparecer acima." -ForegroundColor Green
Write-Host "Este APK e so para a MESMA Wi-Fi (teste local)." -ForegroundColor Yellow
Write-Host "Para outra cidade: npm run build:apk:prod (veja DEPLOY-PRODUCAO.md)" -ForegroundColor Cyan
