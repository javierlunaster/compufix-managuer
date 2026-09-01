import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { WarrantiesModule } from "../warranties/warranties.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  // Reutiliza ProductsService (stock bajo, Fase 6) y WarrantiesService
  // (garantías por vencer, Fase 10) en vez de reimplementar esas consultas.
  imports: [InventoryModule, WarrantiesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
