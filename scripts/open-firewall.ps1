# Libera portas do Mealfy no firewall do Windows (rode como Administrador)
$ports = @(5173, 3000, 8081, 8083, 8084)
foreach ($port in $ports) {
  $name = "Mealfy Port $port"
  Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName $name -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow | Out-Null
  Write-Host "Liberada porta $port" -ForegroundColor Green
}
Write-Host "`nPronto. Teste no celular: http://SEU_IP:5173" -ForegroundColor Cyan
