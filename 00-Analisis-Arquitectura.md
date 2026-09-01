# COMPufix Manager — Análisis y Propuesta de Arquitectura
### Fase 0: Análisis del Excel, modelo de datos y plan de desarrollo

---

## 0. Resumen ejecutivo

Analicé las 15 hojas de `Inventario-PC.xlsx` (celda por celda, no solo encabezados). Conclusión principal: **el Excel no es una base de datos, es una colección de 15 reportes independientes que comparten conceptos pero no comparten claves**. El mismo cliente aparece escrito de formas distintas en 6 hojas distintas; el mismo código de reparación aparece en dos formatos (`10797` numérico vs `C10797` con prefijo); no existe un catálogo real de productos, proveedores ni técnicos — son texto libre repetido en cada fila.

Esto no es un defecto de quien lo llevó — es exactamente lo que pasa cuando un negocio crece más rápido que su herramienta. La buena noticia: los datos reales sí contienen todo lo necesario para diseñar un modelo relacional sólido. Abajo está ese análisis completo.

No escribí código todavía, como pediste. Esto es solo el análisis y la propuesta para que la revises y apruebes antes de la Fase 1.

---

## A. Inventario de entidades del negocio

Mapeo de las 15 hojas a las entidades reales que representan (varias hojas mezclan más de una entidad; lo indico):

| Hoja del Excel | Filas de datos | Entidad(es) real(es) que contiene |
|---|---|---|
| `Ingreso de equipos` | 1,097 | **Órdenes de reparación** (la tabla más importante del negocio) + cliente embebido + finanzas embebidas |
| `Bitacora de reparaciones` | 8 | **Bitácora técnica** por orden (formato manual, subutilizada) |
| `Datos de Operacion` | 2 | **Diagnóstico electrónico detallado** (plantilla de mediciones a nivel de componente, casi sin usar) |
| `Equipos Pendientes` | ~2,420 celdas, ~180 equipos reales | **Backlog/tareas pendientes** — exportación rota de una tabla dinámica (ver problema en sección G) |
| `Cotizaciones` | ~50 con datos reales | **Cotizaciones** de repuestos a proveedores externos (no cotizaciones a clientes) |
| `Clientes` | 477 | Realmente es un **reporte de cartera** (nombre + teléfono + saldo pendiente "Cobros"), no un maestro de clientes |
| `INVENTARIO` | 120 | **Catálogo de productos** — dos bloques distintos en la misma hoja: cargadores (con precios) y licencias Windows/Office vendidas (con credenciales) |
| `DISOS Y COMPONTE` | 14 | **Catálogo de componentes electrónicos** (MOSFET, ICs) + tabla de precios de discos SSD mezclada en las mismas columnas |
| `Compras` | 415 | **Compras a proveedores** — pero contiene dos tablas distintas lado a lado sin relación: compras de accesorios y una tabla de "venta de discos" con cliente |
| `Ventas de Partes` | 864 | **Ventas de repuestos (POS)** — contiene 3 mini-tablas independientes en el mismo rango de filas: ventas, un registro de caja ("dinero para reinvertir"), y una calculadora de cotización suelta |
| `Servicios` | ~8 | **Servicios B2B a empresas** con comisión de técnico (modelo de pago distinto al de reparaciones normales) |
| `Ingresos` | 82 | **Reporte financiero mensual agregado** — es un resumen calculado, no una fuente de datos primaria |
| `Impuestos` | 5 | **Facturas de impuestos/retenciones** pendientes de pago |
| `Codigos de facturacion` | 7 | Catálogo pequeño de **códigos de servicio** para facturar |
| `Transferencias` | 3 | Catálogo de **cuentas de pago** por empresa/canal (Nequi, Bancolombia) |

**Entidades implícitas que NO tienen hoja propia** (se deducen de texto libre repetido):
- **Técnicos** — aparecen como texto libre en `Servicios` ("Técnico Asignado") y como columna vacía "V Tecnicos" en `INVENTARIO`. Nunca hay una lista maestra.
- **Proveedores** — "JAWAN", "Virtual Tronic", "Digital" aparecen como texto libre en `Compras`, `Cotizaciones` y `Transferencias`, escritos de formas distintas cada vez.
- **Marcas de equipos** — HP aparece como `Hp`, `HP`, `hp`, `HP ` (con espacio), `hP` — 5 variantes de la misma marca solo en una hoja.
- **Categorías de producto** — se infieren de los títulos de bloque en `INVENTARIO` y `DISOS Y COMPONTE` (Cargadores, Discos, MOSFET, Licencias), pero no existen como catálogo.

---

## B. Diccionario de datos (por entidad del sistema nuevo)

Solo incluyo las entidades núcleo; el resto (garantías, pagos, etc.) se detalla en la Fase 1 cuando se traduzca a migraciones. Formato: `campo | tipo | obligatorio | origen en Excel | observación`.

### customers (Clientes)
| Campo | Tipo | Oblig. | Origen Excel | Observación |
|---|---|---|---|---|
| id | UUID/serial | ✔ | — | nuevo |
| full_name | text | ✔ | `Ingreso de equipos.Cliente`, `Clientes.Nombre`, etc. | mismo cliente escrito distinto en cada hoja → requiere normalización + fuzzy match en migración |
| document_id (cédula/NIT) | text | ✗ | no existe en ninguna hoja | **dato faltante crítico** — el Excel nunca identifica clientes por documento, solo por nombre. Alto riesgo de duplicados. |
| phone | text | ✗ | `Telefono` en varias hojas | muchos valores en `0` (placeholder de "sin dato", no un teléfono real) — hay que tratarlo como NULL, no como dato válido |
| customer_type | enum(persona/empresa) | ✔ | inferido (`Servicios` tiene clientes empresa como "COMERCIALIZADORA RGA") | nuevo campo — el Excel no distingue |
| created_at | date | ✗ | fecha de primer registro encontrado | se reconstruye en migración |

### technicians
| Campo | Tipo | Oblig. | Origen Excel | Observación |
|---|---|---|---|---|
| id | serial | ✔ | — | nuevo |
| full_name | text | ✔ | texto libre en `Servicios.Tecnico Asignado` | solo 1-2 nombres reales encontrados (ej. "JUAN PEREZ") — catálogo casi vacío, se completará manualmente en Fase 2 |
| commission_pct | decimal | ✗ | se deduce de `Servicios` (Valor cobrado vs Valor a pagar técnico: ~30% retención en el ejemplo) | **confirmado: se ajusta manualmente por servicio**, no es un % fijo del negocio — el campo debe ser editable en cada registro, no calculado por una regla global |

### suppliers
| Campo | Tipo | Oblig. | Origen Excel | Observación |
|---|---|---|---|---|
| id | serial | ✔ | — | nuevo |
| name | text | ✔ | `Compras.Empresa Compra`, `Cotizaciones` (columnas "Virtual Tronic", "Jawam", "Digital") | al menos 3 proveedores recurrentes: JAWAN, Virtual Tronic, Digital — hoy están como **columnas** en `Cotizaciones` en lugar de filas; hay que pivotear |
| payment_account | text | ✗ | `Transferencias` | Nequi/Bancolombia por proveedor |

### product_categories / products (Inventario)
| Campo | Tipo | Oblig. | Origen Excel | Observación |
|---|---|---|---|---|
| category | enum | ✔ | títulos de bloque en `INVENTARIO`/`DISOS Y COMPONTE` (Cargadores, Discos/SSD, MOSFET, Licencias, etc.) | hoy es un título de sección, no un dato — se convierte en catálogo real |
| internal_ref (Referencia Jawan) | text | ✗ | `INVENTARIO.Referencia Jawan` | referencia interna del taller |
| supplier_ref (Referencia Virtual Tronic) | text | ✗ | `INVENTARIO.Referencia Virtual Tronic` | referencia del proveedor — confirma que el mismo producto se referencia distinto según el proveedor, hay que modelarlo como `product_supplier_refs` (relación N:N) |
| description | text | ✔ | `Portatil` (columna mal nombrada, en realidad es la descripción del cargador) | **nombre de columna engañoso** — no es "tipo de portátil", es la descripción del producto |
| cost | decimal | ✗ | `Compra` | costo de compra |
| sale_price | decimal | ✔ | `Precio de venta` | |
| stock | int | ✔ | `Cantidad` | el Excel no registra *movimientos*, solo el saldo actual → se pierde el historial de entradas/salidas. Esto se corrige con `inventory_movements` en el sistema nuevo (Regla 2 del brief) |
| electronic_component_ref | text | ✗ | `DISOS Y COMPONTE.Referencia` + `Encapsulado` + `Descripción` (con links a datasheets) | componentes electrónicos (MOSFET) — mismo catálogo de productos, categoría distinta |

⚠️ **Caso especial detectado — Licencias de software**: dentro de la hoja `INVENTARIO` hay un bloque "Licencias vendidas" con columnas `Cuenta de Microsoft` y `Contraseña` **en texto plano**. Esto es un dato sensible que el brief (sección 32) prohíbe explícitamente almacenar así para clientes. Se migrará a una tabla `software_licenses` separada, con la contraseña cifrada (no en texto plano) y acceso restringido por rol — igual que se propone para las contraseñas de equipos en reparación.

### repair_orders (el corazón del sistema — de `Ingreso de equipos`)
| Campo | Tipo | Oblig. | Origen Excel | Observación |
|---|---|---|---|---|
| order_code | text único | ✔ | `Consecutivo` (10001–11097, 1097 filas) | **hallazgo clave**: verifiqué cruzando datos — el código `C10797` usado en `Bitacora de reparaciones` y `Datos de Operacion` **es el mismo consecutivo** de `Ingreso de equipos` con prefijo `C`. Ejemplo confirmado: consecutivo `10797` = cliente "Hans Patiño" = el mismo `C10797` de la bitácora. Esto es la clave que conecta 3 hojas que hoy no están enlazadas. El sistema nuevo debe generar `order_code = 'C' + id` de forma consistente. |
| customer_id | FK | ✔ | `Cliente` (texto) | requiere resolución de cliente en la migración |
| device_type | enum | ✔ | `Tipo de equipo` | 21 variantes de texto libre para ~6 tipos reales (`Portatil`, `portatil`, `Portail`, `Portaitil`, `Portatl`... todas significan "Portátil") — normalizar a catálogo cerrado |
| brand_id | FK | ✔ | `Marca` | mismo problema: `Hp`/`HP`/`hp`/`HP `/`hP` → catálogo de marcas normalizado |
| model | text | ✗ | `Modelo` | |
| serial_number | text | ✗ | `Serial` | vacío en la mayoría de filas — dato deseable pero no se capturaba consistentemente |
| accessories_received | jsonb o tabla | ✗ | `Cargador`, `Bateria`, `Teclado`, `Mouse` (columnas booleanas dispersas) | se normaliza en una subtabla `order_accessories` |
| reported_issue | text | ✔ | `Estado Inicial` | nombre de columna confuso — es la falla reportada por el cliente, no un "estado" |
| status | enum | ✔ | `Estado` | 6 valores reales encontrados (`Entregado` 950, `No reparado` 31, `Ingresado` 20, `Diagnosticando` 16, `Reparado` 13, más variantes de mayúscula) vs. los 14 estados del flujo completo que pide el brief (sección 7) → **confirmado: el histórico migra a sus estados terminales sin reconstruir transiciones intermedias no registradas; el flujo ampliado (con diagnóstico, cotizando, esperando aprobación, esperando repuesto, en pruebas, garantía) aplica solo a órdenes nuevas creadas desde el sistema** |
| total_value | decimal | ✔ | `Valor` | |
| paid_amount | decimal | ✗ | `Abono` | |
| balance | decimal (calculado) | — | `Saldo` | en el sistema nuevo esto **no se guarda**, se calcula (total − pagos), evitando inconsistencias |
| profit | decimal | ✗ | `Ganancia` | en el Excel es un número suelto; en el sistema nuevo será calculado automáticamente (repuestos + mano de obra vs. precio cobrado, sección 12 del brief) |
| procedures | text/array | ✗ | `Procedimientos`, `Procemiento 1..4` (4 columnas sueltas, con typo "Procemiento") | se normaliza a tabla `repair_procedures` (N filas por orden, no 4 columnas fijas) |
| entry_date | date | ✔ | `Año`/`Mes`/`Dia` (3 columnas texto, mes en español: "Julio", "Agosto"...) | se unifica en un solo campo `date`, parseando el mes en español |
| delivery_date | date | ✗ | `Año4`/`Mes5`/`Dia6` (segundo set de columnas fecha) | es la fecha de salida/entrega — nombre de columna con sufijos numéricos confusos |

### diagnostics / diagnostic_measurements (de `Datos de Operacion`)
Esta hoja, aunque solo tiene 2 filas de datos, es la más valiosa del Excel para diseñar el módulo de diagnóstico (sección 8 del brief) porque ya contiene el vocabulario técnico real del taller:

| Campo Excel (con emoji) | Campo del sistema | Tipo |
|---|---|---|
| Código seguimiento | `repair_order_id` (FK) | — |
| Referencia de placa | `board_reference` | text |
| Charger IC | `charger_ic` | text |
| Divisor ACDET (R1/R2) | medición personalizada | ver abajo |
| ACDET medido (V) | medición personalizada | ver abajo |
| ACOK estado | medición personalizada | ver abajo |
| LED jack | medición personalizada | ver abajo |
| Consumo S5 (A) / Consumo S0 (A) | medición personalizada | ver abajo |
| Voltajes en bobinas / Caída tensión bobinas | medición personalizada | ver abajo |
| Notas extra | `notes` | text |
| Estado final | `result` | enum |

**Decisión de diseño**: en vez de crear una columna fija por cada tipo de medición (como hace el Excel: ACDET, ACOK, PLTRST, RSMRST...), se modela como tabla `diagnostic_measurements` con filas `(diagnostic_id, point_name, expected_value, measured_value, unit, status)` — exactamente como pide el brief en la sección 8, tabla de ejemplo. Esto permite agregar puntos de medición nuevos (cualquier señal de cualquier placa) sin tocar el esquema. Confirmo que esta decisión viene directamente de lo que ya intentaban hacer manualmente en `Datos de Operacion` y en las notas de `Bitacora de reparaciones` (ej. "PL201:265, PL612:008..." es literalmente una lista de puntos y valores escrita como texto corrido).

### quotations vs. purchase_quotations — AMBIGÜEDAD IMPORTANTE
El brief (sección 10) describe cotizaciones **al cliente** (mano de obra + repuestos + servicios → aprobación → se convierte en reparación). Pero la hoja `Cotizaciones` del Excel es otra cosa: son **cotizaciones de compra a proveedores** (columnas "Virtual Tronic", "Digital", "Jawam" = precios que cada proveedor cotiza por un repuesto, para decidir a quién comprarle). Son dos procesos distintos que hoy comparten el mismo nombre de hoja.

**Confirmado**: se crean dos entidades separadas —
- `customer_quotations` (nueva, sin datos históricos en el Excel — el negocio no las registraba formalmente)
- `supplier_price_requests` (mapea a la hoja `Cotizaciones` real: comparación de precio entre proveedores antes de comprar)

La hoja `Cotizaciones` del Excel migra íntegramente a `supplier_price_requests`.

---

## C. Modelo relacional propuesto

```
customers ──1:N── repair_orders ──1:N── repair_status_history
                        │
                        ├──1:N── repair_diagnostics ──1:N── diagnostic_measurements
                        ├──1:N── repair_logs (bitácora cronológica)
                        ├──1:N── repair_photos
                        ├──1:N── repair_parts_used ──N:1── products
                        ├──1:N── repair_services_used ──N:1── services
                        ├──0:1── customer_quotations ──1:N── quotation_items
                        ├──1:N── payments
                        └──0:N── warranties

technicians ──1:N── repair_orders (asignación)
technicians ──1:N── repair_logs (autor)
technicians ──1:N── services_jobs (comisión B2B)

suppliers ──1:N── purchases ──1:N── purchase_items ──N:1── products
suppliers ──1:N── supplier_price_requests ──1:N── price_request_items
suppliers ──1:N── product_supplier_refs ──N:1── products   (N:N: mismo producto, referencia distinta por proveedor)

product_categories ──1:N── products ──1:N── inventory_movements
                                       └──1:N── product_supplier_refs

products ──0:N── software_licenses   (subtipo: licencias con credenciales cifradas)

cash_registers ──1:N── cash_movements ──0:1── payments
                                        └──0:1── purchases
                                        └──0:1── sales

sales (POS) ──1:N── sale_items ──N:1── products
sales ──N:1── customers

users ──N:1── roles ──N:1── permissions
audit_logs ──N:1── users (polimórfico: referencia cualquier tabla auditada)
attachments (polimórfico: referencia repair_orders, customers, purchases, etc.)
```

Notas de diseño clave:
1. **Ningún borrado físico** (Regla 1 del brief): todas las tablas de negocio llevan `status: active/inactive` en vez de `DELETE`.
2. **Inventario solo cambia por movimiento** (Regla 2): `products.stock` es un campo calculado/cacheado, la fuente de verdad es `inventory_movements`.
3. **`repair_status_history`** existe porque hoy el Excel solo guarda el estado *actual* (`Estado`) y pierde todo el historial de transición — es la pérdida de información más importante que corrige el sistema nuevo.
4. **`product_supplier_refs` como tabla N:N**, no como columnas — corrige el problema de `INVENTARIO` donde "Referencia Jawan" y "Referencia Virtual Tronic" son columnas fijas; si mañana llega un proveedor nuevo, hoy tocaría agregar otra columna. Con la tabla relacional no.
5. Las **fechas Año/Mes/Dia en columnas separadas con mes en español** (patrón repetido en `Compras`, `Ventas de Partes`, `Ingreso de equipos`, `Cotizaciones`) se consolidan en un solo campo `date` tipo fecha real en todas las tablas nuevas — esto también es lo que permite que `Ingresos` (el reporte mensual agregado) deje de ser una hoja mantenida a mano y se vuelva una vista calculada (`SUM(...) GROUP BY month`).

---

## D. Flujo de trabajo (estado actual del negocio vs. flujo objetivo)

```
FLUJO OBJETIVO (brief, sección 7):
Ingresado → Diagnóstico → Cotizando → Esperando aprobación → Aprobado →
En reparación → Esperando repuesto → En pruebas → Reparado →
Listo para entrega → Entregado → (Garantía si aplica) / No reparado / Cancelado

FLUJO REAL ENCONTRADO EN EL EXCEL (lo que efectivamente se registra hoy):
Ingresado → Diagnosticando → [reparado o no reparado] → Entregado
```

El taller **ya opera** conceptualmente el flujo completo — la bitácora de `Datos de Operacion` y `Bitacora de reparaciones` demuestra pasos intermedios reales (medición, reprogramación de BIOS, prueba, conclusión) — pero el Excel solo tiene una columna para capturar el *estado final*, no cada transición. El sistema nuevo no está inventando un proceso nuevo; está poniendo estructura a un proceso que el taller ya ejecuta manualmente y que hoy vive disperso en notas de texto libre.

---

## E. Arquitectura técnica propuesta

| Capa | Propuesta | Justificación |
|---|---|---|
| **Backend** | Node.js + TypeScript + NestJS (o Express si prefieres algo más ligero) | tipado fuerte para un dominio con muchas entidades relacionadas; buena documentación; fácil de mantener por un solo desarrollador o equipo pequeño |
| **Base de datos** | PostgreSQL | soporta bien relaciones complejas, JSONB para campos flexibles (ej. mediciones personalizadas), full-text search para la búsqueda global (sección 25), y es gratuito/autoalojable |
| **ORM** | Prisma | migraciones versionadas, tipado automático desde el esquema, ideal para las 14 fases que pides desarrollar de forma incremental |
| **Frontend** | React + TypeScript + Vite, UI con shadcn/ui + Tailwind | rápido, moderno, responsive para escritorio/tablet (sección 29) |
| **Autenticación** | JWT + bcrypt para contraseñas de usuarios del sistema | estándar, bien documentado |
| **Almacenamiento de imágenes/adjuntos** | Sistema de archivos local en desarrollo (`/uploads`), con capa abstraída para migrar a S3-compatible (MinIO/S3) en producción | permite iniciar 100% local (requisito del brief) sin bloquear un despliegue futuro en servidor |
| **Generación de PDF** (informes técnicos, cotizaciones, comprobantes) | Puppeteer (HTML→PDF) o `@react-pdf/renderer` | permite diseñar los documentos como plantillas HTML/React, más mantenible que librerías de PDF de bajo nivel |
| **Backups** | `pg_dump` programado + retención rotativa | estándar de PostgreSQL, sin dependencias adicionales |
| **Despliegue** | Docker Compose (app + Postgres + reverse proxy) para correr local desde el día 1, con el mismo compose desplegable en un VPS más adelante | cumple el requisito explícito de "local primero, servidor después" sin rediseñar nada |
| **Contraseñas de equipos/licencias (dato sensible)** | Campo cifrado (AES) en base de datos, nunca en texto plano, visible solo a roles autorizados, con opción de purga tras la entrega del equipo | requisito explícito de la sección 32 del brief |

---

## F. Arquitectura de módulos

Módulos alineados a los 16 ítems del menú lateral que pediste (sección 29), cada uno mapeado a las entidades de la sección C: Dashboard (vistas agregadas, sin tablas propias) · Clientes · Recepciones (repair_orders, creación) · Reparaciones (repair_orders, ciclo completo) · Diagnóstico (repair_diagnostics + diagnostic_measurements) · Bitácora (repair_logs) · Cotizaciones (customer_quotations) · Inventario (products + inventory_movements + product_categories) · Compras (purchases + suppliers) · Ventas (sales, tipo POS) · Servicios (services + services_jobs B2B) · Proveedores (suppliers + supplier_price_requests) · Caja (cash_registers + cash_movements) · Garantías (warranties) · Reportes (vistas calculadas, sin tablas propias) · Configuración (roles, permisos, catálogos, plantillas de mediciones).

---

## G. Problemas detectados en el Excel

**Duplicados**
- 4 nombres de cliente duplicados exactos en la hoja `Clientes` (ej. "Manuel Gonzalez" dos veces) — **confirmado: son el mismo cliente por error de captura**, no personas distintas. Regla de migración: al fusionar coincidencias de nombre normalizado, se suman los saldos ("Cobros") de las filas duplicadas en un único registro de `customer`.
- El mismo cliente aparece con variantes de escritura entre hojas (`Ingreso de equipos` vs `Ventas de Partes` vs `Clientes`) — se aplica la misma regla de fusión por nombre normalizado + revisión manual de los casos que no sean coincidencia exacta.

**Campos mezclados / mal nombrados**
- Columna llamada `Portatil` en `INVENTARIO` en realidad contiene la *descripción del cargador*, no el tipo de equipo.
- Columnas `Año4`, `Mes5`, `Dia6` en `Ingreso de equipos` (segundo grupo de fecha) — nombres con sufijos numéricos que sugieren que se duplicó la columna de fecha por error de Excel y nunca se renombró.
- `Procemiento 1` (con error tipográfico) junto a `Procedimiento 2/3/4` — cuatro columnas fijas para un campo que en la práctica es una lista de longitud variable.

**Información que debería separarse**
- La hoja `Ventas de Partes` contiene **tres tablas no relacionadas** en el mismo rango de filas (ventas reales, un registro de caja para "reinvertir", y una calculadora de cotización suelta con IVA). Deben migrarse como tres fuentes distintas, no como una sola tabla.
- La hoja `Compras` contiene dos tablas distintas lado a lado (compras de accesorios vs. una tabla de venta de discos con cliente) que no tienen relación entre sí más que compartir la hoja física.
- `INVENTARIO` mezcla cargadores (con precio/costo) y licencias de Windows/Office vendidas (con credenciales) en la misma hoja, sin relación entre ambos bloques.

**Datos sensibles**
- Contraseñas de cuentas Microsoft de clientes almacenadas **en texto plano** en `INVENTARIO` (columna "Contraseña"). Esto se corrige de raíz en el sistema nuevo (cifrado + acceso restringido), tal como exige la sección 32 del brief.
- Ninguna hoja registra número de documento de identidad del cliente — hoy la única forma de identificar a alguien es por nombre (y a veces teléfono en `0`, que es un valor placeholder, no un dato real).

**Datos inconsistentes**
- `Marca`: al menos 5 variantes de "HP" solo en una hoja (`Hp`, `HP`, `hp`, `HP `, `hP`).
- `Tipo de equipo`: 21 variantes de texto libre para representar ~6 categorías reales (typos como "Portaitl", "Portatl", "Al In One").
- `Estado` de reparación: mezcla `Entregado` y `entregado` (minúscula) como si fueran dos estados distintos.
- Teléfonos en `0`: se usan como "no disponible", pero un sistema nuevo los validaría como número inválido si no se tratan como NULL explícitamente.

**Fórmulas que deberían convertirse en lógica del sistema**
- `Saldo` (= Valor − Abono) y `Ganancia` en `Ingreso de equipos`: hoy son celdas calculadas manualmente por fila, con riesgo de quedar desactualizadas si se edita el valor pero no la fórmula. En el sistema nuevo se calculan siempre al vuelo, nunca se almacenan como dato editable.
- La hoja completa `Ingresos` (resumen mensual) es enteramente una fórmula de agregación sobre las otras hojas — se reemplaza por una vista/reporte del dashboard, no por una tabla que haya que mantener a mano.

**Información que debería convertirse en catálogos**
- Marcas de equipo, tipos de equipo, categorías de producto, proveedores, códigos de facturación (`Codigos de facturacion`, 7 filas ya son casi un catálogo listo) y cuentas de pago (`Transferencias`) — todos hoy son texto libre repetido fila a fila.

**Hoja no recuperable en formato tabular: `Equipos Pendientes`**
Esta hoja no es una tabla — es una exportación rota de una tabla dinámica de Excel: cada "columna" en realidad es un valor apilado verticalmente (código, luego nombre de cliente, luego tipo, luego marca... cada uno en una fila distinta de la misma columna A), separados por filas en blanco. Contiene información real y valiosa (~180 equipos pendientes con su tarea/observación), pero requiere un parser específico (detectar bloques de 8-10 filas separados por blancos) en vez de una lectura de fila estándar. Lo trato como una migración aparte con validación manual, no en el import masivo automático.

---

## H. Plan de migración

Migración en 4 pasos, hoja por hoja, priorizando por qué tan "limpia" está cada una:

**Paso 1 — Catálogos (base para todo lo demás)**
`Codigos de facturacion` → `services` · `Transferencias` → `payment_accounts` · marcas/tipos de equipo detectados por frecuencia → `brands`/`device_types` (normalizando las variantes de texto encontradas en la sección G) · categorías de producto inferidas de los bloques de `INVENTARIO`/`DISOS Y COMPONTE`.

**Paso 2 — Maestros con resolución de duplicados**
`Clientes` + nombres embebidos en `Ingreso de equipos`/`Ventas de Partes`/`Cotizaciones` → un único `customers`, con matching por nombre normalizado (minúsculas, sin tildes, sin espacios extra). **Confirmado**: cuando dos filas coinciden en nombre normalizado, se fusionan automáticamente en un único cliente (sumando saldos pendientes), ya que se validó que son errores de captura y no personas distintas. Antes de insertar nada, el sistema mostrará una vista previa: "477 nombres encontrados → X clientes únicos tras la fusión → Y casos ambiguos (coincidencia parcial, no exacta) para revisión manual".

**Paso 3 — Transaccional histórico (solo lectura, se conserva tal cual)**
`Ingreso de equipos` (1,097 órdenes) → `repair_orders`, generando `order_code = 'C' + consecutivo` para que quede unificado con el formato ya usado en `Bitacora de reparaciones` y `Datos de Operacion` · esas dos hojas se enlazan automáticamente por ese mismo código · `Compras` y `Ventas de Partes` se separan en sus tablas correspondientes según el análisis de la sección G (no se migran "tal cual" por tener tablas mezcladas).

**Paso 4 — Casos especiales (requieren tu decisión antes de migrar)**
`Equipos Pendientes` (parser especial, ver arriba) · `Cotizaciones` (confirmado como cotización de compras → migra a `supplier_price_requests`, sección B) · licencias de software con contraseñas (se migran cifradas, nunca en texto plano).

Cada paso sigue el flujo que pediste: **Excel → Validación → Normalización → Vista previa → Corrección → Importación**, con un resumen antes de confirmar (registros nuevos / actualizados / duplicados / errores) — esto se construye en la Fase 13, no antes, pero el diseño de datos de hoy ya lo deja listo.

---

## I. MVP — qué debe incluir la primera versión funcional

Para que puedas dejar de usar el Excel para lo más crítico lo antes posible, el MVP cubre el flujo que representa >85% de las filas reales encontradas (recepción → diagnóstico simple → entrega, que es el 950/1097 de los casos "Entregado"):

1. Login + usuarios + roles básicos (Admin, Técnico, Recepción)
2. Clientes (alta rápida + búsqueda)
3. Recepción de equipos → genera orden con código único `C#####`
4. Cambio de estado con historial (Ingresado → Diagnóstico → Reparación → Pruebas → Reparado/No reparado → Entregado)
5. Bitácora simple por orden (texto + fecha + técnico)
6. Inventario básico con movimientos (sin todavía categorías avanzadas de componentes electrónicos)
7. Repuestos usados en una reparación → cálculo automático de costo/ganancia
8. Cotización simple → convertible en orden
9. Pagos/abonos por orden + saldo calculado
10. Dashboard mínimo (equipos por estado, ingresos del mes)
11. Búsqueda global por código de orden

Quedan fuera del MVP (se agregan en fases posteriores según tu plan de 14 fases): diagnóstico electrónico detallado con mediciones personalizadas, garantías, caja formal, informes técnicos en PDF, importación masiva del Excel histórico, servicios B2B con comisión de técnico, licencias de software.

---

## Preguntas abiertas antes de la Fase 1

1. ~~**`Cotizaciones`** — ¿confirmo que es cotización de compra a proveedor (comparar precio Virtual Tronic/Jawan/Digital) y no cotización a cliente? Esto cambia cómo se migra.~~ **Confirmado: es cotización de compras.** La hoja se migra a `supplier_price_requests` (comparación de precio entre proveedores antes de comprar), tal como se propuso en la sección B. `customer_quotations` queda como entidad nueva sin datos históricos.
2. ~~**Comisión de técnico** en `Servicios` — ¿es un % fijo del negocio o varía por servicio/técnico?~~ **Confirmado: se ajusta manualmente**, no es un % fijo. `commission_pct` (sección B) se captura por servicio en el momento, no se deriva de una regla global — el módulo de Servicios debe permitir editar ese valor en cada registro en vez de calcularlo automáticamente.
3. ~~**Los 4 nombres duplicados en `Clientes`** — ¿son la misma persona (error de captura) o personas distintas con el mismo nombre? Si me confirmas 1-2 casos te puedo dar una regla general para el resto.~~ **Confirmado: son el mismo cliente, error de captura.** Regla general para la migración: cuando dos filas de `Clientes` coincidan en nombre normalizado (minúsculas, sin tildes, sin espacios extra), se fusionan en un único `customer`, sumando los saldos ("Cobros") de ambas filas en vez de tratarlos como clientes distintos. Esta misma regla se aplicará al resto de coincidencias que aparezcan al normalizar las 477 filas, no solo a los 4 casos exactos ya detectados.
4. ~~**Estados de reparación** — el Excel solo usa 6 estados reales; el brief pide 14. ¿Confirmas que el flujo ampliado aplica solo hacia adelante (no se reconstruye retroactivamente en el histórico)?~~ **Confirmado: no se reconstruye.** El histórico migra a sus estados terminales (`Entregado`, `No reparado`, etc.) sin inventar transiciones intermedias que el Excel nunca registró. El flujo ampliado de 14 estados con `repair_status_history` aplica únicamente a las órdenes creadas desde el sistema nuevo en adelante.

Cuando apruebes esta arquitectura (con o sin ajustes a las preguntas anteriores), seguimos con la **Fase 1: modelo de datos definitivo + migraciones + estructura del proyecto**.
