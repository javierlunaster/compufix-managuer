#!/usr/bin/env bash
# Importa los datos exportados con export-test-data.sh directo al Postgres
# administrado por Railway (variante de import-to-supabase.sh para cuando
# la base de datos vive en un servicio Postgres de Railway en vez de
# Supabase — el resto del stack, fotos incluidas, puede seguir usando
# Supabase Storage sin problema, son cosas independientes).
#
# Requisitos antes de correr esto:
#   1. Haber corrido `./deploy/export-test-data.sh` en el entorno con los
#      datos reales (genera deploy/migration-export/datos.dump).
#   2. Haber creado el servicio Postgres en Railway y haber desplegado el
#      backend apuntando su DATABASE_URL a ese Postgres — el propio
#      contenedor aplica el esquema solo al arrancar (`prisma migrate
#      deploy` está en el CMD del Dockerfile), así que las tablas ya
#      deben existir, vacías.
#   3. Tener instalado el cliente de PostgreSQL (pg_restore) en esta
#      máquina — viene con "postgresql-client" en Debian/Ubuntu, o con
#      Postgres.app / `brew install libpq` en macOS.
#
# Uso:
#   RAILWAY_DB_URL="postgresql://postgres:[password]@[host].proxy.rlwy.net:[port]/railway" \
#   ./deploy/import-to-railway-db.sh
#
# Copia RAILWAY_DB_URL desde Railway: servicio Postgres → pestaña
# "Connect" → "Public Network" (necesitas la URL pública, no la interna
# "postgres.railway.internal", porque este script corre desde tu
# computadora, fuera de la red privada de Railway).

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPORT_DIR="$PROJECT_DIR/deploy/migration-export"

if [ -z "${RAILWAY_DB_URL:-}" ]; then
  echo "Falta RAILWAY_DB_URL. Cópiala desde Railway: servicio Postgres →"
  echo "pestaña 'Connect' → 'Public Network', y exporta la variable:"
  echo '  export RAILWAY_DB_URL="postgresql://postgres:TU-PASSWORD@xxxx.proxy.rlwy.net:12345/railway"'
  exit 1
fi

if [ ! -f "$EXPORT_DIR/datos.dump" ]; then
  echo "No se encontró $EXPORT_DIR/datos.dump"
  echo "Corre primero ./deploy/export-test-data.sh y copia el archivo aquí."
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "No se encontró pg_restore. Instala el cliente de PostgreSQL:"
  echo "  Ubuntu/Debian: sudo apt install postgresql-client"
  echo "  macOS:         brew install libpq && brew link --force libpq"
  echo "  Windows:       instala PostgreSQL marcando 'Command Line Tools',"
  echo "                 y corre este script desde Git Bash o WSL."
  exit 1
fi

echo "=== Importando datos al Postgres de Railway ==="
echo ""
echo "Esto asume que el backend ya desplegó al menos una vez contra este"
echo "Postgres (las tablas deben existir pero estar vacías). Si no,"
echo "cancela con Ctrl+C, despliega el backend primero, y vuelve aquí."
echo ""
echo "¿Ya verificaste que ENCRYPTION_KEY en Railway es EXACTAMENTE la"
echo "misma que usaba tu entorno local? Si no estás seguro, detente aquí"
echo "— no hay forma de deshacer esto después."
read -r -p "Escribe 'si' para continuar: " confirm
if [ "$confirm" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

echo ""
echo "Restaurando tablas (pg_restore --data-only)…"
pg_restore --data-only --disable-triggers --no-owner --no-privileges \
  -d "$RAILWAY_DB_URL" \
  "$EXPORT_DIR/datos.dump"

echo ""
echo "=== Listo ==="
echo "Las fotos (si ya subiste alguna en pruebas locales) se migran aparte,"
echo "a Supabase Storage, con:"
echo "  cd backend && npm run migrate-uploads -- /ruta/a/uploads-antiguos"
echo ""
echo "Verifica entrando al sistema desplegado en Railway: revisa que un"
echo "cliente, una orden y una foto (si había) se vean correctamente. Si"
echo "un dato cifrado (contraseña de equipo/licencia) no se puede leer, es"
echo "la señal de que ENCRYPTION_KEY no coincidió con la del entorno"
echo "original."
