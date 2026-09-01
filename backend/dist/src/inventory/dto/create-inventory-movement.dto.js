"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryMovementDto = exports.MANUAL_MOVEMENT_TYPES = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
// Tipos que se pueden registrar manualmente desde este endpoint. PURCHASE y
// SALE se generan automáticamente desde los módulos de Compras/Ventas
// (Fase 8) cuando existan; USED_IN_REPAIR se genera desde el módulo de
// repuestos de reparación (ver repair-parts/), no desde aquí.
const MANUAL_MOVEMENT_TYPES = [
    client_1.InventoryMovementType.ADJUSTMENT,
    client_1.InventoryMovementType.LOSS,
    client_1.InventoryMovementType.RETURN,
    client_1.InventoryMovementType.TRANSFER,
    client_1.InventoryMovementType.WARRANTY_REPLACEMENT,
];
exports.MANUAL_MOVEMENT_TYPES = MANUAL_MOVEMENT_TYPES;
class CreateInventoryMovementDto {
}
exports.CreateInventoryMovementDto = CreateInventoryMovementDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateInventoryMovementDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(MANUAL_MOVEMENT_TYPES, {
        message: `El tipo debe ser uno de: ${MANUAL_MOVEMENT_TYPES.join(", ")}`,
    }),
    __metadata("design:type", String)
], CreateInventoryMovementDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateInventoryMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryMovementDto.prototype, "unitCost", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "La observación es obligatoria en un movimiento manual" }),
    __metadata("design:type", String)
], CreateInventoryMovementDto.prototype, "notes", void 0);
