# --- Etapa 1: dependencias + build -----------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Etapa 2: imagen final, solo lo necesario para correr --------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

# Aplica cualquier migración pendiente y luego arranca — así un despliegue
# nuevo nunca corre con un esquema desactualizado por accidente.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
