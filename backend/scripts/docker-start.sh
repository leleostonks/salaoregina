#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "=============================================="
  echo " ERRO: DATABASE_URL não está configurada!"
  echo ""
  echo " No Render:"
  echo "  1. Crie um PostgreSQL (salonhub-db)"
  echo "  2. Abra o Web Service → Environment"
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

echo "→ API interna na porta 3001..."
PORT=3001 HOST=127.0.0.1 node dist/index.js &
sleep 2

echo "→ Frontend + proxy /api na porta ${PORT:-3000}..."
cd /app/frontend
exec npm start -- -p "${PORT:-3000}" -H 0.0.0.0
