# Encerra a API Mealfy na porta 3001 (evita erro "porta em uso" ao rodar dev:api de novo)
$ErrorActionPreference = "SilentlyContinue"

$killed = @()

Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    $pid = $_.OwningProcess
    if ($pid -and $pid -notin $killed) {
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "Encerrando $($proc.ProcessName) (PID $pid) na porta 3001..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
        $killed += $pid
      }
    }
  }

Start-Sleep -Seconds 1

$still = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "[AVISO] Porta 3001 ainda em uso." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Porta 3001 livre. Rode: npm run dev:api" -ForegroundColor Green
