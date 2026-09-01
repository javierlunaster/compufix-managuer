import { Module } from "@nestjs/common";
import { RepairOrderLogsController } from "./repair-order-logs.controller";
import { RepairLogsController } from "./repair-logs.controller";
import { RepairLogsService } from "./repair-logs.service";

@Module({
  controllers: [RepairOrderLogsController, RepairLogsController],
  providers: [RepairLogsService],
})
export class RepairLogsModule {}
