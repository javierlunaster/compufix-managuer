import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairOrderLogsController } from "./repair-order-logs.controller";
import { RepairLogsController } from "./repair-logs.controller";
import { RepairLogsService } from "./repair-logs.service";

@Module({
  // RepairOrdersService.assertTechnicianAccess() — un Técnico solo puede
  // ver/tocar bitácora de una orden que le hayan asignado.
  imports: [RepairOrdersModule],
  controllers: [RepairOrderLogsController, RepairLogsController],
  providers: [RepairLogsService],
})
export class RepairLogsModule {}
