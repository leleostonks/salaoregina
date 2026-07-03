# SalonHub API — build a partir da raiz do repositório (Render)
FROM node:22-alpine AS builder
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
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/prisma ./prisma/
COPY backend/scripts ./scripts/
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
RUN npx prisma generate && chmod +x scripts/docker-start.sh
EXPOSE 3001
CMD ["sh", "scripts/docker-start.sh"]
