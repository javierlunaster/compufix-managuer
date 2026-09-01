import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { RepairLogsService } from "./repair-logs.service";
import { CreateLogDto } from "./dto/create-log.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/logs")
export class RepairOrderLogsController {
  constructor(private repairLogsService: RepairLogsService) {}

  @Post()
  create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateLogDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairLogsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  findAll(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.repairLogsService.findAllForOrder(orderId);
  }
}
