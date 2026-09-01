# COMPufix Manager — Fase 1: Arquitectura + Modelo de Datos

> **¿Vas a desplegar en internet (Railway + Supabase)?** Ve directo a
> [`DEPLOY_RAILWAY_SUPABASE.md`](./DEPLOY_RAILWAY_SUPABASE.md). Lo de
> abajo es la guía de desarrollo local, fase por fase.

Esta fase entrega el **modelo de datos definitivo** (`backend/prisma/schema.prisma`), la infraestructura local para correrlo, y catálogos iniciales cargados desde los hallazgos del Excel. No incluye todavía API ni interfaz — eso empieza en la Fase 2 (autenticación) y Fase 3 (clientes + equipos), como se acordó en el plan de 14 fases.

## Qué se construyó en esta fase

- **`backend/prisma/schema.prisma`** — 40 modelos y 12 enums que traducen el análisis del Excel (documento `COMPufix-Manager-Analisis-Arquitectura.md`) a un modelo relacional normalizado en PostgreSQL. Cada decisión de diseño está comentada en el propio archivo, justo donde aplica, referenciando la sección del Excel o del brief de la que viene.
- **`docker-compose.yml`** — PostgreSQL 16 + Adminer (interfaz web para inspeccionar la base de datos), para correr todo localmente sin instalar Postgres a mano.
- **`backend/prisma/seed.ts`** — Carga los catálogos que ya existían en el Excel (marcas normalizadas, tipos de equipo normalizados, categorías de producto, servicios, proveedores recurrentes, cuentas de pago) más un usuario administrador inicial.
- **`backend/.env.example`** — plantilla de variables de entorno.

## Decisiones técnicas clave de esta fase

1. **ORM: Prisma sobre PostgreSQL.** Da migraciones versionadas (`prisma migrate`) y tipado automático en TypeScript, algo importante porque el proyecto va a crecer en 14 fases y necesitamos que cada fase pueda modificar el esquema sin romper las anteriores.
2. **Ningún borrado físico.** Todas las tablas de negocio tienen un campo `status` (`ACTIVE`/`INACTIVE`) en vez de permitir `DELETE`. Esto es la Regla 1 del brief y también resuelve, de raíz, el problema de pérdida de información que tenía el Excel.
3. **El inventario nunca se edita directo.** `Product.stock` es un campo de caché; la fuente de verdad es la tabla `InventoryMovement`. Cualquier entrada o salida de inventario (compra, venta, uso en reparación, ajuste, pérdida, garantía) queda registrada como un movimiento, nunca como una edición silenciosa del stock.
4. **Nada de columnas fijas para lo que es una lista.** El Excel tenía patrones como `Procedimiento 1/2/3/4` (4 columnas fijas) o `Referencia Jawan` / `Referencia Virtual Tronic` (una columna por proveedor). En el modelo nuevo esto son tablas relacionales (`RepairProcedure`, `ProductSupplierRef`) que admiten cualquier cantidad sin tocar el esquema.
5. **Datos sensibles cifrados, nunca en texto plano.** `RepairOrder.devicePasswordEncrypted` y `SoftwareLicense.passwordEncrypted` se cifran a nivel de aplicación (AES) — se implementa en la Fase 2 junto con la capa de autenticación. El Excel guardaba las contraseñas de licencias de Windows/Office en texto plano; eso no se replica.
6. **Historial de estados separado del estado actual.** `RepairOrder.status` es el estado actual; `RepairStatusHistory` guarda cada transición con fecha, usuario y observación. El Excel solo tenía el estado final, por eso ese historial se pierde para los datos históricos y solo aplica hacia adelante (como se confirmó en la revisión del documento de arquitectura).
7. **Cotizaciones separadas por tipo.** `SupplierPriceRequest` (compras — mapea la hoja "Cotizaciones" real del Excel, confirmado) es una entidad distinta de `CustomerQuotation` (cotización a cliente, nueva, sin histórico).

## Cómo ejecutar esto localmente

Requisitos: Docker y Docker Compose, Node.js 18+.

```bash
# 1. Levantar PostgreSQL + Adminer
docker compose up -d

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# (los valores por defecto ya coinciden con docker-compose.yml, no es
# obligatorio cambiar nada para probar en local)

# 4. Generar la migración inicial a partir del schema
npx prisma migrate dev --name init

# 5. Cargar los catálogos iniciales
npm run seed

# 6. (Opcional) Explorar la base de datos visualmente
npx prisma studio
# o entrar a Adminer en http://localhost:8080
# Sistema: PostgreSQL, Servidor: postgres, Usuario: compufix,
# Contraseña: compufix_local, Base de datos: compufix
```

> **Nota sobre este entorno de trabajo**: el sandbox donde se generó este código no tiene acceso a internet ni a Docker, por lo que el `schema.prisma` no se pudo validar corriendo `prisma migrate` de forma automática aquí. Sí se verificó manualmente balance de llaves, que cada relación con nombre (`@relation("...")`) esté correctamente emparejada en ambos extremos, y que todo tipo referenciado (modelo o enum) esté definido en el archivo. Aun así, al ejecutar el paso 4 en tu máquina es el momento de confirmar que todo compila contra una base de datos real — si Prisma reporta algún error de validación, lo corregimos de inmediato antes de seguir a la Fase 2.

## Estructura del proyecto

```
compufix-manager/
├── docker-compose.yml          # Postgres + Adminer para desarrollo local
├── README.md                   # este archivo
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── prisma/
        ├── schema.prisma       # modelo de datos completo (Fase 1)
        └── seed.ts             # catálogos iniciales desde el Excel
```

En la Fase 2 se agrega `backend/src/` con el módulo de autenticación (NestJS), y a partir de ahí cada fase añade su propio módulo dentro de `src/` siguiendo la misma estructura por dominio (clientes, recepciones, diagnóstico, inventario, etc.), tal como se listó en la sección F del documento de arquitectura.

## Catálogos cargados por el seed

| Catálogo | Origen | Cantidad |
|---|---|---|
| Roles | sección 21 del brief | 6 |
| Tipos de equipo | normalizado de 21 variantes en `Ingreso de equipos` | 6 |
| Marcas | normalizado de variantes tipo `Hp`/`HP`/`hp` | 11 |
| Categorías de producto | sección 11 del brief + bloques de `INVENTARIO`/`DISOS Y COMPONTE` | 17 |
| Servicios | muestra de `Codigos de facturacion` (completar el resto en Configuración) | 3 |
| Proveedores | `Compras`/`Cotizaciones` | 3 |
| Cuentas de pago | hoja `Transferencias` | 3 |

Los precios de los servicios se dejaron en `0` porque el Excel (`Codigos de facturacion`) solo tenía descripción, no precio — hay que definirlos manualmente en el módulo de Configuración antes de usarlos en cotizaciones reales.

## Qué sigue

Con la arquitectura y el modelo de datos aprobados, la **Fase 2** implementa autenticación (login, JWT, roles/permisos aplicados a nivel de API) y deja el backend listo para que la Fase 3 (Clientes + Equipos) empiece a exponer endpoints reales.

---

# Fase 2: Autenticación + Usuarios + Roles

## Qué se construyó en esta fase

Se agregó `backend/src/` con una API NestJS real:

- **`auth/`** — login con usuario/contraseña, emisión de JWT, cambio de contraseña propia.
- **`users/`** — CRUD de usuarios del sistema (crear, editar, resetear contraseña de otro usuario, desactivar/reactivar). Restringido al rol Administrador.
- **`roles/`** — lectura de roles (la creación de roles/permisos personalizados se deja para el módulo de Configuración en una fase posterior).
- **`prisma/`** — `PrismaService`/`PrismaModule` para inyectar el cliente de Prisma en cualquier servicio.
- **`audit/`** — `AuditService`, un wrapper delgado sobre `AuditLog` que ya usa `UsersService` en cada creación/edición/desactivación. Este es el patrón que se reutilizará en todas las fases siguientes para cumplir la Regla 10 y la sección 26 del brief (trazabilidad).
- **`common/decorators/public.decorator.ts`** — marca endpoints que no requieren token (por ahora, solo `POST /auth/login`).

## Decisiones técnicas clave de esta fase

1. **Todo protegido por defecto.** `JwtAuthGuard` se registra como guard global en `AppModule`. Cualquier endpoint nuevo que se agregue en fases futuras queda protegido automáticamente, incluso si el desarrollador olvida pensarlo — hay que marcar explícitamente `@Public()` para abrir una ruta, nunca al revés. Es más seguro fallar cerrado que fallar abierto.
2. **El estado del usuario se revalida en cada request, no solo al hacer login.** `JwtStrategy.validate()` vuelve a consultar la base de datos en cada petición autenticada. Si un administrador desactiva a un usuario, ese usuario pierde acceso de inmediato — no tiene que esperar a que expire su token (por defecto, 8 horas).
3. **Restricción por rol vía `@Roles()` + `RolesGuard`**, no hardcodeado en cada servicio. `UsersController` está marcado `@Roles("Administrador")` a nivel de clase: crear/editar/desactivar personal es una operación administrativa, no algo que necesite Recepción o Ventas.
4. **Nunca se borra un usuario.** `deactivate()` marca `status: INACTIVE` (Regla 1 del brief), nunca hace `DELETE`. Como el punto 2 ya revalida el estado en cada request, desactivar es tan efectivo como borrar en términos de seguridad, sin perder el historial.
5. **Mensajes de error genéricos en login.** "Usuario o contraseña incorrectos" cubre ambos casos (usuario inexistente o contraseña mala) a propósito, para no confirmarle a alguien por prueba y error qué nombres de usuario existen en el sistema.
6. **Auditoría desde ya, no como algo que se agrega después.** Se estableció el patrón (`AuditService.log(...)`) en esta fase, sobre la entidad más simple (usuarios), para que las fases de inventario, pagos y precios —donde la trazabilidad es obligatoria según la sección 26 del brief— lo reutilicen directamente en vez de tener que diseñarlo bajo presión más adelante.
7. **`ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`.** Cualquier campo que no esté declarado explícitamente en un DTO hace que el request completo se rechace. Esto evita que, por accidente, alguien pueda enviar `passwordHash` o `status` directamente en el body de un `PATCH /users/:id` y saltarse la lógica de negocio.

## Cómo ejecutar esto localmente

Continúa desde donde quedó la Fase 1 (Postgres ya debe estar corriendo y migrado).

```bash
cd backend
npm install            # ahora instala también NestJS, Passport, JWT, class-validator...
cp .env.example .env   # si no lo habías hecho en la Fase 1
# completa JWT_SECRET con un valor propio (no dejar el placeholder en producción)

npx prisma generate    # regenera el cliente de Prisma si no lo habías hecho
npm run start:dev      # levanta la API en http://localhost:3000/api
```

### Probar el login

El seed de la Fase 1 ya crea un usuario administrador:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "CambiarEstaClave123!"}'
```

Debe responder con `accessToken` y los datos básicos del usuario. Usa ese token en el header `Authorization: Bearer <token>` para el resto de endpoints:

```bash
# Cambiar la contraseña del admin (recomendado hacerlo de inmediato)
curl -X PATCH http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "CambiarEstaClave123!", "newPassword": "una-clave-nueva-segura"}'

# Listar roles disponibles (cualquier usuario autenticado)
curl http://localhost:3000/api/roles -H "Authorization: Bearer <token>"

# Crear un técnico nuevo (requiere rol Administrador)
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Juan Pérez",
    "username": "jperez",
    "password": "claveTemporal123",
    "roleId": 3
  }'
```

> **Nota sobre este entorno de trabajo**: igual que en la Fase 1, este sandbox no tiene acceso a internet, así que no pude correr `npm install` ni levantar la API para probar los endpoints end-to-end aquí. Sí revisé manualmente que cada archivo tenga las llaves y paréntesis balanceados y que los imports entre módulos sean consistentes. El primer paso al correr esto en tu máquina es justamente `npm install && npm run start:dev` — si Nest reporta algún error de compilación o de dependencias circulares entre módulos, lo corregimos de inmediato antes de seguir a la Fase 3.

## Estructura del proyecto (actualizada)

```
compufix-manager/
├── docker-compose.yml
├── README.md
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.build.json
    ├── nest-cli.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── prisma/
        │   ├── prisma.module.ts
        │   └── prisma.service.ts
        ├── audit/
        │   ├── audit.module.ts
        │   └── audit.service.ts
        ├── common/
        │   └── decorators/
        │       └── public.decorator.ts
        ├── auth/
        │   ├── auth.module.ts
        │   ├── auth.controller.ts
        │   ├── auth.service.ts
        │   ├── dto/
        │   │   ├── login.dto.ts
        │   │   └── change-password.dto.ts
        │   ├── strategies/
        │   │   └── jwt.strategy.ts
        │   ├── guards/
        │   │   ├── jwt-auth.guard.ts
        │   │   └── roles.guard.ts
        │   └── decorators/
        │       ├── roles.decorator.ts
        │       └── current-user.decorator.ts
        ├── users/
        │   ├── users.module.ts
        │   ├── users.controller.ts
        │   ├── users.service.ts
        │   └── dto/
        │       ├── create-user.dto.ts
        │       ├── update-user.dto.ts
        │       └── reset-password.dto.ts
        └── roles/
            ├── roles.module.ts
            ├── roles.controller.ts
            └── roles.service.ts
```

## Endpoints disponibles al cierre de esta fase

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | Público | Login, devuelve JWT |
| PATCH | `/api/auth/change-password` | Autenticado | Cambia la propia contraseña |
| GET | `/api/users` | Administrador | Lista usuarios |
| POST | `/api/users` | Administrador | Crea usuario |
| GET | `/api/users/:id` | Administrador | Detalle de un usuario |
| PATCH | `/api/users/:id` | Administrador | Edita datos de un usuario |
| PATCH | `/api/users/:id/reset-password` | Administrador | Resetea la contraseña de otro usuario |
| PATCH | `/api/users/:id/deactivate` | Administrador | Desactiva (nunca borra) |
| PATCH | `/api/users/:id/reactivate` | Administrador | Reactiva |
| GET | `/api/roles` | Autenticado | Lista roles activos |
| GET | `/api/roles/:id` | Autenticado | Detalle de un rol con sus permisos |

## Qué sigue

Con autenticación, usuarios y roles funcionando, la **Fase 3** agrega los módulos de **Clientes** y **Equipos** (recepción de equipos como entidad — la orden de reparación completa llega en la Fase 4), reutilizando el mismo patrón de `AuditService` para cada creación/edición.

---

# Fase 3: Clientes + Equipos

## Corrección de diseño antes de empezar

En la Fase 1, los datos del equipo (marca, modelo, serial, RAM, disco...) quedaron embebidos directamente en `RepairOrder`. Al construir el módulo de Clientes es cuando esto se vuelve un problema concreto: las **Reglas 5 y 6** del brief dicen que un cliente puede tener varios equipos y que un mismo equipo puede tener varias reparaciones históricas — pero si los datos del equipo viven dentro de cada orden, no hay forma de decir "este portátil ya estuvo aquí 3 veces" sin comparar seriales a mano entre órdenes sueltas.

Se corrigió el modelo: se creó una entidad **`Device`** independiente, dueña de los datos permanentes del equipo (tipo, marca, modelo, serial, placa, specs), relacionada 1:N con `Customer`. `RepairOrder` ahora tiene un `deviceId` en vez de repetir esos campos, y conserva solo lo que es específico de **cada ingreso puntual**: qué accesorios trajo esa vez, en qué estado físico llegó, la contraseña que dio esa vez, la falla reportada esa vez. Esto significa que ya se generó una migración nueva de Prisma — el comando para aplicarla está más abajo.

## Qué se construyó en esta fase

- **`catalogs/`** — endpoints de solo lectura para marcas y tipos de equipo (los necesita cualquier formulario de registro de equipo).
- **`customers/`** — CRUD de clientes con:
  - **Detección de duplicados al crear**: compara el nombre normalizado (sección B/H del documento de arquitectura — minúsculas, sin tildes, espacios colapsados) contra los clientes activos existentes. Si encuentra coincidencias, responde `409 Conflict` con la lista de posibles duplicados en vez de crear un registro nuevo en silencio. El cliente del API puede reintentar con `confirmCreateDespiteDuplicate: true` si de verdad es una persona distinta con el mismo nombre.
  - **Búsqueda rápida** (`GET /customers?search=...`) por nombre, teléfono, WhatsApp o documento — sección 5 del brief.
- **`devices/`** — CRUD de equipos, ligados siempre a un cliente:
  - `GET /devices?customerId=X` — equipos de un cliente.
  - `GET /devices?serial=X` — búsqueda global por número de serie, sin importar el cliente. Útil en recepción para detectar equipos que ya pasaron antes por el taller, incluso si esta vez lo trae otra persona.
  - El detalle de un equipo (`GET /devices/:id`) ya incluye la relación a `repairOrders`, lista para poblarse en la Fase 4 sin más cambios de esquema.

## Decisiones técnicas clave de esta fase

1. **`Device` no se reasigna de cliente.** Si un equipo cambió de dueño, se crea un `Device` nuevo bajo el nuevo cliente en vez de editar el `customerId` del original — reasignar borraría silenciosamente a quién perteneció antes. `UpdateDeviceDto` excluye `customerId` a propósito para que esto no sea posible por accidente vía API.
2. **`serialNumber` es único por cliente, no global.** Dos clientes distintos podrían, en teoría, tener equipos con el mismo serial (error de fábrica, clones). Por eso el índice único es `@@unique([customerId, serialNumber])` y no un unique global sobre `serialNumber` solo.
3. **La detección de duplicados de clientes es un aviso, no un bloqueo duro.** Se decidió así porque los 4 casos reales encontrados en el Excel eran error de captura (confirmado en la Fase 1), pero nombres iguales entre personas distintas sí pueden pasar — de ahí el flag `confirmCreateDespiteDuplicate`.
4. **Sin `@Roles()` en Clientes/Equipos.** A diferencia de `UsersController` (solo Administrador), aquí cualquier usuario autenticado puede crear y consultar — Recepción, Ventas y Técnicos lo necesitan por igual en el día a día.

## Cómo ejecutar esto localmente

Como se modificó `schema.prisma` (nuevo modelo `Device`), hay que generar y aplicar una migración nueva:

```bash
cd backend
npm install             # por si acaso, no se agregaron dependencias nuevas en esta fase
npx prisma migrate dev --name add_devices
npm run start:dev
```

### Probar los endpoints nuevos

```bash
# (usa el token que obtuviste en /api/auth/login)

# Crear un cliente
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"fullName": "Hans Patiño", "phone": "3028110131"}'

# Intentar crear el mismo cliente de nuevo → debe responder 409 con posibleDuplicates
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"fullName": "hans patiño", "phone": "3028110131"}'

# Buscar clientes
curl "http://localhost:3000/api/customers?search=patino" -H "Authorization: Bearer <token>"

# Ver catálogos disponibles para registrar un equipo
curl http://localhost:3000/api/catalogs/device-types -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/catalogs/brands -H "Authorization: Bearer <token>"

# Registrar un equipo para el cliente creado (usa el id que devolvió el POST anterior)
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"customerId": 1, "deviceTypeId": 1, "brandId": 1, "model": "ThinkPad E14", "serialNumber": "PF3ABC12"}'

# Ver el detalle del cliente, incluyendo sus equipos
curl http://localhost:3000/api/customers/1 -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude correr `prisma migrate dev` ni levantar la API aquí (sin acceso a internet). Verifiqué manualmente el balance de llaves en los 40 archivos TypeScript del proyecto y que cada relación con nombre en el schema esté correctamente emparejada. El primer paso real de validación es tuyo: si `prisma migrate dev --name add_devices` reporta algo raro (por ejemplo, por los datos que ya hayas cargado de prueba en `repair_orders` si llegaste a crear alguno manualmente), avísame el mensaje exacto y lo resolvemos.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 2)...
├── catalogs/
│   ├── catalogs.module.ts
│   ├── catalogs.controller.ts
│   └── catalogs.service.ts
├── customers/
│   ├── customers.module.ts
│   ├── customers.controller.ts
│   ├── customers.service.ts
│   └── dto/
│       ├── create-customer.dto.ts
│       └── update-customer.dto.ts
├── devices/
│   ├── devices.module.ts
│   ├── devices.controller.ts
│   ├── devices.service.ts
│   └── dto/
│       ├── create-device.dto.ts
│       └── update-device.dto.ts
└── common/
    └── utils/
        └── normalize-name.util.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/catalogs/brands` | Autenticado | Lista marcas activas |
| GET | `/api/catalogs/device-types` | Autenticado | Lista tipos de equipo activos |
| POST | `/api/customers` | Autenticado | Crea cliente (409 si hay posible duplicado) |
| GET | `/api/customers?search=` | Autenticado | Búsqueda rápida de clientes |
| GET | `/api/customers/:id` | Autenticado | Detalle de cliente + sus equipos |
| PATCH | `/api/customers/:id` | Autenticado | Edita cliente |
| PATCH | `/api/customers/:id/deactivate` | Autenticado | Desactiva (nunca borra) |
| PATCH | `/api/customers/:id/reactivate` | Autenticado | Reactiva |
| POST | `/api/devices` | Autenticado | Registra un equipo para un cliente |
| GET | `/api/devices?customerId=` | Autenticado | Equipos de un cliente |
| GET | `/api/devices?serial=` | Autenticado | Búsqueda global por número de serie |
| GET | `/api/devices/:id` | Autenticado | Detalle de equipo + historial de reparaciones (vacío hasta la Fase 4) |
| PATCH | `/api/devices/:id` | Autenticado | Edita datos del equipo |
| PATCH | `/api/devices/:id/deactivate` | Autenticado | Desactiva (nunca borra) |

## Qué sigue

Con Clientes y Equipos listos, la **Fase 4** construye la **recepción de equipos y las órdenes de reparación**: generación del código único `C#####`, el flujo de estados con historial, y la pantalla tipo "expediente técnico" descrita en la sección 30 del brief.

---

# Fase 4: Recepción + Órdenes de Reparación

## Qué se construyó en esta fase

- **`repair-orders/`** — el módulo central del sistema:
  - **Creación con generación automática de código** (`POST /repair-orders`): recibe `customerId` + o bien un `deviceId` existente o los datos de un `newDevice` para crear el equipo en el mismo paso (el flujo real de recepción: normalmente el equipo es nuevo para el sistema). El código `C#####` se genera dentro de una transacción de base de datos, usando el `id` autoincremental de la orden — así queda garantizado que nunca hay dos códigos iguales ni huecos por error.
  - **Cambio de estado con historial** (`PATCH /repair-orders/:id/status`): registra estado anterior, estado nuevo, fecha, usuario y observación en `RepairStatusHistory`, tal como pide la sección 7 del brief. El estado inicial `RECEIVED` ya queda registrado como primera entrada del historial al crear la orden.
  - **Bitácora de procedimientos** (`POST /repair-orders/:id/procedures`) — reemplaza las columnas fijas `Procedimiento 1-4` del Excel por una lista de longitud libre (ver Fase 1).
  - **Asignación de técnico** (`PATCH /repair-orders/:id/assign-technician`).
  - **Manejo seguro de la contraseña del equipo**: se recibe en texto plano en la creación (`devicePassword`) pero se cifra antes de guardarse (AES-256-GCM, sección 32 del brief); solo se puede leer con un endpoint dedicado y restringido a Administrador/Gerente/Técnico (`GET /repair-orders/:id/device-password`), y **cada lectura queda auditada**, no solo cada escritura. También existe un endpoint para purgarla (`DELETE /repair-orders/:id/device-password`) una vez entregado el equipo.
  - **Búsqueda** (`GET /repair-orders?search=...`): cubre el caso de uso principal de la sección 25 (búsqueda global) para esta fase — encuentra por código de orden (con o sin el prefijo "C"), por nombre de cliente, o por número de serie del equipo. El resto de la búsqueda global (repuestos, pagos, cotizaciones) se completa cuando esos módulos existan en fases posteriores.
  - **Atajo por código exacto** (`GET /repair-orders/by-code/:code`) — replica el caso de uso literal de la sección 25 del brief: escribir `C11061` y encontrar la orden de inmediato.
- **`common/utils/encryption.util.ts`** — cifrado/descifrado AES-256-GCM reutilizable, ya usado aquí para la contraseña del equipo y listo para reutilizarse en `SoftwareLicense` cuando se construya el módulo de inventario/licencias.

## Decisiones técnicas clave de esta fase

1. **El código de orden se genera dentro de una transacción**, no antes de insertar el registro. Como `orderCode = 'C' + id` depende del `id` autoincremental que Postgres asigna al insertar, la orden se crea primero con un valor temporal único, y se actualiza a `C{id}` en la misma transacción — así nunca queda un código huérfano si algo falla a mitad de camino.
2. **No hay una máquina de estados estricta todavía.** Cualquier usuario autorizado puede mover una orden a cualquier estado del enum `RepairStatus`. Se decidió así para no bloquear el flujo real del taller en esta fase (el MVP de la Fase 1 prioriza flexibilidad); si el negocio pide restringir transiciones inválidas (ej. no poder pasar de `DELIVERED` a `RECEIVED`), se agrega como una validación explícita en `updateStatus()` sin tocar el resto del módulo.
3. **Leer la contraseña del equipo se audita igual que escribirla.** La sección 26 del brief pide trazabilidad de operaciones importantes, y un dato sensible como este es tan importante de vigilar en lectura como en escritura — por eso `revealDevicePassword()` llama a `AuditService` aunque no modifique nada.
4. **Una orden no cambia de cliente ni de equipo.** `UpdateRepairOrderDto` no incluye `customerId` ni `deviceId` a propósito. Si se registró mal el cliente o el equipo, el flujo correcto es cancelar esa orden y crear una nueva — cambiar el dueño de una orden ya en curso rompería la trazabilidad de todo lo que dependa de ella (pagos, garantías, diagnósticos).
5. **`balance` sigue sin almacenarse** (consistente con la decisión de la Fase 1): se calcula al vuelo (`totalValue - paidAmount`) en cada respuesta de detalle.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el flujo completo de recepción

```bash
# (usa el token que obtuviste en /api/auth/login)

# 1. Crear una orden con un equipo NUEVO en el mismo paso
curl -X POST http://localhost:3000/api/repair-orders \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "newDevice": {
      "deviceTypeId": 1,
      "brandId": 1,
      "model": "ThinkPad E14",
      "serialNumber": "PF3ABC12"
    },
    "reportedIssue": "No enciende",
    "chargerReceived": true,
    "devicePassword": "clave-temporal-del-cliente"
  }'
# → responde con la orden completa, incluido orderCode ("C1", por ejemplo)

# 2. Buscarla por código
curl "http://localhost:3000/api/repair-orders/by-code/C1" -H "Authorization: Bearer <token>"

# 3. Moverla a diagnóstico
curl -X PATCH http://localhost:3000/api/repair-orders/1/status \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"newStatus": "DIAGNOSING", "notes": "Se inicia revisión de placa"}'

# 4. Agregar un procedimiento a la bitácora
curl -X POST http://localhost:3000/api/repair-orders/1/procedures \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"description": "Medición de voltajes en la fuente de poder"}'

# 5. Leer la contraseña del equipo (requiere rol Administrador/Gerente/Técnico)
curl http://localhost:3000/api/repair-orders/1/device-password -H "Authorization: Bearer <token>"

# 6. Ver el expediente completo (cliente, equipo, historial de estados, procedimientos)
curl http://localhost:3000/api/repair-orders/1 -H "Authorization: Bearer <token>"

# 7. Purgar la contraseña una vez entregado el equipo
curl -X DELETE http://localhost:3000/api/repair-orders/1/device-password -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: como en las fases anteriores, no pude ejecutar esto de punta a punta aquí (sin acceso a internet). Sí verifiqué manualmente el balance de llaves/paréntesis en los 50 archivos TypeScript del proyecto. Antes de correr el paso 1 de arriba, asegúrate de tener `ENCRYPTION_KEY` configurada en tu `.env` (ya viene en `.env.example` desde la Fase 1) — si no está, `devicePassword` fallará al cifrarse y verás un error claro (`ENCRYPTION_KEY no está configurada`).

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 3)...
├── repair-orders/
│   ├── repair-orders.module.ts
│   ├── repair-orders.controller.ts
│   ├── repair-orders.service.ts
│   └── dto/
│       ├── create-repair-order.dto.ts
│       ├── new-device.dto.ts
│       ├── update-repair-order.dto.ts
│       ├── update-status.dto.ts
│       ├── assign-technician.dto.ts
│       └── add-procedure.dto.ts
└── common/
    └── utils/
        ├── normalize-name.util.ts
        └── encryption.util.ts       ← nuevo
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/repair-orders` | Autenticado | Recibe un equipo, crea la orden y genera el código `C#####` |
| GET | `/api/repair-orders?search=&status=&technicianId=` | Autenticado | Lista/filtra órdenes |
| GET | `/api/repair-orders/by-code/:code` | Autenticado | Busca por código exacto (con o sin "C") |
| GET | `/api/repair-orders/:id` | Autenticado | Expediente completo de la orden |
| PATCH | `/api/repair-orders/:id` | Autenticado | Edita datos generales (no estado, no cliente/equipo) |
| PATCH | `/api/repair-orders/:id/status` | Autenticado | Cambia el estado, con historial |
| PATCH | `/api/repair-orders/:id/assign-technician` | Autenticado | Asigna técnico responsable |
| POST | `/api/repair-orders/:id/procedures` | Autenticado | Agrega un procedimiento a la bitácora |
| GET | `/api/repair-orders/:id/device-password` | Administrador, Gerente, Técnico | Revela la contraseña del equipo (auditado) |
| DELETE | `/api/repair-orders/:id/device-password` | Administrador, Gerente, Técnico | Purga la contraseña guardada |

## Qué sigue

Con recepción y órdenes de reparación funcionando, la **Fase 5** agrega el módulo de **Diagnóstico técnico + Bitácora electrónica**: la tabla de mediciones personalizadas (`DiagnosticMeasurement`) descrita en la sección 8 del brief, sobre las entidades `RepairDiagnostic` y `RepairLog` que ya existen en el modelo de datos desde la Fase 1.

---

# Fase 5: Diagnóstico Técnico + Bitácora Electrónica

## Qué se construyó en esta fase

- **`diagnostics/`** — tres controladores sobre un mismo servicio:
  - `POST /repair-orders/:orderId/diagnostics` y `GET /repair-orders/:orderId/diagnostics` — una orden puede tener **múltiples** diagnósticos (Regla 3 del brief): un primer diagnóstico ("posible falla de fuente"), y tras cambiar el componente, uno de verificación.
  - `GET /diagnostics/:id`, `PATCH /diagnostics/:id` — detalle y edición de un diagnóstico puntual (referencia de placa, IC de carga, componente sospechoso/reemplazado, BIOS/EC reprogramados, resultado).
  - **Mediciones libres** (`POST /diagnostics/:id/measurements`, `POST /diagnostics/:id/measurements/bulk`, `PATCH /measurements/:id`, `DELETE /measurements/:id`): en vez de columnas fijas por señal (ACDET, ACOK, PLTRST...), cada punto medido es una fila de `DiagnosticMeasurement` con `pointName`/`expectedValue`/`measuredValue`/`unit`/`status` totalmente libres — tal como pide explícitamente la sección 8 del brief ("los valores esperados deben ser configurables y depender del circuito/modelo, no asumirlos automáticamente"). El endpoint `bulk` permite cargar la tabla completa de una placa conocida de una sola vez.
- **`repair-logs/`** — bitácora cronológica:
  - `POST /repair-orders/:orderId/logs`, `GET /repair-orders/:orderId/logs` — una orden también puede tener múltiples entradas de bitácora (Regla 3). El ejemplo literal de la sección 9 del brief ("medición de señales → sin PLTRST ni PCH_PWROK → reprogramación BIOS → sin cambio → PCH posiblemente dañado → NO REPARADO") es exactamente una secuencia de estas entradas.
  - `GET /repair-logs/:id`, `PATCH /repair-logs/:id` — **sin endpoint de borrado, a propósito**: la bitácora es información histórica (Regla 1); si una entrada se capturó mal, se corrige (queda auditado el cambio), nunca desaparece.
- **El expediente técnico se completa**: `GET /repair-orders/:id` (Fase 4) ahora también trae los diagnósticos con sus mediciones y toda la bitácora en orden cronológico, sin que haya hecho falta tocar el resto del módulo — las relaciones ya estaban listas en el schema desde la Fase 1.

## Decisiones técnicas clave de esta fase

1. **Mediciones sí se pueden borrar físicamente — única excepción a la Regla 1 hasta ahora.** Todo lo demás en el sistema usa `status: INACTIVE`, pero una medición individual es un dato técnico puntual sin impacto financiero ni legal, y el caso de uso real es corregir una fila mal capturada durante la revisión (un técnico transcribiendo valores de un multímetro se equivoca de vez en cuando). El borrado igual queda auditado con el valor anterior completo, así que no se pierde la trazabilidad de que algo se borró y qué decía.
2. **La bitácora, en cambio, no se puede borrar — solo editar.** A diferencia de una medición suelta, una entrada de bitácora es la narrativa de lo que pasó con el equipo; borrarla rompería la reconstrucción de "qué se hizo y en qué orden" que exige la sección 9 del brief.
3. **El técnico se autoasigna por defecto.** Tanto en diagnósticos como en bitácora, si no se envía `technicianId` explícito, se usa el id del usuario autenticado — cubre el caso más común (el técnico que hace el diagnóstico es quien está logueado) sin obligarlo a repetir su propio id en cada request, pero deja la puerta abierta a que un administrador registre una entrada a nombre de otro técnico si hace falta.
4. **Carga masiva de mediciones (`/measurements/bulk`) como atajo, no como reemplazo del endpoint individual.** Ambos coexisten: el individual sirve para ir registrando mediciones mientras se revisa la placa en vivo; el bulk sirve para cuando ya se tiene la tabla completa (por ejemplo, transcrita de una hoja de referencia de esa placa) y no tiene sentido hacer 15 requests seguidos.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el flujo de diagnóstico y bitácora

```bash
# (usa el token del login y el id de una orden ya creada, ej. 1)

# 1. Crear un diagnóstico para la orden
curl -X POST http://localhost:3000/api/repair-orders/1/diagnostics \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"boardReference": "6050A3356201", "initialSymptom": "No enciende, sin video"}'
# → guarda el id que devuelve, ej. 1

# 2. Agregar mediciones una por una
curl -X POST http://localhost:3000/api/diagnostics/1/measurements \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"pointName": "ACDET", "expectedValue": "2.4-3.0", "measuredValue": "2.72", "unit": "V", "status": "OK"}'

# 3. O cargar varias de una vez
curl -X POST http://localhost:3000/api/diagnostics/1/measurements/bulk \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"measurements": [
    {"pointName": "ACOK", "expectedValue": "HIGH", "measuredValue": "HIGH", "unit": "Estado", "status": "OK"},
    {"pointName": "PLTRST", "measuredValue": "0", "unit": "V", "status": "FUERA DE RANGO"}
  ]}'

# 4. Registrar una entrada de bitácora
curl -X POST http://localhost:3000/api/repair-orders/1/logs \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"procedure": "Medición de señales", "result": "Sin PLTRST ni PCH_PWROK"}'

curl -X POST http://localhost:3000/api/repair-orders/1/logs \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"procedure": "Reprogramación BIOS", "result": "Sin cambio", "notes": "PCH posiblemente dañado"}'

# 5. Ver el expediente completo (ahora con diagnósticos, mediciones y bitácora)
curl http://localhost:3000/api/repair-orders/1 -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 66 archivos TypeScript del proyecto. Si al correr `npm run start:dev` Nest reporta un error de rutas superpuestas o de inyección de dependencias entre los nuevos controladores, dime el mensaje exacto y lo resolvemos de inmediato.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 4)...
├── diagnostics/
│   ├── diagnostics.module.ts
│   ├── diagnostics.service.ts
│   ├── repair-order-diagnostics.controller.ts   ← /repair-orders/:orderId/diagnostics
│   ├── diagnostics.controller.ts                ← /diagnostics/:id + mediciones
│   ├── measurements.controller.ts               ← /measurements/:id
│   └── dto/
│       ├── create-diagnostic.dto.ts
│       ├── update-diagnostic.dto.ts
│       ├── create-measurement.dto.ts
│       ├── update-measurement.dto.ts
│       └── bulk-create-measurements.dto.ts
└── repair-logs/
    ├── repair-logs.module.ts
    ├── repair-logs.service.ts
    ├── repair-order-logs.controller.ts   ← /repair-orders/:orderId/logs
    ├── repair-logs.controller.ts         ← /repair-logs/:id
    └── dto/
        ├── create-log.dto.ts
        └── update-log.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/repair-orders/:orderId/diagnostics` | Autenticado | Crea un diagnóstico para la orden |
| GET | `/api/repair-orders/:orderId/diagnostics` | Autenticado | Lista los diagnósticos de la orden |
| GET | `/api/diagnostics/:id` | Autenticado | Detalle de un diagnóstico + mediciones |
| PATCH | `/api/diagnostics/:id` | Autenticado | Edita un diagnóstico |
| POST | `/api/diagnostics/:id/measurements` | Autenticado | Agrega una medición |
| POST | `/api/diagnostics/:id/measurements/bulk` | Autenticado | Agrega varias mediciones de una vez |
| PATCH | `/api/measurements/:id` | Autenticado | Corrige una medición |
| DELETE | `/api/measurements/:id` | Autenticado | Borra una medición (única excepción a "nunca borrar") |
| POST | `/api/repair-orders/:orderId/logs` | Autenticado | Agrega una entrada de bitácora |
| GET | `/api/repair-orders/:orderId/logs` | Autenticado | Lista la bitácora cronológica de la orden |
| GET | `/api/repair-logs/:id` | Autenticado | Detalle de una entrada |
| PATCH | `/api/repair-logs/:id` | Autenticado | Corrige una entrada (sin borrado) |

## Qué sigue

Con diagnóstico y bitácora funcionando, la **Fase 6** conecta el **inventario con las reparaciones**: registrar repuestos usados en una orden (`RepairPart`), que descuenten stock automáticamente vía `InventoryMovement`, y calcular costo/ganancia por orden.

---

# Fase 6: Inventario + Repuestos

## Qué se construyó en esta fase

- **`inventory/`** — tres controladores sobre el catálogo de inventario:
  - `product-categories` — catálogo de categorías (lectura abierta, escritura restringida a Administrador/Inventario).
  - `products` — CRUD de productos con búsqueda (`?search=`), filtro por categoría y **filtro de stock bajo** (`?lowStockOnly=true`, cubre el indicador "repuestos con inventario bajo" del Dashboard de la sección 4, aunque el Dashboard en sí es una fase posterior). La creación admite un `initialStock` opcional para cuando se está dando de alta el catálogo por primera vez (ej. migrando desde el Excel) — se aplica como un movimiento `ADJUSTMENT`, nunca escribiendo `stock` directo.
  - `inventory-movements` — registro manual de movimientos (`ADJUSTMENT`, `LOSS`, `RETURN`, `TRANSFER`, `WARRANTY_REPLACEMENT`) e historial por producto. Los tipos `PURCHASE` y `SALE` quedan reservados para cuando existan los módulos de Compras/Ventas (Fase 8); `USED_IN_REPAIR` se genera solo desde `repair-parts/`, no manualmente.
  - **`InventoryMovementsService.applyMovement()`** es la única función del sistema que escribe `Product.stock` — valida que el stock resultante nunca quede negativo y queda diseñada para poder invocarse tanto suelta como dentro de una transacción más grande (así la usa `repair-parts/` para componer "descontar stock" + "registrar el repuesto usado" como una sola operación atómica).
- **`repair-parts/`** — conecta inventario con reparaciones (sección 12 del brief):
  - `POST /repair-orders/:orderId/parts` — consume un repuesto: descuenta stock (vía `InventoryMovement` tipo `USED_IN_REPAIR`) y registra el `RepairPart` con el costo que tenía el producto **en ese momento** (no el costo actual, para que la rentabilidad histórica de una reparación vieja no cambie si el precio del repuesto sube después).
  - `DELETE /repair-orders/:orderId/parts/:partId` — revierte: devuelve el stock y borra el registro de consumo.
  - `GET /repair-orders/:orderId/parts/cost-summary` — costo de repuestos, ingreso por repuestos, ganancia y margen % de la orden.
  - El expediente técnico (`GET /repair-orders/:id`, Fase 4/5) ahora también incluye `partsUsed`.

## Decisiones técnicas clave de esta fase

1. **Una sola función escribe el stock, en todo el sistema.** `applyMovement()` es el único punto de escritura de `Product.stock`; tanto el endpoint manual de movimientos como `repair-parts` la reutilizan en vez de duplicar la lógica de "sumar/restar y validar que no quede negativo". Si en una fase futura se agrega la lógica de Compras (Fase 8), también pasará por aquí.
2. **El costo del repuesto se congela al momento de usarlo.** `RepairPart.unitCost` copia `Product.cost` en el instante de la creación, no lo referencia dinámicamente. Es la misma lógica que ya se aplicó en `PurchaseItem`/`SaleItem` desde el diseño de datos de la Fase 1: el costo histórico de una transacción no debe moverse porque el catálogo cambió después.
3. **`RepairPart` sí se puede borrar físicamente — mismo criterio que las mediciones de diagnóstico (Fase 5).** No es un registro de negocio con peso legal por sí solo (a diferencia de una orden, un cliente o un producto); es un hecho transaccional puntual, y el caso de uso real es corregir un repuesto agregado por error. Al borrarlo, el stock se restituye vía un movimiento compensatorio (nunca editando `stock` a mano) y todo queda auditado.
4. **La ganancia de esta fase se calcula solo sobre repuestos, no sobre mano de obra — simplificación explícita del MVP.** El modelo de datos no tiene todavía una tarifa de mano de obra desglosada por orden (eso depende de que exista un módulo de servicios/facturación con precios por servicio prestado). `costSummary()` calcula `ganancia = totalCobrado - costoRepuestos`, que es una aproximación razonable mientras tanto, pero **no** es exactamente la fórmula completa de la sección 12 del brief ("costo de repuestos + mano de obra = costo total"). Cuando se conecten los servicios (`RepairService`, ya existe en el modelo de datos) a la facturación, este cálculo se refina.
5. **`unitCost` en movimientos manuales es opcional.** Solo tiene sentido informarlo en movimientos que representan una entrada de valor conocido (ej. un ajuste al alza); en salidas (pérdida, transferencia) el costo ya está implícito en el `Product.cost` vigente y no hace falta repetirlo.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el flujo de inventario y repuestos

```bash
# (usa el token del login)

# 1. Ver categorías ya cargadas por el seed de la Fase 1
curl http://localhost:3000/api/product-categories -H "Authorization: Bearer <token>"

# 2. Crear un producto con existencia inicial (ej. migrando del Excel)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "sku": "MOSFET-AO4407",
    "categoryId": 10,
    "description": "MOSFET AO4407 SOP-8",
    "cost": 1500,
    "salePrice": 4000,
    "minStock": 5,
    "initialStock": 20
  }'

# 3. Ver productos con stock bajo
curl "http://localhost:3000/api/products?lowStockOnly=true" -H "Authorization: Bearer <token>"

# 4. Usar el repuesto en una orden de reparación (usa un orderId real, ej. 1)
curl -X POST http://localhost:3000/api/repair-orders/1/parts \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'
# → el stock del producto baja de 20 a 18 automáticamente

# 5. Ver el resumen de costo/ganancia de la orden
curl http://localhost:3000/api/repair-orders/1/parts/cost-summary -H "Authorization: Bearer <token>"

# 6. Ver el historial de movimientos del producto
curl "http://localhost:3000/api/inventory-movements?productId=1" -H "Authorization: Bearer <token>"

# 7. Intentar usar más cantidad de la que hay en stock → debe fallar con 400
curl -X POST http://localhost:3000/api/repair-orders/1/parts \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 9999}'
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 81 archivos TypeScript del proyecto. Un punto a vigilar especialmente al probarlo: la composición de transacciones entre `RepairPartsService` e `InventoryMovementsService.applyMovement()` (el `tx` que viaja de un servicio a otro) — si Prisma o TypeScript se quejan de tipos ahí, es el primer lugar donde miraría.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 5)...
├── inventory/
│   ├── inventory.module.ts
│   ├── product-categories.controller.ts
│   ├── product-categories.service.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── inventory-movements.controller.ts
│   ├── inventory-movements.service.ts
│   └── dto/
│       ├── create-product-category.dto.ts
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── create-inventory-movement.dto.ts
└── repair-parts/
    ├── repair-parts.module.ts
    ├── repair-parts.controller.ts
    ├── repair-parts.service.ts
    └── dto/
        └── create-repair-part.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/product-categories` | Autenticado | Lista categorías activas |
| POST | `/api/product-categories` | Administrador, Inventario | Crea categoría |
| PATCH | `/api/product-categories/:id/deactivate` | Administrador, Inventario | Desactiva categoría |
| POST | `/api/products` | Administrador, Inventario | Crea producto (con stock inicial opcional) |
| GET | `/api/products?search=&categoryId=&lowStockOnly=` | Autenticado | Lista/filtra productos |
| GET | `/api/products/:id` | Autenticado | Detalle de producto |
| PATCH | `/api/products/:id` | Administrador, Inventario | Edita producto (nunca el stock) |
| PATCH | `/api/products/:id/deactivate` | Administrador, Inventario | Desactiva |
| PATCH | `/api/products/:id/reactivate` | Administrador, Inventario | Reactiva |
| POST | `/api/inventory-movements` | Administrador, Inventario | Movimiento manual (ajuste, pérdida, devolución...) |
| GET | `/api/inventory-movements?productId=` | Autenticado | Historial de movimientos de un producto |
| POST | `/api/repair-orders/:orderId/parts` | Autenticado | Usa un repuesto en la orden (descuenta stock) |
| GET | `/api/repair-orders/:orderId/parts` | Autenticado | Lista repuestos usados en la orden |
| GET | `/api/repair-orders/:orderId/parts/cost-summary` | Autenticado | Costo/ganancia/margen de la orden |
| DELETE | `/api/repair-orders/:orderId/parts/:partId` | Autenticado | Retira un repuesto (restituye stock) |

## Qué sigue

Con inventario y repuestos conectados a las reparaciones, la **Fase 7** construye el módulo de **Cotizaciones a cliente** (`CustomerQuotation`): armar una cotización con repuestos + servicios + mano de obra, y convertirla directamente en una orden de reparación cuando el cliente aprueba — cerrando el flujo Diagnóstico → Cotización → Aprobación descrito en la sección 10 del brief.

---

# Fase 7: Cotizaciones a Cliente

## Un ajuste a la Fase 6 antes de empezar

Para que convertir una cotización pueda consumir inventario de forma atómica (todo-o-nada, sin dejar un stock a medio descontar si algo falla), refactoricé `RepairPartsService`: la lógica de "consumir un repuesto" ahora vive en un método público `createWithTx(tx, ...)` que **no abre su propia transacción**, y `create()` (el endpoint de la Fase 6) simplemente la envuelve en una. Esto permite que `QuotationsService.convert()` la reutilice dentro de su propia transacción en vez de duplicar la lógica de descuento de stock. El comportamiento del endpoint de la Fase 6 (`POST /repair-orders/:orderId/parts`) no cambió para quien lo consume — es el mismo request/response de siempre.

## Qué se construyó en esta fase

- **`services/`** — catálogo de servicios (sección 16 del brief): CRUD simple, lectura abierta (la necesita el formulario de cotización), escritura restringida a Administrador/Gerente. El seed de la Fase 1 ya cargó 3 servicios de muestra desde `Codigos de facturacion`.
- **`quotations/`** — el módulo central de esta fase:
  - **Creación con cálculo automático de totales** (`POST /quotations`): recibe una lista de ítems (`type: PART|SERVICE|LABOR|OTHER`, con `productId`/`serviceId` opcional según el tipo, descripción, cantidad, precio unitario) y calcula `subtotal`/`total` sumando cantidad × precio de cada ítem, más descuento/impuesto/envío. El número de cotización (`COT#`) se genera con el mismo patrón de dos pasos que `orderCode` en la Fase 4.
  - **Edición solo en borrador**: `PATCH /quotations/:id`, agregar/quitar ítems (`POST`/`DELETE /quotations/:id/items`) — todo bloqueado en cuanto la cotización sale de `DRAFT`. Una cotización ya enviada al cliente no debería cambiar de contenido en silencio.
  - **Cambio de estado** (`PATCH /quotations/:id/status`) para el ciclo `DRAFT → SENT → PENDING → APPROVED/REJECTED/EXPIRED` de la sección 10 del brief. `CONVERTED` está deliberadamente excluido de este endpoint — ver más abajo.
  - **Conversión a orden de reparación** (`POST /quotations/:id/convert`) — la pieza más importante: toma una cotización `APPROVED` con `sourceOrderId`, y dentro de **una sola transacción**:
    1. Por cada ítem tipo `PART`, consume el repuesto del inventario reutilizando `RepairPartsService.createWithTx` — el mismo código de la Fase 6, no una copia.
    2. Por cada ítem tipo `SERVICE`, crea un `RepairService` en la orden.
    3. Actualiza `RepairOrder.totalValue` al total de la cotización y mueve el estado a `APPROVED`, con su entrada correspondiente en `RepairStatusHistory`.
    4. Marca la cotización como `CONVERTED`.
    
    Si algo falla a mitad de camino (por ejemplo, no hay suficiente stock de un repuesto), la transacción completa se revierte — nunca queda una orden a medio actualizar con solo algunos repuestos descontados.
- **El expediente técnico se completa más**: `GET /repair-orders/:id` ahora también trae `servicesUsed` y un resumen de las cotizaciones asociadas a la orden.

## Decisiones técnicas clave de esta fase

1. **Solo se puede convertir una cotización que tiene `sourceOrderId`.** El modelo de datos de `CustomerQuotation` no tiene un `deviceId` propio — depende de la orden de origen para saber a qué equipo pertenece. Una cotización "suelta" (sin orden asociada, por ejemplo alguien pidiendo precio antes de traer el equipo) se puede crear y aprobar, pero no convertir automáticamente; el mensaje de error lo explica claramente en vez de fallar en silencio.
2. **`CONVERTED` no es un estado asignable por el endpoint genérico de cambio de estado.** `UpdateQuotationStatusDto` excluye explícitamente `CONVERTED` de los valores permitidos — llegar a ese estado implica efectos reales (consumir inventario, crear registros, tocar la orden), así que solo `convert()` puede ponerlo.
3. **Ítems tipo `LABOR`/`OTHER` no generan una fila propia en la orden — simplificación explícita, ya anticipada en la Fase 6.** El modelo de datos no tiene todavía una tabla de "cargos de mano de obra" independiente por orden. Su valor sí queda reflejado: `quotation.total` (que incluye labor/otros) se asigna completo a `RepairOrder.totalValue` al convertir. Cuando exista un módulo de facturación más fino, esto se puede desglosar.
4. **La conversión es atómica de verdad, no una secuencia de pasos "esperemos que no falle nada".** Fue por esto que valió la pena el refactor de `RepairPartsService` al inicio de esta fase: sin `createWithTx`, cada consumo de repuesto abriría su propia transacción independiente, y un fallo a mitad de la conversión (ej. el segundo de tres repuestos sin stock) dejaría el primero ya descontado sin poder deshacerlo limpiamente.
5. **Recalcular totales es una función aparte (`recalculateTotals`), no lógica repetida.** Se llama tanto al agregar como al quitar un ítem — la fórmula de `subtotal`/`total` vive en un solo lugar.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el flujo completo: diagnóstico → cotización → aprobación → conversión

```bash
# (usa el token del login, un customerId y un orderId reales, ej. 1 y 1)

# 1. Ver servicios disponibles
curl http://localhost:3000/api/services -H "Authorization: Bearer <token>"

# 2. Crear una cotización asociada a la orden 1, con un repuesto y un servicio
curl -X POST http://localhost:3000/api/quotations \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "sourceOrderId": 1,
    "items": [
      {"type": "PART", "productId": 1, "description": "MOSFET AO4407", "quantity": 2, "unitPrice": 4000},
      {"type": "SERVICE", "serviceId": 1, "description": "Mantenimiento preventivo", "unitPrice": 35000},
      {"type": "LABOR", "description": "Mano de obra reparación de placa", "unitPrice": 50000}
    ]
  }'
# → responde con la cotización completa, incluido quotationNumber ("COT1") y total calculado

# 3. Aprobar la cotización (usa el id que devolvió el paso anterior, ej. 1)
curl -X PATCH http://localhost:3000/api/quotations/1/status \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"newStatus": "APPROVED"}'

# 4. Convertirla en la reparación real
curl -X POST http://localhost:3000/api/quotations/1/convert -H "Authorization: Bearer <token>"
# → consume el MOSFET del inventario, crea el RepairService, actualiza
#   totalValue y status de la orden 1, marca la cotización como CONVERTED

# 5. Verificar: el stock del producto bajó y la orden tiene el total actualizado
curl http://localhost:3000/api/products/1 -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/repair-orders/1 -H "Authorization: Bearer <token>"

# 6. Intentar convertirla de nuevo → debe fallar (ya está CONVERTED)
curl -X POST http://localhost:3000/api/quotations/1/convert -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 93 archivos TypeScript del proyecto, y con especial cuidado el tipado del `tx` que viaja entre `QuotationsService`, `RepairPartsService` e `InventoryMovementsService` — es la composición de transacciones más profunda del proyecto hasta ahora, así que si `npm run start:dev` o `tsc` reportan un error de tipos en esa cadena, es el primer lugar donde miraría.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 6)...
├── services/
│   ├── services.module.ts
│   ├── services.controller.ts
│   ├── services.service.ts
│   └── dto/
│       ├── create-service.dto.ts
│       └── update-service.dto.ts
└── quotations/
    ├── quotations.module.ts
    ├── quotations.controller.ts
    ├── quotations.service.ts
    └── dto/
        ├── create-quotation.dto.ts
        ├── create-quotation-item.dto.ts
        ├── update-quotation.dto.ts
        └── update-quotation-status.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/services?search=` | Autenticado | Lista servicios del catálogo |
| GET | `/api/services/:id` | Autenticado | Detalle de un servicio |
| POST | `/api/services` | Administrador, Gerente | Crea servicio |
| PATCH | `/api/services/:id` | Administrador, Gerente | Edita servicio |
| PATCH | `/api/services/:id/deactivate` | Administrador, Gerente | Desactiva servicio |
| POST | `/api/quotations` | Autenticado | Crea cotización con ítems, calcula totales |
| GET | `/api/quotations?search=&status=&customerId=` | Autenticado | Lista/filtra cotizaciones |
| GET | `/api/quotations/:id` | Autenticado | Detalle con ítems |
| PATCH | `/api/quotations/:id` | Autenticado | Edita datos generales (solo en Borrador) |
| PATCH | `/api/quotations/:id/status` | Autenticado | Cambia el estado (excepto a Convertida) |
| POST | `/api/quotations/:id/items` | Autenticado | Agrega un ítem (solo en Borrador) |
| DELETE | `/api/quotations/:id/items/:itemId` | Autenticado | Quita un ítem (solo en Borrador) |
| POST | `/api/quotations/:id/convert` | Autenticado | Convierte en orden real (atómico) |

## Qué sigue

Con cotizaciones funcionando, la **Fase 8** agrega **Ventas + Compras**: el punto de venta rápido de repuestos/accesorios (`Sale`/`SaleItem`, consumiendo inventario igual que `repair-parts`) y el registro de compras a proveedores (`Purchase`/`PurchaseItem`, que alimenta el inventario en la dirección contraria).

---

# Fase 8: Ventas + Compras

## Qué se construyó en esta fase

- **`suppliers/`** — CRUD de proveedores (sección 14 del brief), necesario para que Compras tenga a quién referenciar. El seed de la Fase 1 ya cargó 3 proveedores de muestra (Jawan, Virtual Tronic, Digital) detectados en el Excel original. El detalle de un proveedor (`GET /suppliers/:id`) trae su historial de compras reciente.
- **`purchases/`** — registro de compras a proveedores (sección 13 del brief):
  - `POST /purchases` — recibe proveedor + ítems (`productId`, `quantity`, `unitCost`), calcula subtotal/total (+ impuesto/envío), y **actualiza el inventario automáticamente**: cada ítem genera un `InventoryMovement` tipo `PURCHASE` que aumenta el stock, reutilizando `InventoryMovementsService.applyMovement()` de la Fase 6 — ni una línea de lógica de inventario duplicada.
  - **Costeo por "último costo"**: además de mover el stock, cada compra actualiza `Product.cost` al precio pagado en esa compra. Es el método de costeo más simple que existe (no promedio ponderado ni FIFO) — una decisión de diseño explícita para el MVP, documentada más abajo.
  - Las compras **no se editan después de creadas** (solo su `paymentStatus`, vía `PATCH /purchases/:id/payment-status`): una vez que movió inventario real, corregirla requeriría lógica de reversión que no está en el alcance de esta fase — si se registró mal, la corrección pasa por un movimiento manual de ajuste (Fase 6).
- **`sales/`** — punto de venta rápido de repuestos/accesorios (sección 15 del brief):
  - `POST /sales` — cliente opcional (venta de mostrador sin cliente registrado), lista de productos con cantidad/precio/descuento, un solo método de pago. Cada ítem descuenta stock vía `InventoryMovement` tipo `SALE`; si no alcanza el stock de algún producto, **toda la venta se cancela** — no se vende "a medias".
  - `POST /sales/:id/cancel` — cancela una venta ya registrada: restituye el stock de cada ítem (movimiento compensatorio, nunca editando `stock` a mano) y marca la venta `INACTIVE`. Nunca se borra (Regla 1) — es un documento financiero.

## Decisiones técnicas clave de esta fase

1. **Costeo "último costo", no promedio ponderado — simplificación explícita.** Un sistema de inventario "serio" normalmente calcula el costo de un producto como un promedio ponderado de todas sus compras históricas (weighted average cost), o rastrea lotes por FIFO. Implementar eso bien requiere más estructura de la que tiene el MVP actual (y el Excel original tampoco lo hacía — usaba un costo fijo por producto). Se optó por lo más simple y predecible: el costo vigente de un producto es el precio de su compra más reciente. Es una limitación real, documentada aquí y no oculta, para que quede claro qué se sacrificó a cambio de simplicidad.
2. **Ni compras ni ventas se editan después de creadas — solo se cancelan/ajustan.** Ambas ya movieron inventario real en el momento de crearse; permitir edición abierta después obligaría a reconstruir esos movimientos cada vez, con mucho más riesgo de inconsistencia que valor práctico. En su lugar: compras solo cambian su estado de pago; ventas se cancelan completas (con reversión de stock) si hace falta deshacerlas.
3. **La venta permite cliente opcional, la compra no.** Coincide con la realidad del mostrador: alguien compra un cable sin dar su nombre, pero el taller siempre sabe a qué proveedor le está comprando.
4. **`sellerId` en una venta es siempre quien está autenticado**, sin opción de asignarlo a otra persona — a diferencia de diagnósticos/bitácora (Fase 5), donde sí se permitía registrar a nombre de otro técnico. Una venta de mostrador la hace quien está físicamente cobrando en ese momento; no tiene el mismo caso de uso de "delegar el registro".

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar compras y ventas

```bash
# (usa el token del login)

# 1. Ver proveedores ya cargados por el seed
curl http://localhost:3000/api/suppliers -H "Authorization: Bearer <token>"

# 2. Registrar una compra (usa un supplierId y productId reales)
curl -X POST http://localhost:3000/api/purchases \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "supplierId": 1,
    "invoiceNumber": "FAC-00123",
    "items": [{"productId": 1, "quantity": 50, "unitCost": 1400}],
    "shipping": 5000
  }'
# → el stock del producto 1 sube en 50, y su Product.cost pasa a 1400

# 3. Ver el detalle de la compra
curl http://localhost:3000/api/purchases/1 -H "Authorization: Bearer <token>"

# 4. Marcarla como pagada
curl -X PATCH http://localhost:3000/api/purchases/1/payment-status \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"paymentStatus": "PAID"}'

# 5. Hacer una venta de mostrador (sin cliente)
curl -X POST http://localhost:3000/api/sales \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 3}], "paymentMethod": "CASH"}'

# 6. Ver el stock actualizado
curl http://localhost:3000/api/products/1 -H "Authorization: Bearer <token>"

# 7. Cancelar la venta (restituye el stock)
curl -X POST http://localhost:3000/api/sales/1/cancel -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 109 archivos TypeScript del proyecto.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 7)...
├── suppliers/
│   ├── suppliers.module.ts
│   ├── suppliers.controller.ts
│   ├── suppliers.service.ts
│   └── dto/
│       ├── create-supplier.dto.ts
│       └── update-supplier.dto.ts
├── purchases/
│   ├── purchases.module.ts
│   ├── purchases.controller.ts
│   ├── purchases.service.ts
│   └── dto/
│       ├── create-purchase.dto.ts
│       ├── create-purchase-item.dto.ts
│       └── update-purchase-payment-status.dto.ts
└── sales/
    ├── sales.module.ts
    ├── sales.controller.ts
    ├── sales.service.ts
    └── dto/
        ├── create-sale.dto.ts
        └── create-sale-item.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/suppliers?search=` | Autenticado | Lista proveedores |
| GET | `/api/suppliers/:id` | Autenticado | Detalle + historial de compras |
| POST | `/api/suppliers` | Administrador, Inventario | Crea proveedor |
| PATCH | `/api/suppliers/:id` | Administrador, Inventario | Edita proveedor |
| PATCH | `/api/suppliers/:id/deactivate` | Administrador, Inventario | Desactiva |
| POST | `/api/purchases` | Administrador, Inventario, Gerente | Registra compra (actualiza inventario) |
| GET | `/api/purchases?supplierId=&paymentStatus=` | Administrador, Inventario, Gerente | Lista/filtra compras |
| GET | `/api/purchases/:id` | Administrador, Inventario, Gerente | Detalle de compra |
| PATCH | `/api/purchases/:id/payment-status` | Administrador, Inventario, Gerente | Actualiza estado de pago |
| POST | `/api/sales` | Autenticado | Venta rápida (descuenta inventario) |
| GET | `/api/sales?customerId=&search=` | Autenticado | Lista/filtra ventas |
| GET | `/api/sales/:id` | Autenticado | Detalle de venta |
| POST | `/api/sales/:id/cancel` | Autenticado | Cancela venta (restituye stock) |

## Qué sigue

Con ventas y compras funcionando, la **Fase 9** agrega **Pagos + Caja**: registrar abonos de clientes contra órdenes/ventas (`Payment`), y el control de caja diario (`CashRegister`/`CashMovement` — apertura, cierre, arqueo) descrito en la sección 19 del brief.

---

# Fase 9: Pagos + Caja

## Qué se construyó en esta fase

- **`cash/`** — control de caja diaria (sección 19 del brief):
  - `POST /cash-registers/open` / `POST /cash-registers/:id/close` — apertura y cierre. **Solo puede haber una caja abierta a la vez en todo el sistema** (no una por usuario o por turno simultáneo); abrir una segunda mientras hay una abierta falla con un mensaje claro indicando cuál está pendiente de cerrar.
  - **Arqueo automático al cerrar**: `expectedAmount = apertura + ingresos - egresos` registrados durante el turno; `difference = lo contado físicamente - lo esperado`. El técnico solo captura cuánto contó en la caja; el sistema calcula si sobra o falta.
  - `GET /cash-registers/current` — la caja abierta en este momento (o vacío si no hay ninguna).
  - `POST /cash-registers/movements` — registro manual de un movimiento (ingreso o egreso, con categoría libre — Reparaciones, Ventas, Compras, Gastos, Envíos, Otros..., igual que las categorías de ejemplo de la sección 19, sin convertirlas en catálogo cerrado). Requiere que haya una caja abierta.
- **`payments/`** — registro de abonos (sección 18 del brief):
  - `POST /payments` — un pago se asocia a una orden de reparación, a una venta, o a ninguna de las dos (abono general a la cuenta del cliente — Regla 9: "un pago puede aplicarse parcialmente a una orden"). Si va contra una orden, **incrementa `RepairOrder.paidAmount`** en la misma transacción (el saldo pendiente se sigue calculando al vuelo, nunca se guarda, consistente con la decisión de la Fase 4).
  - **Integración automática con Caja**: si hay una caja abierta al momento del abono, `CashService.recordIncomeIfRegisterOpen()` refleja el ingreso automáticamente, en la misma transacción — sin bloquear el registro del pago si no hay caja abierta ese día (ver decisión #3 más abajo).
  - El expediente técnico (`GET /repair-orders/:id`) ahora también incluye los pagos aplicados a esa orden.

## Decisiones técnicas clave de esta fase

1. **Una sola caja activa para todo el taller, no por usuario.** El brief describe apertura/cierre/arqueo como un proceso diario del negocio, no una caja personal por cada vendedor — coincide con cómo se ve un taller pequeño operando con una sola caja física.
2. **El arqueo no le pide al usuario que calcule nada.** `expectedAmount` y `difference` se calculan enteramente en el backend a partir de los movimientos reales del turno; la única entrada humana es "cuánto conté físicamente" (`closingAmount`). Esto es a propósito: dejar que alguien calcule el esperado a mano es la forma más común de que un arqueo termine mal cuadrado por error aritmético, no por diferencia real de caja.
3. **La integración Pagos → Caja es "mejor esfuerzo", no obligatoria.** Se decidió que registrar un abono nunca debe fallar por un problema de disciplina de caja (por ejemplo, que se les olvidó abrir la caja esa mañana). Si no hay caja abierta, el pago se registra igual y simplemente no genera un movimiento de caja — es una limitación real y consciente, no un bug: en un negocio donde la caja se abre todos los días sin falta, este caso no debería darse casi nunca; si en la práctica sí pasa seguido, vale la pena revisar si conviene volverlo obligatorio.
4. **Esta integración automática solo cubre Pagos, no Ventas/Compras/Gastos directamente.** `SalesService` (Fase 8) y `PurchasesService` (Fase 8) no fueron modificados en esta fase para generar movimientos de caja automáticamente — quedarían registrados en caja solo si además se les asocia un `Payment`, o si alguien los registra manualmente con `POST /cash-registers/movements`. Conectar automáticamente cada venta/compra/gasto a caja es un ajuste razonable para una fase futura, pero se dejó fuera de esta para no volver a tocar módulos ya cerrados sin una razón de peso — se documenta aquí como el límite real del alcance actual, no como un descuido.
5. **`category` en `CashMovement` sigue siendo texto libre, no un enum ni catálogo.** Igual que en el Excel original, las categorías (Reparaciones, Ventas, Abonos, Compras, Gastos...) son convención, no una lista cerrada en la base de datos — mantiene flexibilidad para categorías nuevas sin una migración.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el flujo de caja y pagos

```bash
# (usa el token del login)

# 1. Abrir la caja del día
curl -X POST http://localhost:3000/api/cash-registers/open \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"openingAmount": 100000}'

# 2. Registrar un abono a una orden de reparación (usa un orderId/customerId reales)
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"customerId": 1, "repairOrderId": 1, "amount": 50000, "method": "CASH"}'
# → sube RepairOrder.paidAmount en 50000 Y genera un CashMovement de ingreso automáticamente

# 3. Ver la caja actual con sus movimientos
curl http://localhost:3000/api/cash-registers/current -H "Authorization: Bearer <token>"

# 4. Registrar un gasto manual (ej. un envío)
curl -X POST http://localhost:3000/api/cash-registers/movements \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"type": "EXPENSE", "category": "Envios", "amount": 8000, "description": "Envío a domicilio"}'

# 5. Cerrar la caja (usa el id que devolvió el paso 1)
curl -X POST http://localhost:3000/api/cash-registers/1/close \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"closingAmount": 142000}'
# → responde con expectedAmount y difference calculados automáticamente

# 6. Ver el saldo pendiente de la orden (balance calculado al vuelo)
curl http://localhost:3000/api/repair-orders/1 -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 119 archivos TypeScript del proyecto.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 8)...
├── cash/
│   ├── cash.module.ts
│   ├── cash.controller.ts
│   ├── cash.service.ts
│   └── dto/
│       ├── open-cash-register.dto.ts
│       ├── close-cash-register.dto.ts
│       └── create-cash-movement.dto.ts
└── payments/
    ├── payments.module.ts
    ├── payments.controller.ts
    ├── payments.service.ts
    └── dto/
        └── create-payment.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/cash-registers/open` | Admin, Gerente, Recepción, Ventas | Abre caja |
| POST | `/api/cash-registers/:id/close` | Admin, Gerente, Recepción, Ventas | Cierra caja, calcula arqueo |
| GET | `/api/cash-registers/current` | Admin, Gerente, Recepción, Ventas | Caja abierta actual |
| GET | `/api/cash-registers` | Admin, Gerente, Recepción, Ventas | Historial de cajas |
| GET | `/api/cash-registers/:id` | Admin, Gerente, Recepción, Ventas | Detalle + movimientos |
| POST | `/api/cash-registers/movements` | Admin, Gerente, Recepción, Ventas | Movimiento manual de caja |
| POST | `/api/payments` | Autenticado | Registra un abono |
| GET | `/api/payments?customerId=&repairOrderId=&saleId=` | Autenticado | Lista/filtra pagos |
| GET | `/api/payments/:id` | Autenticado | Detalle de un pago |

## Qué sigue

Con el backend cubriendo el ciclo operativo completo (clientes → recepción → diagnóstico → cotización → inventario → ventas/compras → pagos → caja), el trabajo continúa en dos frentes: el **frontend** (interfaz gráfica en React, ver sección aparte más abajo) y las fases de backend restantes (Garantías, Informes PDF, Dashboard, Importación del Excel, Seguridad y despliegue) según se necesiten.

---

# Fase 10: Garantías

## Qué se construyó en esta fase

- **`warranties/`** — control de garantías (sección 17 del brief):
  - `POST /repair-orders/:orderId/warranties` — genera la garantía al entregar un equipo. Se captura en **meses de cobertura**, no en una fecha de fin exacta — el sistema calcula `warrantyEndDate` sumando esos meses a la fecha de entrega. Pensar "3 meses en la pantalla" es más natural para quien está en el mostrador que calcular una fecha a mano.
  - `GET /warranties?status=&expiringWithinDays=` — listado global con alertas: `expiringWithinDays=30` devuelve las garantías activas que vencen en los próximos 30 días. Esta consulta existe **antes** de que exista la pantalla de Dashboard (Fase 12) a propósito — es la misma consulta que ese Dashboard va a reutilizar para la alerta "garantías próximas a vencer" (sección 4 del brief), y ya se puede probar hoy sin esperar a esa fase.
  - **`POST /warranties/:id/claim`** — el reclamo de garantía, la operación más interesante de esta fase: en vez de escribir de cero la lógica de "crear una orden nueva", **reutiliza `RepairOrdersService.create()` y `updateStatus()`** (Fase 4) para generar la orden de reclamo — mismo código `C#####`, mismo historial de estados, cero lógica duplicada. La nueva orden nace para el **mismo `Device`** que la orden original, así que "relacionarse con la reparación original" (sección 17 del brief) no requirió ningún campo nuevo en el schema: ya existía la relación `Device → RepairOrder[]` desde la Fase 3 (Regla 6), y esta fase simplemente se apoya en ella. Además, el `entryReason` de la orden nueva menciona explícitamente el código de la orden original, para que quede legible de un vistazo sin tener que cruzar tablas.
  - Una garantía vencida no se puede reclamar — el endpoint lo rechaza con la fecha exacta de vencimiento en el mensaje.
- El expediente técnico (`GET /repair-orders/:id`) ahora también incluye las garantías generadas para esa orden.

## Decisiones técnicas clave de esta fase

1. **Reutilizar `RepairOrdersService` en vez de duplicar su lógica** fue la decisión central de esta fase — mismo criterio arquitectónico que ya se aplicó en la Fase 7 (`QuotationsService` reutilizando `RepairPartsService`) y la Fase 9 (`PaymentsService` reutilizando `CashService`). Cada vez que una fase nueva necesita "básicamente lo mismo que ya hace otro módulo", se importa ese módulo en vez de copiar su código — así una corrección futura en la lógica de creación de órdenes beneficia automáticamente al flujo de garantías, sin tener que acordarse de actualizar dos lugares.
2. **El reclamo de garantía NO está envuelto en una única transacción de base de datos**, a diferencia de la conversión de cotizaciones (Fase 7). `repairOrders.create()` y `repairOrders.updateStatus()` ya son atómicos cada uno por separado, pero no hay una transacción exterior que los una a la actualización final de `Warranty`. Es una diferencia real con el rigor de la Fase 7: ahí, fallar a mitad de camino podía dejar inventario mal descontado (un riesgo financiero real); aquí, en el peor caso, quedaría una orden de reclamo creada sin que la garantía original se marque como `CLAIMED` — una inconsistencia detectable y corregible a mano, no una pérdida de dinero. Se documenta la diferencia de rigor a propósito, no por descuido.
3. **No hay expiración automática por lote (cron job).** `status: EXPIRED` en el modelo de datos existe, pero nada lo asigna automáticamente todavía — `findAll({expiringWithinDays})` calcula "por vencer" al vuelo comparando fechas, sin necesidad de que un proceso en segundo plano mantenga el campo `status` actualizado. Si más adelante hace falta el estado `EXPIRED` reflejado de verdad en la base de datos (por ejemplo, para un reporte histórico de "cuántas garantías vencieron sin reclamarse"), hace falta un job programado — está fuera del alcance de esta fase.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva.

```bash
cd backend
npm install
npm run start:dev
```

### Probar garantías y reclamos

```bash
# (usa el token del login y un orderId real, ej. 1)

# 1. Generar la garantía al entregar el equipo
curl -X POST http://localhost:3000/api/repair-orders/1/warranties \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"warrantyMonths": 3, "coverageDescription": "Cambio de pantalla y mano de obra"}'
# → guarda el id que devuelve, ej. 1

# 2. Ver garantías próximas a vencer en los próximos 30 días
curl "http://localhost:3000/api/warranties?expiringWithinDays=30" -H "Authorization: Bearer <token>"

# 3. El cliente vuelve por garantía
curl -X POST http://localhost:3000/api/warranties/1/claim \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"reportedIssue": "La pantalla volvió a fallar", "claimNotes": "Cliente reporta la misma falla original"}'
# → crea una nueva orden C##### para el mismo equipo, en estado "En garantía",
#   y marca la garantía original como CLAIMED

# 4. Verificar que la nueva orden quedó vinculada al mismo equipo que la original
curl http://localhost:3000/api/devices/1 -H "Authorization: Bearer <token>"
# → repairOrders debe mostrar AMBAS órdenes (la original y la de reclamo)

# 5. Intentar reclamar de nuevo la misma garantía → debe fallar (ya CLAIMED)
curl -X POST http://localhost:3000/api/warranties/1/claim \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"reportedIssue": "Otra vez", "claimNotes": "Prueba"}'
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto de punta a punta aquí. Verifiqué manualmente el balance de llaves/paréntesis en los 126 archivos TypeScript del proyecto, y que los tipos que se pasan entre `WarrantiesService` y `RepairOrdersService` (los DTOs de creación y cambio de estado) coincidan estructuralmente.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 9)...
└── warranties/
    ├── warranties.module.ts
    ├── warranties.service.ts
    ├── repair-order-warranties.controller.ts   ← /repair-orders/:orderId/warranties
    ├── warranties.controller.ts                ← /warranties/:id + reclamo
    └── dto/
        ├── create-warranty.dto.ts
        ├── update-warranty.dto.ts
        └── claim-warranty.dto.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/repair-orders/:orderId/warranties` | Autenticado | Genera garantía al entregar el equipo |
| GET | `/api/repair-orders/:orderId/warranties` | Autenticado | Garantías de una orden |
| GET | `/api/warranties?status=&expiringWithinDays=` | Autenticado | Listado global, con alerta de vencimiento |
| GET | `/api/warranties/:id` | Autenticado | Detalle de una garantía |
| PATCH | `/api/warranties/:id` | Autenticado | Edita cobertura o fecha de fin |
| POST | `/api/warranties/:id/claim` | Autenticado | Registra un reclamo (crea la orden de reclamo) |

## Qué sigue

Con garantías funcionando, la **Fase 11** genera **informes PDF** — el botón "GENERAR INFORME TÉCNICO" descrito en la sección 24 del brief, además de comprobantes de ingreso/entrega y facturas simples, usando la información que el expediente técnico ya reúne desde las fases anteriores.

---

# Fase 11: Informes PDF

## Un cambio a la arquitectura propuesta en la Fase 1

La Fase 1 había propuesto **Puppeteer** (HTML→PDF) para generar documentos. Al llegar a esta fase, decidí cambiarlo por **PDFKit**: Puppeteer necesita descargar Chromium completo (~300 MB) durante `npm install`, lo cual es poco práctico para alguien configurando el proyecto por primera vez con conexión limitada (viste de primera mano lo sensible que puede ser un `npm install` en Windows, con el problema del `.env` que resolvimos hace unas fases). PDFKit es una librería pura de Node, sin binarios externos — la contrapartida es que el diseño de los documentos se arma con código (posiciones, texto, tablas) en vez de HTML/CSS, que es exactamente lo que resuelve `common/pdf/pdf-builder.util.ts`.

## Qué se construyó en esta fase

- **`common/pdf/pdf-builder.util.ts`** — un envoltorio sobre PDFKit con los bloques que se repiten en cualquier documento del taller: encabezado con el nombre del negocio, títulos de sección, cuadrícula de pares clave/valor (como un formulario impreso), tablas, líneas de firma, y un pie de página repetido en todas las páginas. Cada generador de documento compone estos bloques — ninguno manipula PDFKit directamente.
- **`documents/`** — cuatro documentos, todos reutilizando `RepairOrdersService.findOne()` para los datos (el mismo expediente técnico que ya arma el backend desde la Fase 4) en vez de repetir consultas:
  - **`GET /repair-orders/:orderId/documents/technical-report`** — el informe técnico de la sección 24 del brief: datos del cliente y del equipo, síntoma reportado, cada diagnóstico con su tabla de mediciones (misma tabla que ya se ve en la interfaz, ahora en papel), procedimientos y bitácora combinados en una sola línea de tiempo, repuestos utilizados, resultado, garantía si existe, y una línea de firma para el técnico.
  - **`GET /repair-orders/:orderId/documents/intake-receipt`** — comprobante de ingreso: cliente, equipo, accesorios recibidos, falla reportada, líneas de firma para cliente y taller. **La contraseña del equipo nunca aparece aquí** — es un dato sensible que solo se consulta por el endpoint restringido de la Fase 4, jamás se exporta a un papel que cualquiera puede ver.
  - **`GET /repair-orders/:orderId/documents/delivery-receipt`** — comprobante de entrega: resumen financiero (total/abonado/saldo), garantía, firma de recibido a satisfacción.
  - **`GET /warranties/:warrantyId/document`** — certificado de garantía imprimible.

## Decisiones técnicas clave de esta fase

1. **El "informe técnico" no tiene un campo de "recomendaciones" propio en el modelo de datos — simplificación explícita.** La sección 24 del brief pide un campo de recomendaciones separado, pero eso nunca se modeló como columna en el schema (ni en la Fase 1 ni en ninguna posterior). El PDF usa el resultado del diagnóstico más reciente y las notas generales de la orden como la aproximación más honesta disponible con los datos que sí existen — no se inventó contenido para llenar la sección. Si en el futuro hace falta un campo de recomendaciones real y editable, es un cambio de schema sencillo (una columna más en `RepairDiagnostic` o `RepairOrder`).
2. **Los documentos se generan al vuelo en cada solicitud, no se guardan.** No hay una tabla `Document` ni un `Attachment` generado automáticamente por esta fase — cada `GET` reconstruye el PDF desde los datos actuales de la orden. Esto es intencional: un informe técnico "vivo" siempre refleja el estado más reciente de la orden, sin el riesgo de que alguien abra una versión vieja guardada por accidente. Si más adelante hace falta un archivo histórico e inmutable (por ejemplo, para adjuntarlo a un correo), se puede guardar el buffer generado como un `Attachment` en ese momento — el modelo ya lo soporta desde la Fase 1.
3. **Solo el informe técnico queda auditado (`GENERATE_TECHNICAL_REPORT`), los demás documentos no.** Se decidió que el informe técnico es el único con peso suficiente (puede entregarse al cliente como respaldo formal) para justificar dejar rastro de quién lo generó y cuándo; los comprobantes de ingreso/entrega y el certificado de garantía son de uso más rutinario.
4. **`PdfBuilder.table()` corta a una página nueva automáticamente** si una tabla larga (por ejemplo, muchas mediciones de diagnóstico) no cabe en el espacio restante — necesario porque un diagnóstico con 15+ puntos medidos definitivamente no cabe en una sola hoja.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva. Sí hay una dependencia nueva (`pdfkit`), así que corre `npm install` de nuevo.

```bash
cd backend
npm install
npm run start:dev
```

### Probar la generación de documentos

Estos endpoints devuelven el PDF directo (no JSON) — pruébalos abriendo la URL en el navegador con el token en la sesión, o con `curl` guardando el archivo:

```bash
# (usa un orderId real, ej. 1, y un warrantyId real, ej. 1)

curl http://localhost:3000/api/repair-orders/1/documents/technical-report \
  -H "Authorization: Bearer <token>" --output informe-tecnico.pdf

curl http://localhost:3000/api/repair-orders/1/documents/intake-receipt \
  -H "Authorization: Bearer <token>" --output comprobante-ingreso.pdf

curl http://localhost:3000/api/repair-orders/1/documents/delivery-receipt \
  -H "Authorization: Bearer <token>" --output comprobante-entrega.pdf

curl http://localhost:3000/api/warranties/1/document \
  -H "Authorization: Bearer <token>" --output garantia.pdf
```

Abre cualquiera de los `.pdf` generados para confirmar que se ve bien.

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto ni generar un PDF real aquí (sin acceso a internet para instalar `pdfkit`). Verifiqué manualmente el balance de llaves/paréntesis en los 132 archivos TypeScript del proyecto y revisé con cuidado especial la API de PDFKit usada en `pdf-builder.util.ts` (posicionamiento manual de texto con `x`/`y`, `bufferedPageRange()` + `switchToPage()` para el pie de página) contra su documentación, porque es la única parte de todo el proyecto que no sigue un patrón ya usado en fases anteriores. Si al generar un PDF real algo se ve mal posicionado o el pie de página no aparece en todas las páginas, ese archivo es el primer lugar donde miraría.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 10)...
├── common/
│   ├── pdf/
│   │   └── pdf-builder.util.ts
│   └── utils/
│       ├── normalize-name.util.ts
│       ├── encryption.util.ts
│       ├── format.util.ts                  ← nuevo
│       └── repair-status-labels.util.ts    ← nuevo
└── documents/
    ├── documents.module.ts
    ├── documents.controller.ts
    └── documents.service.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/repair-orders/:orderId/documents/technical-report` | Autenticado | Informe técnico en PDF (auditado) |
| GET | `/api/repair-orders/:orderId/documents/intake-receipt` | Autenticado | Comprobante de ingreso en PDF |
| GET | `/api/repair-orders/:orderId/documents/delivery-receipt` | Autenticado | Comprobante de entrega en PDF |
| GET | `/api/warranties/:warrantyId/document` | Autenticado | Certificado de garantía en PDF |

## Qué sigue

Con los documentos formales resueltos, la **Fase 12** construye el **Dashboard**: los indicadores y gráficos de la sección 4 del brief (equipos por estado, ingresos del mes, garantías próximas a vencer reutilizando la consulta de la Fase 10, stock bajo reutilizando la de la Fase 6, etc.) como un conjunto de endpoints agregados, listos para que el frontend los consuma en una pantalla de inicio real.

---

# Fase 12: Dashboard

## Qué se construyó en esta fase

- **`dashboard/`** — todos los indicadores y gráficos de la sección 4 del brief, como endpoints agregados:
  - **`GET /dashboard/summary`** — una sola respuesta con: equipos recibidos hoy, equipos por estado (todo el desglose: pendientes, en diagnóstico, esperando aprobación, en reparación, listos, entregados, no reparados — de una sola vez), cotizaciones pendientes, dinero pendiente de clientes, ventas del día, ingresos/gastos del mes, ganancia estimada, repuestos con stock bajo (**reutilizando `ProductsService` de la Fase 6**), garantías próximas a vencer (**reutilizando `WarrantiesService` de la Fase 10**), y reparaciones en curso por técnico.
  - **`GET /dashboard/charts/orders-by-status`** — para un gráfico de equipos por estado.
  - **`GET /dashboard/charts/repairs-by-month?months=6`** — reparaciones ingresadas por mes.
  - **`GET /dashboard/charts/revenue-by-month?months=6`** — ingresos por mes, sumando pagos + ventas (ver decisión #2 más abajo).
  - **`GET /dashboard/charts/top-brands?limit=10`** — marcas más reparadas.
  - **`GET /dashboard/charts/common-issues?limit=10`** — fallas más frecuentes, con una limitación importante documentada en la decisión #3.

## Decisiones técnicas clave de esta fase

1. **Reutilizar servicios ya construidos en vez de repetir sus consultas — tercera vez que aparece este patrón (Fases 7, 9, 10) y la más rentable de todas.** `getSummary()` inyecta `ProductsService` y `WarrantiesService` directamente y llama sus métodos existentes (`findAll({lowStockOnly: true})`, `findAll({expiringWithinDays: 30})`) en vez de escribir de nuevo esas consultas. El costo es una pequeña ineficiencia (`ProductsService.findAll` trae hasta 200 registros completos solo para contar cuántos hay) que se documenta aquí como aceptable a la escala de un taller pequeño/mediano — si el catálogo de productos creciera mucho, valdría la pena agregar un método `countLowStock()` dedicado que solo cuente en la base de datos.
2. **"Ingresos del mes" es dinero efectivamente cobrado (pagos + ventas), no lo facturado.** Se decidió deliberadamente NO sumar `RepairOrder.totalValue` de las órdenes del mes, porque ese total puede seguir pendiente de cobro — sumarlo mostraría un ingreso que todavía no existe como caja real. En cambio, se suman `Payment.amount` y `Sale.total`, que sí representan dinero que ya entró.
3. **"Fallas más frecuentes" hereda una limitación real del Excel original — documentada explícitamente en el código, no escondida.** `reportedIssue` sigue siendo texto libre (nunca se convirtió en catálogo, a diferencia de marcas y tipos de equipo en la Fase 1). La consulta agrupa por texto normalizado, así que "No enciende" y "no enciende " cuentan juntos, pero "No prende" y "No enciende" —la misma falla en la práctica— cuentan como cosas distintas. Es exactamente el mismo problema de fragmentación que tenían "Tipo de equipo" y "Marca" en el Excel antes de normalizarlos. Si este reporte necesita ser confiable de verdad, hace falta un cambio de modelo de datos (un catálogo de fallas comunes + un campo de detalle libre aparte) que no se hizo en esta fase.
4. **El Dashboard completo está restringido a Administrador y Gerente**, a diferencia de la mayoría de endpoints de consulta del sistema (que son abiertos a cualquier autenticado). Incluye cifras financieras (dinero pendiente de clientes, ingresos/gastos/ganancia) que no todos los roles deberían ver de un vistazo.
5. **Tres consultas usan SQL crudo (`$queryRaw`)**, algo que ninguna fase anterior había necesitado: agrupar por mes (`date_trunc`) y cruzar `repair_orders → devices → brands` para "marcas más reparadas" no se pueden expresar con el `groupBy` nativo de Prisma cuando el agrupamiento cruza relaciones o trunca fechas. Los parámetros (`months`, `limit`) se pasan por el template parametrizado de Prisma, no por concatenación de strings, así que siguen protegidos contra inyección SQL igual que el resto del sistema.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta una migración nueva ni dependencias nuevas.

```bash
cd backend
npm install
npm run start:dev
```

### Probar el Dashboard

```bash
# (usa el token de un usuario con rol Administrador o Gerente)

curl http://localhost:3000/api/dashboard/summary -H "Authorization: Bearer <token>"

curl http://localhost:3000/api/dashboard/charts/orders-by-status -H "Authorization: Bearer <token>"

curl "http://localhost:3000/api/dashboard/charts/repairs-by-month?months=6" -H "Authorization: Bearer <token>"

curl "http://localhost:3000/api/dashboard/charts/revenue-by-month?months=6" -H "Authorization: Bearer <token>"

curl "http://localhost:3000/api/dashboard/charts/top-brands?limit=5" -H "Authorization: Bearer <token>"

curl "http://localhost:3000/api/dashboard/charts/common-issues?limit=10" -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: igual que en las fases anteriores, no pude ejecutar esto aquí (sin acceso a internet ni a una base de datos real). Verifiqué manualmente el balance de llaves/paréntesis en los 135 archivos del proyecto, y revisé con cuidado especial la sintaxis de las tres consultas `$queryRaw` (nombres de tabla y columna entre comillas dobles, que es como Postgres las guarda porque Prisma no las normaliza a snake_case a menos que se use `@map` explícito) — es la parte de esta fase con más riesgo de un error tipográfico que solo aparece al ejecutar contra una base de datos real. Si `npm run start:dev` arranca bien pero alguno de los endpoints de `/dashboard/charts/` responde con un error de SQL, esas tres consultas son el primer lugar donde miraría.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 11)...
└── dashboard/
    ├── dashboard.module.ts
    ├── dashboard.controller.ts
    └── dashboard.service.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Administrador, Gerente | Todos los indicadores de la sección 4 en una respuesta |
| GET | `/api/dashboard/charts/orders-by-status` | Administrador, Gerente | Equipos por estado |
| GET | `/api/dashboard/charts/repairs-by-month?months=` | Administrador, Gerente | Reparaciones ingresadas por mes |
| GET | `/api/dashboard/charts/revenue-by-month?months=` | Administrador, Gerente | Ingresos (pagos + ventas) por mes |
| GET | `/api/dashboard/charts/top-brands?limit=` | Administrador, Gerente | Marcas más reparadas |
| GET | `/api/dashboard/charts/common-issues?limit=` | Administrador, Gerente | Fallas más frecuentes (texto libre, ver limitación) |

## Qué sigue

Con el Dashboard listo, la **Fase 13** construye la **importación del histórico del Excel** — el proceso Excel → Validación → Normalización → Vista previa → Corrección → Importación descrito en la sección 27 del brief, aplicando exactamente el plan de migración que se definió en el documento de arquitectura de la Fase 1 (fusión de clientes duplicados, normalización de marcas/tipos de equipo, generación de `orderCode` consistente con el histórico, etc.).

---

# Fase 13: Importación del Excel Histórico

## Alcance de esta fase — qué se importa y qué no

Esta fase importa **solo la hoja "Ingreso de equipos"** (~1.097 filas): es la tabla transaccional más limpia del Excel y cubre, según el análisis de la Fase 1, más del 85% del histórico real del taller (recepción → diagnóstico → reparación → entrega). Las hojas con estructura rota o mezclada que el mismo análisis de la Fase 1 identificó (`Equipos Pendientes` — tabla dinámica exportada de forma vertical; `Cotizaciones`, `Compras`, `Ventas de Partes` — varias tablas distintas conviviendo en el mismo rango de filas) **quedan fuera a propósito**. Forzarlas por este mismo importador genérico produciría datos incorrectos silenciosamente; el plan de migración de la Fase 1 ya las señaló como casos que necesitan un parser dedicado y revisión manual, y esta fase no le da la vuelta a esa conclusión solo por completar un checklist.

## Qué se construyó en esta fase

- **`import/`** — el flujo de dos pasos que pide la sección 27 del brief:
  - **`POST /import/excel/preview`** (sube el archivo `.xlsx`) — parsea, valida y normaliza **sin escribir nada en la base de datos todavía**. Devuelve un resumen (registros encontrados, filas válidas, ya importadas anteriormente, clientes nuevos vs. ya existentes) más dos listas separadas:
    - **`errors`** — filas que NO se van a importar (sin código, sin cliente, o con fecha imposible de interpretar) y por qué.
    - **`warnings`** — filas que SÍ se importan, pero con algo que vale la pena revisar (un teléfono "0" tratado como vacío, una marca o tipo de equipo que no estaba en la lista de variantes conocidas de la Fase 1 y se va a crear como categoría nueva, un estado no reconocido).
    
    La respuesta incluye un `importId` — la vista previa completa queda guardada en memoria por 30 minutos, así que confirmar no requiere volver a subir el archivo.
  - **`POST /import/excel/commit/:importId`** — confirma esa vista previa exacta. Todo ocurre en una sola transacción (con el timeout ampliado a 5 minutos, porque son ~1.000 filas con varias operaciones cada una).
- **`import/import.constants.ts`** — las tablas de normalización de marcas, tipos de equipo y estados, con las variantes exactas que se detectaron al analizar el Excel en la Fase 1 (`Hp`/`HP`/`hp` → `HP`; `Portatil`/`Portaitil`/`Portatl` → `Portátil`, etc.). Si el archivo real del taller trae una variante que no está en esta lista, **no se descarta el dato**: se crea como categoría nueva en el catálogo y queda marcada como advertencia para que alguien la revise después — nunca se pierde información por no reconocerla.
- **`common/utils/spanish-date.util.ts`** — reconstruye una fecha real a partir de las 3 columnas separadas que tenía el Excel (Año / Mes en texto en español / Día), devolviendo `null` (→ error de importación) si alguna parte no se puede interpretar, en vez de adivinar una fecha incorrecta para un registro de hace años.

## Decisiones técnicas clave de esta fase

1. **El código de orden histórico se preserva EXACTO, no se regenera.** Este es el punto más delicado de toda la fase. Desde la Fase 4, `orderCode` se genera como `'C' + id`, donde `id` es el autoincremento de Postgres. Pero para el histórico, el código *ya existe* — es literalmente el número de consecutivo del Excel, y ya se demostró en la Fase 1 que ese mismo número conecta `Ingreso de equipos` con `Bitacora de reparaciones` y `Datos de Operacion` (el hallazgo `C10797` ↔ consecutivo `10797`). Por eso el importador inserta cada orden con **`id` explícito igual al consecutivo original**, no uno generado por Postgres. Después de importar todo, se ejecuta `setval()` sobre la secuencia de autoincremento para que la primera orden nueva creada desde la aplicación (Fase 4) continúe después del máximo id importado, sin chocar con el histórico.
2. **La fusión de clientes duplicados es automática, sin preguntar — coherente con lo que ya se decidió y confirmó en la Fase 1.** A diferencia de `CustomersService.create()` (Fase 3), que responde `409` y pregunta antes de crear un posible duplicado, el importador fusiona automáticamente por nombre normalizado sin pedir confirmación fila por fila — sería inmanejable aprobar uno por uno entre cientos de clientes. La revisión humana ya ocurrió en la Fase 1 (se confirmó que los duplicados detectados eran error de captura) y esa misma regla general es la que se aplica aquí a escala.
3. **Un mismo número de serie del mismo cliente reutiliza el mismo `Device`, no crea uno nuevo por cada fila.** Es la aplicación directa de la Regla 6 (un equipo puede tener múltiples reparaciones históricas) sobre datos reales: si el Excel tiene tres filas para el mismo cliente con el mismo serial, la importación las conecta bajo un solo equipo con tres órdenes, en vez de tres equipos "fantasma" idénticos.
4. **No se reconstruye el historial de estados intermedios — un solo snapshot por orden.** Coherente con la decisión ya confirmada en la Fase 1: el Excel nunca registró las transiciones (solo el estado final), así que inventar una secuencia de estados intermedios sería fabricar datos que no existen. Cada orden importada queda con una única entrada en `RepairStatusHistory` con su estado final real.
5. **El flujo preview → commit es repetible sin duplicar nada.** Si el `commit` se interrumpe a la mitad (por ejemplo, se cae la conexión), volver a correr `preview` con el mismo archivo detecta qué órdenes ya quedaron importadas (por `orderCode`) y las excluye automáticamente de la siguiente vista previa — la importación se puede reintentar sin miedo a duplicar filas ya procesadas.
6. **Las sesiones de vista previa viven en memoria del proceso, no en la base de datos — limitación real y documentada.** Si el backend llegara a correr con más de una instancia detrás de un balanceador, el `commit` podría llegarle a una instancia distinta de la que generó el `preview` y fallar con "sesión no encontrada". Aceptable para el uso previsto de esta función (una importación puntual del histórico, no una operación del día a día); si eso cambia, esta tabla en memoria tendría que moverse a Redis o a Postgres.
7. **El truthy() para "Cargador/Batería/Teclado/Mouse recibido" es una interpretación best-effort, no verificada contra datos reales.** El análisis de la Fase 1 confirmó que esas columnas existen en el Excel, pero no se inspeccionó el valor exacto que contienen (¿"Sí"/"No"? ¿1/0? ¿una X?). Se implementó una detección permisiva (cualquier valor no vacío y distinto de "no"/"0"/"false" cuenta como recibido) — si el archivo real usa una convención distinta, esta es la primera función a ajustar.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase, pero sí hay dos dependencias nuevas (`xlsx`, `multer`) — corre `npm install`.

```bash
cd backend
npm install
npm run start:dev
```

### Probar la importación

```bash
# (usa el token de un usuario Administrador, y la ruta real de tu archivo)

# 1. Vista previa — no escribe nada todavía
curl -X POST http://localhost:3000/api/import/excel/preview \
  -H "Authorization: Bearer <token>" \
  -F "file=@C:/ruta/a/Inventario-PC.xlsx"

# Revisa la respuesta: recordsFound, validRows, errors, warnings.
# Si algo en "errors" te parece mal, corrige el Excel y repite este paso
# las veces que haga falta — no cuesta nada, no toca la base de datos.

# 2. Cuando estés conforme, confirma con el importId que devolvió el paso 1
curl -X POST http://localhost:3000/api/import/excel/commit/<importId> \
  -H "Authorization: Bearer <token>"

# 3. Verificar: buscar una orden histórica por su código original
curl http://localhost:3000/api/repair-orders/by-code/C10797 -H "Authorization: Bearer <token>"
```

> **Nota sobre este entorno de trabajo**: esta es la fase donde más pesa la limitación de no tener acceso a internet ni al archivo Excel real corriendo contra un backend real. No pude probar el parseo contra `Inventario-PC.xlsx` de verdad — todo el código de esta fase se escribió con base en los encabezados y estructura exactos que sí se inspeccionaron celda por celda en la Fase 1 (los nombres de columna, incluido el typo real `"Procemiento 1"` sin "d", están copiados tal cual de esa inspección), pero **esta es, con diferencia, la fase con más riesgo de que algo no encaje al ejecutarla de verdad** — sobre todo la detección de accesorios recibidos (decisión #7) y cualquier fila del Excel real que tenga un formato de fecha o un valor que no se haya visto en la muestra que se inspeccionó. Corre el `preview` primero (no toca la base de datos) y revísalo con calma antes de confirmar — es exactamente para eso que existe el paso separado.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 12)...
├── common/utils/
│   ├── ...(igual que en fases anteriores)...
│   └── spanish-date.util.ts       ← nuevo
└── import/
    ├── import.module.ts
    ├── import.controller.ts
    ├── import.service.ts
    └── import.constants.ts
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/import/excel/preview` | Administrador | Sube el Excel, valida y normaliza, sin escribir nada |
| POST | `/api/import/excel/commit/:importId` | Administrador | Confirma la importación de esa vista previa |

## Qué sigue

Con las 13 fases de datos y funcionalidad completas, la **Fase 14** cierra el proyecto con pruebas, seguridad y despliegue: revisar la cobertura de pruebas automatizadas, endurecer configuración de producción (CORS, rate limiting, variables de entorno), y dejar el proyecto listo para desplegarse en un servidor real siguiendo la estrategia Docker que ya viene funcionando en local desde la Fase 1.

---

# Fase 14: Pruebas, Seguridad y Despliegue

## Qué se construyó en esta fase

### Seguridad

- **Límite de intentos de login (`@nestjs/throttler`)**: 5 intentos por minuto por IP en `/auth/login` — antes de esta fase, el mensaje de error genérico ("usuario o contraseña incorrectos", Fase 2) protegía contra confirmar qué usuarios existen, pero nada impedía probar miles de contraseñas por minuto contra un mismo usuario. El resto de la API tiene un límite de fondo más generoso (100 req/min) para frenar un script descontrolado sin estorbar el uso normal.
- **Helmet**: cabeceras HTTP de seguridad estándar (`X-Content-Type-Options`, `X-Frame-Options`, política básica de CSP, etc.) en cada respuesta.
- **CORS restringido en producción**: antes, `app.enableCors()` aceptaba cualquier origen (razonable en desarrollo local, señalado como pendiente en el README de la Fase 2). Ahora, si `FRONTEND_URL` está definida, el CORS se restringe exactamente a ese dominio; en desarrollo, sin esa variable, se mantiene abierto para no complicar el `npm run dev` del día a día.
- **Filtro global de excepciones** (`AllExceptionsFilter`): cualquier error que no sea una excepción conocida de Nest ahora responde con un mensaje genérico en producción ("Ha ocurrido un error inesperado"), no con el mensaje interno de Node/Prisma ni el stack trace — eso queda solo en el log del servidor. En desarrollo, se sigue viendo el detalle completo para poder depurar.
- **Validación de variables de entorno al arrancar** (`validateEnv()`): si falta `DATABASE_URL`, `JWT_SECRET` o `ENCRYPTION_KEY`, la aplicación ahora rehúsa arrancar con un mensaje claro, en vez de fallar de forma confusa la primera vez que algo las necesite. Además, **en producción bloquea el arranque si detecta que se dejaron los valores de ejemplo de `.env.example` sin cambiar** — un candado explícito contra el error más costoso posible: desplegar con un secreto de cifrado que cualquiera que vea este repositorio ya conoce.
- **`GET /health`**: endpoint público (sin token) que confirma que el proceso responde y que la base de datos está alcanzable — para el `healthcheck` de Docker Compose y para monitoreo externo.

### Pruebas automatizadas

- **Pruebas unitarias de las funciones más críticas y más puras del sistema**: `normalizeName` (la fusión de clientes duplicados de la Fase 3), `encryptSecret`/`decryptSecret` (incluye una prueba que confirma explícitamente que el valor cifrado nunca contiene el texto plano — la garantía de seguridad más importante de la Fase 4), y `parseSpanishDate` (la reconstrucción de fechas del Excel de la Fase 13, con casos específicos como "Agosto " con espacio, tomados directo de filas reales analizadas en la Fase 1).
- **Una prueba de servicio con Prisma simulado** (`CustomersService`): establece el patrón para probar cualquiera de los ~35 servicios del sistema sin necesitar una base de datos real — todos comparten la misma forma de constructor (`prisma`, `audit`, ...), así que este mismo molde se reutiliza.
- **Una prueba end-to-end de ejemplo** (`test/app.e2e-spec.ts`): arranca la aplicación completa de verdad (con conexión real a Postgres) y confirma con `supertest` que `/health` responde y que las rutas protegidas rechazan requests sin token. Requiere Postgres corriendo y el seed aplicado — a diferencia de las pruebas unitarias, esta sí necesita el entorno completo.

## Lo que esta fase NO hace — límites reales, no descuidos

1. **La cobertura de pruebas es un punto de partida, no una suite completa.** Se escribieron pruebas para las piezas más críticas y más fáciles de probar de forma aislada (funciones puras, un servicio representativo), estableciendo el patrón — pero la enorme mayoría de los ~35 servicios del sistema (órdenes de reparación, cotizaciones, inventario, pagos...) no tiene pruebas propias todavía. Escribir esa cobertura completa es, en sí misma, un trabajo del tamaño de varias de las fases anteriores juntas.
2. **No hay integración de CI/CD** (GitHub Actions, GitLab CI, etc.) que corra las pruebas automáticamente en cada cambio. Los scripts (`npm test`, `npm run test:e2e`) están listos para conectarse a cualquier pipeline, pero conectar ese pipeline no se hizo en esta fase.
3. **El despliegue con HTTPS real no está completamente automatizado.** `docker-compose.prod.yml` deja el backend y el frontend corriendo en los puertos 3000 y 80 — para servirlos con un dominio real y certificado TLS (Let's Encrypt), hace falta un proxy inverso (Nginx o Caddy) por delante de ambos contenedores, configurado con el dominio específico del taller. Eso es información que depende completamente del servidor real donde se despliegue (dominio, proveedor de DNS, etc.) y no se puede generar de forma genérica — se documenta como el siguiente paso concreto, no se improvisa una configuración que nadie pidió.
4. **Rate limiting es por IP, en memoria del proceso** — si el backend corre con más de una instancia (varias réplicas detrás de un balanceador), cada instancia lleva su propio conteo, así que el límite real efectivo sería más alto que el configurado (ej. 3 instancias con límite de 5/min = hasta 15/min en la práctica). Para un despliegue con una sola instancia de backend (lo normal para un taller de este tamaño), esto no es un problema.

## Cómo ejecutar esto localmente

Hay dependencias nuevas (`@nestjs/throttler`, `helmet`, `jest`, `supertest` y sus tipos) — corre `npm install`. No se modificó `schema.prisma`.

```bash
cd backend
npm install
npm run start:dev
```

### Correr las pruebas

```bash
# Pruebas unitarias (no necesitan Postgres corriendo)
npm test

# Con reporte de cobertura
npm run test:cov

# Prueba end-to-end (SÍ necesita Postgres corriendo + seed aplicado)
docker compose up -d
npx prisma migrate deploy
npm run seed
npm run test:e2e
```

### Probar el rate limiting del login

```bash
# Ejecuta esto 6 veces seguidas rápido — la 6ª debe responder 429 Too Many Requests
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "incorrecta"}'
done
```

### Desplegar en un servidor real

```bash
# En el servidor (Linux con Docker instalado):
git clone <tu-repositorio>   # o sube el proyecto de otra forma
cd compufix-manager

cp .env.prod.example .env.prod
# Edita .env.prod con secretos reales:
#   openssl rand -base64 48   → JWT_SECRET
#   openssl rand -base64 32   → ENCRYPTION_KEY
#   tu dominio real           → FRONTEND_URL

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Verificar que todo levantó bien:
curl http://localhost:3000/api/health

# Cargar los catálogos iniciales (una sola vez):
docker compose -f docker-compose.prod.yml exec backend npm run seed

# Programar respaldos diarios (crontab -e):
# 0 2 * * * cd /ruta/al/proyecto && ./deploy/backup.sh >> /var/log/compufix-backup.log 2>&1
```

> **Nota sobre este entorno de trabajo**: como en todas las fases anteriores, no pude ejecutar `npm install`, correr las pruebas, ni construir las imágenes de Docker aquí (sin acceso a internet). Verifiqué manualmente el balance de llaves/paréntesis/corchetes en los 149 archivos del proyecto. De todo lo construido en esta fase, lo que **más vale la pena verificar primero** en tu máquina es: (1) que `npm test` corra sin errores de configuración de Jest, (2) que el rate limiting del login responda `429` como se espera (la sintaxis de `@nestjs/throttler` v5 cambió respecto a versiones anteriores de la librería, y es la dependencia más nueva de todo el proyecto), y (3) que `docker compose -f docker-compose.prod.yml build` complete sin errores — son los tres puntos de este entregable que no comparten patrón con nada ya probado en fases anteriores.

## Estructura del proyecto (actualizada y final)

```
compufix-manager/
├── docker-compose.yml            ← desarrollo local (Fase 1)
├── docker-compose.prod.yml       ← producción (Fase 14)
├── .env.prod.example
├── deploy/
│   ├── backup.sh
│   └── restore.sh
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── test/
│   │   ├── jest-e2e.json
│   │   └── app.e2e-spec.ts
│   └── src/
│       ├── health/
│       │   ├── health.module.ts
│       │   └── health.controller.ts
│       ├── common/
│       │   ├── config/
│       │   │   └── validate-env.ts
│       │   ├── filters/
│       │   │   └── all-exceptions.filter.ts
│       │   └── utils/
│       │       ├── normalize-name.util.spec.ts
│       │       ├── encryption.util.spec.ts
│       │       └── spanish-date.util.spec.ts
│       └── customers/
│           └── customers.service.spec.ts
└── frontend/
    ├── Dockerfile
    ├── .dockerignore
    └── nginx.conf
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Confirma que la API y la base de datos responden |

## El proyecto, de principio a fin

Con esta fase se cierran las 14 fases del plan original (sección 34 del brief). En resumen, lo que existe hoy:

- **Modelo de datos completo** (Fase 1): 41 modelos en PostgreSQL, diseñados a partir del análisis celda por celda del Excel original, no de una traducción directa.
- **Backend funcional** (Fases 2-13): autenticación con roles, clientes y equipos con detección de duplicados, el ciclo completo de una reparación (recepción → diagnóstico → cotización → reparación → entrega → garantía), inventario conectado a reparaciones y ventas, compras, pagos y caja con arqueo automático, informes en PDF, un dashboard con indicadores reales, y un importador del histórico que preserva la identidad exacta de cada orden ya conocida por el taller.
- **Interfaz gráfica** con identidad visual propia, cubriendo el flujo diario más importante: recibir un equipo, buscarlo, diagnosticarlo, cotizarlo, cobrar y entregarlo.
- **Listo para producción** (Fase 14): seguridad reforzada, pruebas de ejemplo, y una estrategia de despliegue documentada de punta a punta.

Lo que queda deliberadamente fuera —documentado explícitamente en cada fase donde aplicó, nunca escondido— son extensiones reales pero futuras: WhatsApp, notificaciones automáticas, facturación electrónica, portal de clientes, código QR, firma digital, IA para diagnóstico, y una cobertura de pruebas exhaustiva. El objetivo de este proyecto, tal como se planteó desde la Fase 1, era una arquitectura sólida que le permita al taller dejar de depender de Excel — no una aplicación que pretenda estar terminada para siempre.

---

# Frontend: Interfaz Gráfica (React)

## Identidad visual — por qué se ve así

Antes de escribir un solo componente, se definió una identidad propia en `frontend/DESIGN.md` — vale la pena leerlo completo, pero el resumen es: esto es una herramienta para técnicos de electrónica, no un dashboard SaaS genérico. El fondo oscuro con tinte verde-azulado imita un tapete antiestático de banco de trabajo; el acento es **cobre** (el color real de una pista de cobre o una gota de estaño), no el típico "negro + verde neón" que cualquier IA produce por reflejo. Los códigos de orden y las mediciones de diagnóstico se tipografían como la lectura de un instrumento (monoespaciado, números tabulares) — la pantalla de una orden de reparación es, literalmente, el elemento de firma de todo el diseño.

Tipografía: **IBM Plex Sans** (texto general) + **IBM Plex Mono** (códigos, datos, mediciones) — misma superfamilia, diseñadas para convivir.

## Qué se construyó

Un scaffold real y funcional, no un mockup — cada pantalla llama a los endpoints del backend construidos en las Fases 1-9:

- **Autenticación** (`lib/auth.tsx`): login contra `/auth/login`, token guardado en `localStorage`, rutas protegidas que redirigen a `/login` si no hay sesión. Si el backend responde `401` en cualquier momento (token vencido), `lib/api.ts` limpia la sesión automáticamente.
- **Layout** (`components/Layout.tsx`): sidebar de navegación + barra superior con **búsqueda global** — escribir algo ahí y dar enter lleva directo a `/repair-orders?search=...`, que es el caso de uso principal de la sección 25 del brief.
- **Clientes** (`pages/CustomersPage.tsx`, `CustomerDetailPage.tsx`): búsqueda rápida, creación con manejo explícito del `409 Conflict` por posible duplicado que ya construimos en el backend (Fase 3) — la interfaz muestra los duplicados encontrados y dos botones claros: "es la misma persona" o "es alguien distinto, crear igual".
- **Recepción de equipos** (`pages/NewRepairOrderPage.tsx`): el formulario de recepción completo — búsqueda de cliente en vivo, elegir entre un equipo ya registrado o capturar uno nuevo, falla reportada, accesorios recibidos, contraseña del equipo (que el backend cifra).
- **Lista de reparaciones** (`pages/RepairOrdersPage.tsx`): tabla con búsqueda y filtro por estado, usando `StatusPill` para cada fila.
- **El expediente técnico** (`pages/RepairOrderDetailPage.tsx`) — la pantalla más importante, con pestañas: Información, Diagnóstico (con la tabla de mediciones estilo multímetro), Bitácora (listar + agregar entradas), Repuestos (usar un repuesto **con buscador visual**, descuenta inventario en vivo), Cotizaciones (lista enlazada + botón para crear una nueva, prellenando cliente y orden de origen), Pagos (registrar abono), Historial (línea de tiempo de cambios de estado). El cambio de estado se hace desde el mismo encabezado.
- **Cotizaciones** (`pages/QuotationsPage.tsx`, `NewQuotationPage.tsx`, `QuotationDetailPage.tsx`) — el flujo completo: crear una cotización armando ítems de tres tipos (repuestos vía `ProductSearch`, servicios vía `ServiceSearch`, mano de obra como línea libre) con descuento/impuesto/envío calculados en vivo; en el detalle, agregar o quitar ítems mientras está en Borrador, cambiar de estado, y **convertir** una cotización Aprobada directamente en la reparación (solo visible cuando corresponde: estado Aprobada y con una orden de origen asociada — si falta la orden de origen, la interfaz explica por qué no se puede convertir en vez de mostrar un botón que fallaría).
- **`components/ServiceSearch.tsx`** — mismo patrón que `ProductSearch`: búsqueda en vivo de servicios del catálogo, usada en ambas pantallas de cotización.
- **Caja** (`pages/CashPage.tsx`) — si no hay una caja abierta, muestra el formulario de apertura; si hay una abierta, muestra el resumen en vivo (apertura + ingresos − egresos = esperado), el formulario para registrar movimientos manuales, la lista de movimientos del turno, y el cierre con arqueo — el "esperado" y la "diferencia" siempre los calcula el sistema, la persona solo escribe lo que contó físicamente.
- **Ventas** (`pages/SalesPage.tsx`) — venta rápida tipo mostrador: cliente opcional (o venta anónima), productos por buscador visual con cantidad/precio editables, un método de pago, y cancelación de ventas ya registradas (restituye el stock).
- **Compras** (`pages/PurchasesPage.tsx`) — registrar una compra a proveedor actualiza el inventario automáticamente; el estado de pago de cada compra se cambia con un selector en la misma fila de la lista, sin necesitar una pantalla de detalle aparte.
- **Proveedores** (`pages/SuppliersPage.tsx`, `SupplierDetailPage.tsx`) — búsqueda y alta rápida; el detalle permite editar datos de contacto, ver el historial de compras hechas a ese proveedor, y desactivarlo. Se llega aquí desde un enlace en la pantalla de Compras ("Gestionar proveedores →") en vez de tener su propio ítem en el menú lateral — mismo criterio que las categorías de producto, que se gestionan desde Inventario sin saturar la navegación principal con catálogos secundarios.
- **Dashboard real** (`pages/DashboardPage.tsx`) — reemplaza los accesos rápidos por los indicadores y gráficos reales de la Fase 12: tarjetas de un solo número (recibidos hoy, cotizaciones pendientes, stock bajo, garantías por vencer, ventas del día, dinero pendiente de clientes, ingresos/gastos/ganancia del mes), gráficos de reparaciones e ingresos por mes (con `recharts`), equipos por estado y carga de trabajo por técnico como barras horizontales simples, y marcas más reparadas / fallas más frecuentes. Si el usuario autenticado no tiene rol Administrador o Gerente (el backend restringe `/dashboard` a esos roles desde la Fase 12), la pantalla no muestra un error feo — detecta el `403` específicamente y en su lugar muestra los accesos rápidos que sí puede usar cualquier rol.
- **Inventario** (`pages/ProductsPage.tsx`, `ProductDetailPage.tsx`) — lista con búsqueda, filtro por categoría y filtro de stock bajo; creación de productos con stock inicial (incluye alta rápida de categorías nuevas sin salir del formulario); detalle de producto con historial completo de movimientos y un formulario de ajuste manual (pérdida, devolución, transferencia, reemplazo por garantía).
- **`components/ProductSearch.tsx`** — buscador de productos por SKU/descripción con resultados en vivo, mostrando stock y precio en cada resultado. Se construyó como componente aparte porque se reutiliza en dos lugares: la pestaña de Repuestos del expediente técnico (reemplazando el campo de "ID de producto" que había quedado ahí como limitación conocida) y el módulo de Inventario.

## Decisiones técnicas clave

1. **Sin librería de manejo de estado remoto (React Query, SWR, etc.).** Se optó por un hook propio muy simple (`lib/useFetch.ts`, básicamente `useEffect` + `useState`) para no sumar una dependencia más a un proyecto que ya es grande. Es una limitación real: no hay caché entre pantallas ni revalidación automática en segundo plano. Si el frontend crece bastante más allá de este scaffold, migrar a TanStack Query es el siguiente paso natural — se documenta aquí para que quien continúe no lo interprete como un descuido.
2. **Sin librería de componentes (shadcn/ui, Radix, etc.).** Los componentes en `components/ui.tsx` (Button, Input, Select, Card...) son deliberadamente simples y hechos a mano — otra vez, para mantener el proyecto ligero mientras se valida el flujo completo. Son fáciles de reemplazar por una librería más completa más adelante sin tocar la lógica de las páginas, porque cada página solo los importa por su nombre.
3. **Búsqueda de cliente con "escribe y aparecen resultados", no un `<select>` con todos los clientes.** Con cientos de clientes (recordemos: el Excel original tenía 477), cargar todos en un desplegable sería inutilizable — se replica el patrón de búsqueda rápida que ya construimos en el backend.
4. **El buscador visual de productos se construyó como componente aparte desde el principio.** `ProductSearch` no tiene lógica propia de "a dónde va la selección" — solo busca y devuelve el producto elegido vía `onSelect`. Eso es lo que permitió reutilizarlo tal cual en Inventario, Repuestos, Cotizaciones, Ventas y Compras sin duplicar la llamada a `GET /products?search=`.
5. **El Dashboard distingue explícitamente "sin permiso" de "error real".** En vez de tratar cualquier fallo de red o de servidor como el mismo mensaje genérico, `DashboardPage` revisa si el error es específicamente un `403` (`ApiError.status`) y, en ese caso, no lo trata como una falla — es una restricción de rol esperada, así que muestra los accesos rápidos en vez de un banner de error. Un `500` o un problema de red sí se muestra como error real.
6. **Proveedores no tiene su propio ítem en el menú lateral.** Se llega desde un enlace dentro de Compras — es un catálogo de apoyo para esa pantalla, no un destino que alguien busque de forma independiente en el día a día, así que no compite por espacio en la navegación principal.

## Cómo ejecutar esto localmente

```bash
cd frontend
npm install
cp .env.example .env   # opcional: el valor por defecto ya funciona en local
npm run dev
```

Abre `http://localhost:5173`. Inicia sesión con el usuario administrador que crea el seed de la Fase 1 (`admin` / la contraseña que hayas configurado — recuerda que el README de la Fase 2 recomienda cambiarla de inmediato). Asegúrate de que el backend esté corriendo en `http://localhost:3000` (o ajusta `VITE_API_URL` si lo tienes en otro puerto).

> **Nota sobre este entorno de trabajo**: igual que con el backend, no pude ejecutar `npm install` ni `npm run dev` en este sandbox (sin acceso a internet), así que el frontend no quedó probado en un navegador real. Verifiqué manualmente el balance de llaves/paréntesis en los 20 archivos TypeScript/TSX del proyecto, pero errores de tipos de TypeScript (que solo aparecen al compilar con el compilador real) no se pudieron detectar aquí. Si `npm run dev` o `npm run build` marcan algún error, dime el mensaje exacto — es información que no tuve manera de verificar por adelantado.

## Estructura del proyecto

```
frontend/
├── DESIGN.md                  ← identidad visual, léelo primero
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx                 ← rutas y layout protegido
    ├── index.css               ← variables de diseño (ver DESIGN.md)
    ├── vite-env.d.ts
    ├── lib/
    │   ├── api.ts              ← cliente HTTP, manejo de token y errores
    │   ├── auth.tsx            ← contexto de autenticación
    │   ├── types.ts             ← tipos compartidos (reflejan las entidades del backend)
    │   ├── format.ts            ← formato de moneda y fechas (es-CO)
    │   └── useFetch.ts          ← hook simple de carga de datos
    ├── components/
    │   ├── Layout.tsx           ← sidebar + búsqueda global
    │   ├── StatusPill.tsx       ← píldora de estado tipo LED
    │   ├── ProductSearch.tsx    ← buscador visual de productos, reutilizable
    │   ├── ServiceSearch.tsx    ← buscador visual de servicios, reutilizable
    │   └── ui.tsx               ← Button, Input, Select, Card...
    └── pages/
        ├── LoginPage.tsx
        ├── DashboardPage.tsx
        ├── CustomersPage.tsx
        ├── CustomerDetailPage.tsx
        ├── RepairOrdersPage.tsx
        ├── NewRepairOrderPage.tsx
        ├── RepairOrderDetailPage.tsx   ← el expediente técnico completo
        ├── ProductsPage.tsx            ← inventario: lista + creación
        ├── ProductDetailPage.tsx       ← detalle + movimientos + ajustes
        ├── QuotationsPage.tsx          ← lista de cotizaciones
        ├── NewQuotationPage.tsx        ← creación con ítems
        ├── QuotationDetailPage.tsx     ← detalle, ítems, estado, conversión
        ├── CashPage.tsx                ← apertura/cierre de caja con arqueo
        ├── SalesPage.tsx               ← venta rápida de mostrador
        ├── PurchasesPage.tsx           ← registro de compras a proveedores
        ├── SuppliersPage.tsx           ← lista + alta rápida de proveedores
        └── SupplierDetailPage.tsx      ← edición + historial de compras
```

## Qué sigue

Con esto, la interfaz cubre el ciclo operativo completo del taller, los indicadores de gestión, y la administración de sus catálogos principales. En backend, las 14 fases del plan original ya están completas. Lo que quede pendiente a partir de aquí depende de lo que el uso real del taller vaya pidiendo.

---

# Fase 15: Fotos de Evidencia (Adjuntos)

## Por qué esta fase no estaba en el plan original de 14

El modelo `Attachment` se diseñó desde la Fase 1 (sección 22 del brief: "fotografías del equipo recibido, daños físicos, placa, serial, diagnóstico, reparación, resultado final"), pero **nunca se construyó el módulo del backend que lo expone** — quedó como una relación lista en el schema, sin controlador ni servicio, hasta que el uso real del sistema hizo evidente el hueco. Esta fase lo cierra, y de paso amplía el modelo original: además de fotos generales de una orden, ahora también se pueden asociar a una **entrada específica de la bitácora** — algo que el diseño de la Fase 1 no contemplaba.

## Qué se construyó en esta fase

### Backend

- **Cambio de schema**: `Attachment` gana un campo `repairLogId` opcional. Cuando una foto se sube desde una entrada de bitácora, se guardan **ambos** ids (`repairOrderId` y `repairLogId`) — así la foto aparece tanto en la bitácora puntual como en cualquier consulta general de "todas las fotos de esta orden". **Requiere una migración nueva**: `npx prisma migrate dev --name add_attachment_log_relation`.
- **`attachments/`** — el módulo completo:
  - `POST /repair-orders/:orderId/photos` — fotos generales de la orden (ej. estado físico al recibir el equipo).
  - `POST /repair-orders/:orderId/logs/:logId/photos` — fotos de un paso puntual de la bitácora.
  - `DELETE /attachments/:id` — borrado físico del registro **y** del archivo en disco. A diferencia de casi todo el resto del sistema (Regla 1: nunca borrar), una foto subida por error (desenfocada, del equipo equivocado) no tiene valor histórico que valga la pena preservar como "inactivo" — se decidió que acumular fotos basura desactivadas para siempre no protege a nadie.
  - Almacenamiento en **sistema de archivos local** (`./uploads`), exactamente como se propuso en la arquitectura de la Fase 1 ("con capa abstraída para migrar a S3-compatible en producción") — `attachments/multer.config.ts` es esa capa: es el único archivo que habría que tocar para migrar a S3/MinIO más adelante.
  - Solo acepta imágenes (JPEG, PNG, WEBP, GIF), máximo 8MB por archivo, hasta 10 fotos por solicitud.
- **`main.ts`** ahora sirve `/uploads/<archivo>` como archivos estáticos, y se ajustó la configuración de Helmet (`crossOriginResourcePolicy: "cross-origin"`) — sin ese ajuste específico, las fotos se subirían bien pero el navegador las bloquearía en silencio al intentar mostrarlas desde un origen distinto (el frontend en otro puerto).
- **`docker-compose.prod.yml`** gana un volumen (`compufix_uploads`) para que las fotos sobrevivan a una reconstrucción del contenedor en producción.

### Frontend

- **`components/PhotoGallery.tsx`** — un componente reutilizable (galería + carga) usado en tres lugares:
  1. **Pestaña Información** del expediente técnico — fotos generales del estado del equipo.
  2. **Pestaña Bitácora** — cada entrada tiene su propia mini-galería.
  3. **El formulario de recepción** (`NewRepairOrderPage`) — tras crear la orden, aparece un paso final para subir las fotos de evidencia **antes** de continuar, dentro del mismo flujo de recepción, en vez de dejarlo como un paso aparte que alguien tendría que acordarse de hacer después.
- **`lib/api.ts`** gana `api.postForm()` (sube `FormData` sin forzar `Content-Type: application/json`) y exporta `API_ORIGIN` para construir las URLs completas de las imágenes (que se sirven desde el origen del backend, no del frontend).

## Decisiones técnicas clave de esta fase

1. **Las fotos sí se pueden borrar físicamente — mismo criterio que las mediciones de diagnóstico (Fase 5) y los repuestos usados (Fase 6/7).** Es un patrón que se repite en el sistema: los datos técnicos/operativos puntuales sin peso financiero o legal por sí solos admiten borrado directo cuando el error es evidente (una foto desenfocada, una medición mal transcrita); los registros de negocio (clientes, órdenes, pagos) nunca.
2. **El ajuste de Helmet fue el detalle más fácil de pasar por alto de toda esta fase.** Sin `crossOriginResourcePolicy: "cross-origin"`, todo el flujo de subida funcionaría perfecto (la foto llega, se guarda, la base de datos la registra) y solo al momento de *mostrarla* en el navegador fallaría en silencio — exactamente el tipo de error que parece "no tiene sentido, si la subida sí funcionó" hasta que se revisa la consola del navegador y aparece un bloqueo de CORP, no de CORS.
3. **El paso de fotos en la recepción es un segundo request, no un único formulario multipart con todo junto.** Combinar la creación de la orden (JSON) y la subida de fotos (multipart) en una sola solicitud habría requerido rediseñar el endpoint `POST /repair-orders` para aceptar ambos formatos a la vez — más complejidad de la que se justificaba. En su lugar, se crea la orden primero (ya funcionaba así) y se ofrece subir las fotos de inmediato después, usando el `id` que acaba de devolver el primer request — dos llamadas simples en vez de una combinada y compleja.

## Cómo ejecutar esto localmente

```bash
cd backend
npm install
npx prisma migrate dev --name add_attachment_log_relation
npm run start:dev
```

### Probar la subida de fotos

```bash
# (usa el token del login y un orderId real, ej. 1)

# Subir una foto general de la orden
curl -X POST http://localhost:3000/api/repair-orders/1/photos \
  -H "Authorization: Bearer <token>" \
  -F "files=@C:/ruta/a/foto.jpg"

# Ver las fotos generales de la orden
curl http://localhost:3000/api/repair-orders/1/photos -H "Authorization: Bearer <token>"

# Subir una foto a una entrada de bitácora específica (usa un logId real)
curl -X POST http://localhost:3000/api/repair-orders/1/logs/1/photos \
  -H "Authorization: Bearer <token>" \
  -F "files=@C:/ruta/a/otra-foto.jpg"

# Ver la imagen directamente en el navegador
# http://localhost:3000/uploads/<nombre-generado>.jpg
```

> **Nota sobre este entorno de trabajo**: no pude subir un archivo real ni verificar visualmente que una imagen cargue en el navegador aquí (sin acceso a internet ni a un navegador real). Verifiqué manualmente el balance de llaves/paréntesis en los 153 archivos del backend y en todos los del frontend, y revisé con cuidado la coherencia entre el nombre del campo del formulario (`files`) en el frontend y el que espera `FilesInterceptor` en el backend. Si al subir una foto de verdad el navegador la bloquea al intentar mostrarla (aparecería como ícono de imagen rota, con un error de CORP en la consola), el ajuste de Helmet en `main.ts` es el primer lugar donde miraría.

## Estructura del proyecto (actualizada)

```
backend/src/
├── ...(igual que en la Fase 14)...
└── attachments/
    ├── attachments.module.ts
    ├── attachments.controller.ts
    ├── attachments.service.ts
    ├── multer.config.ts
    └── dto/
        └── upload-attachment.dto.ts

frontend/src/
└── components/
    └── PhotoGallery.tsx
```

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/repair-orders/:orderId/photos` | Autenticado | Sube fotos generales de la orden |
| GET | `/api/repair-orders/:orderId/photos` | Autenticado | Lista las fotos generales |
| POST | `/api/repair-orders/:orderId/logs/:logId/photos` | Autenticado | Sube fotos a una entrada de bitácora |
| DELETE | `/api/attachments/:id` | Autenticado | Borra una foto (archivo + registro) |

---

# Fase 16: Descarga de PDFs Conectada a la Interfaz

## El hueco que cerró esta fase

La Fase 11 construyó cuatro generadores de PDF en el backend (informe técnico, comprobante de ingreso, comprobante de entrega, certificado de garantía) — pero **la interfaz nunca llegó a tener un solo botón que los usara**. Los endpoints funcionaban perfecto probados con `curl`, pero desde el navegador no había manera de generarlos. Esta fase agrega, además, el documento que faltaba desde el principio: **una cotización lista para enviarle al cliente**, que tampoco existía ni en el backend ni en la interfaz.

## Qué se construyó en esta fase

### Backend

- **`DocumentsService.generateQuotationPdf()`** — a diferencia de los demás generadores de esta fase (que reutilizan `RepairOrdersService.findOne()`), la cotización es su propia entidad desde la Fase 7, así que se consulta directo con Prisma: cliente, orden de origen si existe, ítems con su descripción/cantidad/precio. Incluye la fecha de vigencia si se definió, y un pie de página con las condiciones básicas ("precios sujetos a disponibilidad de repuestos... para aprobar, comunícate con el taller").
- **`GET /quotations/:quotationId/document`** — nuevo endpoint, mismo patrón (`StreamableFile`) que los otros cuatro documentos.

### Frontend

- **`lib/api.ts` gana `api.download()`** — la pieza que realmente faltaba para que cualquiera de los cinco documentos funcionara desde el navegador. Un `<a href="...">` normal no puede mandar el header `Authorization`, así que estos endpoints (protegidos por token) nunca se podían abrir con un enlace simple. `api.download()` trae el archivo con `fetch` (con el token), arma un `blob`, y dispara la descarga mediante un enlace temporal invisible — el patrón estándar para descargas autenticadas en una aplicación de una sola página.
- **`components/DownloadPdfButton.tsx`** — botón reutilizable con su propio estado de carga ("Generando…") y manejo de error, para no repetir esa lógica cinco veces.
- **Cotizaciones**: botón "Descargar PDF" en el encabezado de `QuotationDetailPage`, junto a las demás acciones.
- **Expediente técnico**: una tarjeta nueva "Documentos" en la pestaña Información, con los tres documentos de la orden (informe técnico, comprobante de ingreso, comprobante de entrega) listos con un clic.

## Decisiones técnicas clave de esta fase

1. **El certificado de garantía se quedó sin botón en esta fase — a propósito.** Sigue sin existir una pantalla de detalle de garantías en la interfaz (`Warranty` no tiene su propia página, solo se generan y se reclaman vía API desde la Fase 10). Agregar el botón sin la pantalla que lo alojara no tenía sentido; queda como la pieza más obvia para la próxima vez que se retome el frontend de Garantías.
2. **`api.download()` es una función aparte, no una extensión de `api.get()`.** `api.get()` siempre espera y parsea JSON; forzarlo a manejar también blobs binarios habría complicado esa función central para un caso de uso que en realidad es bastante distinto (no hay body que parsear como objeto, hay que leer el nombre de archivo del header `Content-Disposition`, y el resultado no se "devuelve" para usarse en el estado de un componente — se dispara una descarga y ya).
3. **Cada botón de descarga maneja su propio error, no un error global de la página.** Si falla la generación de un PDF específico (ej. el comprobante de entrega, porque a la orden le falta algo), solo ese botón muestra el problema — el resto de la pantalla (y los otros documentos) siguen disponibles con normalidad.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` en esta fase — no hace falta migración nueva ni dependencias nuevas.

```bash
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Prueba el flujo completo desde el navegador: entra a una cotización y da clic en "Descargar PDF"; entra a una orden de reparación, pestaña Información, y descarga cualquiera de los tres documentos.

> **Nota sobre este entorno de trabajo**: no pude verificar en un navegador real que la descarga se dispare correctamente (sin poder ejecutar `npm run dev` aquí). Sí verifiqué el balance de llaves/paréntesis en todos los archivos tocados, y revisé con cuidado que el patrón `fetch → blob → enlace temporal → click → revocar URL` en `api.download()` esté completo — olvidar el `URL.revokeObjectURL()` al final no rompe la descarga, pero sí acumula memoria del navegador si alguien descarga muchos documentos seguidos en la misma sesión, así que quedó incluido a propósito.

## Endpoints disponibles al cierre de esta fase (nuevos)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/quotations/:quotationId/document` | Autenticado | Cotización en PDF, lista para enviar al cliente |

---

# Corrección: Texto Cruzado y Símbolos Corruptos en los PDF

Reportado con los PDF reales generados por el sistema (informe técnico y comprobante de entrega de la orden C6) — dos errores distintos en `common/pdf/pdf-builder.util.ts`, ambos en el código de la Fase 11, nunca antes verificados contra un PDF real generado de punta a punta.

## Qué estaba mal

1. **`keyValueGrid()` cruzaba secciones con un número impar de pares.** La función decidía dónde empezar la siguiente fila leyendo la posición del cursor que iba dejando cada `.text()` de PDFKit, en vez de calcular la altura de la fila de antemano. Con un número par de pares (2, 4...) esto coincidía por casualidad; con un número impar (ej. "Cliente / Teléfono / Documento" = 3, usado en el informe técnico), la última fila sin pareja nunca actualizaba la posición correctamente, y la sección siguiente ("Datos del equipo") se escribía encima de la anterior — exactamente lo que se veía en el PDF de la orden C6.
2. **`table()` usaba una altura de fila fija (16px)**, sin importar cuánto texto tuviera la celda. La tabla de "Procedimientos realizados" combina fecha + descripción larga, que fácilmente ocupa 3-4 líneas — con solo 16px reservados, cada fila larga invadía la siguiente, produciendo el bloque de texto ilegible que se veía en el informe.
3. **El carácter flecha "→"**, usado para unir procedimiento y resultado de la bitácora en el informe técnico, no existe en la fuente estándar que usa PDFKit (Helvetica, con codificación WinAnsi/Windows-1252) — se renderizaba como el símbolo corrupto `!'` que aparecía en el PDF real.

## Qué se corrigió

1. **`keyValueGrid()` y `table()` ahora calculan la altura real de cada fila con `heightOfString()` antes de escribir nada**, sin importar si el número de pares es par o impar, ni cuánto texto tenga cada celda. Ambas funciones también restauran el cursor horizontal al margen izquierdo al terminar — sin eso, un título de sección escrito justo después de una tabla o una cuadrícula podía quedar indentado en la posición de la última columna en vez de empezar al margen.
2. **Se agregó `sanitizeForPdf()`**, aplicada automáticamente en los siete métodos de `PdfBuilder` que escriben texto (`header`, `sectionTitle`, `keyValueGrid`, `paragraph`, `table`, `signatureLine`, `footer`). No es una solución puntual para la flecha: cubre cualquier texto libre que un técnico escriba en el futuro (una falla reportada, una nota, un resultado de bitácora) que incluya un símbolo que la fuente no soporte — antes de esta corrección, ese error se descubriría en producción, con un PDF real ya enviado a un cliente.
3. **La lista de símbolos seguros usa el mapeo real de Windows-1252**, no un rango numérico simple. Un primer intento de esta corrección usaba `[^\x00-\xFF]` como red de seguridad final — eso habría convertido la raya "—", las comillas curvas y la viñeta "•" en signos de interrogación, porque sus códigos Unicode quedan muy por encima de 0xFF aunque la fuente sí los dibuje bien (Windows-1252 mapea su rango de bytes 0x80-0x9F a esos símbolos específicos, no a un rango contiguo bajo). Se corrigió antes de entregarlo, con una lista explícita de esos códigos especiales.

## Cómo verificar la corrección

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend
npm run start:dev
```

Genera de nuevo el informe técnico de cualquier orden que tenga varias entradas de bitácora con procedimiento y resultado (como la orden C6 del reporte original) y confirma que:
- "Datos del cliente" y "Datos del equipo" ya no se superponen.
- La tabla de procedimientos se lee completa, sin líneas montadas una sobre otra.
- Donde antes aparecía `!'` ahora aparece `->`.

> **Nota sobre este entorno de trabajo**: no pude generar un PDF real ni verificarlo visualmente aquí (sin `pdfkit` instalado ni un entorno gráfico). Verifiqué la lógica de `sanitizeForPdf()` ejecutándola de forma aislada en Node con los textos exactos del reporte original (incluida la frase completa que aparecía corrupta) y confirmé que el resultado es el esperado. La corrección de `heightOfString()` en `keyValueGrid()`/`table()` se revisó por lectura cuidadosa contra la documentación de PDFKit, pero no se generó un PDF real para confirmar visualmente el espaciado — si algo se ve apretado o con demasiado espacio de más entre filas, ese es el ajuste más probable a afinar (el `+8` y `+6` de separación entre filas son valores razonables elegidos a ojo, no medidos contra un documento real impreso).

---

# Frontend de Garantías

## El hueco que cerró esta fase

Al construir los botones de descarga de PDF, se documentó explícitamente que el certificado de garantía se quedó sin botón porque no existía ninguna pantalla de detalle de garantías en la interfaz. Esta entrega construye esa pantalla — y con ella, todo el frontend de un módulo que desde la Fase 10 solo se podía usar por API.

## Qué se construyó

- **`pages/WarrantiesPage.tsx`** — listado global con filtro por estado (Vigente/Vencida/Reclamada) y un filtro rápido de "vencen en N días", que reutiliza directamente el parámetro `expiringWithinDays` que ya existía en el backend desde la Fase 10 pensado para una alerta de Dashboard que nunca llegó a tener su propia pantalla — esta lista es, en la práctica, esa alerta.
- **`pages/WarrantyDetailPage.tsx`** — el certificado PDF finalmente tiene un botón real; edición de cobertura y fecha de vencimiento (solo si sigue vigente); y el flujo de reclamo completo: un formulario pide la falla reportada y una observación, y al confirmar navega directo a la nueva orden de reparación que el backend generó para el mismo equipo (Regla 6) — sin que la persona tenga que ir a buscarla por su cuenta.
- **Nueva pestaña "Garantía" en el expediente técnico** (`RepairOrderDetailPage`) — es el lugar natural para generar la garantía al entregar el equipo (meses de cobertura + descripción), justo donde ya existe el resto del flujo de la orden. Si la orden ya tiene una o más garantías, se listan con enlace a su detalle.
- **"Garantías" en el menú lateral**, entre Cotizaciones y Clientes.

## Decisiones técnicas clave

1. **Editar la cobertura solo está disponible si la garantía sigue vigente.** Una garantía ya vencida o ya reclamada es un registro histórico — permitir "corregir" su fecha de vencimiento después de que ya se resolvió (o venció) abriría la puerta a reescribir lo que realmente pasó.
2. **El formulario de reclamo se cierra navegando a la nueva orden, no quedándose en la pantalla de garantía.** Después de reclamar, lo que la persona necesita hacer de inmediato es trabajar en la reparación nueva — quedarse mirando el detalle de la garantía ya reclamada no aporta nada en ese momento.
3. **La lista de garantías por orden vive dentro del expediente técnico, no hay una ruta separada "garantías de esta orden".** Ya existe `GET /warranties?repairOrderId=` de forma indirecta a través del campo `warranties` que el propio detalle de la orden ya trae incluido desde la Fase 10 — reutilizar ese dato evita una llamada de red adicional solo para mostrar algo que ya llegó con la orden.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Prueba el flujo completo: entra a una orden entregada, pestaña "Garantía", genera una con 3 meses de cobertura; ve a "Garantías" en el menú, filtra por "vencen en 90 días" y confírmala en la lista; entra a su detalle y descarga el certificado; por último, registra un reclamo y confirma que te lleva a la orden nueva.

---

# Corrección: Sin Forma de Asignar Técnico desde la Interfaz

Reportado directamente: el Panel muestra "Reparaciones en curso por técnico" (Fase 12), pero la pantalla de Reparaciones nunca tuvo forma de asignar un técnico a una orden — el backend tenía el endpoint desde la Fase 4 (`PATCH /repair-orders/:id/assign-technician`), pero, igual que el botón de diagnóstico y los de descarga de PDF, nunca se conectó a la interfaz. El expediente técnico solo mostraba el técnico asignado en modo lectura.

## Un obstáculo adicional que apareció al revisar esto

Al intentar simplemente agregar un desplegable de técnicos en la interfaz, apareció un problema de fondo: `GET /users` (de donde saldría la lista) está restringido a Administrador desde la Fase 2. Eso significa que Recepción o un técnico —quienes en la práctica son quienes asignan reparaciones en el día a día— no habrían podido ni siquiera cargar la lista de técnicos para elegir uno.

## Qué se corrigió

- **`GET /catalogs/technicians`** (nuevo) — devuelve solo `id` y `fullName` de los usuarios activos con rol Técnico, abierto a cualquier persona autenticada. Se puso en `catalogs/` (no en `users/`) a propósito: mismo criterio que ya existía para marcas y tipos de equipo — un catálogo de solo lectura para poblar un desplegable nunca debería exigir el mismo permiso que administrar usuarios completos.
- **El encabezado del expediente técnico** ahora tiene un segundo desplegable junto al de "Cambiar estado…": "Asignar técnico…", que muestra el técnico actual si ya hay uno asignado y permite cambiarlo con un clic.

## Decisiones técnicas clave

1. **El catálogo filtra estrictamente por rol "Técnico"**, no lista todos los usuarios activos. Es una decisión razonable pero con un límite real: si алgún día se necesita asignar una reparación a un Gerente o Administrador (poco común, pero posible en un taller pequeño), este desplegable no lo va a mostrar — el campo `technicianId` en la base de datos no tiene esa restricción, solo la tiene esta consulta puntual.
2. **El error de asignar técnico se maneja por separado del error de cambiar estado**, aunque ambos desplegables viven en el mismo encabezado — si falla uno, no debería verse como si el otro también hubiera fallado.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` — no hace falta migración ni dependencias nuevas.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a cualquier orden de reparación y confirma que el desplegable "Asignar técnico…" ya trae los técnicos activos del sistema.

---

# Frontend de Gestión de Usuarios y Técnicos

## El hueco que cerró esta fase

Para asignar un técnico a una reparación (corrección anterior) primero hace falta que ese técnico exista como usuario del sistema — y la interfaz nunca tuvo ninguna pantalla para crear o administrar usuarios. El backend tiene el CRUD completo desde la Fase 2 (`POST /users`, editar, resetear contraseña, desactivar/reactivar), pero solo se había probado por API en su momento.

## Qué se construyó

- **`pages/UsersPage.tsx`** — lista de usuarios con su rol y especialidad visibles de un vistazo, y creación de usuarios nuevos (nombre, usuario, contraseña temporal, rol, especialidad opcional, datos de contacto).
- **`pages/UserDetailPage.tsx`** — edición de datos y rol, restablecer contraseña (para cuando alguien la olvida), y desactivar/reactivar — nunca borrar, mismo criterio de todo el sistema.
- **"Usuarios" en el menú lateral, visible solo para el rol Administrador.** El backend ya restringía estos endpoints a ese rol desde la Fase 2; mostrarle el ítem del menú a cualquier otro rol solo lo habría llevado a una pantalla que falla con `403` en cada llamada. El filtro de visibilidad del menú (`Layout.tsx`) ahora acepta una lista opcional de roles permitidos por ítem — reutilizable si en el futuro otra sección necesita el mismo tipo de restricción.

## Decisiones técnicas clave

1. **La contraseña se pide como "temporal" en el formulario de creación, no como la contraseña definitiva.** El usuario nuevo normalmente la cambia la primera vez que entra (o el Administrador se la comunica de forma segura) — el lenguaje del formulario lo deja claro para que nadie asuma que esa clave queda fija para siempre.
2. **Restablecer contraseña es una acción separada de editar el usuario**, con su propia confirmación visual ("Contraseña actualizada. Comunícasela al usuario de forma segura") — mezclar el cambio de contraseña dentro del formulario general de edición habría hecho fácil cambiarla sin querer al guardar otro campo.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` — no hace falta migración ni dependencias nuevas.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Inicia sesión como Administrador, entra a "Usuarios", crea un técnico nuevo, y confirma que aparece de inmediato en el desplegable "Asignar técnico…" de cualquier orden de reparación.

---

# Revisión General: Endpoints del Backend sin Conectar

Se hizo un cruce sistemático de **todas** las rutas del backend contra **todas** las llamadas del frontend, buscando el mismo patrón que ya había aparecido varias veces (diagnóstico, PDFs, garantías, asignación de técnico, usuarios): un endpoint construido y probado por API, pero nunca conectado a ninguna pantalla.

## Lo que se corrigió en esta revisión

1. **Contraseña del equipo (Fase 4) — no tenía ninguna forma de consultarse desde la interfaz.** Es un dato cifrado, restringido por rol, con su propio endpoint de lectura y de purga — construido con cuidado desde la Fase 4, pero completamente inalcanzable para un técnico que de verdad necesita encender el equipo del cliente. Se agregó una tarjeta "Contraseña del equipo" en la pestaña Información del expediente técnico, con un botón para mostrarla bajo pedido (nunca se trae junto con el resto del detalle de la orden) y otro para eliminarla después de la entrega.
2. **No existía una página de detalle de equipo — la Regla 6 del brief ("un equipo puede tener múltiples reparaciones históricas") no tenía dónde mostrarse.** Los equipos solo aparecían como una lista plana dentro de la ficha del cliente, sin poder ver su ficha técnica completa ni, sobre todo, su historial de visitas al taller — que es exactamente el hallazgo que justificó crear `Device` como entidad propia desde la Fase 3. Se agregó `DeviceDetailPage`: ficha técnica editable, desactivación, y la lista completa de órdenes de reparación de ese equipo específico, sin importar qué cliente lo trajo cada vez.

## Pendiente al cierre de esta revisión

Ninguno — los seis puntos identificados en esta revisión (historial de cajas, desactivar clientes/productos, resumen de costo/ganancia, editar bitácora/diagnóstico, desactivar categorías, y carga masiva de mediciones) quedaron resueltos en las secciones siguientes de este README.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a cualquier orden con una contraseña de equipo registrada (créala desde "Recibir equipo" si no tienes una) y confirma que "Mostrar contraseña" la trae correctamente. Luego entra a la ficha de un cliente, haz clic en uno de sus equipos, y confirma que ves su historial completo de reparaciones.

---

# Historial de Cajas Cerradas

## El hueco que cerró esta fase

De la lista de pendientes de la revisión general: `CashPage` solo mostraba la caja abierta del momento — no había forma de revisar el arqueo de un día anterior. `GET /cash-registers` y `GET /cash-registers/:id` existían en el backend desde la Fase 9, sin conectar.

## Qué se construyó

- **`CashHistorySection`**, agregada directamente dentro de `CashPage.tsx` (no una pantalla aparte): debajo de la caja actual (o del formulario de apertura, si no hay ninguna abierta), una tabla con todas las cajas ya cerradas — apertura, cierre, esperado, contado y diferencia, coloreada según si sobró o faltó dinero.
- **`pages/CashRegisterDetailPage.tsx`** — al hacer clic en cualquier fila del historial, se ve el detalle completo de esa caja: el mismo resumen de arqueo más la lista completa de movimientos de ese turno, igual que se ve para la caja actual, pero de solo lectura (no se puede agregar movimientos ni volver a cerrarla).

## Decisiones técnicas clave

1. **El historial vive en la misma página de Caja, no en una ruta de nivel superior en el menú.** No tiene sentido un ítem de menú separado "Historial de cajas" cuando el 90% del tiempo la persona entra a esta pantalla para ver la caja de HOY — el historial es un complemento de esa misma pantalla, con su propio detalle a un clic de distancia, no un destino independiente.
2. **La caja abierta actual se excluye de la tabla de historial**, aunque `GET /cash-registers` la incluya en la respuesta — ya se está mostrando en detalle arriba; listarla otra vez abajo sería mostrar la misma información dos veces en la misma pantalla.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Cierra la caja actual (si tienes una abierta) y confirma que aparece de inmediato en la tabla de historial, con la diferencia calculada correctamente; haz clic en ella para ver el detalle completo.

---

# Botón de Desactivar en Clientes y Productos

## El hueco que cerró esta fase

Ambos módulos tenían edición completa desde hace varias entregas, pero ninguno tenía el botón de desactivar en su pantalla de detalle — `PATCH /customers/:id/deactivate` y `PATCH /products/:id/deactivate` (y sus `reactivate`) existían y funcionaban desde las Fases 3 y 6 respectivamente, simplemente nunca se conectaron.

## Qué se construyó

- **`CustomerDetailPage`** y **`ProductDetailPage`** ganan un botón "Desactivar"/"Reactivar" junto al de "Editar", con confirmación antes de actuar y un mensaje distinto según el caso: desactivar un cliente dice "seguirá visible en el historial, pero no aparecerá en nuevas búsquedas"; desactivar un producto dice "dejará de aparecer en el buscador para nuevas ventas, compras o reparaciones" — cada mensaje explica la consecuencia real y específica de ese módulo, no un genérico "¿estás seguro?".
- Cuando un registro está inactivo, su nombre en el encabezado lleva una etiqueta roja "Inactivo" — visible de inmediato sin tener que ir a buscar el campo de estado en ningún otro lado.
- Se completaron los tipos `Customer` y `Product` en el frontend, que no tenían el campo `status` a pesar de que el backend siempre lo había devuelto.

## Un error propio, encontrado antes de entregarlo

Al insertar el bloque del botón en `ProductDetailPage.tsx`, una edición dejó una etiqueta JSX sin cerrar (`{actionError && <ErrorBanner message={actionError} />` sin el `}` final). El chequeo de balance de llaves que se corre antes de cada entrega lo detectó de inmediato — se corrigió antes de empaquetar, y se verificó de nuevo que el archivo completo quedara balanceado.

## Decisiones técnicas clave

1. **Nunca se navega fuera de la página al desactivar** (a diferencia de `SupplierDetailPage`, que sí redirige a la lista). Aquí la persona se queda viendo el registro con la etiqueta "Inactivo" ya reflejada — útil si justo después quiere reactivarlo por error, sin tener que volver a buscarlo.
2. **El mensaje de confirmación es específico por módulo, no un texto genérico compartido.** Cuesta lo mismo escribir "¿desactivar este registro?" que explicar la consecuencia real — y la segunda opción reduce la posibilidad de que alguien desactive algo sin entender del todo qué va a dejar de pasar.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra al detalle de cualquier cliente o producto y confirma que el botón desactiva/reactiva correctamente, con la etiqueta "Inactivo" apareciendo y desapareciendo según corresponda.

---

# Resumen de Costo/Ganancia por Reparación

## El hueco que cerró esta fase

`GET /repair-orders/:orderId/parts/cost-summary` calculaba costo de repuestos, ingreso y margen desde la Fase 6, pero nunca se mostraba en ningún lado de la interfaz — la pestaña Repuestos del expediente técnico solo listaba los repuestos usados, sin ningún total.

## Qué se construyó

- **`CostSummaryCard`**, agregada al final de la pestaña Repuestos: costo, cobrado por repuestos, ganancia (en verde o rojo según el signo) y margen porcentual — solo aparece cuando la orden ya tiene al menos un repuesto usado, para no mostrar una tarjeta vacía con puros ceros en una orden que todavía no ha consumido inventario.
- Se recalcula automáticamente cada vez que se agrega o se quita un repuesto, sin que la persona tenga que refrescar la página.

## Decisiones técnicas clave

1. **La tarjeta dice explícitamente "de repuestos", no "de la reparación".** Esta es la misma limitación que ya se documentó al construir el endpoint en la Fase 6: el cálculo no incluye mano de obra, porque el modelo de datos todavía no tiene una tarifa de servicio desglosada por orden. Mostrar este número como "la ganancia total de la reparación" sería engañoso — alguien podría tomar una decisión de precio pensando que ese margen ya incluye el trabajo del técnico, cuando en realidad solo refleja el margen de los repuestos.
2. **La actualización usa la cantidad de repuestos como disparador de recarga (`refreshKey={order.partsUsed.length}`), no un estado propio.** Como el resumen vive en un endpoint separado del detalle de la orden, no se actualiza automáticamente cuando el resto de la pestaña se refresca — depender de un valor que cambia con cada alta o baja de repuesto (la longitud de la lista) es más simple que mantener un segundo mecanismo de recarga manual.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a una orden, agrega un repuesto en la pestaña Repuestos, y confirma que la tarjeta de costo/ganancia aparece y se actualiza al agregar o quitar repuestos.

---

# Edición de Bitácora y Diagnóstico Ya Creados

## El hueco que cerró esta fase

Ambos módulos permitían crear, pero no corregir: `PATCH /repair-logs/:id` y `PATCH /diagnostics/:id` existían desde la Fase 5, sin conectar. Si un técnico transcribía mal un resultado o quería completar un diagnóstico después de investigar más, no había forma de corregirlo — solo quedaba crear una entrada nueva para "enmendar" la anterior, ensuciando la bitácora.

## Qué se construyó

- **Bitácora**: cada entrada ahora tiene un botón "Editar" que la convierte en un formulario en línea (procedimiento, resultado, notas) — reemplaza el texto por el formulario en el mismo lugar de la lista, sin abrir ningún modal ni navegar a otra pantalla.
- **Diagnóstico**: cada tarjeta de diagnóstico gana un "Editar" en su propio encabezado (reutilizando el prop `action` que `CardHeader` ya soportaba desde el principio, sin tener que tocar ese componente). Al editar, los campos de texto (referencia de placa, síntoma inicial, componente sospechoso/reemplazado, resultado) se reemplazan por sus inputs correspondientes; la tabla de mediciones y el formulario para agregar una nueva quedan visibles todo el tiempo, edición o no.

## Decisiones técnicas clave

1. **La edición reemplaza el contenido en el mismo lugar, no abre un formulario aparte debajo o un modal.** Es el mismo patrón que ya se usaba en Clientes, Proveedores y Usuarios — mantiene la mirada de la persona en el mismo punto de la pantalla en vez de hacerla buscar el formulario en otro lado.
2. **No se puede editar el técnico de una entrada de bitácora**, ni tampoco los indicadores booleanos de BIOS/EC reprogramados en un diagnóstico — se dejaron fuera del formulario de edición a propósito (mismo criterio que ya tenía `UpdateLogDto` en el backend desde la Fase 5: la bitácora registra quién hizo qué en su momento, eso no se reasigna después).

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a una orden con al menos una entrada de bitácora y un diagnóstico, y confirma que "Editar" funciona en ambos casos.

---

# Desactivar Categorías de Producto

## El hueco que cerró esta fase, y un límite real que encontré al construirlo

`PATCH /product-categories/:id/deactivate` existía desde la Fase 6; la interfaz solo permitía crear categorías, nunca desactivarlas. Al ir a construir el botón encontré algo que vale la pena que sepas antes de usarlo: **el backend nunca tuvo un endpoint de "reactivar" categoría** — a diferencia de clientes y productos, que sí lo tienen. Desactivar una categoría desde la interfaz es, en la práctica, difícil de deshacer sin entrar directo a la base de datos.

## Qué se construyó

- **Botón "Categorías"** en el encabezado de Inventario, junto a "+ Nuevo producto" — despliega un panel con la lista de categorías activas, cada una con su botón "Desactivar", y un formulario para crear categorías nuevas sin salir de la pantalla.
- El mensaje de confirmación antes de desactivar dice explícitamente que no hay forma de reactivarla desde la interfaz, para que nadie lo haga pensando que es una acción reversible con un clic.

## Decisiones técnicas clave

1. **Se documentó la limitación en vez de fingir que no existe o de construir el endpoint de reactivar que faltaba.** Agregar `PATCH /product-categories/:id/reactivate` en el backend habría sido sencillo, pero cambiaba el alcance de "conectar lo que ya existe" a "completar una funcionalidad que nunca se terminó" — se dejó como una mejora futura evidente, señalada explícitamente, en vez de mezclarla sin avisar con esta corrección.
2. **El panel de categorías es un despliegue dentro de la misma pantalla de Inventario, no una ruta ni una pantalla aparte.** Mismo criterio que Proveedores (colgado de Compras) y el historial de Caja (colgado de la pantalla de Caja): un catálogo de apoyo que se usa ocasionalmente no necesita competir por espacio en la navegación principal.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a Inventario, abre "Categorías", crea una de prueba y luego desactívala — confirma que el mensaje de confirmación advierte sobre la falta de reactivación, y que la categoría desaparece de la lista y de los desplegables de creación de productos.

---

# Carga Masiva de Mediciones de Diagnóstico

## El hueco que cerró esta fase — y el último de la lista de la revisión general

`POST /diagnostics/:id/measurements/bulk` existía desde la Fase 5, pensado exactamente para el caso de "el técnico ya tiene la tabla completa de una placa conocida, transcrita de una hoja de referencia" — pero la interfaz solo tenía el formulario de agregar una medición a la vez, que para una tabla de 10-15 puntos habría significado repetir el mismo formulario esa cantidad de veces.

## Qué se construyó

- **`BulkMeasurementForm`**, junto al formulario individual ya existente dentro de cada tarjeta de diagnóstico: una tabla editable que arranca con 2 filas vacías, con botón "+ Agregar fila" para sumar cuantas hagan falta y "Quitar" en cada una para descartar filas que sobren. El botón de guardar muestra cuántas mediciones válidas va a enviar (`Guardar 8 mediciones`), contando solo las filas que sí tienen el nombre del punto lleno.
- **Las filas sin nombre de punto se ignoran silenciosamente al guardar, no se rechazan con un error** — es exactamente lo que hace falta cuando alguien arranca con 2 filas vacías por defecto, llena solo 6, y dos quedan sin usar; no tendría sentido obligar a borrarlas a mano antes de poder guardar.

## Decisiones técnicas clave

1. **La carga masiva vive DENTRO de la interfaz como una tabla editable, no como un cuadro de texto para pegar CSV.** Se consideró la alternativa de un textarea donde el técnico pegara filas separadas por comas — más rápido de escribir para quien ya tiene los datos en otro lado, pero mucho más propenso a errores de formato invisibles (una coma de más, un campo corrido) que solo se detectarían después de guardar. La tabla editable es más lenta de llenar a mano, pero cada campo se valida en su propio input, igual que el resto del sistema.
2. **Ambos formularios (individual y masivo) conviven lado a lado, ninguno reemplaza al otro.** Mismo criterio que ya se documentó al construir el endpoint en el backend (Fase 5): el individual sirve para ir registrando mientras se revisa la placa en vivo; el masivo, para cuando ya se tiene la tabla completa de antemano.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a un diagnóstico existente, haz clic en "+ Cargar tabla completa", llena varias filas (deja alguna vacía a propósito) y confirma que solo se guardan las que sí tienen el punto lleno.

## Con esto se cierra la lista completa de la revisión general

Los seis puntos identificados en la revisión sistemática de endpoints sin conectar quedaron resueltos: historial de cajas, desactivar clientes/productos, resumen de costo/ganancia, editar bitácora/diagnóstico, desactivar categorías, y esta carga masiva de mediciones.

---

# Catálogo de Puntos de Medición Conocidos

## De dónde salió esto

A partir de un checklist real de diagnóstico de alimentación ("Power Trace", S5/S0 para laptops gamer) que se compartió como referencia. La tabla de mediciones (`DiagnosticMeasurement`, Fase 5) ya tenía exactamente los campos que ese checklist necesita — punto, esperado, medido, estado — así que no hizo falta ningún cambio de modelo de datos. Lo que faltaba era no tener que escribir a mano, cada vez, el nombre exacto y el valor esperado de un punto que ya se conoce de memoria (`CHARGER_IN`, `ACDET`, `PLTRST#`...).

## Qué se construyó

- **`lib/measurementPoints.ts`** — un catálogo estático de ~35 puntos de medición extraídos directamente del checklist, agrupados por sección (S5 · Charger, S5 · EC/KBC, S5 · USB-C, S0 · CPU (VRM), etc.), cada uno con su valor esperado y unidad tal como aparece en el documento original.
- **`components/MeasurementPointSelect.tsx`** — un desplegable agrupado por sección (usando `<optgroup>`, igual que se ve organizado el checklist en papel) que, al elegir un punto, entrega su nombre y valor esperado completos.
- **Integrado en ambos formularios de medición**: en el individual, autocompleta "Punto" y "Esperado" (y la unidad), dejando "Medido" y "Estado" para que el técnico los complete con lo que acaba de leer en el instrumento. En el de carga masiva, cada selección agrega una fila nueva ya prellenada, para armar rápido la tabla completa de una placa conocida sin escribir los nombres de los puntos uno por uno.

## Decisiones técnicas clave

1. **El catálogo vive en el frontend, no en el backend — a propósito, y es un límite real, no una casualidad.** `DiagnosticMeasurement.pointName`/`expectedValue` siguen siendo texto libre en la base de datos, exactamente como se diseñaron desde la Fase 5 ("los valores esperados deben ser configurables y depender del circuito/modelo, no asumirlos automáticamente" — sección 8 del brief). Esto es un atajo de captura, no una restricción: si el equipo real no tiene alguno de estos puntos, o el valor esperado de ese modelo específico es distinto al del catálogo, se puede seguir escribiendo todo a mano como hasta ahora — el selector nunca bloquea la edición manual, solo la ahorra cuando aplica.
2. **El campo siempre vuelve a "Selecciona un punto…" después de cada elección**, tanto en el formulario individual como en el masivo — permite usarlo varias veces seguidas sin que se quede "atascado" mostrando el último punto elegido.
3. **No se intentó capturar el checklist completo** (sector como campo propio, tipo V/S/F, instrumento usado, consumo de corriente, conclusión estructurada) — eso sí requeriría cambios de modelo de datos reales, que se conversaron y se decidió dejar fuera por ahora. Este catálogo cubre específicamente lo que se pidió: poder elegir la medición a realizar y que muestre el valor esperado.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a un diagnóstico, abre "+ Agregar medición", y confirma que elegir un punto del desplegable llena el nombre y el valor esperado automáticamente. Prueba lo mismo en "+ Cargar tabla completa" y confirma que cada selección agrega una fila nueva.

---

# Publicación en Internet: HTTPS Real y Migración de Datos de Pruebas

## La pieza que quedó pendiente desde la Fase 14, ahora resuelta

Desde la Fase 14 se documentó explícitamente: *"el despliegue con HTTPS real no está completamente automatizado... hace falta un proxy inverso (Nginx o Caddy) configurado con el dominio específico del taller... no se puede generar de forma genérica"*. Llegado el momento real de publicar, esa pieza ya no es genérica — hay un dominio real de por medio. Se cierra con **Caddy**, que a diferencia de Nginx+Certbot obtiene y renueva el certificado TLS solo, sin cron jobs ni renovación manual.

## Qué se construyó

- **`deploy/caddy/Caddyfile`** — enruta `/api/*` y `/uploads/*` al backend, todo lo demás al frontend, bajo el mismo dominio. `VITE_API_URL=/api` (ya así por defecto desde la Fase 14) funciona sin cambios porque frontend y backend ahora comparten origen.
- **`docker-compose.prod.yml`** actualizado: se agregó el servicio `caddy` con los puertos 80/443, y **backend y frontend dejaron de exponerse directamente** — Caddy es ahora el único punto de entrada desde internet, backend y frontend solo se hablan por la red interna de Docker (mismo criterio que ya regía para Postgres desde el principio).
- **`.env.prod.example`** gana `DOMAIN` y `ADMIN_EMAIL` (los usa Caddy para pedir el certificado), con una advertencia explícita junto a `ENCRYPTION_KEY` sobre el riesgo de migración.
- **`deploy/export-test-data.sh`** / **`deploy/import-to-production.sh`** — el par de scripts para mover los datos ya cargados del entorno de pruebas al de producción: `pg_dump --data-only` en el origen, `pg_restore --data-only` en el destino (evita conflictos de versión de esquema, ya que las tablas las crea Prisma con sus migraciones, no el dump), más el empaquetado/restauración de la carpeta `uploads/` (fotos de evidencia, Fase 15) que es fácil olvidar porque no vive en la base de datos. El script de importación pide una confirmación explícita antes de proceder, recordando verificar que `ENCRYPTION_KEY` coincida.

## El riesgo más caro de esta migración — y por qué se documentó con esa prioridad

`ENCRYPTION_KEY` (Fase 4) cifra las contraseñas de equipos y de licencias de software guardadas en la base de datos. Es el único secreto de todo el sistema que **no se puede regenerar** al pasar a producción — a diferencia de `JWT_SECRET` o `DB_PASSWORD`, que sí pueden (y deberían) ser nuevos. Si se genera una `ENCRYPTION_KEY` nueva "por seguridad" en el servidor de producción, cualquier contraseña ya cifrada en los datos de pruebas queda indescifrable para siempre — no hay forma de recuperarla, porque el cifrado está diseñado exactamente para que eso sea imposible. Por esta razón: (1) el script de exportación deliberadamente NO copia este valor (no debería viajar dentro de un archivo de datos), (2) `.env.prod.example` lo advierte junto al campo mismo, y (3) el script de importación exige una confirmación explícita antes de tocar la base de datos de producción.

## Decisiones técnicas clave

1. **Se eligió Caddy sobre Nginx+Certbot específicamente por la renovación automática sin intervención.** Un taller de reparación de computadores no tiene por qué tener a alguien pendiente de renovar un certificado TLS cada 90 días — Caddy lo resuelve solo, y si algo falla, deja de servir HTTPS con un error claro en vez de fallar en silencio meses después cuando el certificado expira.
2. **`pg_dump --data-only` en vez de un dump completo (esquema + datos).** El esquema de producción lo crea Prisma aplicando las migraciones (`prisma migrate deploy`, ya parte del arranque del backend desde la Fase 14) — mezclar un dump de esquema del entorno de pruebas con las migraciones de Prisma en producción podría generar conflictos de versión si ambos entornos no están exactamente sincronizados. Separar ambas cosas es más robusto: Prisma es la única fuente de verdad para la estructura, `pg_dump`/`pg_restore` solo mueven el contenido.
3. **El script de importación exige escribir "si" explícitamente antes de tocar nada**, no un simple `[y/N]` de un carácter — para una operación que puede volver indescifrables datos reales de clientes si algo salió mal antes en la preparación, un solo caracter presionado por error es un riesgo real que vale la pena evitar con más fricción deliberada.

## No se pudo verificar en este entorno de trabajo

Igual que con el instalador de Windows: **no hay forma de compilar/ejecutar nada de esto aquí** — sin un dominio real que apunte a un servidor, sin acceso a internet, sin poder abrir puertos 80/443 hacia el exterior, es imposible probar de verdad que Caddy obtiene el certificado, o que `pg_dump`/`pg_restore` migran los datos sin fricciones en un caso real (con relaciones circulares, tipos de datos específicos, etc.). El `Caddyfile` y los scripts se escribieron con cuidado contra el comportamiento documentado de cada herramienta, pero la primera publicación real en un dominio propio es el verdadero punto de validación. Recomendación concreta: antes de migrar los datos reales, practica el flujo completo (exportar → importar) contra una copia de prueba en el mismo servidor de producción, no directo con los datos reales de una sola vez.

## Cómo desplegar esto

```bash
# En el servidor de producción (con el dominio ya apuntando a su IP):
cp .env.prod.example .env.prod
# completa DB_PASSWORD, JWT_SECRET, ENCRYPTION_KEY (ver advertencia arriba),
# DOMAIN, ADMIN_EMAIL, FRONTEND_URL

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Verifica que el certificado se emitió:
docker compose -f docker-compose.prod.yml logs caddy

# Si vienes migrando datos de pruebas (en la máquina de pruebas primero):
./deploy/export-test-data.sh
# copia deploy/migration-export/*.dump y *.tar.gz al servidor nuevo
# en el servidor de producción:
./deploy/import-to-production.sh
```

## Estructura del proyecto (actualizada y final)

```
compufix-manager/
├── docker-compose.yml              ← desarrollo local (Fase 1)
├── docker-compose.prod.yml         ← servidor con dominio propio + HTTPS (Fase 14 + esta fase)
├── .env.prod.example
├── deploy/
│   ├── backup.sh / restore.sh      ← respaldo de base de datos (Fase 14)
│   ├── export-test-data.sh         ← exportar datos de pruebas
│   ├── import-to-production.sh     ← importar en producción
│   └── caddy/
│       └── Caddyfile               ← proxy inverso + HTTPS automático
├── installer/                      ← instalador de escritorio para Windows
├── backend/
└── frontend/
```

---

# Cambiar la Propia Contraseña (Incluido el Administrador)

## El hueco que cerró esta fase

`PATCH /auth/change-password` existía desde la Fase 2 — pensado para que **cualquier usuario autenticado cambie su propia contraseña**, escribiendo la actual como confirmación — pero nunca se conectó a ninguna pantalla. Lo único que existía en la interfaz era "Restablecer contraseña" en `UserDetailPage` (Fase 17), y esa es una operación distinta: solo la puede usar un Administrador, sobre la cuenta de **otra** persona, sin necesitar conocer la contraseña actual. El propio Administrador no tenía ninguna forma de cambiar su contraseña del día a día sin recurrir a ese mecanismo pensado para terceros.

## Qué se construyó

- **`pages/AccountPage.tsx`** ("Mi cuenta") — un formulario que pide la contraseña actual, la nueva, y su confirmación, disponible para **cualquier rol**, no solo Administrador.
- **Enlace "Cambiar contraseña"** junto a "Cerrar sesión", al pie del menú lateral — visible siempre, sin importar qué pantalla se esté usando, porque es algo que cualquier persona en cualquier rol puede necesitar hacer en cualquier momento.

## En qué se diferencia de "Restablecer contraseña" (Fase 17) — y por qué ambas siguen existiendo

| | Cambiar mi contraseña (nuevo) | Restablecer contraseña de otro (Fase 17) |
|---|---|---|
| Quién lo usa | Cualquier usuario, sobre sí mismo | Solo Administrador, sobre otra persona |
| Requiere la contraseña actual | Sí | No — es una anulación administrativa |
| Para qué sirve | Cambiarla por gusto, o por rutina de seguridad | Cuando alguien la olvidó y no puede iniciar sesión |

Son dos operaciones genuinamente distintas con modelos de permiso distintos — no se fusionaron en un solo formulario a propósito, porque hacerlo habría significado o exigirle la contraseña actual a un Administrador que intenta ayudar a otra persona que la olvidó (imposible, por definición), o permitir cambiar la contraseña de cualquiera sin verificar nada (un hueco de seguridad real).

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Inicia sesión con cualquier usuario (incluido `admin`), haz clic en "Cambiar contraseña" al pie del menú, y confirma que pide la contraseña actual antes de aceptar la nueva.

---

# Portal de Clientes (Solo Lectura)

## ⚠️ Advertencia de seguridad — léela antes de activar esto

**El documento de identidad como usuario y contraseña es, por diseño, una autenticación débil.** El documento de una persona no es un secreto real: lo conocen familiares, aparece en otros papeles, y en algunos casos es hasta predecible. Cualquiera que sepa el documento de un cliente y sepa que el taller ofrece este portal podría entrar a ver sus reparaciones. Se construyó exactamente así porque fue el requisito explícito del taller, y el alcance de lo que expone está diseñado en consecuencia: **solo lectura, y nunca datos que puedan usarse para hacerle daño a alguien si se filtran** — nada de contraseñas de equipos, nada de notas internas, nada que no sea "en qué va mi reparación". No es la forma en que se diseñaría un portal bancario; para lo que expone (el estado de una reparación de computador), el balance entre conveniencia y riesgo es razonable, pero no debería tratarse como una práctica de seguridad a imitar en otro contexto.

## Qué se construyó

### Backend — sesión completamente separada del personal

- **`CustomerJwtStrategy`** — una segunda estrategia de Passport (nombre `"customer-jwt"`, distinto del `"jwt"` del personal), con su propio guard (`CustomerJwtAuthGuard`). Comparte el mismo `JWT_SECRET` por simplicidad, pero los tokens de cliente llevan `type: "customer"` en su contenido — un token de personal, aunque esté firmado con el mismo secreto, no tiene esa forma y esta estrategia lo rechaza. **Se reforzó también la estrategia del personal** para que rechace explícitamente cualquier token con `type: "customer"` — defensa en profundidad: sin ese chequeo, un token de cliente técnicamente válido podría colarse en cualquier endpoint del personal que no tenga un `@Roles` específico (por ejemplo, catálogos de solo lectura abiertos a "cualquier usuario autenticado").
- **`customer-portal/`** — módulo nuevo y completo:
  - `POST /customer-portal/login` — documento como usuario y contraseña; límite de 5 intentos por minuto por IP (mismo mecanismo que ya protegía el login del personal desde la Fase 14, aquí más importante todavía dado lo adivinable de la credencial); mensaje de error genérico ("documento o contraseña incorrectos") que no revela si el documento existe, para no convertir el portal en una herramienta de verificación de qué personas son clientes del taller.
  - `GET /customer-portal/my-orders` — lista de las propias reparaciones, filtrada por el `customerId` que viene en el token, nunca por un parámetro que el cliente pudiera manipular.
  - `GET /customer-portal/my-orders/:id` — detalle de una orden, verificando explícitamente que pertenezca a ese cliente antes de devolverla; si no, `404` genérico (el mismo error que "no existe"), para no confirmarle a alguien que probó un ID ajeno que sí existe una orden con ese número, aunque no sea suya.
- **La forma de datos que ve el cliente es deliberadamente reducida.** Se seleccionan explícitamente solo los campos seguros de mostrar (código, estado, fechas, equipo, falla reportada, fotos generales, pagos, garantía, totales) — nunca `devicePasswordEncrypted`, notas internas, bitácora técnica, diagnósticos ni cotizaciones. Cada campo se verificó contra el schema real antes de escribirlo.

### Frontend — una mini-aplicación aparte, no una extensión de la interfaz del personal

- **`lib/portalApi.ts`** / **`lib/portalAuth.tsx`** — cliente de API y contexto de sesión propios, con el token guardado en una llave de `localStorage` distinta (`compufix_portal_token`) a la del personal (`compufix_token`). Si alguien tuviera ambas sesiones abiertas en el mismo navegador (el computador de recepción, por ejemplo), nunca se pisan entre sí.
- **`PortalLoginPage`** — un solo campo (el documento), no dos como un login convencional, porque usuario y contraseña son literalmente el mismo valor — pedirlo dos veces solo generaría confusión.
- **`PortalProtectedLayout`** — encabezado mínimo con el nombre del cliente y "Salir"; sin menú lateral, sin ningún rastro de la navegación del personal.
- **`PortalOrdersPage`** / **`PortalOrderDetailPage`** — lista y detalle de las propias reparaciones, con fotos, pagos y garantía si aplica.

## Una limitación real de los datos, heredada de la Fase 13

No todos los clientes importados desde el Excel original tienen documento de identidad capturado (el análisis de la Fase 0 ya identificó datos inconsistentes en esa hoja). **Un cliente sin documento registrado no puede usar el portal** — no hay nada que comparar como contraseña. Esto no es un error del portal: es un reflejo honesto de que la calidad del dato de origen determina quién puede beneficiarse de esta función. Recepción puede completar el documento desde la ficha del cliente (edición ya construida) para habilitarlo.

## Decisiones técnicas clave

1. **Dos estrategias de Passport con nombres distintos, no una sola con un campo de rol adicional.** Se pudo haber reutilizado la misma estrategia del personal agregando `"Cliente"` como un rol más — se descartó a propósito: mezclar clientes y personal en el mismo sistema de roles habría significado que cualquier nuevo endpoint del personal necesitara acordarse de excluir explícitamente el rol "Cliente", en vez de que la separación sea estructural e imposible de olvidar.
2. **Ni bitácora, ni diagnósticos, ni cotizaciones se exponen al cliente en esta versión** — no porque no pudieran mostrarse con cuidado, sino porque decidir *qué tanto* de una nota técnica interna es apropiado compartir requiere una revisión caso por caso que no se hizo aquí. Quedó fuera del alcance de esta entrega a propósito, no por descuido.
3. **El portal no tiene "olvidé mi contraseña"** — no aplica: la contraseña es el documento, y si alguien no lo recuerda, tiene un problema más grande que este sistema. Es consistente con el requisito explícito de que ni el cliente ni nadie más pueda cambiar esas credenciales desde la interfaz.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` — `Customer.documentId` ya existía desde la Fase 3. No hace falta migración ni dependencias nuevas.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a `http://localhost:5173/portal/login` con el documento de un cliente que ya tenga órdenes registradas (y documento capturado) y confirma que solo ve sus propias reparaciones. Prueba también entrar con el documento de un cliente que no tiene órdenes — debería ver la pantalla vacía, no un error.

---

# Gestión del Catálogo de Servicios

## El hueco que cerró esta fase

`ServiceSearch` (usado en Cotizaciones desde hace varias entregas) busca servicios **ya existentes** — pero nunca hubo ninguna pantalla para *crear* uno nuevo o fijar su precio. El backend tenía el CRUD completo desde hacía tiempo, sin conectar, igual que varios otros casos ya resueltos en este proyecto.

## Un endpoint que además faltaba de verdad en el backend

Al construir el botón "Reactivar" (para que el módulo de servicios tuviera la misma simetría que ya tienen Clientes, Productos y Usuarios), encontré que **`PATCH /services/:id/reactivate` no existía** — solo `deactivate`. Intentar reactivar con un `PATCH` genérico habría fallado, porque `UpdateServiceDto` tampoco acepta un campo `status` (el `ValidationPipe` global rechaza cualquier campo no declarado explícitamente en el DTO). Se agregó el endpoint que faltaba, con el mismo patrón exacto que ya usan `customers.service.ts`, `products.service.ts` y `users.service.ts` — incluido el mismo texto de auditoría (`action: "REACTIVATE"`).

## Qué se construyó

- **`pages/ServicesPage.tsx`** — lista de servicios con su precio, código de facturación y meses de garantía visibles de un vistazo; creación, edición en línea, y desactivar/reactivar.
- **Enlace "Gestionar servicios →"** en el encabezado de Cotizaciones — mismo criterio que Proveedores (colgado de Compras) y Categorías (colgado de Inventario): un catálogo de apoyo no necesita su propio ítem en el menú principal.
- **Backend**: `PATCH /services/:id/reactivate` (nuevo, ver arriba).

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a Cotizaciones, haz clic en "Gestionar servicios →", crea uno con su precio, y confirma que aparece de inmediato en el buscador "Agregar servicio" al crear una cotización nueva.

---

# Editar Información de una Orden Ya Creada

## El hueco que cerró esta fase

`PATCH /repair-orders/:id` acepta un conjunto amplio de campos (falla reportada, motivo de ingreso, estado físico, accesorios recibidos, notas, fecha de entrega) — pero antes de esta entrega no había ningún formulario en la interfaz para usarlo. Una vez creada una orden, solo se podía cambiar su estado y su técnico asignado; un error de digitación en la falla reportada, o un accesorio marcado por error, quedaba ahí para siempre.

## Un límite que se respetó a propósito, no por descuido

El mismo `UpdateRepairOrderDto` también acepta `totalValue` y `paidAmount` — **deliberadamente no se expusieron en este formulario**. Se verificó primero cómo se mantienen esos dos campos en el resto del sistema: `paidAmount` se incrementa automáticamente cada vez que se registra un pago (`payments.service.ts`), y `totalValue` se fija solo al aprobar una cotización (`quotations.service.ts`). Editarlos a mano aquí habría creado una vía paralela para desincronizar el saldo de la historia real de pagos y cotizaciones — el mismo tipo de atajo que, en cualquier sistema con dinero de por medio, termina generando un saldo que no cuadra con nadie sabiendo por qué.

## Qué se construyó

- **Botón "Editar información"** en la pestaña Información del expediente técnico, que reemplaza las dos tarjetas de solo lectura por un formulario: falla reportada, motivo de ingreso, estado físico, fecha de entrega, los cuatro accesorios como casillas de verificación, notas de accesorios, y notas generales.
- **"Notas de accesorios" y "Fecha de entrega"** ahora también se muestran en la vista de solo lectura — existían como campos del modelo de datos desde el principio, pero nunca se habían mostrado en ningún lado de la interfaz.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a cualquier orden, pestaña Información, clic en "Editar información", corrige algo, guarda, y confirma que el cambio se refleja de inmediato tanto en el formulario como en la vista de solo lectura.

---

# Editar un Producto Ya Creado

## El hueco que cerró esta fase

`ProductDetailPage` solo permitía desactivar/reactivar y ajustar el stock (por movimiento de inventario, correctamente) — pero nunca se pudo cambiar el precio, la descripción, la categoría, la marca, la ubicación o el stock mínimo de un producto ya creado. El backend aceptaba todos estos cambios desde la Fase 6 (`UpdateProductDto`); solo faltaba el formulario.

## Qué se construyó

- **Botón "Editar"** junto al de "Desactivar"/"Reactivar", que reemplaza la tarjeta "Datos del producto" por un formulario completo: descripción, SKU, código interno, categoría, marca, costo, precio de venta, stock mínimo, ubicación y garantía del repuesto.

## El límite que se respetó a propósito

**El stock no se edita desde este formulario, ni siquiera indirectamente.** `UpdateProductDto` en el backend ya excluye explícitamente `initialStock` por esta misma razón desde que se creó (Regla 2 del brief: cualquier cambio de existencias pasa por un `InventoryMovement` explícito, nunca por escribir el número de stock directamente) — el formulario de edición respeta esa misma regla y ni siquiera intenta tocar ese campo. Para cambiar existencias sigue existiendo, justo debajo, el formulario de "Registrar movimiento manual" que ya existía.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a cualquier producto, clic en "Editar", cambia el precio de venta, guarda, y confirma que se refleja de inmediato en la vista de solo lectura y en el buscador de productos (`ProductSearch`) al usarlo desde una cotización o venta.

---

# Fotos de Trabajo Realizado y Estado Final (Diagnóstico)

## Lo que se pidió

Además de las fotos de estado de ingreso (Fase 15) y las de bitácora (internas), hacía falta poder documentar el trabajo realizado y el estado final del equipo desde la hoja de diagnóstico — y que esas fotos, a diferencia de las de bitácora, sí lleguen al cliente.

## Requiere una migración nueva

Se amplió el modelo `Attachment` con un campo `diagnosticId` opcional, igual que ya tenía `repairLogId` desde la Fase 15. **Corre esto antes de arrancar el backend:**

```bash
cd backend
npx prisma migrate dev --name add_attachment_diagnostic_relation
```

## Qué se construyó

- **Cada tarjeta de diagnóstico** ahora tiene su propia galería de fotos ("Fotos del trabajo y estado final — visibles para el cliente"), con el mismo componente `PhotoGallery` reutilizado de la Fase 15 — subir, ver en grande, y eliminar.
- **La galería general de la orden** (pestaña Información) ahora excluye también las fotos ligadas a un diagnóstico, además de las de bitácora — evita que la misma foto aparezca duplicada en dos lugares distintos de la interfaz.
- **El portal de clientes las muestra automáticamente, sin ningún cambio de código en `customer-portal.service.ts`.** Su consulta de fotos ya excluía únicamente las de bitácora (`repairLogId: null`) — como las fotos de diagnóstico nunca tienen `repairLogId`, pasan ese filtro sin necesitar ningún ajuste adicional.

## Por qué las fotos de diagnóstico sí llegan al cliente y las de bitácora no

Es la misma distinción que ya se hizo al construir el portal (Fase de Portal de Clientes): una entrada de bitácora es una nota técnica interna que puede incluir una evaluación cruda no pensada para el cliente ("el disco de prueba del taller sí detecta, el del cliente no"). Una foto de un diagnóstico —el trabajo hecho, cómo quedó el equipo— es exactamente el tipo de evidencia que un cliente esperaría ver. La frontera se trazó en el campo mismo (`repairLogId` vs `diagnosticId`), no en una revisión manual caso por caso.

## Lo que esto NO incluye — a propósito, por alcance

**Las fotos no se insertan dentro del PDF del informe técnico.** Incrustar imágenes reales en un documento generado con PDFKit es una pieza de trabajo bastante más grande (manejo de dimensiones, layout, saltos de página alrededor de cada imagen) que no se abordó en esta entrega. Hoy el cliente ve estas fotos a través del **portal de clientes**, no del PDF descargable. Si más adelante se necesita que aparezcan también en el PDF, es una ampliación puntual de `documents.service.ts` que vale la pena tratar como su propia entrega.

## Cómo ejecutar esto localmente

```bash
cd backend
npx prisma migrate dev --name add_attachment_diagnostic_relation
npm run start:dev
```
```bash
cd frontend && npm run dev
```

Entra a un diagnóstico, sube una foto en su galería, y confirma que aparece ahí (no en la galería general de Información). Luego entra al portal de clientes con el documento de ese cliente y confirma que la foto sí se ve en el detalle de la orden.

---

# Quitar un Repuesto Usado por Error

## El hueco que cerró esta fase

`DELETE /repair-orders/:orderId/parts/:partId` ya revertía correctamente el movimiento de inventario (devuelve la cantidad al stock dentro de la misma transacción) desde la Fase 6 — pero `PartsTab` nunca tuvo un botón para usarlo. Si se agregaba el repuesto equivocado a una orden, no había forma de deshacerlo desde la interfaz.

## Qué se construyó

- **Botón "Quitar"** en cada fila de la tabla de repuestos usados, con confirmación explícita que menciona la cantidad exacta que va a devolver al inventario — no es un simple "¿estás seguro?", sino que deja claro que es una reversión de stock, no solo borrar una fila de una lista.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Agrega un repuesto a una orden, anota el stock del producto, quítalo desde "Quitar", y confirma que el stock volvió a su número original.

---

# Registrar un Equipo sin Crear una Reparación

## El hueco que cerró esta fase

`POST /devices` existía desde la Fase 3, pero un equipo solo se podía crear DENTRO del flujo de "nueva reparación" (el campo `newDevice` que va junto con la orden) — nunca de forma independiente. Si un cliente quería dejar registrado un segundo equipo sin traerlo todavía, no había forma de hacerlo.

## Qué se construyó

- **Botón "+ Nuevo equipo"** en la ficha del cliente, junto a la lista de equipos ya registrados — mismo lugar donde ya se ve "Nueva reparación →" por cada equipo existente.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a la ficha de un cliente, clic en "+ Nuevo equipo", regístralo sin crear ninguna reparación, y confirma que aparece en la lista con un enlace a "Nueva reparación →" listo para cuando lo traiga.

---

# Autocompletado del Campo "Modelo" al Registrar un Equipo

## Lo que se pidió

Los modelos de equipo se repiten mucho (el mismo taller ve varias veces "E14 GEN 3" o "Ideapad 330") y escribirlos a mano cada vez es tedioso y propenso a variaciones ("E14 Gen3" vs "E14 GEN 3" vs "e14 gen 3") que después dificultan agrupar reportes por modelo.

## Qué se construyó

- **`GET /catalogs/device-models`** (nuevo) — devuelve los modelos ya registrados, sin duplicados, opcionalmente filtrados por marca y/o tipo de equipo (para no sugerir modelos de HP al escribir un Lenovo).
- **`<datalist>` nativo del navegador**, no un componente de autocompletado a la medida — el navegador ya sabe filtrar mientras se escribe, navegar con flechas, y funciona con teclado sin JavaScript adicional. Se integró en los tres lugares donde existe el campo Modelo: creación de equipo dentro de "Recibir equipo", "+ Nuevo equipo" en la ficha del cliente, y la edición de un equipo ya existente.

## Es una ayuda, nunca una restricción

Los modelos siguen siendo texto libre en la base de datos — el `<datalist>` sugiere, no obliga. Si el equipo es de un modelo nuevo que nunca se ha visto, se escribe normal y ya. Esto no resuelve por sí solo el problema de variaciones de escritura ya existentes en los datos (si "E14 GEN 3" y "E14 Gen 3" ya conviven como dos valores distintos en la base de datos, ambos aparecerán como sugerencias separadas) — pero si de ahora en adelante todos parten de una sugerencia ya escrita antes, el problema deja de crecer.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Registra dos equipos con el mismo modelo (ej. "E14 GEN 3") y confirma que, al crear un tercero, ese modelo aparece como sugerencia al escribir las primeras letras.

---

# Detalle de una Compra a Proveedor

## El hueco que cerró esta fase

`PurchasesPage` solo permitía cambiar el estado de pago desde la lista — no había forma de ver qué productos incluía una compra específica una vez registrada. `GET /purchases/:id` ya traía esa información desde la Fase 8, sin usar.

## Qué se construyó

- **`pages/PurchaseDetailPage.tsx`** — proveedor, factura, fecha, totales (subtotal/impuesto/envío/total), y la tabla completa de productos comprados con cantidad y costo unitario, cada uno enlazado a su ficha de inventario.
- **La fecha de cada compra en la lista ahora enlaza a su detalle.**

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a Compras, haz clic en la fecha de cualquier registro, y confirma que ves los productos que incluía esa compra.

---

# Editar o Quitar una Medición Individual

## El hueco que cerró esta fase — el último de toda la lista

`PATCH /measurements/:id` y `DELETE /measurements/:id` existían desde la Fase 5, sin conectar. Una vez guardada una medición de diagnóstico, un valor mal transcrito no se podía corregir sin editar todo el diagnóstico completo (que ni siquiera toca las mediciones individuales) — la única opción real era dejarlo mal.

## Qué se construyó

- **`MeasurementRow`** — cada fila de la tabla de mediciones ahora tiene "Editar" (convierte la fila en inputs editables, en el mismo lugar de la tabla) y "Quitar" (con confirmación).

## Con esto se cierran las dos rondas completas de revisión general

Entre ambas revisiones sistemáticas de endpoints sin conectar, se identificaron y resolvieron: contraseña de equipo, detalle de dispositivo, historial de cajas, desactivar clientes/productos, resumen de costo/ganancia, editar bitácora/diagnóstico, desactivar categorías, carga masiva de mediciones, editar información de orden, editar producto, quitar repuesto usado, registrar equipo independiente, detalle de compra, y esta última: editar/quitar medición individual.

## Cómo ejecutar esto localmente

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Entra a un diagnóstico con mediciones, corrige un valor con "Editar", y quita otra con "Quitar" — confirma que ambas acciones se reflejan de inmediato.

---

# Corrección: Gráficas del Panel Mostraban el Mes Anterior

Reportado con evidencia real: el Panel mostraba "Reparaciones por mes" e "Ingresos por mes" con la mayoría de los datos aparentando estar en julio, cuando en realidad todos los equipos habían entrado a partir del 25 de agosto (confirmado revisando que la orden C1, la primera que existe en el sistema, ya tiene fecha de agosto — no había margen cronológico para que existieran órdenes de julio).

## La causa

El backend calcula el mes con `date_trunc('month', "entryDate")` en PostgreSQL, que devuelve una fecha en UTC — por ejemplo, `2026-08-01T00:00:00.000Z` para representar "agosto". La función que le ponía la etiqueta a esa fecha en el gráfico (`formatMonthLabel`, en `lib/format.ts`) usaba `Intl.DateTimeFormat` sin especificar en qué zona horaria mostrarla — por defecto, usa la zona horaria del navegador de quien lo está viendo. En un navegador configurado en Colombia (UTC-5), esa medianoche UTC del 1 de agosto cae el **31 de julio a las 7:00 p.m.** hora local — así que agosto completo se mostraba etiquetado como julio.

**El dato nunca estuvo mal — los conteos y montos siempre correspondían al mes correcto.** Solo la etiqueta del eje horizontal del gráfico estaba corrida hacia atrás.

## La corrección

Se agregó `timeZone: "UTC"` a `monthLabelFormatter`, para que la etiqueta siempre se calcule en los mismos términos que usó el backend al agrupar los datos, sin importar en qué zona horaria esté el navegador de quien lo mire. Se verificó que ningún otro formateador de fecha (`formatDate`, `formatDateTime`, usados para fechas reales como el ingreso de un equipo o un pago) tenga el mismo problema — esos sí deben mostrarse en la hora local de quien los ve, porque representan un momento real, a diferencia de un "mes completo" calculado en UTC.

## Cómo verificar la corrección

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd frontend && npm run dev
```

Recarga el Panel y confirma que "Reparaciones por mes" e "Ingresos por mes" ahora muestran "Ago de 2026" (no "Jul de 2026") para los datos de agosto.

---

# Corrección: Página Extra en Blanco en Todos los PDF

Reportado con evidencia real: el PDF de una cotización corta (un solo ítem) generaba una segunda hoja, casi vacía.

## La causa

El pie de página (`PdfBuilder.footer()`, usado por **los cinco documentos del sistema**: informe técnico, comprobante de ingreso, comprobante de entrega, certificado de garantía, y cotización) se escribe a propósito muy cerca del borde inferior físico de la hoja (`page.height - 40`), una posición que queda por fuera del margen inferior configurado (50pt). PDFKit interpreta escribir ahí como "no cabe, hace falta una página nueva" y crea automáticamente una hoja adicional — donde termina apareciendo el pie de página, dejando la hoja original sin él y la nueva casi en blanco.

Con una cotización corta, esa hoja extra se nota de inmediato porque contiene casi nada; en un informe técnico largo (con varias páginas ya de por sí), el mismo error pasaba más desapercibido, pero afectaba a los cinco documentos por igual.

## La corrección

Se baja el margen inferior de la página a 0 justo mientras se escribe el pie de página, y se restaura de inmediato después — esto evita que PDFKit dispare su chequeo automático de "salto de página" en esa posición específica, sin afectar el resto del contenido de la hoja.

## Cómo verificar la corrección

No se modificó `schema.prisma` ni se agregaron dependencias — no hace falta migración ni `npm install`.

```bash
cd backend && npm run start:dev
```

Genera de nuevo el PDF de la misma cotización (o cualquier otro de los cinco documentos) y confirma que ya no aparece la hoja adicional.

---

# Instalador de Windows para Distribución

## Por qué esto es distinto a `docker-compose.prod.yml` (Fase 14)

`docker-compose.prod.yml` está pensado para un servidor real con dominio propio (un VPS, por ejemplo) — necesita configurar DNS, HTTPS, y alguien con conocimientos de servidor para desplegarlo. Para distribuir COMPufix Manager directamente al computador de un taller (sin servidor propio, sin dominio), hace falta algo distinto: un instalador de Windows tradicional (`.exe`) que alguien sin conocimientos técnicos pueda ejecutar con doble clic.

## La pieza que hizo falta corregir antes de nada

Este proyecto nunca tuvo acceso a una base de datos real durante su desarrollo (documentado en cada fase desde la Fase 1). Eso significa que **la migración inicial de Prisma nunca se generó** — el backend arranca con `prisma migrate deploy` (que *aplica* migraciones existentes), no con `migrate dev` (que las *crea*). Sin ese archivo generado de antemano, el instalador habría levantado los contenedores perfectamente, pero las tablas de la base de datos nunca se habrían creado — un fallo silencioso justo en el momento más importante, el primer arranque en la máquina del cliente. Quedó documentado como el primer paso obligatorio, antes que cualquier otra cosa, en `installer/README-INSTALADOR.md`.

## Qué se construyó

- **`installer/docker-compose.installer.yml`** — una variante de la orquestación pensada para un solo computador con `localhost`, no un servidor con dominio: Postgres + backend + frontend, con las URLs ya fijadas para acceder todo por `http://localhost:8080`.
- **`installer/generate-env.ps1`** — genera una configuración con secretos aleatorios (contraseña de base de datos, JWT, llave de cifrado) la primera vez que se instala, y nunca la sobrescribe en instalaciones o actualizaciones posteriores.
- **`installer/start-compufix.ps1`** / **`stop-compufix.ps1`** — los scripts detrás de los accesos directos: verifican que Docker Desktop esté corriendo, construyen y levantan los contenedores, esperan a que el backend responda antes de abrir el navegador, y cargan los catálogos iniciales (el mismo seed de la Fase 1) solo la primera vez.
- **`installer/setup.iss`** — el script fuente de Inno Setup: empaqueta el código del backend y del frontend (sin `node_modules` ni carpetas de build — eso lo genera Docker en el primer arranque), crea los accesos directos del Menú Inicio y del Escritorio, y verifica que Docker Desktop esté instalado antes de proceder, con un aviso claro y el enlace de descarga si no lo encuentra.

## Decisiones técnicas clave

1. **El único requisito real en la máquina del taller es Docker Desktop — nada de Node.js ni PostgreSQL instalados por separado en Windows.** Todo el backend y el frontend se construyen y corren dentro de contenedores Linux que Docker administra vía WSL2. Esto simplifica enormemente el instalador: no hay que empaquetar un runtime de Node para Windows, ni gestionar la instalación de una base de datos nativa — Docker ya resuelve ambas cosas de la misma forma en la que se viene trabajando desde la Fase 1.
2. **El instalador solo empaqueta código fuente, no `node_modules` ni carpetas de build.** Eso mantiene el tamaño del instalador pequeño (unos pocos megabytes de código, no cientos de megabytes de dependencias) a cambio de que la primera construcción tome varios minutos — un intercambio razonable para software que se instala una vez y se usa por años.
3. **Desinstalar nunca borra los datos automáticamente.** El volumen de Docker con la base de datos y las fotos subidas sobrevive a una desinstalación — solo se borra si alguien lo hace explícitamente desde una terminal. Mismo principio de "nunca borrar sin que alguien lo pida explícitamente" que rige el resto del sistema desde la Regla 1 de la Fase 1.
4. **Actualizar la aplicación no vuelve a pedir la contraseña de base de datos ni invalida sesiones.** `generate-env.ps1` revisa si ya existe una configuración antes de generar una nueva — instalar una versión más reciente encima de una existente reutiliza los mismos secretos, así que la base de datos sigue siendo accesible con las mismas credenciales.

## Cómo compilar y probar esto

No se modificó `schema.prisma` — pero si tienes cambios de schema pendientes de fases futuras, genera su migración con `prisma migrate dev` antes de recompilar el instalador, como se explica en `installer/README-INSTALADOR.md`.

```bash
# 1. Genera la migración inicial (obligatorio, una sola vez, antes de compilar)
docker compose up -d
cd backend && npm install && npx prisma migrate dev --name init

# 2. Instala Inno Setup (gratuito): https://jrsoftware.org/isdl.php
# 3. Abre installer/setup.iss con el Inno Setup Compiler y compílalo (Ctrl+F9)
# 4. El instalador queda en installer/Output/COMPufix-Manager-Setup.exe
```

> **Nota sobre este entorno de trabajo**: esta es, de todas las entregas de este proyecto, la que tiene el límite más grande de verificación posible — no hay Windows, ni Docker Desktop, ni el compilador de Inno Setup en este sandbox, así que **nada de esto se pudo compilar ni ejecutar realmente**. El script `.iss` se escribió con cuidado contra la documentación oficial de Inno Setup y el comportamiento conocido de Docker Desktop/PowerShell, pero la primera compilación real en una máquina Windows es el verdadero primer punto de validación. Si algo falla, lo más probable es un detalle de sintaxis en la sección `[Code]` del script, o que Docker Desktop esté instalado en una ruta distinta a la que se verifica (por ejemplo, en una unidad de disco distinta a `C:`) — ambos son ajustes menores y localizados, no un problema de diseño de fondo. Ver la sección "Limitaciones conocidas" en `installer/README-INSTALADOR.md` para el detalle completo.

## Estructura del proyecto (actualizada y final)

```
compufix-manager/
├── docker-compose.yml              ← desarrollo local (Fase 1)
├── docker-compose.prod.yml         ← servidor con dominio propio (Fase 14)
├── installer/                      ← instalador de escritorio para Windows
│   ├── setup.iss                   ← script fuente de Inno Setup
│   ├── docker-compose.installer.yml
│   ├── generate-env.ps1
│   ├── start-compufix.ps1
│   ├── stop-compufix.ps1
│   └── README-INSTALADOR.md
├── backend/
└── frontend/
```
