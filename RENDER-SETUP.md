# Deploy no Render — 1 serviço só (API + site)

## O que mudou

Agora **um único Web Service** serve tudo:
- `https://SEU-SERVICO.onrender.com/` → landing
- `https://SEU-SERVICO.onrender.com/login` → painel
- `https://SEU-SERVICO.onrender.com/health` → API
- `https://SEU-SERVICO.onrender.com/api/...` → API

Não precisa de segundo serviço para o frontend.

---

## Passo a passo

### 1. PostgreSQL
**New** → **PostgreSQL** → name: `salonhub-db`

### 2. Web Service (só um!)
**New** → **Web Service** → repo `leleostonks/salaoregina`

| Campo | Valor |
|-------|--------|
| Name | `salaoregina` (ou `salaoregina-1`) |
| Runtime | **Docker** |
| Root Directory | *(vazio)* |
| Dockerfile | `Dockerfile` |
| Health Check | `/health` |

### 3. Environment

| Key | Value |
|-----|--------|
| `DATABASE_URL` | **Add from Database** → `salonhub-db` |
| `JWT_SECRET` | chave longa aleatória |
| `NODE_ENV` | `production` |

### 4. Apague o serviço duplicado (se tiver 2 iguais)

Mantenha **apenas um** Web Service Docker.

### 5. Push + Deploy

```bash
git add .
git commit -m "fix: API e frontend no mesmo serviço Render"
git push origin master
```

**Manual Deploy** → **Deploy latest commit**

---

## Teste

```
https://salaoregina-1.onrender.com/health
https://salaoregina-1.onrender.com/login
```

Login: **riana@gmail.com** / **123456**

---

## Local (sem mudança)

```bash
cd backend && npm run dev    # :3001
cd frontend && npm run dev    # :3000
```
