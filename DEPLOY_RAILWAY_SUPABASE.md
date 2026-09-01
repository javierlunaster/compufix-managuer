# Desplegar COMPufix Manager en Railway + Supabase

Este documento asume que ya tienes cuenta de Supabase y de Railway, y que
ambos están conectados a tu cuenta de GitHub (`javierlunaster/compufix-managuer`).
Cubre: crear el proyecto de Supabase (base de datos + Storage para fotos),
desplegar backend y frontend en Railway, y migrar los datos reales que ya
tienes corriendo en local (`docker-compose.yml`) sin perderlos.

## Resumen de la arquitectura nueva

- **Antes**: Postgres propio (contenedor Docker) + fotos en disco local +
  Caddy como proxy TLS, todo en un servidor que administras tú.
- **Ahora**: Postgres administrado por **Supabase** + fotos en **Supabase
  Storage** (el filesystem de Railway se borra en cada redeploy, así que ya
  no se pueden guardar ahí) + **Railway** corriendo el backend (NestJS) y
  el frontend (Nginx sirviendo el build de React) como dos servicios
  separados, cada uno con su propio dominio HTTPS automático — ya no hace
  falta Caddy ni certificados manuales.

El `docker-compose.prod.yml` + Caddy que ya existía en el repo sigue
funcionando tal cual para quien prefiera un VPS propio en vez de Railway —
no se tocó esa ruta, solo se le quitó el volumen de `uploads` porque ahora
las fotos van a Supabase Storage en cualquiera de los dos casos.

---

## Paso 1 — Crear el proyecto de Supabase (si no lo tienes ya)

1. En [supabase.com](https://supabase.com) → **New Project**. Elige una
   contraseña fuerte para la base de datos (la vas a necesitar en el
   Paso 3) y guárdala en un gestor de contraseñas.
2. Espera a que el proyecto termine de aprovisionarse (~2 min).

### 1.1 Obtener la cadena de conexión a la base de datos

**Project Settings → Database → Connection string → modo "Session pooler"**
(puerto `5432`, no el "Transaction pooler" de `6543` — Prisma necesita
prepared statements que el modo transacción no soporta). Se ve así:

```
postgresql://postgres.xxxxxxxx:[TU-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Reemplaza `[TU-PASSWORD]` por la contraseña del Paso 1. Guarda esto — es tu
`DATABASE_URL`.

### 1.2 Obtener las claves de API

**Project Settings → API**:

- **Project URL** → tu `SUPABASE_URL`.
- **service_role key** (la secreta, NO la `anon` key) → tu
  `SUPABASE_SERVICE_ROLE_KEY`. Nunca la pongas en el frontend ni la subas a
  git — solo vive en las variables de entorno del backend en Railway.

### 1.3 Crear el bucket de Storage para las fotos

**Storage → New bucket**:

- Nombre: `attachments` (si usas otro nombre, ajusta `SUPABASE_STORAGE_BUCKET`
  en las variables de entorno más abajo).
- **Public bucket: activado.** Las fotos de evidencia no son el dato
  sensible del sistema — la contraseña del equipo y las licencias van
  cifradas aparte en la base de datos, nunca en un archivo — así que no
  hace falta autenticación para verlas, igual que cuando las servía el
  backend directamente.

---

## Paso 2 — Desplegar el backend en Railway

1. En Railway: **New Project → Deploy from GitHub repo** → elige
   `javierlunaster/compufix-managuer`.
2. En el servicio creado, entra a **Settings**:
   - **Root Directory**: `backend` (el repo es un monorepo — así Railway
     solo construye esa carpeta con su `Dockerfile`, que ya existe y no
     necesita cambios).
3. **Variables** (pestaña Variables del servicio) — agrega:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la del Paso 1.1 |
   | `JWT_SECRET` | genera uno nuevo: `openssl rand -base64 48` |
   | `JWT_EXPIRES_IN` | `8h` |
   | `ENCRYPTION_KEY` | **la misma que ya usas en tu `.env` local** — ver aviso abajo |
   | `SUPABASE_URL` | del Paso 1.2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | del Paso 1.2 |
   | `SUPABASE_STORAGE_BUCKET` | `attachments` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | déjalo vacío por ahora, lo completas en el Paso 4 |

   > **⚠️ `ENCRYPTION_KEY` no se genera de nuevo.** Cifra las contraseñas
   > de equipos y licencias que ya tienes guardadas en tu base local. Si
   > pones una distinta a la de tu `backend/.env` actual, esos datos
   > quedan indescifrables para siempre. Cópiala tal cual.

4. **Deploy**. Railway construye la imagen con el `Dockerfile` de
   `backend/`; al arrancar, el propio contenedor corre
   `npx prisma migrate deploy` automáticamente (ya viene así en el
   `CMD` del Dockerfile) — esto crea todas las tablas en tu base de
   Supabase, todavía vacías.
5. Cuando el deploy quede "Active": **Settings → Networking → Generate
   Domain**. Copia esa URL (ej. `https://compufix-backend-production.up.railway.app`) —
   la necesitas en los pasos siguientes. Verifica que responde:
   `https://<esa-url>/api/health` debería devolver `{"status":"ok"}` o similar.

---

## Paso 3 — Migrar tus datos reales (local → Supabase)

Corre esto **en tu computadora** (donde tienes `docker-compose.yml`
corriendo con tus datos reales), no en Railway.

### 3.1 Exportar desde tu entorno local

```bash
cd compufix-manager-claude    # la carpeta del proyecto
./deploy/export-test-data.sh
```

Esto genera `deploy/migration-export/datos.dump` (todas las tablas) e
intenta empaquetar `uploads.tar.gz`. Como en desarrollo el backend corre
directo con `npm run start:dev` (no en un contenedor Docker), ese segundo
paso va a decir "no se encontró la carpeta uploads en el contenedor" — es
normal, ignóralo: tus fotos ya están directo en `backend/uploads/` en tu
disco, no dentro de un contenedor.

### 3.2 Importar las tablas a Supabase

Necesitas el cliente de PostgreSQL instalado (`pg_restore`):
Windows → instala [PostgreSQL](https://www.postgresql.org/download/windows/)
(solo necesitas marcar "Command Line Tools" en el instalador, no el
servidor completo).

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres.xxxx:TU-PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres"
./deploy/import-to-supabase.sh
```

(En Windows, corre este `.sh` desde Git Bash o WSL — PowerShell no
ejecuta scripts bash directamente.)

Confirma escribiendo `si` cuando el script pregunte por `ENCRYPTION_KEY`.

### 3.3 Migrar las fotos a Supabase Storage

```bash
cd backend
DATABASE_URL="postgresql://postgres.xxxx:TU-PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres" `
SUPABASE_URL="https://tu-proyecto.supabase.co" `
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key" `
npm run migrate-uploads -- ./uploads
```

(Ajusta la sintaxis de variables de entorno según tu shell — el ejemplo de
arriba es PowerShell con backtick de continuación; en Git Bash/WSL usa
`VAR=valor VAR2=valor2 npm run migrate-uploads -- ./uploads` en una sola
línea.)

Al terminar, verifica en Supabase → Storage → `attachments` que aparecen
los archivos, y en Supabase → Table Editor → `attachments` que la columna
`file_url` ahora empieza con `https://` en vez de `/uploads/`.

---

## Paso 4 — Desplegar el frontend en Railway

1. En el mismo proyecto de Railway: **New → GitHub Repo** (el mismo repo
   otra vez, como segundo servicio).
2. **Settings → Root Directory**: `frontend`.
3. **Variables**:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://<dominio-del-backend-del-Paso-2>/api` |

   Railway pasa las variables del servicio como build args al `Dockerfile`
   (que ya tiene `ARG VITE_API_URL` — no hay que tocar el Dockerfile).
   **Ojo**: como es una SPA compilada a archivos estáticos, si cambias esta
   variable más adelante hay que volver a desplegar (Railway → Deployments
   → Redeploy) para que se refleje — no basta con reiniciar el contenedor.

4. **Deploy**, y luego **Settings → Networking → Generate Domain**. Copia
   esa URL — es el dominio público de tu aplicación.

## Paso 5 — Cerrar el círculo: CORS

Vuelve al servicio del **backend** en Railway → Variables → completa
`FRONTEND_URL` con la URL del frontend del Paso 4 (con `https://`, sin
barra final), y vuelve a desplegar el backend (Deployments → Redeploy)
para que tome el nuevo valor.

---

## Verificación final

1. Abre la URL del frontend. Deberías ver la pantalla de login.
2. Entra con un usuario que ya existía en tus datos migrados.
3. Abre una orden que ya tenía fotos y confirma que se ven (vienen de
   Supabase Storage ahora, no del backend).
4. Si algo cifrado (contraseña de equipo, licencia) no se puede leer, es
   la señal de que `ENCRYPTION_KEY` en Railway no coincide con la que
   usaba tu entorno local — corrígela y no vuelvas a importar los datos
   (la clave se puede cambiar en Railway sin tocar la base de datos, pero
   los valores ya cifrados con la clave vieja seguirán ilegibles: si esto
   pasa, avísame y lo resolvemos).

## Respaldos hacia adelante

- **Base de datos**: Supabase hace backups automáticos (Project Settings →
  Database → Backups; en el plan gratuito son diarios con retención
  corta). Para algo más robusto, `deploy/backup.sh` sigue sirviendo si
  apuntas `DB_USER`/`DB_NAME`/`SUPABASE_DB_URL` a Supabase en vez de a un
  Postgres en Docker — para eso, ajusta ese script a `pg_dump
  "$SUPABASE_DB_URL"` en vez de `docker compose exec`.
- **Fotos**: viven en Supabase Storage, cubiertas por los mismos backups
  del proyecto.
