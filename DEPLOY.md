# SalonHub — Guia de Deploy

## Opção A — Render (blueprint, tudo em um lugar)

Existe um `render.yaml` na raiz do projeto que descreve os 3 recursos (backend, frontend e Postgres).

1. Suba o repositório para o GitHub
2. Em [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → selecione o repositório
3. Render lê o `render.yaml` e cria:
   - `salonhub-db` — Postgres gerenciado (free tier expira em 90 dias, veja abaixo)
   - `salonhub-backend` — API Node/Express via Docker (`backend/Dockerfile`), roda `prisma migrate deploy` automaticamente no start
   - `salonhub-frontend` — Next.js via runtime Node nativo
4. Depois do primeiro deploy, confira as URLs reais atribuídas (`https://salonhub-backend-xxxx.onrender.com`, `https://salonhub-frontend-xxxx.onrender.com`) — se o Render adicionar sufixo por conflito de nome, atualize manualmente:
   - `CORS_ORIGIN` no serviço backend → URL do frontend
   - `NEXT_PUBLIC_API_URL` no serviço frontend → `URL do backend` + `/api`
5. `JWT_SECRET` é gerado automaticamente pelo Render (`generateValue: true`)

**Atenção free tier:** serviços web free "dormem" após 15 min sem tráfego (primeira requisição demora ~30-50s) e o banco free é apagado após 90 dias — para produção real, migre para planos pagos.

## Opção B — Vercel + Railway + Neon

### Arquitetura em produção

```
Next.js (Vercel)  →  API Node.js (Railway)  →  PostgreSQL (Neon/Supabase)
   :3000                  :3001                      cloud
```

---

## 1. Banco de dados — Neon (recomendado)

1. Acesse [neon.tech](https://neon.tech) e crie conta gratuita
2. Crie um projeto → copie a **Connection String**
3. Cole no `backend/.env`:

```
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

4. Rode as migrations:

```bash
cd backend
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### Alternativa: Supabase

1. [supabase.com](https://supabase.com) → New Project
2. Settings → Database → Connection string (URI)
3. Use a mesma `DATABASE_URL` no backend

### Alternativa local: Docker

```bash
docker compose up -d
# DATABASE_URL já configurada em backend/.env
cd backend && npx prisma migrate dev --name init && npm run db:seed
```

---

## 2. Backend — Railway

1. Crie conta em [railway.app](https://railway.app)
2. New Project → Deploy from GitHub (pasta `backend/`)
3. Variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Connection string do Neon |
| `JWT_SECRET` | Chave segura (openssl rand -base64 32) |
| `CORS_ORIGIN` | URL do frontend Vercel |
| `NODE_ENV` | production |

4. Railway detecta o `Dockerfile` automaticamente

---

## 3. Frontend — Vercel

1. Crie conta em [vercel.com](https://vercel.com)
2. Import GitHub → pasta `frontend/`
3. Variável de ambiente:

```
NEXT_PUBLIC_API_URL=https://sua-api.railway.app/api
```

4. Deploy automático a cada push

---

## 4. Rodar localmente (completo)

### Terminal 1 — PostgreSQL (Docker)
```bash
docker compose up -d
```

### Terminal 2 — Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Terminal 3 — Frontend Next.js
```bash
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:3000**

Login: `riana@gmail.com` / `123456`

---

## 5. Sem Docker (só Neon)

Se não tiver Docker, use Neon gratuito:

1. Crie banco no Neon
2. Atualize `DATABASE_URL` no `backend/.env`
3. `cd backend && npx prisma db push && npm run db:seed && npm run dev`
4. `cd frontend && npm run dev`

---

## Checklist pós-deploy

- [ ] API `/health` responde 200
- [ ] Login funciona no frontend
- [ ] CORS_ORIGIN aponta para URL do Vercel
- [ ] JWT_SECRET é único em produção
- [ ] DATABASE_URL usa SSL (`?sslmode=require`)
