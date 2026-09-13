import { Body, Controller, Delete, Param, ParseIntPipe, Patch } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UpdateMeasurementDto } from "./dto/update-measurement.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("measurements")
export class MeasurementsController {
  constructor(
    private diagnosticsService: DiagnosticsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMeasurementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderIdForMeasurement(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.updateMeasurement(id, dto, actingUser.id);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderIdForMeasurement(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.deleteMeasurement(id, actingUser.id);
  }
}
