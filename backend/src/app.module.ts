import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { CatalogsModule } from "./catalogs/catalogs.module";
import { CustomersModule } from "./customers/customers.module";
import { DevicesModule } from "./devices/devices.module";
import { RepairOrdersModule } from "./repair-orders/repair-orders.module";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { RepairLogsModule } from "./repair-logs/repair-logs.module";
import { InventoryModule } from "./inventory/inventory.module";
import { RepairPartsModule } from "./repair-parts/repair-parts.module";
import { ServicesModule } from "./services/services.module";
import { QuotationsModule } from "./quotations/quotations.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { SalesModule } from "./sales/sales.module";
import { CashModule } from "./cash/cash.module";
import { PaymentsModule } from "./payments/payments.module";
import { WarrantiesModule } from "./warranties/warranties.module";
import { DocumentsModule } from "./documents/documents.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ImportModule } from "./import/import.module";
import { HealthModule } from "./health/health.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { CustomerPortalModule } from "./customer-portal/customer-portal.module";
import { FinanceModule } from "./finance/finance.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Límite general de la API: 100 requests/minuto por IP. El login
    // (Fase 2) tiene un límite mucho más estricto propio, ver
    // auth.controller.ts — este es solo el límite de fondo para todo lo
    // demás, pensado para frenar un script descontrolado, no un uso normal.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CatalogsModule,
    CustomersModule,
    DevicesModule,
    RepairOrdersModule,
    DiagnosticsModule,
    RepairLogsModule,
    InventoryModule,
    RepairPartsModule,
    ServicesModule,
    QuotationsModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    CashModule,
    PaymentsModule,
    WarrantiesModule,
    DocumentsModule,
    DashboardModule,
    ImportModule,
    HealthModule,
    AttachmentsModule,
    CustomerPortalModule,
    FinanceModule,
  ],
  providers: [
    // Orden de ejecución: ThrottlerGuard primero (protege incluso rutas
    // públicas como /auth/login), luego JwtAuthGuard (autentica y adjunta
    // request.user), luego RolesGuard (ya puede leer request.user).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
