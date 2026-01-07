#!/bin/sh
set -e

echo "Starting Entrypoint..."

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set!"
  exit 1
fi
export DATABASE_URL=$DATABASE_URL
# Опционально: ожидание доступности порта базы данных (нужен nc/netcat, который обычно есть в alpine)
# Попробуем просто выполнить команду Prisma с несколькими попытками, если нужно
echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Starting application..."
# exec "$@" выполнит команду из CMD в Dockerfile: ["node", "dist/src/main.js"]
exec "$@"