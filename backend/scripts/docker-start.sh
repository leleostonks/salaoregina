#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "=============================================="
  echo " ERRO: DATABASE_URL não está configurada!"
  echo " Render → Web Service → Environment"
  echo " Add from Database → salonhub-db"
  echo "=============================================="
  echo ""
  exit 1
fi

WEB_PORT="${PORT:-3000}"
API_PORT=3001

echo "→ Prisma migrate deploy..."
npx prisma migrate deploy

echo "→ Seed (demo)..."
npx tsx prisma/seed.ts || echo "⚠ Seed ignorado (já existe)"

echo "→ API interna na porta ${API_PORT}..."
PORT="${API_PORT}" HOST=0.0.0.0 node dist/index.js &
API_PID=$!

echo "→ Aguardando API..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if wget -q -O - "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    echo "   API ok"
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "ERRO: API não respondeu em ${API_PORT}"
    kill "$API_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 2
done

echo "→ Frontend na porta ${WEB_PORT}..."
cd /app/web
export PORT="${WEB_PORT}"
export HOSTNAME=0.0.0.0
exec node server.js
