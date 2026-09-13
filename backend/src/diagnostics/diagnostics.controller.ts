import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UpdateDiagnosticDto } from "./dto/update-diagnostic.dto";
import { CreateMeasurementDto } from "./dto/create-measurement.dto";
import { BulkCreateMeasurementsDto } from "./dto/bulk-create-measurements.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("diagnostics")
export class DiagnosticsController {
  constructor(
    private diagnosticsService: DiagnosticsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDiagnosticDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.update(id, dto, actingUser.id);
  }

  @Post(":id/measurements")
  async addMeasurement(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateMeasurementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.addMeasurement(id, dto, actingUser.id);
  }

  @Post(":id/measurements/bulk")
  async bulkAddMeasurements(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: BulkCreateMeasurementsDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.diagnosticsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.bulkAddMeasurements(id, dto, actingUser.id);
  }
}
