import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairOrderHardwareTestsController } from "./repair-order-hardware-tests.controller";
import { HardwareTestsController } from "./hardware-tests.controller";
import { HardwareTestsService } from "./hardware-tests.service";

@Module({
  // RepairOrdersService.assertTechnicianAccess() — un Técnico solo puede
  // registrar pruebas de entrega en una orden que le hayan asignado.
  imports: [RepairOrdersModule],
  controllers: [RepairOrderHardwareTestsController, HardwareTestsController],
  providers: [HardwareTestsService],
})
export class HardwareTestsModule {}
