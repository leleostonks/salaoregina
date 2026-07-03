# SalonHub API

Backend SaaS multi-tenant para gestão de salões de beleza.

## Stack

- Node.js + Express 5 + TypeScript
- Prisma ORM + SQLite (local) / PostgreSQL (produção)
- JWT Authentication
- Zod validation

## Início rápido

```bash
cd backend
npm install
npm run setup    # gera banco + seed
npm run dev      # http://localhost:3001
```

## Credenciais de teste (seed)

| Campo   | Valor                    |
|---------|--------------------------|
| E-mail  | riana@gmail.com     |
| Senha   | 123456                 |
| Plano   | PROFESSIONAL             |

## Endpoints

### Públicos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status da API |
| POST | `/api/auth/register` | Cadastrar salão + owner |
| POST | `/api/auth/login` | Login |

### Autenticados (Header: `Authorization: Bearer <token>`)

| Módulo | Rotas |
|--------|-------|
| Auth | `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard/overview`, `/revenue-chart`, `/cash-flow` |
| Profissionais | CRUD + `GET /ranking` |
| Serviços | CRUD + `GET /analysis` |
| Clientes | CRUD + `GET /stats` |
| Atendimentos | CRUD + `PATCH /:id/complete` |
| Despesas | CRUD + `GET /summary` |
| Estoque | CRUD + `PATCH /:id/stock`, `GET /alerts` (Premium) |
| Metas | `GET /`, `POST /`, `GET /progress` |

## Exemplo — Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"riana@gmail.com\",\"password\":\"123456\"}"
```

## Exemplo — Dashboard

```bash
curl http://localhost:3001/api/dashboard/overview \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Multi-tenant

Cada salão (`Tenant`) possui dados isolados. O `tenantId` vem do JWT — nenhum salão acessa dados de outro.

## Planos

| Plano | Profissionais | Estoque |
|-------|---------------|---------|
| BASIC | até 3 | ❌ |
| PROFESSIONAL | até 10 | ❌ |
| PREMIUM | ilimitado | ✅ |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor em modo desenvolvimento |
| `npm run build` | Compilar TypeScript |
| `npm run setup` | Banco + seed |
| `npm run db:studio` | Prisma Studio (visualizar dados) |
