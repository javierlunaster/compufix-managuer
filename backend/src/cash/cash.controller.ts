import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CashService } from "./cash.service";
import { OpenCashRegisterDto } from "./dto/open-cash-register.dto";
import { CloseCashRegisterDto } from "./dto/close-cash-register.dto";
import { CreateCashMovementDto } from "./dto/create-cash-movement.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("cash-registers")
@Roles("Administrador", "Gerente", "Recepción", "Ventas")
export class CashController {
  constructor(private cashService: CashService) {}

  @Post("open")
  open(@Body() dto: OpenCashRegisterDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.cashService.open(dto, actingUser.id);
  }

  @Post(":id/close")
  close(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.cashService.close(id, dto, actingUser.id);
  }

  @Get("current")
  findCurrent() {
    return this.cashService.findCurrent();
  }

  @Get()
  findAll() {
    return this.cashService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.cashService.findOne(id);
  }

  @Post("movements")
  createMovement(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.cashService.createMovement(dto, actingUser.id);
  }
}
