import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Roles } from "../auth/decorators/roles.decorator";

// Restringido a nivel gerencial: incluye cifras financieras (dinero
// pendiente de clientes, ingresos/gastos del mes, ganancia estimada) que
// no todos los roles deberían ver de un vistazo.
@Controller("dashboard")
@Roles("Administrador", "Gerente")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("summary")
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get("charts/orders-by-status")
  getOrdersByStatus() {
    return this.dashboardService.getOrdersByStatus();
  }

  @Get("charts/repairs-by-month")
  getRepairsByMonth(@Query("months") months?: string) {
    return this.dashboardService.getRepairsByMonth(months ? Number(months) : 6);
  }

  @Get("charts/revenue-by-month")
  getRevenueByMonth(@Query("months") months?: string) {
    return this.dashboardService.getRevenueByMonth(months ? Number(months) : 6);
  }

  @Get("charts/top-brands")
  getTopBrands(@Query("limit") limit?: string) {
    return this.dashboardService.getTopBrands(limit ? Number(limit) : 10);
  }

  @Get("charts/common-issues")
  getCommonIssues(@Query("limit") limit?: string) {
    return this.dashboardService.getCommonIssues(limit ? Number(limit) : 10);
  }
}
