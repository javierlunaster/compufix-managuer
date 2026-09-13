import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateDiagnosticDto } from "./dto/create-diagnostic.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/diagnostics")
export class RepairOrderDiagnosticsController {
  constructor(
    private diagnosticsService: DiagnosticsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateDiagnosticDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  async findAll(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.diagnosticsService.findAllForOrder(orderId);
  }
}
