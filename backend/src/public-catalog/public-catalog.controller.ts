import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PublicCatalogService } from "./public-catalog.service";

/**
 * Vitrina pública de productos — sin login, pensada para compartir el link
 * directo con un cliente. @Public() a nivel de controlador, mismo criterio
 * que CustomerPortalController: así el guard global del personal
 * (JwtAuthGuard) ignora esta ruta por completo, sin depender de que cada
 * handler lo recuerde.
 */
@Controller("public/catalog")
@Public()
export class PublicCatalogController {
  constructor(private catalogService: PublicCatalogService) {}

  // GET /public/catalog/products?search=&categoryId=&brandId=&page=&pageSize=
  @Get("products")
  findAll(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("brandId") brandId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.catalogService.findAll({
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("filters")
  findFilters() {
    return this.catalogService.findFilters();
  }

  @Get("products/:id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.catalogService.findOne(id);
  }
}
