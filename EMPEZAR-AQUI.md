# COMPufix Manager — Empieza Aquí

Sistema de gestión para talleres de reparación de computadores: clientes, recepción de equipos, diagnóstico, cotizaciones, inventario, ventas, compras, caja, garantías, portal de clientes, y reportes financieros.

Esta guía te lleva paso a paso desde cero hasta tener el sistema funcionando en tu computador. Está pensada para alguien que **nunca ha visto este proyecto antes** — no necesitas saber nada de lo que se decidió durante su desarrollo para poder instalarlo y usarlo.

> Si más adelante quieres entender el *por qué* de una decisión técnica específica (por ejemplo, "¿por qué el stock no se puede editar directamente?"), todo ese detalle está en `README.md` — es la bitácora completa del desarrollo, fase por fase. No hace falta leerlo para instalar ni para usar el sistema.

---

## 1. Lo que necesitas tener instalado

| Programa | Para qué | Dónde conseguirlo |
|---|---|---|
| **Node.js** (versión 20 o superior) | Correr el backend y el frontend | https://nodejs.org (elige la versión "LTS") |
| **Docker Desktop** | Correr la base de datos (PostgreSQL) sin instalarla manualmente | https://www.docker.com/products/docker-desktop |

Con eso basta. No necesitas instalar PostgreSQL por separado, ni ninguna otra herramienta — Docker se encarga de la base de datos.

**Verifica que ambos quedaron bien instalados** abriendo una terminal (PowerShell en Windows, o Terminal en Mac/Linux) y escribiendo:

```bash
node --version
docker --version
```

Si ambos comandos responden con un número de versión (no un error), estás listo para continuar.

---

## 2. Descomprime el proyecto

Descomprime el archivo `.zip` que recibiste en una carpeta de tu preferencia — por ejemplo `C:\dev\compufix-manager` en Windows, o `~/dev/compufix-manager` en Mac/Linux. El resto de esta guía asume que estás parado en esa carpeta.

---

## 3. Levanta la base de datos

Desde la carpeta raíz del proyecto (donde está este archivo):

```bash
docker compose up -d
```

Esto descarga (la primera vez) y levanta PostgreSQL en segundo plano. Puedes confirmar que quedó corriendo con:

```bash
docker compose ps
```

Deberías ver un servicio llamado `postgres` con estado "Up" o "running".

---

## 4. Configura y arranca el backend

```bash
cd backend
copy .env.example .env        # en Windows (PowerShell/CMD)
cp .env.example .env          # en Mac/Linux

npm install
npx prisma migrate deploy
npm run seed
npm run start:dev
```

Qué hace cada paso:
- **`.env`** — la configuración del backend (contraseña de la base de datos, secretos de sesión). El archivo `.env.example` ya trae valores que funcionan tal cual para uso local — no necesitas cambiar nada para empezar.
- **`npm install`** — instala las dependencias del proyecto.
- **`npx prisma migrate deploy`** — crea todas las tablas de la base de datos.
- **`npm run seed`** — carga los catálogos iniciales (marcas de equipos, tipos de dispositivo, roles de usuario, y un usuario administrador).
- **`npm run start:dev`** — arranca el backend. Deja esta terminal abierta; deberías ver el mensaje `COMPufix Manager API escuchando en http://localhost:3000/api`.

---

## 5. Configura y arranca el frontend

Abre una **segunda terminal** (deja la del backend corriendo) y desde la carpeta raíz del proyecto:

```bash
cd frontend
npm install
npm run dev
```

Cuando termine, verás algo como `Local: http://localhost:5173/` — esa es la dirección de la aplicación.

---

## 6. Entra al sistema

Abre `http://localhost:5173` en tu navegador. Inicia sesión con:

- **Usuario:** `admin`
- **Contraseña:** `CambiarEstaClave123!`

**Lo primero que deberías hacer es cambiar esa contraseña** — hay un enlace "Cambiar contraseña" al pie del menú lateral, junto a "Cerrar sesión".

---

## 7. Primeros pasos recomendados una vez adentro

El sistema arranca con los catálogos básicos ya cargados (marcas, tipos de equipo, roles), pero **sin ningún cliente, orden, ni producto** — es una base limpia para que la ajustes a tu propio taller:

1. **Cambia la contraseña del administrador** (paso anterior).
2. **Crea los usuarios de tu equipo** (menú Usuarios) — técnicos, personal de recepción, etc., cada uno con su rol.
3. **Carga tu inventario inicial** (menú Inventario) — productos, categorías, precios.
4. **Configura tu catálogo de servicios** (desde Cotizaciones → "Gestionar servicios →") con los precios que cobras.
5. **Revisa las marcas y tipos de equipo** (se cargan de fábrica con las más comunes; puedes agregar más según lo que repares).
6. Cuando tengas todo listo, **empieza a recibir equipos de verdad** desde Reparaciones → Recibir equipo.

---

## 8. Para el día a día: un acceso directo en el Escritorio

Repetir los pasos 3-5 cada vez que quieras trabajar sería tedioso. En la raíz del proyecto hay dos archivos ya preparados para esto (Windows):

- **`start-compufix-dev.bat`** — levanta la base de datos, abre el backend y el frontend cada uno en su propia ventana, y abre el navegador solo.
- **`stop-compufix-dev.bat`** — detiene la base de datos ordenadamente.

Para tener un ícono en el Escritorio: clic derecho sobre `start-compufix-dev.bat` → **Enviar a** → **Escritorio (crear acceso directo)**. Ver la sección "Lanzador de Escritorio para Modo Desarrollo" en `README.md` para más detalle.

---

## 9. Si algo no arranca

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El backend se cae con "Faltan variables de entorno obligatorias" | No copiaste `.env.example` como `.env`, o falta algún valor | Repite el paso 4, confirma que el archivo se llama exactamente `.env` (sin `.example`) |
| El backend no puede conectarse a la base de datos | Docker Desktop no está corriendo, o el contenedor no arrancó | Abre Docker Desktop, espera a que inicie, corre `docker compose up -d` de nuevo |
| `npm install` bloquea scripts de `bcrypt`/`prisma` con una advertencia de seguridad | Versión reciente de npm que bloquea scripts de instalación por defecto | Corre `npm approve-scripts --all` y vuelve a correr `npm install` |
| `npm run dev` dice "Missing script" | El script se llama `start:dev`, no `dev` (en el backend) | Usa `npm run start:dev` |
| Página en blanco o error raro en el navegador | Puede ser cualquier cosa — revisa la consola del navegador (F12) | El sistema tiene un mecanismo que muestra el error en pantalla en vez de dejar todo en blanco; copia ese mensaje si necesitas ayuda |

---

## 10. Para ir más allá de tu computador

Cuando quieras que el sistema sea accesible desde internet (no solo tu computador), o distribuirlo como un instalador de Windows para otro equipo, hay dos caminos ya preparados y documentados en `README.md`:

- **`installer/`** — un instalador de Windows (`.exe`) para llevar el sistema al computador de un taller sin que esa persona tenga que tocar una terminal.
- **`docker-compose.prod.yml`** — para publicar el sistema en un servidor con dominio propio y HTTPS real.

Ambos caminos tienen su propia sección detallada en `README.md`, incluyendo las advertencias de seguridad que hay que tener en cuenta antes de dar ese paso (especialmente sobre no perder la llave de cifrado de las contraseñas de equipos ya guardadas).
