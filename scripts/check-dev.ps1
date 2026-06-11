# Verifica site, API e se o IP do .env bate com a Wi-Fi
$root = Split-Path $PSScriptRoot -Parent
$web = "http://127.0.0.1:5173"
$api = "http://127.0.0.1:3001/api/health"

Write-Host ""
Write-Host "Mealfy - checagem de servidores" -ForegroundColor Cyan
Write-Host ""

$siteOk = $false
$apiOk = $false

try {
  $r = Invoke-WebRequest -Uri $web -UseBasicParsing -TimeoutSec 4
  Write-Host "[OK] Site: $web (status $($r.StatusCode))" -ForegroundColor Green
  $siteOk = $true
} catch {
  Write-Host "[FALTA] Site: rode 'npm run dev' na pasta Mealfy" -ForegroundColor Red
}

try {
  $r = Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 4
  Write-Host "[OK] API: $api (status $($r.StatusCode))" -ForegroundColor Green
  $apiOk = $true
} catch {
  Write-Host "[FALTA] API: rode 'npm run dev:api' na pasta Mealfy" -ForegroundColor Red
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -match '^192\.168\.' } |
  Select-Object -First 1).IPAddress

if ($ip) {
  Write-Host ""
  Write-Host "IP da Wi-Fi: $ip" -ForegroundColor Yellow
  Write-Host "  Site no celular: http://${ip}:5173"
  Write-Host "  API no celular:  http://${ip}:3001/api"

  $envPath = Join-Path $root ".env"
  if (Test-Path $envPath) {
    $envRaw = Get-Content $envPath -Raw
    if ($envRaw -notmatch [regex]::Escape($ip)) {
      Write-Host ""
      Write-Host "[AVISO] .env pode estar com IP antigo. Rode: npm run sync:lan" -ForegroundColor Yellow
    }
  } else {
    Write-Host ""
    Write-Host "[AVISO] Sem .env. Rode: npm run sync:lan" -ForegroundColor Yellow
  }

  if ($siteOk) {
    try {
      $lanWeb = "http://${ip}:5173"
      Invoke-WebRequest -Uri $lanWeb -UseBasicParsing -TimeoutSec 4 | Out-Null
      Write-Host "[OK] Site acessivel pelo IP da rede (celular deve abrir)" -ForegroundColor Green
    } catch {
      Write-Host "[AVISO] Site nao responde no IP $ip - rode 'npm run firewall' como Admin" -ForegroundColor Yellow
    }
  }
}

Write-Host ""
if (-not $siteOk -or -not $apiOk) {
  exit 1
}
exit 0
