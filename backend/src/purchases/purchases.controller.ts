import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { UpdatePurchasePaymentStatusDto } from "./dto/update-purchase-payment-status.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("purchases")
@Roles("Administrador", "Inventario", "Gerente")
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.purchasesService.create(dto, actingUser.id);
  }

  @Get()
  findAll(
    @Query("supplierId") supplierId?: string,
    @Query("paymentStatus") paymentStatus?: PaymentStatus,
  ) {
    return this.purchasesService.findAll({
      supplierId: supplierId ? Number(supplierId) : undefined,
      paymentStatus,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.purchasesService.findOne(id);
  }

  @Patch(":id/payment-status")
  updatePaymentStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePurchasePaymentStatusDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.purchasesService.updatePaymentStatus(id, dto, actingUser.id);
  }
}
