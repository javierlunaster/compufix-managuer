import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { QuotationGroupsService } from "./quotation-groups.service";
import { CreateQuotationGroupDto } from "./dto/create-quotation-group.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("quotation-groups")
export class QuotationGroupsController {
  constructor(private quotationGroupsService: QuotationGroupsService) {}

  @Post()
  create(@Body() dto: CreateQuotationGroupDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.quotationGroupsService.create(dto, actingUser.id);
  }

  @Get()
  findAll(@Query("customerId") customerId?: string) {
    return this.quotationGroupsService.findAll({
      customerId: customerId ? Number(customerId) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.quotationGroupsService.findOne(id);
  }

  @Post(":id/approve")
  approve(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.quotationGroupsService.approve(id, actingUser.id);
  }

  @Post(":id/reject")
  reject(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.quotationGroupsService.reject(id, actingUser.id);
  }
}
