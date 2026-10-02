#!/bin/bash
# ==============================================================================
# Script de deploy e atualização Mealfy na VPS Hostinger
# ==============================================================================
set -e

echo "🚀 [Mealfy] Iniciando processo de deploy..."

# 1. Verifica se o arquivo .env existe
if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado!"
  echo "👉 Crie-o copiando o exemplo: cp .env.production.example .env"
  echo "👉 E edite os domínios e senhas antes de continuar."
  exit 1
fi

# 2. Puxa as últimas atualizações do repositório (se for repo git)
if [ -d .git ]; then
  echo "📥 Atualizando código fonte da branch feat/mealfy-v1.0.0..."
  git fetch origin feat/mealfy-v1.0.0
  git checkout feat/mealfy-v1.0.0
  git pull origin feat/mealfy-v1.0.0
fi

# 3. Faz build e sobe os containers
echo "🐳 Construindo imagens e subindo containers..."
docker compose -f docker-compose.prod.yml pull || true
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 4. Status dos containers
echo ""
echo "✅ Deploy finalizado com sucesso!"
echo "📊 Status dos serviços:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Para acompanhar os logs do backend em tempo real:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "Para acompanhar os logs do Caddy (SSL/HTTPS):"
echo "  docker compose -f docker-compose.prod.yml logs -f caddy"
