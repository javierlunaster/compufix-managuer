# Instalador de Windows para COMPufix Manager

## ⚠️ Paso obligatorio ANTES de compilar el instalador

**Este proyecto nunca tuvo acceso a una base de datos real durante su
desarrollo** (se construyó en un entorno sin conexión a internet ni a
Postgres — está documentado en cada fase del README principal). Eso
significa que la carpeta `backend/prisma/migrations/` **no existe
todavía**. El backend arranca ejecutando `npx prisma migrate deploy`
(aplica migraciones ya generadas), no `migrate dev` (que las genera) — así
que sin ese paso previo, el instalador levantaría los contenedores
perfectamente, pero **las tablas de la base de datos nunca se crearían**,
y la aplicación fallaría al primer intento de login o de cualquier
consulta.

Antes de compilar el instalador, en tu máquina de desarrollo (con Docker
funcionando), corre esto **una sola vez**:

```bash
cd compufix-manager
docker compose up -d          # levanta Postgres (docker-compose.yml de desarrollo)
cd backend
cp .env.example .env          # si no lo tenías ya
npm install
npx prisma migrate dev --name init
```

Esto crea `backend/prisma/migrations/<fecha>_init/migration.sql`. Esa
carpeta debe quedar dentro del proyecto antes de compilar el instalador —
Inno Setup la empaqueta automáticamente junto con el resto del código del
backend (no está en la lista de exclusiones). Sin este paso, el
instalador queda incompleto, no importa cuántas veces se recompile.

## Qué instala esto y qué NO instala

**Se instala en la máquina del taller:**
- El código del backend y del frontend (como archivos fuente, no
  compilados).
- Los scripts que arrancan/detienen todo con Docker.
- Accesos directos en el Menú Inicio y (opcional) el Escritorio.

**NO se instala Node.js ni PostgreSQL en Windows.** Todo corre dentro de
contenedores Linux que Docker Desktop administra — el único requisito
real en la máquina del taller es tener **Docker Desktop** instalado
(gratuito, https://www.docker.com/products/docker-desktop). El instalador
lo verifica al iniciar la instalación y avisa si no lo encuentra.

La primera vez que alguien hace clic en "Iniciar COMPufix Manager", Docker
construye las imágenes (descarga dependencias, compila) — puede tardar
varios minutos según la conexión a internet del taller. Las siguientes
veces arranca en segundos, porque las imágenes ya quedaron construidas.

## Cómo compilar el instalador (una vez, en tu máquina de desarrollo)

1. Completa el paso obligatorio de arriba (generar la migración inicial).
2. Descarga e instala **Inno Setup** (gratuito):
   https://jrsoftware.org/isdl.php
3. Abre `installer/setup.iss` con el "Inno Setup Compiler".
4. Menú **Build → Compile** (o `Ctrl+F9`).
5. El instalador queda en `installer/Output/COMPufix-Manager-Setup.exe`.

Ese único archivo `.exe` es lo que se comparte con el taller — no hace
falta compartir el proyecto completo ni explicar nada de Docker Compose.

## Qué ve la persona que instala esto en el taller

1. Ejecuta `COMPufix-Manager-Setup.exe`, acepta los permisos de
   administrador (necesarios para instalar en Archivos de Programa).
2. Si no tiene Docker Desktop instalado, el instalador se lo advierte con
   el enlace de descarga, y le pregunta si quiere continuar de todas
   formas (puede instalar Docker después y usar los accesos directos con
   normalidad).
3. Al terminar, puede marcar la casilla para crear un acceso directo en el
   Escritorio, y elegir que se inicie la aplicación de inmediato.
4. "Iniciar COMPufix Manager" hace todo el trabajo: revisa que Docker esté
   corriendo, genera una configuración propia con contraseñas aleatorias
   la primera vez, construye y levanta los contenedores, carga los
   catálogos iniciales (marcas, tipos de equipo, roles, usuario
   administrador) solo la primera vez, y abre el navegador en
   `http://localhost:8080` cuando todo está listo.
5. El usuario y contraseña iniciales son `admin` / `CambiarEstaClave123!`
   — el mismo de siempre desde el seed de la Fase 1. Cambiarla es lo
   primero que debería hacer quien administre el sistema.
6. "Detener COMPufix Manager" apaga los contenedores sin borrar nada — la
   próxima vez que se inicie, todo sigue donde quedó.

## Actualizar la aplicación más adelante

Cuando haya una versión nueva del código:

1. Vuelve a compilar el instalador con el código actualizado (repite los
   pasos de compilación de arriba — **sin** volver a correr
   `prisma migrate dev --name init`; si hay cambios de schema nuevos,
   genera una migración adicional con
   `npx prisma migrate dev --name <algo-descriptivo>`, que se suma a las
   ya existentes, nunca las reemplaza).
2. Corre el instalador nuevo sobre la instalación existente — Inno Setup
   sobrescribe los archivos de la aplicación, pero **no toca los
   volúmenes de Docker** (la base de datos y las fotos subidas quedan
   intactas).
3. Al iniciar de nuevo, Docker reconstruye las imágenes con el código
   nuevo, y `prisma migrate deploy` aplica automáticamente cualquier
   migración nueva que no se hubiera aplicado todavía.

## Desinstalar

Desde "Agregar o quitar programas" de Windows, o el acceso directo
"Desinstalar COMPufix Manager". Esto detiene los contenedores y borra los
archivos de la aplicación — **los volúmenes de Docker con los datos NO se
borran automáticamente**, a propósito, por si se vuelve a instalar
después. Si de verdad se quiere borrar todo, incluidos los datos, hay que
hacerlo manualmente desde una terminal:

```bash
docker compose -f docker-compose.installer.yml down -v
```

## Limitaciones conocidas de este instalador

1. **No hay HTTPS ni certificado.** Es una instalación de un solo
   computador, accedida por `localhost` — no aplica el mismo riesgo que
   un servidor expuesto a internet (ver `docker-compose.prod.yml` para
   ese escenario, que sí necesita un dominio y proxy inverso con TLS).
2. **No se probó en un Windows real.** Este instalador se escribió y
   revisó cuidadosamente contra la documentación de Inno Setup y el
   comportamiento conocido de Docker Desktop/PowerShell, pero no hay
   forma de compilarlo ni ejecutarlo en este entorno de trabajo (sin
   Windows, sin el compilador de Inno Setup, sin Docker). La primera
   compilación y prueba real en una máquina Windows es el momento en que
   esto se valida de verdad — si algo falla, lo más probable es un
   detalle de sintaxis de Pascal Script en la sección `[Code]`, o una ruta
   de Docker Desktop distinta a la que se verificó (por ejemplo, si
   Docker Desktop se instaló en una unidad de disco distinta a `C:`).
3. **Un solo puerto fijo por servicio** (3000 para el backend, 8080 para
   el frontend) — si el computador del taller ya tiene algo corriendo en
   esos puertos, hay conflicto. Se pueden cambiar editando
   `docker-compose.installer.yml` antes de compilar.
