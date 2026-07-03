# SalonHub

SaaS multi-tenant para gestão de salões de beleza.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | **Next.js 15** + React + Tailwind |
| Backend | **Node.js** + Express + TypeScript |
| ORM | **Prisma** |
| Banco | **PostgreSQL** (Neon / Supabase / Docker) |
| Deploy | Vercel (front) + Railway (API) |

## Estrutura

```
salonhub/
├── frontend/          Next.js — landing + painel
├── backend/           API REST multi-tenant
├── app/               Painel legado (HTML) — substituído pelo Next.js
├── docker-compose.yml PostgreSQL local
├── DEPLOY.md          Guia completo de deploy
└── setup.bat          Script de instalação (Windows)
```

## Início rápido

```bash
# 1. Banco (escolha uma opção)
docker compose up -d                    # Docker local
# OU configure Neon em backend/.env

# 2. Backend
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev                             # http://localhost:3001

# 3. Frontend
cd frontend
npm install
npm run dev                             # http://localhost:3000
```

**Login:** `regina@salonhub.demo` / `senha123`

## Deploy

Veja [DEPLOY.md](DEPLOY.md) para instruções de Vercel + Railway + Neon.

## Documentação

- `SALONHUB-ACOMPANHAMENTO.txt` — acompanhamento do projeto
- `SALONHUB-API.txt` — documentação da API
- `backend/README.md` — detalhes do backend
