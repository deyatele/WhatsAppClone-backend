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

# Создаем пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Копируем результаты сборки и скрипт
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./

# Даем права на выполнение скрипта
RUN chmod +x docker-entrypoint.sh

# Переключаемся на пользователя (важно: скрипт будет запущен от него)
USER nestjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]