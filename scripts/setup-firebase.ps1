# Configura Firebase no Mealfy (env + checklist do Console)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Mealfy — Setup Firebase ===" -ForegroundColor Cyan

# 1) .env na raiz
$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"
if (Test-Path $envExample) {
  if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] .env criado a partir de .env.example" -ForegroundColor Green
  } else {
    $content = Get-Content $envFile -Raw
    if ($content -notmatch "VITE_FIREBASE_API_KEY=") {
      Add-Content $envFile (Get-Content $envExample | Select-Object -Skip 3)
      Write-Host "[OK] Variaveis Firebase adicionadas ao .env" -ForegroundColor Green
    } else {
      Write-Host "[OK] .env ja contem Firebase" -ForegroundColor Green
    }
  }
}

# 2) mobile .env
$mobileEnv = Join-Path $root "mobile\.env"
$mobileExample = Join-Path $root "mobile\.env.example"
if (-not (Test-Path $mobileEnv) -and (Test-Path $mobileExample)) {
  Copy-Item $mobileExample $mobileEnv
  Write-Host "[OK] mobile/.env criado" -ForegroundColor Green
}

# 3) Service account (opcional)
$saExample = Join-Path $root "server\src\Mealfy.Api\firebase-service-account.json.example"
$saReal = Join-Path $root "server\src\Mealfy.Api\firebase-service-account.json"
if (-not (Test-Path $saReal)) {
  Write-Host '[!] Coloque firebase-service-account.json em server\src\Mealfy.Api\' -ForegroundColor Yellow
  Write-Host '    Opcional: WebApiKey no appsettings ja valida tokens em dev' -ForegroundColor Yellow
}

# 4) Firebase CLI — regras Firestore
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebaseCmd) {
  Write-Host ""
  Write-Host "Firebase CLI encontrado. Para publicar regras:" -ForegroundColor Cyan
  Write-Host "  firebase login" -ForegroundColor White
  Write-Host "  firebase use christian-c5714" -ForegroundColor White
  Write-Host "  firebase deploy --only firestore:rules" -ForegroundColor White
} else {
  Write-Host ""
  Write-Host "Instale Firebase CLI (opcional):" -ForegroundColor Cyan
  Write-Host "  npm install -g firebase-tools" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Console Firebase (faca uma vez na sua conta) ===" -ForegroundColor Cyan
Write-Host "1. https://console.firebase.google.com/project/christiano-c5714/authentication/providers"
Write-Host "   -> Ativar E-mail/senha, Google e Autenticacao anonima (cadastro beneficiario)"
Write-Host "2. https://console.firebase.google.com/project/christiano-c5714/firestore"
Write-Host "   -> Criar banco e publicar firestore.rules (colecoes: users, entities, families, indications, config)"
Write-Host "3. Authentication -> Settings -> Authorized domains -> localhost"
Write-Host ""
Write-Host "Depois rode: npm run dev:api  e  npm run dev" -ForegroundColor Green
