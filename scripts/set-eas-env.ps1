# Atualiza env de um profile no mobile/eas.json
param(
  [Parameter(Mandatory = $true)][string]$Profile,
  [Parameter(Mandatory = $true)][string]$WebUrl,
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [Parameter(Mandatory = $true)][string]$EasPath
)

$json = Get-Content $EasPath -Raw | ConvertFrom-Json
if (-not $json.build.$Profile) {
  Write-Host "[ERRO] Profile '$Profile' nao existe em eas.json" -ForegroundColor Red
  exit 1
}
if (-not $json.build.$Profile.env) {
  $json.build.$Profile | Add-Member -NotePropertyName env -NotePropertyValue ([PSCustomObject]@{})
}
$json.build.$Profile.env | Add-Member -NotePropertyName EXPO_PUBLIC_WEB_APP_URL -NotePropertyValue $WebUrl -Force
$json.build.$Profile.env | Add-Member -NotePropertyName EXPO_PUBLIC_API_URL -NotePropertyValue $ApiUrl -Force
$json | ConvertTo-Json -Depth 10 | Set-Content $EasPath -Encoding utf8
