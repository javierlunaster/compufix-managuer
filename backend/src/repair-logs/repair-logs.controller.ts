import { Body, Controller, Get, Param, ParseIntPipe, Patch } from "@nestjs/common";
import { RepairLogsService } from "./repair-logs.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UpdateLogDto } from "./dto/update-log.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-logs")
export class RepairLogsController {
  constructor(
    private repairLogsService: RepairLogsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.repairLogsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairLogsService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLogDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.repairLogsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairLogsService.update(id, dto, actingUser.id);
  }
}
