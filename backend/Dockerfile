FROM node:22-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma/
COPY src ./src/
EXPOSE 5000
CMD ["node", "src/server.js"]
