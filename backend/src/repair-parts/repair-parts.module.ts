import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { RepairPartsController } from "./repair-parts.controller";
import { RepairPartsService } from "./repair-parts.service";

@Module({
  imports: [InventoryModule], // reutiliza InventoryMovementsService
  controllers: [RepairPartsController],
  providers: [RepairPartsService],
  // Se exporta para que QuotationsModule pueda consumir repuestos de forma
  // atómica al convertir una cotización aprobada en una orden real.
  exports: [RepairPartsService],
})
export class RepairPartsModule {}
