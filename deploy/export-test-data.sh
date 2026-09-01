#!/usr/bin/env bash
# Exporta los datos del entorno de PRUEBAS para migrarlos a producción.
# Corre esto en la máquina/entorno donde están los datos actuales
# (docker-compose.yml de desarrollo, o donde sea que esté corriendo hoy).
#
# Uso:
#   ./deploy/export-test-data.sh
#
# Genera dos archivos en deploy/migration-export/:
#   datos.dump        → todo el contenido de las tablas (pg_dump --data-only)
#   uploads.tar.gz     → todas las fotos subidas (Fase 15)
#
# Copia esos dos archivos al servidor de producción (scp, USB, lo que sea)
# y sigue con deploy/import-to-production.sh allá.
#
# IMPORTANTE: esto NO copia el ENCRYPTION_KEY — ese valor no vive en la
# base de datos, vive en tu archivo .env. Cópialo tú mismo, a mano, al
# .env.prod del servidor nuevo. Si generas uno nuevo en vez de reusar el
# actual, las contraseñas de equipos y licencias ya guardadas en estos
# datos quedan indescifrables para siempre.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck disable=SC1091
[ -f .env ] && source .env

DB_USER="${DB_USER:-compufix}"
DB_NAME="${DB_NAME:-compufix}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

EXPORT_DIR="$PROJECT_DIR/deploy/migration-export"
mkdir -p "$EXPORT_DIR"

echo "=== Exportando datos del entorno de pruebas ==="
echo ""
echo "Recuerda: el archivo .env de ESTE entorno tiene el ENCRYPTION_KEY que"
echo "debes copiar a mano al .env.prod del servidor nuevo. Este script no lo"
echo "toca ni lo copia — es una decisión deliberada, ese valor no debería"
echo "viajar dentro de un archivo de datos."
echo ""

echo "Exportando tablas (pg_dump --data-only)…"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" --data-only --disable-triggers -Fc "$DB_NAME" \
  > "$EXPORT_DIR/datos.dump"
echo "  → $EXPORT_DIR/datos.dump"

echo "Empaquetando fotos subidas (uploads/)…"
if docker compose -f "$COMPOSE_FILE" exec -T backend test -d /app/uploads 2>/dev/null; then
  docker compose -f "$COMPOSE_FILE" exec -T backend tar -czf - -C /app uploads \
    > "$EXPORT_DIR/uploads.tar.gz"
  echo "  → $EXPORT_DIR/uploads.tar.gz"
else
  echo "  (no se encontró la carpeta uploads en el contenedor — se omite, puede que no haya fotos subidas todavía)"
fi

echo ""
echo "=== Listo ==="
echo "Copia estos archivos al servidor de producción y continúa con:"
echo "  deploy/import-to-production.sh"
echo ""
ls -lh "$EXPORT_DIR"
