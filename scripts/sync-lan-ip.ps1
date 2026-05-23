# Atualiza .env e mobile/.env com o IPv4 da Wi-Fi atual
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Get-LanIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -match '^192\.168\.\d+\.\d+$' -or
      $_.IPAddress -match '^10\.\d+\.\d+\.\d+$'
    } |
    Sort-Object -Property InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
  return $ip
}

$ip = Get-LanIp
if (-not $ip) {
  Write-Host "[ERRO] Nao encontrei IPv4 da Wi-Fi. Conecte o PC na rede." -ForegroundColor Red
  exit 1
}

Write-Host "IP da rede: $ip" -ForegroundColor Cyan

function Update-EnvFile($path, $pairs) {
  $lines = @()
  if (Test-Path $path) {
    $lines = Get-Content $path
  }
  $map = @{}
  foreach ($line in $lines) {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
      $map[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  foreach ($key in $pairs.Keys) {
    $map[$key] = $pairs[$key]
  }
  $out = @()
  foreach ($key in $map.Keys | Sort-Object) {
    $out += "$key=$($map[$key])"
  }
  Set-Content -Path $path -Value ($out -join "`n") -Encoding utf8
}

$rootEnv = Join-Path $root ".env"
$mobileEnv = Join-Path $root "mobile\.env"

Update-EnvFile $rootEnv @{
  "VITE_API_URL" = "http://${ip}:3000"
  "VITE_HMR_HOST" = $ip
  "VITE_DISABLE_LOCAL_FALLBACK" = "false"
}

Update-EnvFile $mobileEnv @{
  "EXPO_PUBLIC_WEB_APP_URL" = "http://${ip}:5173"
  "EXPO_PUBLIC_API_URL" = "http://${ip}:3000"
}

Write-Host "[OK] .env atualizado" -ForegroundColor Green
Write-Host "[OK] mobile/.env atualizado" -ForegroundColor Green
Write-Host ""
Write-Host "Celular / Expo Go:" -ForegroundColor Yellow
Write-Host "  Site: http://${ip}:5173"
Write-Host "  API:  http://${ip}:3000"
Write-Host ""

exit 0
