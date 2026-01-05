# --- Этап 1: Установка зависимостей ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Ставим зависимости и генерируем клиент
RUN npm ci && npx prisma generate

# --- Этап 2: Сборка приложения ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- Этап 3: Финальный образ ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Копируем всё необходимое
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
# !!! ВАЖНО: копируем файл конфигурации, если он в корне
COPY prisma.config.ts ./ 
COPY package*.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh
USER nestjs

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]