import { Module } from "@nestjs/common";
import { RepairOrderDiagnosticsController } from "./repair-order-diagnostics.controller";
import { DiagnosticsController } from "./diagnostics.controller";
import { MeasurementsController } from "./measurements.controller";
import { DiagnosticsService } from "./diagnostics.service";

@Module({
  controllers: [
    RepairOrderDiagnosticsController,
    DiagnosticsController,
    MeasurementsController,
  ],
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
