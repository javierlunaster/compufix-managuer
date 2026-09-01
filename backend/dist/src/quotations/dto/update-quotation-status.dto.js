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
exports.UpdateQuotationStatusDto = exports.ASSIGNABLE_STATUSES = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
// CONVERTED se excluye a propósito: ese estado solo lo puede poner
// QuotationsService.convert(), nunca este endpoint genérico — convertir
// implica efectos reales (consumir inventario, crear RepairService,
// actualizar la orden), no es un simple cambio de estado.
const ASSIGNABLE_STATUSES = [
    client_1.QuotationStatus.DRAFT,
    client_1.QuotationStatus.SENT,
    client_1.QuotationStatus.PENDING,
    client_1.QuotationStatus.APPROVED,
    client_1.QuotationStatus.REJECTED,
    client_1.QuotationStatus.EXPIRED,
];
exports.ASSIGNABLE_STATUSES = ASSIGNABLE_STATUSES;
class UpdateQuotationStatusDto {
}
exports.UpdateQuotationStatusDto = UpdateQuotationStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(ASSIGNABLE_STATUSES, {
        message: `El estado debe ser uno de: ${ASSIGNABLE_STATUSES.join(", ")}`,
    }),
    __metadata("design:type", String)
], UpdateQuotationStatusDto.prototype, "newStatus", void 0);
