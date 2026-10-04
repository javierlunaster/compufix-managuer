import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairServicesController } from "./repair-services.controller";
import { RepairServicesService } from "./repair-services.service";

@Module({
  // RepairOrdersModule: RepairOrdersService.assertTechnicianAccess() — un
  // Técnico solo puede ver/tocar servicios de una orden que le asignaron.
  imports: [RepairOrdersModule],
  controllers: [RepairServicesController],
  providers: [RepairServicesService],
  // Se exporta para que QuotationsModule pueda crear estos registros de
  // forma atómica al convertir una cotización aprobada (ítems tipo
  // SERVICE/LABOR/OTHER).
  exports: [RepairServicesService],
})
export class RepairServicesModule {}
