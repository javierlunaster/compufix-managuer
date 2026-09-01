import { Module } from "@nestjs/common";
import { ProductCategoriesController } from "./product-categories.controller";
import { ProductCategoriesService } from "./product-categories.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { InventoryMovementsController } from "./inventory-movements.controller";
import { InventoryMovementsService } from "./inventory-movements.service";

@Module({
  controllers: [ProductCategoriesController, ProductsController, InventoryMovementsController],
  providers: [ProductCategoriesService, ProductsService, InventoryMovementsService],
  // InventoryMovementsService se exporta porque repair-parts/ lo reutiliza
  // para descontar stock al usar un repuesto en una reparación, en vez de
  // duplicar la lógica de "nunca escribir stock directo". ProductsService
  // se exporta porque el Dashboard (Fase 12) reutiliza su consulta de
  // stock bajo en vez de reimplementarla.
  exports: [InventoryMovementsService, ProductsService],
})
export class InventoryModule {}
