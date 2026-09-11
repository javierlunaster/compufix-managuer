"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const catalogs_module_1 = require("./catalogs/catalogs.module");
const customers_module_1 = require("./customers/customers.module");
const devices_module_1 = require("./devices/devices.module");
const repair_orders_module_1 = require("./repair-orders/repair-orders.module");
const diagnostics_module_1 = require("./diagnostics/diagnostics.module");
const repair_logs_module_1 = require("./repair-logs/repair-logs.module");
const inventory_module_1 = require("./inventory/inventory.module");
const repair_parts_module_1 = require("./repair-parts/repair-parts.module");
const services_module_1 = require("./services/services.module");
const quotations_module_1 = require("./quotations/quotations.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const purchases_module_1 = require("./purchases/purchases.module");
const sales_module_1 = require("./sales/sales.module");
const cash_module_1 = require("./cash/cash.module");
const payments_module_1 = require("./payments/payments.module");
const warranties_module_1 = require("./warranties/warranties.module");
const documents_module_1 = require("./documents/documents.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const import_module_1 = require("./import/import.module");
const health_module_1 = require("./health/health.module");
const attachments_module_1 = require("./attachments/attachments.module");
const customer_portal_module_1 = require("./customer-portal/customer-portal.module");
const finance_module_1 = require("./finance/finance.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./auth/guards/roles.guard");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            // Límite general de la API: 100 requests/minuto por IP. El login
            // (Fase 2) tiene un límite mucho más estricto propio, ver
            // auth.controller.ts — este es solo el límite de fondo para todo lo
            // demás, pensado para frenar un script descontrolado, no un uso normal.
            throttler_1.ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            catalogs_module_1.CatalogsModule,
            customers_module_1.CustomersModule,
            devices_module_1.DevicesModule,
            repair_orders_module_1.RepairOrdersModule,
            diagnostics_module_1.DiagnosticsModule,
            repair_logs_module_1.RepairLogsModule,
            inventory_module_1.InventoryModule,
            repair_parts_module_1.RepairPartsModule,
            services_module_1.ServicesModule,
            quotations_module_1.QuotationsModule,
            suppliers_module_1.SuppliersModule,
            purchases_module_1.PurchasesModule,
            sales_module_1.SalesModule,
            cash_module_1.CashModule,
            payments_module_1.PaymentsModule,
            warranties_module_1.WarrantiesModule,
            documents_module_1.DocumentsModule,
            dashboard_module_1.DashboardModule,
            import_module_1.ImportModule,
            health_module_1.HealthModule,
            attachments_module_1.AttachmentsModule,
            customer_portal_module_1.CustomerPortalModule,
            finance_module_1.FinanceModule,
        ],
        providers: [
            // Orden de ejecución: ThrottlerGuard primero (protege incluso rutas
            // públicas como /auth/login), luego JwtAuthGuard (autentica y adjunta
            // request.user), luego RolesGuard (ya puede leer request.user).
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
