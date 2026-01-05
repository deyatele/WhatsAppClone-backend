#!/bin/sh
set -e

echo "Checking environment..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Starting app..."
exec "$@"