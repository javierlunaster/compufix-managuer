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
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("suppliers")
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query("search") search?: string) {
    return this.suppliersService.findAll(search);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @Roles("Administrador", "Inventario")
  create(@Body() dto: CreateSupplierDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.suppliersService.create(dto, actingUser.id);
  }

  @Patch(":id")
  @Roles("Administrador", "Inventario")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.suppliersService.update(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  @Roles("Administrador", "Inventario")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.suppliersService.deactivate(id, actingUser.id);
  }
}
