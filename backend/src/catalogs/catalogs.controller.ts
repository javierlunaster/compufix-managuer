import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { CatalogsService } from "./catalogs.service";
import { CreateCatalogEntryDto } from "./dto/create-catalog-entry.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Cualquier usuario autenticado puede leer estos catálogos — los necesita
// cualquier formulario que registre un equipo (Recepción, Técnico, etc.).
// El CRUD (crear/renombrar/desactivar) queda restringido a
// Administrador/Inventario, mismo criterio que ProductCategoriesController.
@Controller("catalogs")
export class CatalogsController {
  constructor(private catalogsService: CatalogsService) {}

  @Get("brands")
  findAllBrands() {
    return this.catalogsService.findAllBrands();
  }

  @Get("device-types")
  findAllDeviceTypes() {
    return this.catalogsService.findAllDeviceTypes();
  }

  // --- Marcas (gestión — Configuración) -----------------------------------

  @Get("brands/all")
  @Roles("Administrador", "Inventario")
  findAllBrandsIncludingInactive() {
    return this.catalogsService.findAllBrandsIncludingInactive();
  }

  @Post("brands")
  @Roles("Administrador", "Inventario")
  createBrand(@Body() dto: CreateCatalogEntryDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.createBrand(dto, actingUser.id);
  }

  @Patch("brands/:id")
  @Roles("Administrador", "Inventario")
  renameBrand(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateCatalogEntryDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.catalogsService.renameBrand(id, dto, actingUser.id);
  }

  @Patch("brands/:id/deactivate")
  @Roles("Administrador", "Inventario")
  deactivateBrand(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.setBrandStatus(id, "INACTIVE", actingUser.id);
  }

  @Patch("brands/:id/reactivate")
  @Roles("Administrador", "Inventario")
  reactivateBrand(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.setBrandStatus(id, "ACTIVE", actingUser.id);
  }

  // --- Tipos de equipo (gestión — Configuración) --------------------------

  @Get("device-types/all")
  @Roles("Administrador", "Inventario")
  findAllDeviceTypesIncludingInactive() {
    return this.catalogsService.findAllDeviceTypesIncludingInactive();
  }

  @Post("device-types")
  @Roles("Administrador", "Inventario")
  createDeviceType(@Body() dto: CreateCatalogEntryDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.createDeviceType(dto, actingUser.id);
  }

  @Patch("device-types/:id")
  @Roles("Administrador", "Inventario")
  renameDeviceType(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateCatalogEntryDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.catalogsService.renameDeviceType(id, dto, actingUser.id);
  }

  @Patch("device-types/:id/deactivate")
  @Roles("Administrador", "Inventario")
  deactivateDeviceType(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.setDeviceTypeStatus(id, "INACTIVE", actingUser.id);
  }

  @Patch("device-types/:id/reactivate")
  @Roles("Administrador", "Inventario")
  reactivateDeviceType(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.catalogsService.setDeviceTypeStatus(id, "ACTIVE", actingUser.id);
  }

  @Get("technicians")
  findTechnicians() {
    return this.catalogsService.findTechnicians();
  }

  @Get("device-models")
  findDeviceModels(
    @Query("brandId") brandId?: string,
    @Query("deviceTypeId") deviceTypeId?: string,
  ) {
    return this.catalogsService.findDeviceModels(
      brandId ? Number(brandId) : undefined,
      deviceTypeId ? Number(deviceTypeId) : undefined,
    );
  }
}
