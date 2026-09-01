import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { RepairPartsService } from "./repair-parts.service";
import { CreateRepairPartDto } from "./dto/create-repair-part.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/parts")
export class RepairPartsController {
  constructor(private repairPartsService: RepairPartsService) {}

  @Post()
  create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateRepairPartDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairPartsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  findAll(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.repairPartsService.findAllForOrder(orderId);
  }

  @Get("cost-summary")
  costSummary(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.repairPartsService.costSummary(orderId);
  }

  @Delete(":partId")
  remove(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("partId", ParseIntPipe) partId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairPartsService.remove(orderId, partId, actingUser.id);
  }
}
