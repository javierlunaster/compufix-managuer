import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { RepairLogsService } from "./repair-logs.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateLogDto } from "./dto/create-log.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/logs")
export class RepairOrderLogsController {
  constructor(
    private repairLogsService: RepairLogsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateLogDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairLogsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  async findAll(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairLogsService.findAllForOrder(orderId);
  }
}
