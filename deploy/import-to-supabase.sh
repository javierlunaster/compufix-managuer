#!/usr/bin/env bash
# Importa los datos exportados con export-test-data.sh directo al Postgres
# de Supabase (a diferencia de import-to-production.sh, que asume un
# Postgres corriendo en un contenedor propio via docker compose — este
# script se conecta por red al Postgres administrado de Supabase).
#
# Requisitos antes de correr esto:
#   1. Haber corrido `./deploy/export-test-data.sh` en el entorno con los
#      datos reales (genera deploy/migration-export/datos.dump).
#   2. Haber aplicado el esquema en Supabase: desde backend/, con
#      DATABASE_URL apuntando a Supabase,
#        npx prisma migrate deploy
#      (las tablas deben existir pero estar vacías).
#   3. Tener instalado el cliente de PostgreSQL (pg_restore) en esta
#      máquina — viene con "postgresql-client" en Debian/Ubuntu, o con
#      Postgres.app / `brew install libpq` en macOS.
#
# Uso:
#   SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
#   ./deploy/import-to-supabase.sh
#
# Después de esto, migra las fotos con:
#   cd backend && npm run migrate-uploads -- /ruta/a/uploads-antiguos

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPORT_DIR="$PROJECT_DIR/deploy/migration-export"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Falta SUPABASE_DB_URL. Cópiala desde Supabase → Project Settings →"
  echo "Database → Connection string → Session pooler, y exporta la variable:"
  echo '  export SUPABASE_DB_URL="postgresql://postgres.xxxx:TU-PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres"'
  exit 1
fi

if [ ! -f "$EXPORT_DIR/datos.dump" ]; then
  echo "No se encontró $EXPORT_DIR/datos.dump"
  echo "Corre primero ./deploy/export-test-data.sh en el entorno de origen y copia el archivo aquí."
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "No se encontró pg_restore. Instala el cliente de PostgreSQL:"
  echo "  Ubuntu/Debian: sudo apt install postgresql-client"
  echo "  macOS:         brew install libpq && brew link --force libpq"
  exit 1
fi

echo "=== Importando datos a Supabase ==="
echo ""
echo "Esto asume que ya corriste 'npx prisma migrate deploy' contra Supabase"
echo "(las tablas deben existir pero estar vacías). Si no lo has hecho,"
echo "cancela con Ctrl+C y hazlo primero."
echo ""
echo "¿Ya verificaste que ENCRYPTION_KEY que vas a usar en Railway es"
echo "EXACTAMENTE la misma que usaba el entorno de origen? Si no estás"
echo "seguro, detente aquí — no hay forma de deshacer esto después."
read -r -p "Escribe 'si' para continuar: " confirm
if [ "$confirm" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

echo ""
echo "Restaurando tablas (pg_restore --data-only)…"
pg_restore --data-only --disable-triggers --no-owner --no-privileges \
  -d "$SUPABASE_DB_URL" \
  "$EXPORT_DIR/datos.dump"

echo ""
echo "=== Listo ==="
echo "Siguiente paso: migrar las fotos a Supabase Storage."
echo "  cd backend && npm run migrate-uploads -- /ruta/a/uploads-antiguos"
echo ""
echo "Luego verifica entrando al sistema desplegado en Railway: revisa que"
echo "un cliente, una orden y una foto de evidencia (si había) se vean"
echo "correctamente. Si un dato cifrado (contraseña de equipo/licencia) no"
echo "se puede leer, es la señal de que ENCRYPTION_KEY no coincidió con la"
echo "del entorno original."
