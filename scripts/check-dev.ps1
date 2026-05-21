# Verifica se site e API estão no ar
$web = "http://127.0.0.1:5173"
$api = "http://127.0.0.1:3000/health"

Write-Host "`nMealfy — checagem de servidores`n" -ForegroundColor Cyan

try {
  $r = Invoke-WebRequest -Uri $web -UseBasicParsing -TimeoutSec 4
  Write-Host "[OK] Site: $web (status $($r.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "[FALTA] Site: rode 'npm run dev' na pasta Mealfy" -ForegroundColor Red
}

try {
  $r = Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 4
  Write-Host "[OK] API: $api (status $($r.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "[FALTA] API: rode 'npm run dev:api' na pasta Mealfy" -ForegroundColor Red
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
if ($ip) {
  Write-Host "`nNo celular use IP (nao localhost):" -ForegroundColor Yellow
  Write-Host "  Site: http://${ip}:5173"
  Write-Host "  API:  http://${ip}:3000"
}
Write-Host ""
