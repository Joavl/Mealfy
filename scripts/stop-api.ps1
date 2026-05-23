# Encerra a API Mealfy na porta 3000 (evita erro "arquivo bloqueado" ao rodar dev:api de novo)
$ErrorActionPreference = "SilentlyContinue"

$killed = @()

Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    $pid = $_.OwningProcess
    if ($pid -and $pid -notin $killed) {
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "Encerrando $($proc.ProcessName) (PID $pid) na porta 3000..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
        $killed += $pid
      }
    }
  }

Get-Process -Name "Mealfy.Api" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "Encerrando Mealfy.Api (PID $($_.Id))..." -ForegroundColor Yellow
  Stop-Process -Id $_.Id -Force
  $killed += $_.Id
}

Start-Sleep -Seconds 1

$still = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "[AVISO] Porta 3000 ainda em uso." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Porta 3000 livre. Rode: npm run dev:api" -ForegroundColor Green
