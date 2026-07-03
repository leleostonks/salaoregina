# SalonHub — Guia de Deploy

## Arquitetura em produção

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

Login: `regina@salonhub.demo` / `senha123`

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
