import { Injectable } from "@nestjs/common";
import { RepairStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../inventory/products.service";
import { WarrantiesService } from "../warranties/warranties.service";
import { REPAIR_STATUS_LABELS } from "../common/utils/repair-status-labels.util";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Estados que cuentan como "en curso" para el reporte de reparaciones por
// técnico — no tiene sentido sumarle a un técnico órdenes ya entregadas o
// canceladas cuando lo que se quiere ver es su carga de trabajo actual.
const IN_PROGRESS_STATUSES: RepairStatus[] = [
  RepairStatus.DIAGNOSING,
  RepairStatus.QUOTING,
  RepairStatus.AWAITING_APPROVAL,
  RepairStatus.APPROVED,
  RepairStatus.IN_REPAIR,
  RepairStatus.AWAITING_PART,
  RepairStatus.TESTING,
];

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private products: ProductsService,
    private warranties: WarrantiesService,
  ) {}

  /**
   * Todos los indicadores de un solo número de la sección 4 del brief, en
   * una sola respuesta — pensado para pintar las tarjetas del Dashboard
   * con una sola llamada en vez de una por indicador.
   */
  async getSummary() {
    const [
      equiposRecibidosHoy,
      ordersByStatus,
      cotizacionesPendientes,
      activeOrdersForBalance,
      ventasDelDiaAgg,
      incomeThisMonth,
      expensesThisMonth,
      lowStockProducts,
      warrantiesExpiring30d,
      repairsByTechnician,
    ] = await Promise.all([
      this.prisma.repairOrder.count({
        where: { entryDate: { gte: startOfToday(), lte: endOfToday() } },
      }),
      this.prisma.repairOrder.groupBy({
        by: ["status"],
        where: { recordStatus: "ACTIVE" },
        _count: { _all: true },
      }),
      this.prisma.customerQuotation.count({
        where: { status: { in: ["SENT", "PENDING"] } },
      }),
      this.prisma.repairOrder.findMany({
        where: { recordStatus: "ACTIVE" },
        select: { totalValue: true, paidAmount: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: "ACTIVE", date: { gte: startOfToday(), lte: endOfToday() } },
        _sum: { total: true },
      }),
      this.prisma.cashMovement.aggregate({
        where: { type: "INCOME", date: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      this.prisma.cashMovement.aggregate({
        where: { type: "EXPENSE", date: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      this.products.findAll({ lowStockOnly: true }),
      this.warranties.findAll({ expiringWithinDays: 30 }),
      this.prisma.repairOrder.groupBy({
        by: ["technicianId"],
        where: { status: { in: IN_PROGRESS_STATUSES }, technicianId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const equiposPorEstado = Object.fromEntries(
      ordersByStatus.map((row) => [REPAIR_STATUS_LABELS[row.status], row._count._all]),
    );

    // El saldo pendiente por cliente se suma en memoria porque es
    // (totalValue - paidAmount) por fila — Prisma no permite restar dos
    // columnas de la misma tabla dentro de un agregado sin SQL crudo. Con
    // el volumen de un taller pequeño/mediano esto no es un problema de
    // rendimiento; si el número de órdenes activas crece mucho, esto se
    // reescribe como una consulta agregada en SQL.
    const dineroPendienteClientes = activeOrdersForBalance.reduce(
      (sum, o) => sum + (Number(o.totalValue) - Number(o.paidAmount)),
      0,
    );

    const technicianIds = repairsByTechnician
      .map((r) => r.technicianId)
      .filter((id): id is number => id !== null);
    const technicians = await this.prisma.user.findMany({
      where: { id: { in: technicianIds } },
      select: { id: true, fullName: true },
    });
    const reparacionesPorTecnico = repairsByTechnician.map((r) => ({
      technician: technicians.find((t) => t.id === r.technicianId)?.fullName ?? "—",
      count: r._count._all,
    }));

    const ingresosDelMes = Number(incomeThisMonth._sum.amount ?? 0);
    const gastosDelMes = Number(expensesThisMonth._sum.amount ?? 0);

    return {
      equiposRecibidosHoy,
      equiposPorEstado,
      cotizacionesPendientes,
      dineroPendienteClientes,
      ventasDelDia: Number(ventasDelDiaAgg._sum.total ?? 0),
      // Ingresos/gastos del mes dependen de que el taller registre sus
      // movimientos de caja consistentemente (ver limitación documentada
      // en la Fase 9) — si no hay caja abierta casi nunca, estos números
      // van a verse artificialmente bajos, no porque el negocio no esté
      // facturando, sino porque no quedó registrado en CashMovement.
      ingresosDelMes,
      gastosDelMes,
      gananciaEstimada: ingresosDelMes - gastosDelMes,
      repuestosStockBajo: lowStockProducts.length,
      garantiasPorVencer: warrantiesExpiring30d.length,
      reparacionesPorTecnico,
    };
  }

  /** Equipos por estado — para un gráfico de barras o dona. */
  async getOrdersByStatus() {
    const rows = await this.prisma.repairOrder.groupBy({
      by: ["status"],
      where: { recordStatus: "ACTIVE" },
      _count: { _all: true },
    });
    return rows.map((r) => ({ status: r.status, label: REPAIR_STATUS_LABELS[r.status], count: r._count._all }));
  }

  /** Reparaciones ingresadas por mes, últimos N meses. */
  async getRepairsByMonth(months: number) {
    return this.prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', "entryDate") AS month, COUNT(*)::bigint AS count
      FROM repair_orders
      WHERE "entryDate" >= now() - (${months}::int || ' months')::interval
      GROUP BY month
      ORDER BY month ASC
    `.then((rows) => rows.map((r) => ({ month: r.month, count: Number(r.count) })));
  }

  /**
   * "Ingresos por mes": dinero efectivamente cobrado (pagos + ventas), no
   * lo facturado/cotizado. Es una definición deliberada — totalValue de una
   * orden puede estar pendiente de cobro, así que sumar eso sería mostrar
   * ingresos que todavía no existen como caja real.
   */
  async getRevenueByMonth(months: number) {
    const [paymentsByMonth, salesByMonth] = await Promise.all([
      this.prisma.$queryRaw<{ month: Date; total: string }[]>`
        SELECT date_trunc('month', "date") AS month, COALESCE(SUM(amount), 0)::text AS total
        FROM payments
        WHERE "date" >= now() - (${months}::int || ' months')::interval
        GROUP BY month
      `,
      this.prisma.$queryRaw<{ month: Date; total: string }[]>`
        SELECT date_trunc('month', "date") AS month, COALESCE(SUM(total), 0)::text AS total
        FROM sales
        WHERE status = 'ACTIVE' AND "date" >= now() - (${months}::int || ' months')::interval
        GROUP BY month
      `,
    ]);

    const byMonth = new Map<string, number>();
    for (const row of paymentsByMonth) {
      const key = row.month.toISOString();
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(row.total));
    }
    for (const row of salesByMonth) {
      const key = row.month.toISOString();
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(row.total));
    }

    return Array.from(byMonth.entries())
      .map(([month, total]) => ({ month: new Date(month), total }))
      .sort((a, b) => a.month.getTime() - b.month.getTime());
  }

  /** Marcas más reparadas — requiere unir repair_orders → devices → brands. */
  async getTopBrands(limit: number) {
    return this.prisma.$queryRaw<{ brand: string | null; count: bigint }[]>`
      SELECT b.name AS brand, COUNT(*)::bigint AS count
      FROM repair_orders ro
      JOIN devices d ON d.id = ro."deviceId"
      LEFT JOIN brands b ON b.id = d."brandId"
      WHERE ro."recordStatus" = 'ACTIVE'
      GROUP BY b.name
      ORDER BY count DESC
      LIMIT ${limit}
    `.then((rows) => rows.map((r) => ({ brand: r.brand ?? "Sin marca", count: Number(r.count) })));
  }

  /**
   * Fallas más frecuentes. IMPORTANTE — limitación heredada directamente
   * del Excel original (ver documento de arquitectura, Fase 1): `reportedIssue`
   * sigue siendo texto libre, nunca se convirtió en catálogo. Esta consulta
   * agrupa por texto normalizado (minúsculas, recortado), así que "No
   * enciende" y "no enciende " cuentan juntos, pero "No prende" y "No
   * enciende" —la misma falla en la práctica— cuentan como cosas distintas,
   * exactamente el mismo problema que tenían "Tipo de equipo" y "Marca" en
   * el Excel antes de normalizarlos en la Fase 1. Si este reporte necesita
   * ser confiable de verdad, `reportedIssue` tendría que convertirse en un
   * catálogo de fallas comunes + un campo de texto libre aparte para el
   * detalle — un cambio de modelo de datos que no se hizo en esta fase.
   */
  async getCommonIssues(limit: number) {
    return this.prisma.$queryRaw<{ issue: string; count: bigint }[]>`
      SELECT lower(trim("reportedIssue")) AS issue, COUNT(*)::bigint AS count
      FROM repair_orders
      WHERE "recordStatus" = 'ACTIVE'
      GROUP BY issue
      ORDER BY count DESC
      LIMIT ${limit}
    `.then((rows) => rows.map((r) => ({ issue: r.issue, count: Number(r.count) })));
  }
}
