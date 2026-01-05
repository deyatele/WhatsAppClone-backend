#!/bin/sh
set -e

echo "Starting Entrypoint..."

# Проверка наличия переменной (выведет только длину строки для безопасности)
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set!"
  exit 1
else
  echo "DATABASE_URL is detected (length: ${#DATABASE_URL})"
fi

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Starting application..."
exec "$@"