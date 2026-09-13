import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { RepairPartsService } from "./repair-parts.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateRepairPartDto } from "./dto/create-repair-part.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/parts")
export class RepairPartsController {
  constructor(
    private repairPartsService: RepairPartsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateRepairPartDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairPartsService.create(orderId, dto, actingUser.id);
  }

  @Get()
  async findAll(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairPartsService.findAllForOrder(orderId);
  }

  @Get("cost-summary")
  async costSummary(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairPartsService.costSummary(orderId);
  }

  @Delete(":partId")
  async remove(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("partId", ParseIntPipe) partId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairPartsService.remove(orderId, partId, actingUser.id);
  }
}
