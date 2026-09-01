import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { WarrantiesService } from "./warranties.service";
import { CreateWarrantyDto } from "./dto/create-warranty.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/warranties")
export class RepairOrderWarrantiesController {
  constructor(private warrantiesService: WarrantiesService) {}

  @Post()
  create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateWarrantyDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.warrantiesService.create(orderId, dto, actingUser.id);
  }

  @Get()
  findAll(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.warrantiesService.findAllForOrder(orderId);
  }
}
