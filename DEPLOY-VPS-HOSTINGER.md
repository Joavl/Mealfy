# 📖 Manual de Deploy e Atualização — Mealfy na VPS Hostinger

Este documento é o guia definitivo para qualquer desenvolvedor que precise manter, atualizar ou subir do zero a aplicação **Mealfy** na VPS da Hostinger.

---

## 🏗️ 1. Arquitetura e Dados da Infraestrutura

| Item | Descrição / Valor |
| :--- | :--- |
| **Provedor** | Hostinger VPS (KVM 2) |
| **Sistema Operacional** | Ubuntu 24.04 LTS |
| **IP da VPS** | `187.127.62.140` |
| **Usuário SSH** | `root` |
| **Diretório do Projeto na VPS** | `/opt/Mealfy` |
| **Frontend Web** | [https://app.mealfy.org](https://app.mealfy.org) (React + Vite + Nginx) |
| **Backend API** | [https://api.mealfy.org](https://api.mealfy.org) (Node.js Express + Prisma) |
| **Banco de Dados** | PostgreSQL gerenciado via **Supabase** |
| **Proxy Reverso & SSL** | **Caddy 2** (Certificados HTTPS Let's Encrypt automáticos) |
| **Branch de Produção** | `feat/mealfy-v1.0.0` (ou `main` conforme o fluxo do time) |

---

## 🔄 2. Como Fazer Novas Atualizações (Rotina do Desenvolvedor)

Sempre que você ou outro desenvolvedor fizer alterações no código, commitar e enviar para o GitHub, siga estes passos para publicar a atualização na VPS:

### Passo 1: Conectar na VPS via SSH
A partir de qualquer computador (Mac, Linux ou Windows via terminal/PowerShell):
```bash
ssh root@187.127.62.140
```
*(Informe a senha de root da VPS quando solicitada)*.

### Passo 2: Entrar na pasta do projeto
```bash
cd /opt/Mealfy
```

### Passo 3: Executar o script de atualização
Criamos um script que automatiza tudo (puxa o código do Git, reconstrói as imagens modificadas, roda migrações do banco e recarrega os containers sem downtime prolongado):

```bash
bash scripts/deploy-vps.sh
```

> **O que esse comando faz internamente:**
> 1. Executa `git pull origin feat/mealfy-v1.0.0`
> 2. Executa `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`
> 3. No boot do container backend, o Prisma executa automaticamente: `npx prisma migrate deploy`
> 4. Exibe o status final dos containers.

### Passo 4: Verificar se está tudo rodando
```bash
docker compose -f docker-compose.prod.yml ps
```
Todos os 3 containers (`mealfy-backend`, `mealfy-frontend`, `mealfy-caddy`) devem estar com status **Up / Running**.

---

## 🚨 3. Solução de Problemas e Comandos de Diagnóstico

### Ver logs em tempo real:
- **Backend (erros de API, banco ou rotas):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f --tail 100 backend
  ```
- **Caddy (emissão de certificados SSL e tráfego HTTPS):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f --tail 100 caddy
  ```
- **Frontend (erros de servidor Nginx):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f --tail 100 frontend
  ```

### Reiniciar um serviço específico sem parar os outros:
```bash
# Reiniciar apenas o backend:
docker compose -f docker-compose.prod.yml restart backend

# Reiniciar apenas o Caddy (SSL):
docker compose -f docker-compose.prod.yml restart caddy
```

### Rodar scripts manuais do backend na VPS:
Se precisar rodar comandos dentro do container do backend:

- **Importar municípios e regiões do IBGE:**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend npm run regions:import
  ```

- **Forçar migrações do Prisma manualmente:**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
  ```

---

## ⚙️ 4. Subir do Zero em Nova VPS (Setup Inicial)

Caso o servidor precise ser recriado do zero em algum momento, siga este roteiro:

### 1. Configurar o DNS
No gerenciador de DNS do domínio (`mealfy.org`):
- Registro tipo `A`: `app` ➜ `187.127.62.140`
- Registro tipo `A`: `api` ➜ `187.127.62.140`

### 2. Liberar portas do sistema operacional
O Ubuntu por padrão pode subir com Nginx/Apache nativos. É fundamental desativá-los para não conflitarem com as portas 80/443 do Caddy:
```bash
systemctl stop nginx apache2 2>/dev/null || true
systemctl disable nginx apache2 2>/dev/null || true
```

### 3. Instalar dependências (Docker e Git)
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git
```

### 4. Clonar o projeto
```bash
cd /opt
git clone -b feat/mealfy-v1.0.0 https://github.com/Joavl/Mealfy.git
cd Mealfy
```

### 5. Configurar o `.env`
Copie o modelo de produção:
```bash
cp .env.production.example .env
nano .env
```
Preencha as variáveis de ambiente necessárias (domínios `app.mealfy.org`, `api.mealfy.org`, chaves do Supabase, `DATABASE_URL`, `JWT_SECRET`, etc.).

### 6. Subir a aplicação
```bash
bash scripts/deploy-vps.sh
```

---

## 🔐 5. Onde ficam as Variáveis de Ambiente?

O arquivo `.env` fica localizado em `/opt/Mealfy/.env` na VPS.
- Ele **não é comitado no Git** por motivos de segurança.
- Se novas variáveis de ambiente forem criadas no código, lembre-se de adicioná-las tanto no `.env.production.example` (no repositório) quanto no arquivo `/opt/Mealfy/.env` (no servidor).
- Após alterar qualquer variável no `.env` da VPS, reinicie os containers com:
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```
