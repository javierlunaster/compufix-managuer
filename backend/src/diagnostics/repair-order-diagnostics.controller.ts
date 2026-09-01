import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { DiagnosticsService } from "./diagnostics.service";
import { CreateDiagnosticDto } from "./dto/create-diagnostic.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/diagnostics")
export class RepairOrderDiagnosticsController {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Post()
  create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateDiagnosticDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.diagnosticsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  findAll(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.diagnosticsService.findAllForOrder(orderId);
  }
}
