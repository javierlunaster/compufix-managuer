#!/usr/bin/env bash
# Importa los datos exportados con export-test-data.sh en el servidor de
# PRODUCCIÓN. Corre esto DESPUÉS de que docker-compose.prod.yml ya esté
# levantado y con las migraciones aplicadas (el backend las aplica solo al
# arrancar) pero con las tablas todavía vacías — antes de que nadie más
# use el sistema nuevo.
#
# Uso:
#   1. Copia datos.dump y uploads.tar.gz (generados por export-test-data.sh)
#      a la carpeta deploy/migration-export/ de este servidor.
#   2. ./deploy/import-to-production.sh
#
# Requiere que docker-compose.prod.yml ya esté corriendo.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck disable=SC1091
[ -f .env.prod ] && source .env.prod

DB_USER="${DB_USER:-compufix}"
DB_NAME="${DB_NAME:-compufix}"
EXPORT_DIR="$PROJECT_DIR/deploy/migration-export"

if [ ! -f "$EXPORT_DIR/datos.dump" ]; then
  echo "No se encontró $EXPORT_DIR/datos.dump"
  echo "Copia primero los archivos generados por export-test-data.sh a esa carpeta."
  exit 1
fi

echo "=== Importando datos a producción ==="
echo ""
echo "¿Ya verificaste que ENCRYPTION_KEY en .env.prod es EXACTAMENTE la"
echo "misma que usaba el entorno de pruebas? Si no estás seguro, detente"
echo "aquí y verifícalo — no hay forma de deshacer esto después."
read -r -p "Escribe 'si' para continuar: " confirm
if [ "$confirm" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

echo ""
echo "Restaurando tablas (pg_restore --data-only)…"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$DB_USER" --data-only --disable-triggers -d "$DB_NAME" \
  < "$EXPORT_DIR/datos.dump"

if [ -f "$EXPORT_DIR/uploads.tar.gz" ]; then
  echo "Restaurando fotos subidas…"
  docker compose -f docker-compose.prod.yml exec -T backend \
    tar -xzf - -C /app < "$EXPORT_DIR/uploads.tar.gz"
else
  echo "(no se encontró uploads.tar.gz — se omite)"
fi

echo ""
echo "=== Listo ==="
echo "Verifica entrando al sistema: revisa que un cliente, una orden y una"
echo "foto de evidencia (si había) se vean correctamente. Si un dato"
echo "cifrado (contraseña de equipo/licencia) no se puede leer, es la señal"
echo "de que ENCRYPTION_KEY no coincidió con la del entorno original."
