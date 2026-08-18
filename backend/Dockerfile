# Mealfy Backend — imagem para Railway/Render (opcional; ambos também buildam sem Docker).
FROM node:22-slim

# Prisma precisa de openssl no Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências (inclui devDeps para gerar o Prisma Client e compilar)
COPY package*.json ./
RUN npm ci

# Código + build (build roda `prisma generate && tsc`)
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway/Render injetam PORT; o app respeita process.env.PORT
EXPOSE 3000

# Aplica migrations pendentes e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
