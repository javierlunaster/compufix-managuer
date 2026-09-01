import { Body, Controller, Delete, Param, ParseIntPipe, Patch } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { UpdateMeasurementDto } from "./dto/update-measurement.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("measurements")
export class MeasurementsController {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMeasurementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.updateMeasurement(id, dto, actingUser.id);
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.deleteMeasurement(id, actingUser.id);
  }
}
