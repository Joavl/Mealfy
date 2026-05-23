# APK para uso em qualquer cidade (URLs HTTPS publicas em .env.production)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy — APK PRODUCAO (internet) ===" -ForegroundColor Cyan

$vars = & (Join-Path $PSScriptRoot "load-production-env.ps1")
if (-not $vars -or -not $vars['EXPO_PUBLIC_WEB_APP_URL']) { exit 1 }

$webUrl = $vars['EXPO_PUBLIC_WEB_APP_URL']
$apiUrl = $vars['EXPO_PUBLIC_API_URL']

$easPath = Join-Path $root "mobile\eas.json"
& (Join-Path $PSScriptRoot "set-eas-env.ps1") -Profile production -WebUrl $webUrl -ApiUrl $apiUrl -EasPath $easPath
Write-Host "[OK] eas.json production -> $webUrl" -ForegroundColor Green

# mobile/.env para builds locais de referencia
$mobileEnv = Join-Path $root "mobile\.env"
Set-Content $mobileEnv @(
  "EXPO_PUBLIC_WEB_APP_URL=$webUrl"
  "EXPO_PUBLIC_API_URL=$apiUrl"
) -Encoding utf8

Write-Host ""
Write-Host "Dica: publique site e API antes do APK:" -ForegroundColor Yellow
Write-Host "  npm run deploy:web" -ForegroundColor White
Write-Host "  (API no Render — veja DEPLOY-PRODUCAO.md)" -ForegroundColor White
Write-Host ""

$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Faca login: eas login" -ForegroundColor Yellow
  exit 1
}
Write-Host "[OK] Expo: $whoami" -ForegroundColor Green

Set-Location (Join-Path $root "mobile")

Write-Host ""
Write-Host "Build APK producao (10-20 min)..." -ForegroundColor Cyan
Write-Host "Qualquer pessoa com o APK podera abrir:" -ForegroundColor Green
Write-Host "  $webUrl" -ForegroundColor White
Write-Host ""

eas build --platform android --profile production --non-interactive

Write-Host ""
Write-Host "Baixe o APK pelo link acima e envie para quem quiser." -ForegroundColor Green
Write-Host "Nao precisa estar na mesma Wi-Fi do seu PC." -ForegroundColor Green
