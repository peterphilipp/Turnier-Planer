# ── Stage 1: Frontend build ──
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY ../frontend/package.json ../frontend/package-lock.json ./
RUN npm ci
COPY ../frontend/ .
RUN npm run build

# ── Stage 2: Backend + nginx ──
FROM node:22-slim
WORKDIR /app

# Dependencies & Build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma/
COPY src ./src/

# Prisma generieren
RUN npx prisma generate

# Frontend dist kopieren
COPY --from=frontend-build /app/dist ./dist/

# nginx installieren
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# nginx config: API -> Backend, alles andere -> statische Dateien
RUN echo 'upstream backend { server 127.0.0.1:5000; }' > /etc/nginx/conf.d/upstream.conf && \
    cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    root /app/dist;
    index index.html;

    # API proxy zum Backend
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

EXPOSE 80

CMD ["sh", "-c", "node src/server.js & nginx -g 'daemon off;'"]
