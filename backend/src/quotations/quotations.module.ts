import { Module } from "@nestjs/common";
import { RepairPartsModule } from "../repair-parts/repair-parts.module";
import { RepairServicesModule } from "../repair-services/repair-services.module";
import { QuotationsController } from "./quotations.controller";
import { QuotationsService } from "./quotations.service";

@Module({
  // Reutiliza RepairPartsService.createWithTx / RepairServicesService.createWithTx
  // para consumir inventario y aplicar servicios de forma atómica al
  // convertir una cotización aprobada.
  imports: [RepairPartsModule, RepairServicesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
