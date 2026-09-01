import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { ProductCategoriesService } from "./product-categories.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("product-categories")
export class ProductCategoriesController {
  constructor(private categoriesService: ProductCategoriesService) {}

  // Lectura abierta a cualquier autenticado: la necesita el formulario de
  // creación de productos.
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles("Administrador", "Inventario")
  create(
    @Body() dto: CreateProductCategoryDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.categoriesService.create(dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  @Roles("Administrador", "Inventario")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.categoriesService.deactivate(id, actingUser.id);
  }
}
