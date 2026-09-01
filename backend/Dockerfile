# --- Etapa 1: dependencias + build -----------------------------------
# node:20-slim (Debian) en vez de node:20-alpine: los binarios del motor
# de Prisma se compilan contra glibc + una versión específica de OpenSSL,
# y en Alpine (musl) el desajuste de versión de OpenSSL entre lo que
# detecta "prisma generate" y lo que trae la imagen final es una fuente
# de fallos recurrente ("Please manually install OpenSSL..." aunque
# OpenSSL sí esté instalado). Debian slim evita todo ese problema.
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Etapa 2: imagen final, solo lo necesario para correr --------------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

# Aplica cualquier migración pendiente y luego arranca — así un despliegue
# nuevo nunca corre con un esquema desactualizado por accidente.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
