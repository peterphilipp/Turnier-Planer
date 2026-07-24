#!/bin/sh
set -e

echo "  Prisma Schema synchronisieren..."
npx prisma db push --accept-data-loss

echo "  Standarddaten importieren (Ignition Phase)..."
npx prisma db seed

echo "  Backend startet..."
exec npx tsx src/server.ts
