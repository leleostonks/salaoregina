# SalonHub — API + Frontend no mesmo serviço (Render)
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=/api
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src/
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/prisma ./prisma/
COPY backend/scripts ./scripts/
COPY --from=backend-builder /app/dist ./dist/
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma/
RUN npx prisma generate && chmod +x scripts/docker-start.sh

# Frontend (Next.js)
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --omit=dev
COPY --from=frontend-builder /frontend/.next ./.next
COPY frontend/next.config.ts ./
WORKDIR /app

EXPOSE 3000
CMD ["sh", "scripts/docker-start.sh"]
