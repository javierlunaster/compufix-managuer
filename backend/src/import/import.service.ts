import { randomUUID } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as XLSX from "xlsx";
import { RepairStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { normalizeName } from "../common/utils/normalize-name.util";
import { parseSpanishDate } from "../common/utils/spanish-date.util";
import { BRAND_ALIASES, DEVICE_TYPE_ALIASES, HISTORICAL_STATUS_ALIASES } from "./import.constants";

const SHEET_NAME = "Ingreso de equipos";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos

// Encabezados exactos detectados al analizar el Excel en la Fase 1 (ver
// documento de arquitectura). Si el archivo real no trae alguno de estos,
// el importador falla rápido con un mensaje claro en vez de desalinear
// columnas silenciosamente.
const REQUIRED_HEADERS = [
  "Consecutivo",
  "Año",
  "Mes",
  "Dia",
  "Cliente",
  "Telefono",
  "Tipo de equipo",
  "Marca",
  "Modelo",
  "Serial",
  "Estado Inicial",
  "Valor",
  "Abono",
  "Estado",
] as const;

interface RowIssue {
  row: number;
  message: string;
}

interface ParsedOrderRow {
  consecutivo: number;
  orderCode: string;
  customerName: string;
  normalizedCustomerName: string;
  phone: string | null;
  deviceTypeName: string;
  brandName: string | null;
  model: string | null;
  serialNumber: string | null;
  chargerReceived: boolean;
  batteryReceived: boolean;
  keyboardReceived: boolean;
  mouseReceived: boolean;
  reportedIssue: string;
  status: RepairStatus;
  entryDate: Date;
  deliveryDate: Date | null;
  totalValue: number;
  paidAmount: number;
  procedures: string[];
}

interface ImportSession {
  rows: ParsedOrderRow[];
  createdAt: number;
}

export interface PreviewResult {
  importId: string;
  recordsFound: number;
  validRows: number;
  alreadyImported: number;
  newCustomers: number;
  existingCustomerMatches: number;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface CommitResult {
  ordersImported: number;
  customersCreated: number;
  customersMatched: number;
  devicesCreated: number;
  devicesReused: number;
  proceduresImported: number;
}

function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  return s !== "" && s !== "0" && s !== "no" && s !== "false" && s !== "n";
}

function cellToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

@Injectable()
export class ImportService {
  // Sesiones en memoria: solo funciona con una instancia del backend
  // corriendo. Si esto se despliega detrás de un balanceador con varias
  // instancias, esta tabla tiene que moverse a un almacenamiento
  // compartido (Redis, o directamente una tabla en Postgres) para que el
  // /commit no le llegue a una instancia distinta de la que hizo el
  // /preview. Aceptable para el uso previsto: una importación puntual del
  // histórico, hecha una vez, no un flujo de uso diario.
  private sessions = new Map<string, ImportSession>();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private getSession(importId: string): ImportSession {
    const session = this.sessions.get(importId);
    if (!session || Date.now() - session.createdAt > SESSION_TTL_MS) {
      this.sessions.delete(importId);
      throw new NotFoundException(
        "La sesión de importación no existe o expiró (30 minutos) — vuelve a subir el archivo para generar una vista previa nueva",
      );
    }
    return session;
  }

  /**
   * Paso 1 del flujo de la sección 27 del brief: Excel → Validación →
   * Normalización → Vista previa. No escribe nada en la base de datos —
   * solo parsea, valida y guarda el resultado en una sesión temporal para
   * que `commit()` lo confirme sin tener que volver a subir el archivo.
   *
   * Alcance de esta fase: solo la hoja "Ingreso de equipos" (la tabla
   * transaccional más importante y más limpia del Excel, ~1.097 filas,
   * cubre el flujo completo de recepción → reparación → entrega). Las
   * hojas con estructura rota o mezclada detectadas en la Fase 1
   * (`Equipos Pendientes`, `Cotizaciones`, `Compras`, `Ventas de Partes`)
   * quedan fuera a propósito — importarlas bien requiere el parser
   * especial que ya se documentó como pendiente en el plan de migración,
   * y forzarlas por este mismo camino generaría datos incorrectos, no
   * ahorraría trabajo.
   */
  async preview(buffer: Buffer): Promise<PreviewResult> {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
      throw new BadRequestException(
        `El archivo no tiene una hoja llamada "${SHEET_NAME}" — verifica que sea el Excel correcto`,
      );
    }

    // header:1 → cada fila como array de celdas, sin asumir que la fila 1
    // trae los encabezados: en este Excel los encabezados reales están en
    // la fila 2 (la fila 1 tiene otro contenido), tal como se detectó en
    // el análisis de la Fase 1.
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const headerRow = (rawRows[1] ?? []).map((h) => String(h ?? "").trim());
    const dataRows = rawRows.slice(2);

    const colIndex = (name: string) => headerRow.indexOf(name);
    const missingHeaders = REQUIRED_HEADERS.filter((h) => colIndex(h) === -1);
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `La hoja "${SHEET_NAME}" no tiene el formato esperado — faltan las columnas: ${missingHeaders.join(", ")}`,
      );
    }

    const idx = {
      consecutivo: colIndex("Consecutivo"),
      anio: colIndex("Año"),
      mes: colIndex("Mes"),
      dia: colIndex("Dia"),
      cliente: colIndex("Cliente"),
      telefono: colIndex("Telefono"),
      tipoEquipo: colIndex("Tipo de equipo"),
      marca: colIndex("Marca"),
      modelo: colIndex("Modelo"),
      cargador: colIndex("Cargador"),
      bateria: colIndex("Bateria"),
      teclado: colIndex("Teclado"),
      mouse: colIndex("Mouse"),
      serial: colIndex("Serial"),
      estadoInicial: colIndex("Estado Inicial"),
      procedimientos: colIndex("Procedimientos"),
      valor: colIndex("Valor"),
      abono: colIndex("Abono"),
      estado: colIndex("Estado"),
      anio4: colIndex("Año4"),
      mes5: colIndex("Mes5"),
      dia6: colIndex("Dia6"),
      procemiento1: colIndex("Procemiento 1"),
      procedimiento2: colIndex("Procedimiento 2"),
      procedimiento3: colIndex("Procedimiento 3"),
      procedimiento4: colIndex("Procedimiento 4"),
    };

    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const parsedRows: ParsedOrderRow[] = [];

    dataRows.forEach((row, i) => {
      const excelRow = i + 3; // fila real en el archivo (1-indexada, header en la 2)
      if (!row || row.every((c) => c === null || c === "")) return; // fila totalmente vacía, se ignora en silencio

      const consecutivoRaw = row[idx.consecutivo];
      const consecutivo = Number(consecutivoRaw);
      if (!consecutivoRaw || !Number.isInteger(consecutivo)) {
        errors.push({ row: excelRow, message: "Registro sin código (Consecutivo) — no se puede importar" });
        return;
      }

      const customerName = cellToString(row[idx.cliente]);
      if (!customerName) {
        errors.push({ row: excelRow, message: `Equipo sin cliente (orden C${consecutivo})` });
        return;
      }

      const entryDate = parseSpanishDate(row[idx.anio], row[idx.mes], row[idx.dia]);
      if (!entryDate) {
        errors.push({ row: excelRow, message: `Fecha de ingreso inválida (orden C${consecutivo})` });
        return;
      }
      const deliveryDate = parseSpanishDate(row[idx.anio4], row[idx.mes5], row[idx.dia6]);

      let phone = cellToString(row[idx.telefono]);
      if (phone === "0") {
        warnings.push({ row: excelRow, message: `Teléfono "0" tratado como sin dato (orden C${consecutivo})` });
        phone = null;
      }

      const deviceTypeRaw = cellToString(row[idx.tipoEquipo]);
      let deviceTypeName: string;
      if (!deviceTypeRaw) {
        deviceTypeName = "Sin especificar";
        warnings.push({ row: excelRow, message: `Tipo de equipo vacío, se usó "Sin especificar" (orden C${consecutivo})` });
      } else {
        const alias = DEVICE_TYPE_ALIASES[normalizeName(deviceTypeRaw)];
        deviceTypeName = alias ?? deviceTypeRaw;
        if (!alias) {
          warnings.push({
            row: excelRow,
            message: `Tipo de equipo no reconocido "${deviceTypeRaw}" — se creará como categoría nueva (orden C${consecutivo})`,
          });
        }
      }

      const brandRaw = cellToString(row[idx.marca]);
      let brandName: string | null = null;
      if (brandRaw) {
        const alias = BRAND_ALIASES[normalizeName(brandRaw)];
        brandName = alias ?? brandRaw;
        if (!alias) {
          warnings.push({
            row: excelRow,
            message: `Marca no reconocida "${brandRaw}" — se creará como marca nueva (orden C${consecutivo})`,
          });
        }
      }

      let reportedIssue = cellToString(row[idx.estadoInicial]);
      if (!reportedIssue) {
        reportedIssue = "Sin falla reportada en el histórico";
        warnings.push({ row: excelRow, message: `Falla reportada vacía (orden C${consecutivo})` });
      }

      const statusRaw = cellToString(row[idx.estado]);
      const statusKey = normalizeName(statusRaw ?? "");
      const status = HISTORICAL_STATUS_ALIASES[statusKey];
      if (!status) {
        warnings.push({
          row: excelRow,
          message: `Estado no reconocido "${statusRaw ?? "(vacío)"}" — se importó como "Ingresado" (orden C${consecutivo})`,
        });
      }

      const procedures = [
        cellToString(row[idx.procedimientos]),
        cellToString(row[idx.procemiento1]),
        cellToString(row[idx.procedimiento2]),
        cellToString(row[idx.procedimiento3]),
        cellToString(row[idx.procedimiento4]),
      ].filter((p, i2, arr): p is string => p !== null && arr.indexOf(p) === i2);

      parsedRows.push({
        consecutivo,
        orderCode: `C${consecutivo}`,
        customerName,
        normalizedCustomerName: normalizeName(customerName),
        phone,
        deviceTypeName,
        brandName,
        model: cellToString(row[idx.modelo]),
        serialNumber: cellToString(row[idx.serial]),
        chargerReceived: truthy(row[idx.cargador]),
        batteryReceived: truthy(row[idx.bateria]),
        keyboardReceived: truthy(row[idx.teclado]),
        mouseReceived: truthy(row[idx.mouse]),
        reportedIssue,
        status: status ?? RepairStatus.RECEIVED,
        entryDate,
        deliveryDate,
        totalValue: Number(row[idx.valor]) || 0,
        paidAmount: Number(row[idx.abono]) || 0,
        procedures,
      });
    });

    // Idempotencia: si una orden con ese orderCode ya existe (una corrida
    // anterior de esta misma importación), no se vuelve a importar. Así
    // el flujo preview→commit se puede repetir sin miedo a duplicar todo
    // si algo se interrumpió a la mitad.
    const existingOrderCodes = new Set(
      (
        await this.prisma.repairOrder.findMany({
          where: { orderCode: { in: parsedRows.map((r) => r.orderCode) } },
          select: { orderCode: true },
        })
      ).map((o) => o.orderCode),
    );
    const alreadyImported = parsedRows.filter((r) => existingOrderCodes.has(r.orderCode));
    const rowsToImport = parsedRows.filter((r) => !existingOrderCodes.has(r.orderCode));

    const existingCustomers = new Set(
      (await this.prisma.customer.findMany({ select: { normalizedName: true } })).map(
        (c) => c.normalizedName,
      ),
    );
    const distinctNames = new Set(rowsToImport.map((r) => r.normalizedCustomerName));
    const newCustomers = [...distinctNames].filter((n) => !existingCustomers.has(n)).length;
    const existingCustomerMatches = distinctNames.size - newCustomers;

    const importId = randomUUID();
    this.sessions.set(importId, { rows: rowsToImport, createdAt: Date.now() });

    return {
      importId,
      recordsFound: dataRows.length,
      validRows: rowsToImport.length,
      alreadyImported: alreadyImported.length,
      newCustomers,
      existingCustomerMatches,
      errors,
      warnings,
    };
  }

  /**
   * Paso 2: confirma una vista previa ya generada. Todo ocurre en una sola
   * transacción — con un timeout ampliado a 5 minutos porque son ~1.000
   * filas con varias operaciones cada una (más de lo que Prisma espera
   * esperar por defecto en una transacción interactiva). Si el histórico
   * real del taller es mucho más grande que esto, ese timeout —y
   * probablemente la estrategia de una sola transacción— tendría que
   * revisarse.
   */
  async commit(importId: string, actingUserId: number): Promise<CommitResult> {
    const session = this.getSession(importId);

    const result: CommitResult = {
      ordersImported: 0,
      customersCreated: 0,
      customersMatched: 0,
      devicesCreated: 0,
      devicesReused: 0,
      proceduresImported: 0,
    };

    await this.prisma.$transaction(
      async (tx) => {
        const customerCache = new Map<string, number>();
        const deviceTypeCache = new Map<string, number>();
        const brandCache = new Map<string, number>();
        const deviceCache = new Map<string, number>(); // `${customerId}:${serial}`

        for (const row of session.rows) {
          // --- Cliente: fusión automática por nombre normalizado --------
          let customerId = customerCache.get(row.normalizedCustomerName);
          if (!customerId) {
            const existing = await tx.customer.findFirst({
              where: { normalizedName: row.normalizedCustomerName },
            });
            if (existing) {
              customerId = existing.id;
              result.customersMatched++;
            } else {
              const created = await tx.customer.create({
                data: {
                  fullName: row.customerName,
                  normalizedName: row.normalizedCustomerName,
                  phone: row.phone,
                },
              });
              customerId = created.id;
              result.customersCreated++;
            }
            customerCache.set(row.normalizedCustomerName, customerId);
          }

          // --- Tipo de equipo y marca: catálogo existente o nuevo -------
          const deviceTypeId = await this.findOrCreateCatalogEntry(
            tx.deviceType,
            deviceTypeCache,
            row.deviceTypeName,
          );
          const brandId = row.brandName
            ? await this.findOrCreateCatalogEntry(tx.brand, brandCache, row.brandName)
            : null;

          // --- Equipo: se reutiliza si el mismo cliente ya trajo el mismo
          // serial en otra fila (Regla 6: un equipo puede tener múltiples
          // reparaciones históricas) -----------------------------------
          const deviceKey = `${customerId}:${row.serialNumber ?? ""}`;
          let deviceId = row.serialNumber ? deviceCache.get(deviceKey) : undefined;
          if (!deviceId && row.serialNumber) {
            const existingDevice = await tx.device.findFirst({
              where: { customerId, serialNumber: row.serialNumber },
            });
            if (existingDevice) deviceId = existingDevice.id;
          }
          if (!deviceId) {
            const createdDevice = await tx.device.create({
              data: {
                customerId,
                deviceTypeId,
                brandId: brandId ?? undefined,
                model: row.model,
                serialNumber: row.serialNumber,
              },
            });
            deviceId = createdDevice.id;
            result.devicesCreated++;
            if (row.serialNumber) deviceCache.set(deviceKey, deviceId);
          } else {
            result.devicesReused++;
          }

          // --- Orden: se preserva el número de consecutivo original como
          // id, para que el código quede idéntico al que el taller ya usó
          // en papel/otras hojas del Excel (ver Fase 1 — el cruce
          // C10797 ↔ consecutivo 10797 fue justamente el hallazgo que
          // conectó Bitacora e Ingreso de equipos). Se restaura la
          // secuencia de autoincremento al final de esta función. -------
          await tx.repairOrder.create({
            data: {
              id: row.consecutivo,
              orderCode: row.orderCode,
              customerId,
              deviceId,
              chargerReceived: row.chargerReceived,
              batteryReceived: row.batteryReceived,
              keyboardReceived: row.keyboardReceived,
              mouseReceived: row.mouseReceived,
              reportedIssue: row.reportedIssue,
              status: row.status,
              totalValue: row.totalValue,
              paidAmount: row.paidAmount,
              entryDate: row.entryDate,
              deliveryDate: row.deliveryDate ?? undefined,
              notes: "Importado del histórico de Excel (Fase 13)",
            },
          });
          result.ordersImported++;

          for (const description of row.procedures) {
            await tx.repairProcedure.create({
              data: { repairOrderId: row.consecutivo, description, performedAt: row.entryDate },
            });
            result.proceduresImported++;
          }

          // Un solo snapshot de estado, no la secuencia completa que el
          // Excel nunca registró (decisión ya confirmada en la Fase 1: el
          // histórico migra a su estado terminal, el flujo detallado de
          // 14 estados aplica solo hacia adelante).
          await tx.repairStatusHistory.create({
            data: {
              repairOrderId: row.consecutivo,
              previousStatus: null,
              newStatus: row.status,
              changedAt: row.deliveryDate ?? row.entryDate,
              userId: actingUserId,
              notes: "Importado del histórico de Excel",
            },
          });
        }
      },
      { timeout: 5 * 60 * 1000, maxWait: 10_000 },
    );

    // Postgres no sabe que se insertaron ids manualmente — hay que
    // adelantar la secuencia para que la próxima orden creada desde la
    // app (Fase 4) no choque con un id ya usado por el histórico.
    await this.prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('repair_orders', 'id'), (SELECT COALESCE(MAX(id), 1) FROM repair_orders));`,
    );

    this.sessions.delete(importId);

    await this.audit.log({
      userId: actingUserId,
      action: "IMPORT_EXCEL",
      entityType: "RepairOrder",
      entityId: 0,
      newValue: result,
    });

    return result;
  }

  /**
   * Busca una categoría de catálogo (marca o tipo de equipo) por nombre
   * exacto; si no existe, la crea. Se usa el mismo helper para ambas
   * tablas porque tienen la misma forma (id, name, status) — evita
   * duplicar esta lógica de "encontrar o crear" dos veces.
   */
  private async findOrCreateCatalogEntry(
    delegate: { findFirst: Function; create: Function },
    cache: Map<string, number>,
    name: string,
  ): Promise<number> {
    const cached = cache.get(name);
    if (cached) return cached;

    const existing = await delegate.findFirst({ where: { name } });
    if (existing) {
      cache.set(name, existing.id);
      return existing.id;
    }

    const created = await delegate.create({ data: { name } });
    cache.set(name, created.id);
    return created.id;
  }
}
