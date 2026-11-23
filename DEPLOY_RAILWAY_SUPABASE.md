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

---

## Replicar el sistema para un cliente nuevo

Este mismo repositorio sirve para comercializar el sistema a otros talleres,
sin tocar una sola línea de código por cliente: cada cliente es un
**despliegue independiente** (su propio proyecto de Railway, su propia base
de datos, su propio Storage), pero **todos corren exactamente el mismo
código**, controlado por variables de entorno — el mismo mecanismo que ya
usa la marca (`BUSINESS_NAME`, `VITE_LOGO_URL`, etc., ver
`backend/src/common/config/branding.config.ts` y `frontend/src/lib/branding.ts`).

**La pieza clave para que las actualizaciones se reflejen en todos los
sistemas**: el proyecto de Railway de cada cliente nuevo se conecta al
**mismo repo de GitHub y a la misma rama** que ya usa este despliegue —
nunca se hace un fork ni se copia el código a una carpeta aparte. Railway
redespliega automáticamente cada servicio cuando llega un push nuevo a esa
rama, así que un solo `git push` actualiza a CompuFix y a cualquier otro
cliente al mismo tiempo, sin ningún paso manual adicional. Si algún día se
necesita que un cliente se quede en una versión anterior mientras el resto
avanza, ahí sí se le cambiaría a su propia rama — pero mientras todos
comparten el mismo comportamiento, no hace falta.

### Paso A — Base de datos y Storage del cliente nuevo

1. **Postgres**: en el proyecto de Railway del cliente nuevo (créalo aparte,
   no lo agregues al proyecto de CompuFix) → **New → Database → Add
   PostgreSQL**. Railway genera su propio `DATABASE_URL` (variable
   `DATABASE_URL` del plugin, referenciable como `${{Postgres.DATABASE_URL}}`
   desde el servicio de backend) — nunca reuses la base de datos de
   CompuFix ni ninguna de sus variables.
2. **Storage**: crea un proyecto de Supabase **nuevo** (Paso 1 de esta
   guía, con su propio bucket `attachments` público) — uno por cliente,
   nunca el mismo proyecto de Supabase para dos clientes distintos, o las
   fotos de un cliente terminarían mezcladas en el bucket del otro.

### Paso B — Backend del cliente nuevo

Mismo Paso 2 de esta guía (Root Directory `backend`, mismo repo), pero con
variables **todas nuevas**, nunca copiadas de CompuFix:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la del Postgres del Paso A.1 |
| `JWT_SECRET` | nuevo: `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `8h` |
| `ENCRYPTION_KEY` | nueva: `openssl rand -base64 32` (a diferencia de CompuFix, un cliente nuevo no tiene datos previos que descifrar, así que aquí sí se genera una nueva) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | del proyecto de Supabase del Paso A.2 |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | vacío por ahora (Paso 5) |
| `BUSINESS_NAME` / `BUSINESS_TAGLINE` | nombre y lema del negocio del cliente (ver `backend/.env.example`) |
| `RESEND_API_KEY` / `MAIL_FROM` | opcional — solo si el cliente quiere notificaciones por correo, con su propio dominio verificado en Resend |

### Paso C — Base de datos en blanco (sin datos de CompuFix)

Con `DATABASE_URL` apuntando a la base del cliente nuevo:

```bash
cd backend
npx prisma migrate deploy   # crea las tablas
npm run seed                 # catálogos genéricos: roles, admin, tipos de
                              # equipo, marcas, categorías de producto
```

**No definas `SEED_COMPUFIX_BUSINESS_DATA`.** Sin esa variable (el
comportamiento por defecto), el seed deja fuera los servicios, proveedores
y cuentas bancarias reales de CompuFix — esos datos solo se siembran si se
pone `SEED_COMPUFIX_BUSINESS_DATA=true` explícitamente, y eso nunca debe
pasar en la base de datos de otro cliente.

Entra con `admin` / `CambiarEstaClave123!` y **cambia la contraseña de
inmediato** (Cambiar contraseña, en el pie del menú).

### Paso D — Frontend del cliente nuevo

Mismo Paso 4 de esta guía (Root Directory `frontend`), con `VITE_API_URL`
apuntando al backend del Paso B, más las variables de marca del cliente
(`VITE_BUSINESS_NAME`, `VITE_LOGO_URL`, `VITE_WHATSAPP_NUMBER`,
`VITE_SOCIAL_*`, etc. — ver `frontend/.env.example` para la lista
completa). Cierra el círculo de CORS igual que el Paso 5.

### Qué NO se replica

- **Código**: nunca se copia ni se bifurca — los dos despliegues corren el
  mismo repo/rama, eso es justo lo que mantiene las correcciones
  sincronizadas sin esfuerzo.
- **Secretos**: `JWT_SECRET`, `ENCRYPTION_KEY`, credenciales de Supabase —
  cada cliente los suyos, nunca compartidos entre despliegues.
- **Datos**: cada cliente tiene su propia base de datos y su propio bucket
  de Storage — cero cruce de información entre clientes.
