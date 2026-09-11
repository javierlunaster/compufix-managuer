import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { QuotationStatus } from "@prisma/client";
import { QuotationsService } from "./quotations.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";
import { UpdateQuotationStatusDto } from "./dto/update-quotation-status.dto";
import { CreateQuotationItemDto } from "./dto/create-quotation-item.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("quotations")
export class QuotationsController {
  constructor(private quotationsService: QuotationsService) {}

  @Post()
  create(@Body() dto: CreateQuotationDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.quotationsService.create(dto, actingUser.id);
  }

  // GET /quotations?search=&status=&customerId=
  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: QuotationStatus,
    @Query("customerId") customerId?: string,
  ) {
    return this.quotationsService.findAll({
      search,
      status,
      customerId: customerId ? Number(customerId) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.quotationsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.quotationsService.update(id, dto, actingUser.id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationStatusDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.quotationsService.updateStatus(id, dto, actingUser.id);
  }

  @Post(":id/items")
  addItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateQuotationItemDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.quotationsService.addItem(id, dto, actingUser.id);
  }

  @Delete(":id/items/:itemId")
  removeItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.quotationsService.removeItem(id, itemId, actingUser.id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.quotationsService.remove(id, actingUser.id);
  }

  @Post(":id/convert")
  convert(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.quotationsService.convert(id, actingUser.id);
  }
}
