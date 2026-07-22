# ── Stage 1: Frontend build ──
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY ../frontend/package.json ../frontend/package-lock.json ./
RUN npm ci
COPY ../frontend/ .
RUN npm run build

# ── Stage 2: Backend + Express static ──
FROM node:22-slim
WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Source & Frontend dist
COPY src ./src/
COPY --from=frontend-build /app/dist ./dist/

EXPOSE 5000

CMD ["node", "src/server.js"]
