#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "=============================================="
  echo " ERRO: DATABASE_URL não está configurada!"
  echo ""
  echo " No Render:"
  echo "  1. Crie um PostgreSQL (salonhub-db)"
  echo "  2. Abra salonhub-backend → Environment"
  echo "  3. Add from Database → salonhub-db"
  echo "  4. Variável: DATABASE_URL"
  echo "  5. Save e faça Manual Deploy"
  echo "=============================================="
  echo ""
  exit 1
fi

echo "→ Prisma migrate deploy..."
npx prisma migrate deploy

echo "→ Seed (demo)..."
npx tsx prisma/seed.ts

echo "→ Iniciando API na porta ${PORT:-3001}..."
exec node dist/index.js
