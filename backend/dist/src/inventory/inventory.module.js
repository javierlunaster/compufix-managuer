"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const product_categories_controller_1 = require("./product-categories.controller");
const product_categories_service_1 = require("./product-categories.service");
const products_controller_1 = require("./products.controller");
const products_service_1 = require("./products.service");
const inventory_movements_controller_1 = require("./inventory-movements.controller");
const inventory_movements_service_1 = require("./inventory-movements.service");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        controllers: [product_categories_controller_1.ProductCategoriesController, products_controller_1.ProductsController, inventory_movements_controller_1.InventoryMovementsController],
        providers: [product_categories_service_1.ProductCategoriesService, products_service_1.ProductsService, inventory_movements_service_1.InventoryMovementsService],
        // InventoryMovementsService se exporta porque repair-parts/ lo reutiliza
        // para descontar stock al usar un repuesto en una reparación, en vez de
        // duplicar la lógica de "nunca escribir stock directo". ProductsService
        // se exporta porque el Dashboard (Fase 12) reutiliza su consulta de
        // stock bajo en vez de reimplementarla.
        exports: [inventory_movements_service_1.InventoryMovementsService, products_service_1.ProductsService],
    })
], InventoryModule);
