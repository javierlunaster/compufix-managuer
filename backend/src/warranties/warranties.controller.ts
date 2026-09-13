import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { WarrantyStatus } from "@prisma/client";
import { WarrantiesService } from "./warranties.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UpdateWarrantyDto } from "./dto/update-warranty.dto";
import { ClaimWarrantyDto } from "./dto/claim-warranty.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("warranties")
export class WarrantiesController {
  constructor(
    private warrantiesService: WarrantiesService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  // GET /warranties?status=ACTIVE&expiringWithinDays=30
  @Get()
  findAll(
    @CurrentUser() actingUser: AuthenticatedUser,
    @Query("status") status?: WarrantyStatus,
    @Query("expiringWithinDays") expiringWithinDays?: string,
  ) {
    return this.warrantiesService.findAll(
      {
        status,
        expiringWithinDays: expiringWithinDays ? Number(expiringWithinDays) : undefined,
      },
      actingUser,
    );
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const warranty = await this.warrantiesService.findOne(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, warranty.repairOrder.id);
    return warranty;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const warranty = await this.warrantiesService.findOne(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, warranty.repairOrder.id);
    return this.warrantiesService.update(id, dto, actingUser.id);
  }

  @Post(":id/claim")
  async claim(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ClaimWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const warranty = await this.warrantiesService.findOne(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, warranty.repairOrder.id);
    return this.warrantiesService.claim(id, dto, actingUser.id);
  }
}
