# ── Stage 1: Frontend build ──
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Backend + Express static ──
FROM node:22-slim
WORKDIR /app

# OpenSSL (für Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Prisma
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Source & Frontend dist
COPY backend/src ./src/
COPY --from=frontend-build /app/dist ./dist/

EXPOSE 5000

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
