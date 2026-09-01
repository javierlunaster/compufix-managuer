#!/usr/bin/env bash
# Respaldo de la base de datos de producción.
#
# Uso manual:
#   ./deploy/backup.sh
#
# Uso programado (cron, todos los días a las 2 AM), en el servidor:
#   0 2 * * * cd /ruta/al/proyecto && ./deploy/backup.sh >> /var/log/compufix-backup.log 2>&1
#
# Requiere que docker-compose.prod.yml ya esté corriendo (usa `docker
# compose exec` contra el contenedor "postgres" en marcha).

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck disable=SC1091
[ -f .env.prod ] && source .env.prod

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/compufix-$TIMESTAMP.sql.gz"

echo "Generando respaldo en $BACKUP_FILE ..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${DB_USER:-compufix}" "${DB_NAME:-compufix}" | gzip > "$BACKUP_FILE"

echo "Respaldo completado: $BACKUP_FILE"

# Las fotos subidas (Fase 15) viven en un volumen de Docker aparte —
# pg_dump nunca las toca. Sin este paso, un respaldo "completo" en
# realidad perdía toda la evidencia fotográfica de las órdenes.
UPLOADS_BACKUP_FILE="$BACKUP_DIR/compufix-uploads-$TIMESTAMP.tar.gz"
echo "Generando respaldo de fotos subidas en $UPLOADS_BACKUP_FILE ..."
docker run --rm \
  -v compufix-manager_compufix_uploads:/uploads:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/compufix-uploads-$TIMESTAMP.tar.gz" -C /uploads .
echo "Respaldo de fotos completado: $UPLOADS_BACKUP_FILE"

# Retención: se conservan los últimos 30 respaldos, se borran los más
# viejos — sin esto, la carpeta de respaldos crecería indefinidamente.
RETENTION_COUNT=30
cd "$BACKUP_DIR"
ls -1t compufix-*.sql.gz 2>/dev/null | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm --
echo "Respaldos conservados: $(ls -1 compufix-*.sql.gz 2>/dev/null | wc -l) (máximo $RETENTION_COUNT)"
