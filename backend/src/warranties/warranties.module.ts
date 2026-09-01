import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairOrderWarrantiesController } from "./repair-order-warranties.controller";
import { WarrantiesController } from "./warranties.controller";
import { WarrantiesService } from "./warranties.service";

@Module({
  // Reutiliza RepairOrdersService.create()/updateStatus() para generar la
  // orden de reclamo sin duplicar esa lógica.
  imports: [RepairOrdersModule],
  controllers: [RepairOrderWarrantiesController, WarrantiesController],
  providers: [WarrantiesService],
  // Se exporta para que DashboardModule (Fase 12) reutilice la consulta de
  // garantías por vencer en vez de reimplementarla.
  exports: [WarrantiesService],
})
export class WarrantiesModule {}
