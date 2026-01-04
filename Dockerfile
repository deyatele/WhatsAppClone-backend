# Этап 1: Сборка приложения
FROM node:20-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и устанавливаем все зависимости (включая dev)
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Собираем TypeScript в JavaScript
RUN npm run build

# Этап 2: Подготовка production-образа
FROM node:20-alpine

WORKDIR /app

# Копируем package.json для установки только production-зависимостей
COPY package*.json ./
RUN npm install --only=production

# Копируем собранный код из этапа 'builder'
COPY --from=builder /app/dist ./dist

# Открываем порт
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "dist/main.js"]
