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
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles("Administrador", "Inventario")
  create(@Body() dto: CreateProductDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.productsService.create(dto, actingUser.id);
  }

  // GET /products?search=&categoryId=&lowStockOnly=true
  // lowStockOnly cubre "repuestos con inventario bajo" del Dashboard
  // (sección 4 del brief), aunque el Dashboard en sí llega en otra fase.
  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
  ) {
    return this.productsService.findAll({
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      lowStockOnly: lowStockOnly === "true",
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(":id")
  @Roles("Administrador", "Inventario")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  @Roles("Administrador", "Inventario")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.productsService.deactivate(id, actingUser.id);
  }

  @Patch(":id/reactivate")
  @Roles("Administrador", "Inventario")
  reactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.productsService.reactivate(id, actingUser.id);
  }
}
