import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { WarrantiesService } from "./warranties.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateWarrantyDto } from "./dto/create-warranty.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/warranties")
export class RepairOrderWarrantiesController {
  constructor(
    private warrantiesService: WarrantiesService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.warrantiesService.create(orderId, dto, actingUser.id);
  }

  @Get()
  async findAll(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.warrantiesService.findAllForOrder(orderId);
  }
}
