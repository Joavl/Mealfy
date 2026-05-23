# Build APK local (requer Android SDK + Java no PC)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

& "$PSScriptRoot\sync-lan-ip.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

$mobile = Join-Path $root "mobile"
Set-Location $mobile

Write-Host "=== Build APK local ===" -ForegroundColor Cyan
Write-Host "Requer Android Studio / SDK instalado." -ForegroundColor Yellow

if (-not (Test-Path "android")) {
  Write-Host "Gerando pasta android (prebuild)..." -ForegroundColor Cyan
  npx expo prebuild --platform android --clean
}

Write-Host "Compilando release APK..." -ForegroundColor Cyan
Set-Location android
.\gradlew.bat assembleRelease

$apk = Get-ChildItem -Path "app\build\outputs\apk\release" -Filter "*.apk" -Recurse | Select-Object -First 1
if ($apk) {
  $dest = Join-Path $root "Mealfy-release.apk"
  Copy-Item $apk.FullName $dest -Force
  Write-Host ""
  Write-Host "[OK] APK: $dest" -ForegroundColor Green
} else {
  Write-Host "[ERRO] APK nao encontrado em app/build/outputs" -ForegroundColor Red
  exit 1
}
