# --- Этап 1: Установка зависимостей ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы манифеста для кэширования слоев
COPY package*.json ./
COPY prisma ./prisma/

# Используем npm ci для точной и быстрой установки
# Генерируем Prisma Client сразу после установки
RUN npm ci && npx prisma generate

# --- Этап 2: Сборка приложения ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Отключаем Prisma generate в postinstall (если есть), так как клиент уже готов
RUN npm run build

# --- Этап 3: Финальный образ ---
FROM node:22-alpine AS runner
WORKDIR /app

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

# Создаем пользователя для безопасности (не запускаем под root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Копируем только необходимые файлы
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package*.json ./

# Переключаемся на пользователя
USER nestjs

EXPOSE 3001

# Используем "dumb-init" или запускаем напрямую через node
CMD ["node", "dist/src/main.js"]