# --- Etapa 1: build de producción con Vite -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_API_URL se hornea en el build — si cambia, hay que reconstruir la
# imagen (es una limitación normal de una SPA servida como archivos
# estáticos, no un descuido).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Etapa 2: Nginx sirviendo los archivos estáticos --------------------
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
