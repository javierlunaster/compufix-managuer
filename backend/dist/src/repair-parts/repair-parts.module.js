"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairPartsModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_module_1 = require("../inventory/inventory.module");
const repair_parts_controller_1 = require("./repair-parts.controller");
const repair_parts_service_1 = require("./repair-parts.service");
let RepairPartsModule = class RepairPartsModule {
};
exports.RepairPartsModule = RepairPartsModule;
exports.RepairPartsModule = RepairPartsModule = __decorate([
    (0, common_1.Module)({
        imports: [inventory_module_1.InventoryModule], // reutiliza InventoryMovementsService
        controllers: [repair_parts_controller_1.RepairPartsController],
        providers: [repair_parts_service_1.RepairPartsService],
        // Se exporta para que QuotationsModule pueda consumir repuestos de forma
        // atómica al convertir una cotización aprobada en una orden real.
        exports: [repair_parts_service_1.RepairPartsService],
    })
], RepairPartsModule);
