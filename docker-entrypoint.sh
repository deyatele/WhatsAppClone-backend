#!/bin/sh
set -e

echo "Pushing database schema..."
# --accept-data-loss нужен, если вы меняете схему так, что это требует удаления данных
npx prisma db push --accept-data-loss

echo "Starting application..."
exec "$@"