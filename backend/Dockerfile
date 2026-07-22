FROM node:20-slim AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml* yarn.lock package-lock.json* ./
RUN npm install --production
COPY prisma ./prisma/
COPY src ./src/
EXPOSE 5000
CMD ["node", "src/server.js"]
