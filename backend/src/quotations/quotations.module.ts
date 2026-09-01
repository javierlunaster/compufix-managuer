import { Module } from "@nestjs/common";
import { RepairPartsModule } from "../repair-parts/repair-parts.module";
import { QuotationsController } from "./quotations.controller";
import { QuotationsService } from "./quotations.service";

@Module({
  // Reutiliza RepairPartsService.createWithTx para consumir inventario de
  // forma atómica al convertir una cotización aprobada.
  imports: [RepairPartsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
