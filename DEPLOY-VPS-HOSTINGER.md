# 🚀 Guia de Deploy na VPS Hostinger (Mealfy)

Este guia orienta o passo a passo completo para publicar a versão **v1.0.0** (Frontend + Backend + Banco PostgreSQL + SSL automático com Caddy) na sua VPS Hostinger.

---

## 🏗️ Arquitetura dos Serviços na VPS

A VPS executará 4 containers Docker integrados:
1. **Frontend (`mealfy-frontend`)**: React + Vite servido via Nginx otimizado.
2. **Backend (`mealfy-backend`)**: Node.js/Express + Prisma ORM. Executa migrações do banco automaticamente no boot.
3. **Banco de Dados (`mealfy-postgres`)**: PostgreSQL 16 com volume persistente (seguro e isolado da internet).
4. **Proxy Reverso & SSL (`mealfy-caddy`)**: Emite e renova certificados HTTPS (Let's Encrypt) automaticamente para os seus domínios.

---

## 📋 Pré-requisitos na Hostinger

### 1. Apontar o DNS do seu domínio
No painel da Hostinger (ou provedor onde comprou o domínio):
Crie dois apontamentos do tipo **A**:
- `mealfy.seudominio.com` (ou `@`) ➜ **IP_DA_SUA_VPS**
- `api.seudominio.com` ➜ **IP_DA_SUA_VPS**

> ⏱️ *Dica*: Aguarde alguns minutos para propagação do DNS antes de subir o Caddy.

### 2. Liberar portas no Firewall da VPS
No painel da Hostinger (VPS ➜ Segurança ➜ Firewall) ou via terminal:
- Porta `80` (HTTP)
- Porta `443` (HTTPS)
- Porta `22` (SSH)

---

## 🛠️ Passo a Passo na VPS (via terminal SSH)

### 1. Conectar na VPS
```bash
ssh root@SEU_IP_DA_VPS
```

### 2. Instalar Docker e Git (caso ainda não estejam instalados)
```bash
# Atualizar repositórios
apt update && apt upgrade -y

# Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
apt install -y git
```

### 3. Clonar o projeto e a branch `feat/mealfy-v1.0.0`
```bash
cd /opt
git clone -b feat/mealfy-v1.0.0 https://github.com/Joavl/Mealfy.git
cd Mealfy
```

### 4. Configurar as variáveis de ambiente (`.env`)
```bash
cp .env.production.example .env
nano .env
```

Edite os campos principais:
1. **Domínios**:
   ```env
   APP_DOMAIN=mealfy.seudominio.com
   API_DOMAIN=api.seudominio.com
   VITE_API_URL=https://api.seudominio.com
   APP_URL=https://mealfy.seudominio.com
   ```
2. **Senhas e Chaves**:
   - `POSTGRES_PASSWORD`: defina uma senha forte.
   - `JWT_SECRET`: gere uma chave segura (rode `openssl rand -hex 32` no terminal para gerar).
   - `STEP_UP_OTP_HMAC_KEY`: gere outra chave de 64 caracteres hex (`openssl rand -hex 32`).

Salve o arquivo (`Ctrl + O`, depois `Enter`, e `Ctrl + X` para sair).

### 5. Iniciar o Deploy
Execute o script de automação:
```bash
bash scripts/deploy-vps.sh
```

Ou execute diretamente via Docker Compose:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔍 Comandos de Verificação e Manutenção

### Checar status dos containers:
```bash
docker compose -f docker-compose.prod.yml ps
```

### Ver logs em tempo real:
- **Backend**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  ```
- **Caddy (SSL/HTTPS)**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f caddy
  ```
- **Banco de Dados**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f postgres
  ```

### Importar Municípios/Regiões do IBGE (Opcional):
Para carregar os municípios do IBGE no banco de dados da VPS:
```bash
docker compose -f docker-compose.prod.yml exec backend npm run regions:import
```

---

## 🔄 Como atualizar em futuros Deploys

Quando você fizer novos commits na branch `feat/mealfy-v1.0.0`, basta rodar:
```bash
cd /opt/Mealfy
bash scripts/deploy-vps.sh
```
O script fará o `git pull` automático, reconstruirá as imagens necessárias e atualizará os containers sem downtime prolongado.
