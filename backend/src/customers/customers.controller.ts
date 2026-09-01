import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Sin @Roles(): Recepción, Ventas, Técnicos y Administrador necesitan
// consultar y registrar clientes por igual. La sola autenticación basta.
@Controller("customers")
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.customersService.create(dto, actingUser.id);
  }

  // GET /customers?search=juan  → búsqueda rápida por nombre/teléfono/documento
  @Get()
  search(@Query("search") search?: string) {
    return this.customersService.search(search);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.customersService.update(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.customersService.deactivate(id, actingUser.id);
  }

  @Patch(":id/reactivate")
  reactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.customersService.reactivate(id, actingUser.id);
  }
}
