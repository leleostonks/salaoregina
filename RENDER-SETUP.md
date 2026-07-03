# Render — variáveis obrigatórias (configurar no dashboard)

## salonhub-db (PostgreSQL)
Criado automaticamente pelo Blueprint ou manualmente em New → PostgreSQL.

---

## salonhub-backend (Web Service — Docker)

| Variável | Obrigatória | Como obter |
|----------|-------------|------------|
| `DATABASE_URL` | **SIM** | Postgres → Internal Database URL (ou Add from Database) |
| `JWT_SECRET` | **SIM** | Gere uma chave longa aleatória |
| `NODE_ENV` | sim | `production` |
| `HOST` | sim | `0.0.0.0` |
| `JWT_EXPIRES_IN` | não | `7d` |
| `CORS_ORIGIN` | sim | URL do frontend (ex: `https://salonhub-frontend.onrender.com`) |
| `PORT` | auto | Render define automaticamente |

**Settings do backend:**
- Runtime: **Docker**
- Root Directory: *(vazio)*
- Dockerfile Path: `Dockerfile`
- Health Check Path: `/health`

---

## salonhub-frontend (Web Service — Node)

| Variável | Obrigatória | Como obter |
|----------|-------------|------------|
| `NEXT_PUBLIC_API_URL` | **SIM** | URL do backend (com ou sem `/api`) |
| `NODE_ENV` | sim | `production` |
| `PORT` | auto | Render define automaticamente |

**Settings do frontend:**
- Runtime: **Node**
- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start -- -p $PORT -H 0.0.0.0`

---

## Ordem de criação (manual)

1. PostgreSQL (`salonhub-db`)
2. Backend (`salonhub-backend`) + `DATABASE_URL`
3. Frontend (`salonhub-frontend`) + `NEXT_PUBLIC_API_URL`
4. Atualizar `CORS_ORIGIN` no backend com URL real do frontend
5. Manual Deploy nos dois serviços

## Login demo

- E-mail: `riana@gmail.com`
- Senha: `123456`

## Teste

- API: `https://SUA-API.onrender.com/health`
- Painel: `https://SEU-FRONT.onrender.com/login`
