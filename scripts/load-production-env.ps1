# Carrega .env.production e valida URLs publicas (HTTPS, sem IP local)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.production"

if (-not (Test-Path $envFile)) {
  Write-Host "[ERRO] Arquivo .env.production nao encontrado." -ForegroundColor Red
  Write-Host "  Copie:  copy .env.production.example .env.production" -ForegroundColor Yellow
  Write-Host "  Edite as URLs apos publicar site e API (veja DEPLOY-PRODUCAO.md)" -ForegroundColor Yellow
  exit 1
}

$vars = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([^#=]+)=(.*)$') {
    $vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

function Test-PublicUrl([string]$name, [string]$url) {
  if (-not $url) {
    Write-Host "[ERRO] $name ausente em .env.production" -ForegroundColor Red
    return $false
  }
  if ($url -match 'localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|SEU-SERVICO') {
    Write-Host "[ERRO] $name ainda aponta para rede local ou placeholder: $url" -ForegroundColor Red
    return $false
  }
  if ($url -notmatch '^https://') {
    Write-Host "[ERRO] $name deve usar HTTPS em producao: $url" -ForegroundColor Red
    return $false
  }
  return $true
}

$ok = $true
$ok = (Test-PublicUrl "VITE_API_URL" $vars["VITE_API_URL"]) -and $ok
$ok = (Test-PublicUrl "EXPO_PUBLIC_WEB_APP_URL" $vars["EXPO_PUBLIC_WEB_APP_URL"]) -and $ok
$ok = (Test-PublicUrl "EXPO_PUBLIC_API_URL" $vars["EXPO_PUBLIC_API_URL"]) -and $ok

if (-not $ok) { exit 1 }

Write-Host "[OK] URLs de producao validadas" -ForegroundColor Green
Write-Host "  Site: $($vars['EXPO_PUBLIC_WEB_APP_URL'])" -ForegroundColor Cyan
Write-Host "  API:  $($vars['EXPO_PUBLIC_API_URL'])" -ForegroundColor Cyan

return $vars
