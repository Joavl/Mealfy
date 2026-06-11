# Dockerfile for Node.js Express TypeScript API
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source code and Prisma schema
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built package and package files
COPY backend/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

# Expose API port
EXPOSE 3001

# Run the API server
CMD ["node", "dist/server.js"]
