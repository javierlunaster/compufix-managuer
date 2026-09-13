import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { RepairOrderDiagnosticsController } from "./repair-order-diagnostics.controller";
import { DiagnosticsController } from "./diagnostics.controller";
import { MeasurementsController } from "./measurements.controller";
import { DiagnosticsService } from "./diagnostics.service";

@Module({
  // RepairOrdersService.assertTechnicianAccess() — un Técnico solo puede
  // ver/tocar diagnósticos de una orden que le hayan asignado.
  imports: [RepairOrdersModule],
  controllers: [
    RepairOrderDiagnosticsController,
    DiagnosticsController,
    MeasurementsController,
  ],
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
