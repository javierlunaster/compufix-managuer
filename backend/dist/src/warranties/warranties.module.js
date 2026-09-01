"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarrantiesModule = void 0;
const common_1 = require("@nestjs/common");
const repair_orders_module_1 = require("../repair-orders/repair-orders.module");
const repair_order_warranties_controller_1 = require("./repair-order-warranties.controller");
const warranties_controller_1 = require("./warranties.controller");
const warranties_service_1 = require("./warranties.service");
let WarrantiesModule = class WarrantiesModule {
};
exports.WarrantiesModule = WarrantiesModule;
exports.WarrantiesModule = WarrantiesModule = __decorate([
    (0, common_1.Module)({
        // Reutiliza RepairOrdersService.create()/updateStatus() para generar la
        // orden de reclamo sin duplicar esa lógica.
        imports: [repair_orders_module_1.RepairOrdersModule],
        controllers: [repair_order_warranties_controller_1.RepairOrderWarrantiesController, warranties_controller_1.WarrantiesController],
        providers: [warranties_service_1.WarrantiesService],
        // Se exporta para que DashboardModule (Fase 12) reutilice la consulta de
        // garantías por vencer en vez de reimplementarla.
        exports: [warranties_service_1.WarrantiesService],
    })
], WarrantiesModule);
