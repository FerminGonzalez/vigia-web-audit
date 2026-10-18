# -----------------------------------------------------------------------------
# Dockerfile multi-etapa para Vigia Web Audit
# -----------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Prisma necesita OpenSSL para su motor de consultas/migraciones en Alpine.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Imagen de produccion ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL es imprescindible para el motor de Prisma (migrate deploy).
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
# Instala dependencias de produccion (incluye la CLI de Prisma) y genera el cliente.
RUN npm ci --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
