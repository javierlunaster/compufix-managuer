import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { RepairServicesService } from "./repair-services.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateRepairServiceDto } from "./dto/create-repair-service.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/services")
export class RepairServicesController {
  constructor(
    private repairServicesService: RepairServicesService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateRepairServiceDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairServicesService.create(orderId, dto, actingUser.id);
  }

  @Get()
  async findAll(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairServicesService.findAllForOrder(orderId);
  }

  @Delete(":repairServiceId")
  async remove(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("repairServiceId", ParseIntPipe) repairServiceId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.repairServicesService.remove(orderId, repairServiceId, actingUser.id);
  }
}
