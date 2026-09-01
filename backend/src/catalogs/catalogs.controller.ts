import { Controller, Get, Query } from "@nestjs/common";
import { CatalogsService } from "./catalogs.service";

// Cualquier usuario autenticado puede leer estos catálogos — los necesita
// cualquier formulario que registre un equipo (Recepción, Técnico, etc.).
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
