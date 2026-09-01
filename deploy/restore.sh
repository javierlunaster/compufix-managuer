#!/usr/bin/env bash
# Restaura la base de datos desde un archivo de respaldo generado por
# backup.sh.
#
# Uso:
#   ./deploy/restore.sh backups/compufix-20260115-020000.sql.gz
#
# ADVERTENCIA: esto reemplaza los datos actuales de la base de datos. Se
# pide confirmación explícita antes de proceder.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck disable=SC1091
[ -f .env.prod ] && source .env.prod

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Uso: ./deploy/restore.sh <ruta-al-respaldo.sql.gz>"
  exit 1
fi

echo "⚠️  Esto va a REEMPLAZAR todos los datos actuales de la base de datos '${DB_NAME:-compufix}'."
read -r -p "Escribe 'restaurar' para confirmar: " CONFIRMATION
if [ "$CONFIRMATION" != "restaurar" ]; then
  echo "Cancelado — no se modificó nada."
  exit 1
fi

echo "Restaurando desde $BACKUP_FILE ..."
gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${DB_USER:-compufix}" "${DB_NAME:-compufix}"

echo "Restauración completada."
