# Sobe Expo Go com IP da rede sincronizado e exibe QR Code
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy - Expo Go ===" -ForegroundColor Cyan

& (Join-Path $PSScriptRoot "sync-lan-ip.ps1")
if (-not $?) { exit 1 }

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
$expoPort = 8083
$expUrl = "exp://${ip}:${expoPort}"

Write-Host ""
$checkScript = Join-Path $PSScriptRoot "check-dev.ps1"
& $checkScript
$checkOk = ($LASTEXITCODE -eq 0)

if (-not $checkOk) {
  Write-Host ""
  Write-Host "AVISO: site ou API nao detectados no PC." -ForegroundColor Yellow
  Write-Host "  Terminal 1: npm run dev:api" -ForegroundColor White
  Write-Host "  Terminal 2: npm run dev" -ForegroundColor White
  Write-Host ""
  $canPrompt = -not [Console]::IsInputRedirected
  if ($canPrompt) {
    $r = Read-Host "Abrir Expo mesmo assim? (s/N)"
    if ($r -notmatch '^[sS]') {
      Write-Host "Cancelado." -ForegroundColor Red
      exit 1
    }
  } else {
    Write-Host "Abrindo Expo mesmo assim (inicie dev + dev:api para o app carregar)." -ForegroundColor Yellow
  }
}

# Pagina local com QR (funciona mesmo sem QR no terminal do Cursor)
$qrHtml = Join-Path $PSScriptRoot "expo-qr.html"
$encoded = [uri]::EscapeDataString($expUrl)
$html = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mealfy - Expo Go</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; background: #0f1419; color: #e8eaed; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { color: #9aa0a6; }
    img { margin: 1.5rem 0; border-radius: 12px; background: #fff; padding: 12px; }
    code { display: block; margin-top: 1rem; word-break: break-all; font-size: 0.95rem; color: #8ab4f8; }
    .steps { text-align: left; max-width: 360px; margin: 1.5rem auto 0; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Mealfy no Expo Go</h1>
  <p>Abra o app <strong>Expo Go</strong> no celular (mesma Wi-Fi) e escaneie:</p>
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&amp;data=$encoded" width="320" height="320" alt="QR Code Expo" />
  <code>$expUrl</code>
  <ol class="steps">
    <li>Instale <strong>Expo Go</strong> (Play Store / App Store)</li>
    <li>Celular e PC na mesma rede Wi-Fi</li>
    <li>No Expo Go: <strong>Scan QR code</strong></li>
  </ol>
</body>
</html>
"@
Set-Content -Path $qrHtml -Value $html -Encoding utf8

Write-Host ""
Write-Host "Link Expo Go: $expUrl" -ForegroundColor Green
Write-Host "Abrindo pagina com QR Code no navegador..." -ForegroundColor Cyan
Start-Process $qrHtml

$mobileDir = Join-Path $root "mobile"
$metroListening = $false
try {
  $conn = Get-NetTCPConnection -LocalPort $expoPort -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($conn) { $metroListening = $true }
} catch { }

Write-Host ""
if ($metroListening) {
  Write-Host "Metro ja esta na porta $expoPort." -ForegroundColor Yellow
  Write-Host "Se precisar reiniciar, feche a janela do Expo e rode npm run expo:go de novo." -ForegroundColor DarkGray
} else {
  Write-Host "Abrindo janela do Expo (QR grande no terminal)..." -ForegroundColor Cyan
  $expoCmd = "Set-Location -LiteralPath '$mobileDir'; `$env:CI=''; npx expo start --lan --clear --port $expoPort"
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    $expoCmd
  )
}

Write-Host ""
Write-Host "Pronto. Escaneie o QR no navegador OU na janela azul do Expo." -ForegroundColor Green
Write-Host "Site: http://${ip}:5173  |  API: http://${ip}:3000" -ForegroundColor DarkGray
Write-Host ""

exit 0
