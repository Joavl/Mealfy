# Prepara o projeto para gerar APK (local ou producao/internet)
param(
  [ValidateSet('local', 'prod', 'auto')]
  [string]$Mode = 'auto',
  [switch]$DeployWeb,
  [switch]$BuildNow
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Mealfy - Preparar APK Android' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

function Test-ProductionEnvReady {
  $envFile = Join-Path $root '.env.production'
  if (-not (Test-Path $envFile)) { return $false }
  $raw = Get-Content $envFile -Raw
  if ($raw -match 'SEU-SERVICO|192\.168\.|localhost') { return $false }
  if ($raw -notmatch 'EXPO_PUBLIC_WEB_APP_URL=https://') { return $false }
  if ($raw -notmatch 'EXPO_PUBLIC_API_URL=https://') { return $false }
  return $true
}

Write-Host '[1/5] Build do site (producao)...' -ForegroundColor Yellow
npm run build -- --mode production
if ($LASTEXITCODE -ne 0) {
  Write-Host '[ERRO] Build do site falhou.' -ForegroundColor Red
  exit 1
}
Write-Host '[OK] Pasta dist/ pronta' -ForegroundColor Green

Write-Host ''
Write-Host '[2/5] Verificando Expo (EAS)...' -ForegroundColor Yellow
$eas = Get-Command eas -ErrorAction SilentlyContinue
if (-not $eas) {
  Write-Host '[ERRO] Instale: npm install -g eas-cli' -ForegroundColor Red
  exit 1
}
$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host '[AVISO] Faca login: eas login' -ForegroundColor Yellow
} else {
  Write-Host "[OK] Expo: $whoami" -ForegroundColor Green
}

Set-Location (Join-Path $root 'mobile')
if (-not (Select-String -Path 'app.config.js' -Pattern 'projectId' -Quiet)) {
  Write-Host '[AVISO] Primeira vez: eas init na pasta mobile' -ForegroundColor Yellow
}
Set-Location $root

$prodReady = Test-ProductionEnvReady
if ($Mode -eq 'auto') {
  $Mode = if ($prodReady) { 'prod' } else { 'local' }
}

Write-Host ''
Write-Host "[3/5] Modo selecionado: $Mode" -ForegroundColor Yellow

if ($Mode -eq 'prod') {
  if (-not $prodReady) {
    Write-Host '[ERRO] .env.production incompleto (API com SEU-SERVICO).' -ForegroundColor Red
    Write-Host '  Edite .env.production ou use: npm run prepare:apk:local' -ForegroundColor Yellow
    exit 1
  }

  if ($DeployWeb) {
    Write-Host ''
    Write-Host '[4/5] Publicando site no Firebase...' -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'deploy-web.ps1')
    if ($LASTEXITCODE -ne 0) { exit 1 }
  } else {
    Write-Host ''
    Write-Host '[4/5] Publique o site: npm run deploy:web' -ForegroundColor Yellow
  }

  $vars = & (Join-Path $PSScriptRoot 'load-production-env.ps1')
  if (-not $vars) { exit 1 }
  & (Join-Path $PSScriptRoot 'set-eas-env.ps1') -Profile production `
    -WebUrl $vars['EXPO_PUBLIC_WEB_APP_URL'] `
    -ApiUrl $vars['EXPO_PUBLIC_API_URL'] `
    -EasPath (Join-Path $root 'mobile\eas.json')
  Write-Host '[OK] eas.json production atualizado' -ForegroundColor Green
  $buildCmd = 'npm run build:apk:prod'
} else {
  Write-Host ''
  Write-Host '[4/5] Sincronizando IP da rede (APK local)...' -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot 'sync-lan-ip.ps1')
  if ($LASTEXITCODE -ne 0) { exit 1 }

  $mobileEnv = Join-Path $root 'mobile\.env'
  $webUrl = 'http://192.168.0.16:5173'
  $apiUrl = 'http://192.168.0.16:3000'
  if (Test-Path $mobileEnv) {
    foreach ($line in Get-Content $mobileEnv) {
      if ($line -match '^EXPO_PUBLIC_WEB_APP_URL=(.+)$') { $webUrl = $matches[1].Trim() }
      if ($line -match '^EXPO_PUBLIC_API_URL=(.+)$') { $apiUrl = $matches[1].Trim() }
    }
  }
  & (Join-Path $PSScriptRoot 'set-eas-env.ps1') -Profile preview -WebUrl $webUrl -ApiUrl $apiUrl `
    -EasPath (Join-Path $root 'mobile\eas.json')
  Write-Host "[OK] eas.json preview -> $webUrl" -ForegroundColor Green
  $buildCmd = 'npm run build:apk'
}

Write-Host ''
Write-Host '[5/5] Preparacao concluida' -ForegroundColor Green
Write-Host ''
Write-Host 'Melhorias no APK (WebView do site):' -ForegroundColor Cyan
Write-Host '  Cadastro doador, entidade, beneficiario' -ForegroundColor White
Write-Host '  Login com senha (demo: mealfy123)' -ForegroundColor White
Write-Host '  Carrossel, mapa, admin, gift iFood' -ForegroundColor White
Write-Host ''

if ($Mode -eq 'local') {
  Write-Host 'ANTES de abrir o APK:' -ForegroundColor Yellow
  Write-Host '  Terminal 1: npm run dev:api' -ForegroundColor White
  Write-Host '  Terminal 2: npm run dev' -ForegroundColor White
  Write-Host '  Mesma Wi-Fi no PC e celular' -ForegroundColor White
  Write-Host ''
}

Write-Host 'Para GERAR e BAIXAR o APK:' -ForegroundColor Green
Write-Host "  $buildCmd" -ForegroundColor White
Write-Host ''
Write-Host 'Link de download no terminal (10-20 min). Guia: COMO-BAIXAR-APK.md' -ForegroundColor DarkGray
Write-Host ''

if ($BuildNow) {
  Write-Host 'Iniciando build EAS...' -ForegroundColor Cyan
  Invoke-Expression $buildCmd
}
