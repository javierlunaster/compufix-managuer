import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("sales")
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.salesService.create(dto, actingUser.id);
  }

  @Get()
  findAll(@Query("customerId") customerId?: string, @Query("search") search?: string) {
    return this.salesService.findAll({
      customerId: customerId ? Number(customerId) : undefined,
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Post(":id/cancel")
  cancel(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.salesService.cancel(id, actingUser.id);
  }
}
