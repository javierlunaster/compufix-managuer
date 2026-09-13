import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairPartsController } from "./repair-parts.controller";
import { RepairPartsService } from "./repair-parts.service";

@Module({
  // InventoryModule: reutiliza InventoryMovementsService. RepairOrdersModule:
  // RepairOrdersService.assertTechnicianAccess() — un Técnico solo puede
  // ver/tocar repuestos de una orden que le hayan asignado.
  imports: [InventoryModule, RepairOrdersModule],
  controllers: [RepairPartsController],
  providers: [RepairPartsService],
  // Se exporta para que QuotationsModule pueda consumir repuestos de forma
  // atómica al convertir una cotización aprobada en una orden real.
  exports: [RepairPartsService],
})
export class RepairPartsModule {}
