import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { WarrantyStatus } from "@prisma/client";
import { WarrantiesService } from "./warranties.service";
import { UpdateWarrantyDto } from "./dto/update-warranty.dto";
import { ClaimWarrantyDto } from "./dto/claim-warranty.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("warranties")
export class WarrantiesController {
  constructor(private warrantiesService: WarrantiesService) {}

  // GET /warranties?status=ACTIVE&expiringWithinDays=30
  @Get()
  findAll(
    @Query("status") status?: WarrantyStatus,
    @Query("expiringWithinDays") expiringWithinDays?: string,
  ) {
    return this.warrantiesService.findAll({
      status,
      expiringWithinDays: expiringWithinDays ? Number(expiringWithinDays) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.warrantiesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.warrantiesService.update(id, dto, actingUser.id);
  }

  @Post(":id/claim")
  claim(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ClaimWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.warrantiesService.claim(id, dto, actingUser.id);
  }
}
