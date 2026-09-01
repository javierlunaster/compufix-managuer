import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { UpdateDiagnosticDto } from "./dto/update-diagnostic.dto";
import { CreateMeasurementDto } from "./dto/create-measurement.dto";
import { BulkCreateMeasurementsDto } from "./dto/bulk-create-measurements.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("diagnostics")
export class DiagnosticsController {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.diagnosticsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDiagnosticDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.update(id, dto, actingUser.id);
  }

  @Post(":id/measurements")
  addMeasurement(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateMeasurementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.addMeasurement(id, dto, actingUser.id);
  }

  @Post(":id/measurements/bulk")
  bulkAddMeasurements(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: BulkCreateMeasurementsDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.bulkAddMeasurements(id, dto, actingUser.id);
  }
}
