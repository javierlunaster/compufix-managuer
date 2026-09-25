import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type SourceRow = {
  day: Date;
  source: "payments" | "sales" | "other_income" | "cash_expenses" | "purchases";
  kind: "income" | "expense";
  amount: string;
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ingresos y egresos diarios de un mes completo, con desglose por fuente.
   *
   * Cuidado deliberado para no duplicar ingresos: un pago (Payment) o una
   * venta (Sale) que se registra con una caja abierta genera un
   * CashMovement espejo (payments.service.ts / sales.service.ts, "mejor
   * esfuerzo") — sumar Payment.amount/Sale.total Y todos los CashMovement
   * de tipo INCOME al mismo tiempo contaría ese dinero dos veces. Por eso
   * los movimientos de caja de ingreso solo se cuentan aquí cuando NO
   * tienen un pago NI una venta asociada (paymentId IS NULL AND saleId IS
   * NULL) — es decir, solo los ingresos manuales que alguien registró
   * directo en Caja sin pasar por un pago o una venta. Lo mismo aplica a
   * los egresos con una compra asociada (purchaseId IS NOT NULL): esos ya
   * se cuentan directo de la tabla `purchases` cuando queda PAID (ver
   * CashService.recordExpenseIfRegisterOpen en PurchasesService). Mismo
   * criterio para reversiones: si una venta se cancela o una compra se
   * corrige de PAID a pendiente, se revierte con un CashMovement marcado
   * con ese mismo saleId/purchaseId (ver
   * CashService.reverseSaleIncomeIfStillOpen /
   * reversePurchaseExpenseIfStillOpen) — no es un ingreso/gasto real, solo
   * corrige el arqueo de caja, así que también se excluye aquí (la venta
   * cancelada y la compra corregida ya quedan fuera del conteo directo por
   * su propio status/paymentStatus).
   */
  async getDailyBreakdown(year: number, month: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException("El mes debe estar entre 1 y 12");
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const rows = await this.prisma.$queryRaw<SourceRow[]>`
      SELECT date_trunc('day', date) AS day, 'payments' AS source, 'income' AS kind, amount::text AS amount
        FROM payments WHERE date >= ${start} AND date < ${end}
      UNION ALL
      SELECT date_trunc('day', date) AS day, 'sales' AS source, 'income' AS kind, total::text AS amount
        FROM sales WHERE status = 'ACTIVE' AND date >= ${start} AND date < ${end}
      UNION ALL
      SELECT date_trunc('day', date) AS day, 'other_income' AS source, 'income' AS kind, amount::text AS amount
        FROM cash_movements WHERE type = 'INCOME' AND "paymentId" IS NULL AND "saleId" IS NULL AND "purchaseId" IS NULL AND date >= ${start} AND date < ${end}
      UNION ALL
      SELECT date_trunc('day', date) AS day, 'cash_expenses' AS source, 'expense' AS kind, amount::text AS amount
        FROM cash_movements WHERE type = 'EXPENSE' AND "saleId" IS NULL AND "purchaseId" IS NULL AND date >= ${start} AND date < ${end}
      UNION ALL
      SELECT date_trunc('day', date) AS day, 'purchases' AS source, 'expense' AS kind, total::text AS amount
        FROM purchases WHERE status = 'ACTIVE' AND date >= ${start} AND date < ${end}
    `;

    // Se arranca con todos los días del mes en cero — así el gráfico
    // muestra el mes completo, no solo los días en que hubo movimiento.
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = new Date(Date.UTC(year, month - 1, d)).toISOString().slice(0, 10);
      dailyMap.set(key, { income: 0, expenses: 0 });
    }

    const breakdown = { payments: 0, sales: 0, otherIncome: 0, cashExpenses: 0, purchases: 0 };

    for (const row of rows) {
      const key = row.day.toISOString().slice(0, 10);
      const amount = Number(row.amount);
      const bucket = dailyMap.get(key);
      if (bucket) {
        if (row.kind === "income") bucket.income += amount;
        else bucket.expenses += amount;
      }

      if (row.source === "payments") breakdown.payments += amount;
      else if (row.source === "sales") breakdown.sales += amount;
      else if (row.source === "other_income") breakdown.otherIncome += amount;
      else if (row.source === "cash_expenses") breakdown.cashExpenses += amount;
      else if (row.source === "purchases") breakdown.purchases += amount;
    }

    const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      income: v.income,
      expenses: v.expenses,
      net: v.income - v.expenses,
    }));

    const totalIncome = breakdown.payments + breakdown.sales + breakdown.otherIncome;
    const totalExpenses = breakdown.cashExpenses + breakdown.purchases;

    return {
      daily,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        incomeBreakdown: {
          payments: breakdown.payments,
          sales: breakdown.sales,
          otherIncome: breakdown.otherIncome,
        },
        expenseBreakdown: {
          cashExpenses: breakdown.cashExpenses,
          purchases: breakdown.purchases,
        },
      },
    };
  }
}
