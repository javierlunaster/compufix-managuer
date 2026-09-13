import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("payments")
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() actingUser: AuthenticatedUser) {
    if (dto.repairOrderId) {
      await this.repairOrdersService.assertTechnicianAccess(actingUser, dto.repairOrderId);
    }
    return this.paymentsService.create(dto, actingUser.id);
  }

  // GET /payments?customerId=&repairOrderId=&saleId=
  @Get()
  findAll(
    @Query("customerId") customerId?: string,
    @Query("repairOrderId") repairOrderId?: string,
    @Query("saleId") saleId?: string,
  ) {
    return this.paymentsService.findAll({
      customerId: customerId ? Number(customerId) : undefined,
      repairOrderId: repairOrderId ? Number(repairOrderId) : undefined,
      saleId: saleId ? Number(saleId) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }
}
