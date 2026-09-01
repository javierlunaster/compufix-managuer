import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { InventoryMovementsService } from "./inventory-movements.service";
import { CreateInventoryMovementDto } from "./dto/create-inventory-movement.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("inventory-movements")
export class InventoryMovementsController {
  constructor(private movementsService: InventoryMovementsService) {}

  @Post()
  @Roles("Administrador", "Inventario")
  create(
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.movementsService.createManual(dto, actingUser.id);
  }

  // GET /inventory-movements?productId=5  → historial de un producto
  @Get()
  findAllForProduct(@Query("productId", ParseIntPipe) productId: number) {
    return this.movementsService.findAllForProduct(productId);
  }
}
