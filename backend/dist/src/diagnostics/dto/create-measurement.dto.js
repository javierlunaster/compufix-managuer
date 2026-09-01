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
exports.CreateMeasurementDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * Un punto de medición libre — ej. ACDET, ACOK, PLTRST, "Consumo S0"...
 * No hay valores esperados predefinidos por el sistema (sección 8 del
 * brief: "Los valores esperados deben ser configurables y depender del
 * circuito/modelo"), así que `expectedValue` también es texto libre que
 * el técnico ingresa según la placa que esté revisando.
 */
class CreateMeasurementDto {
}
exports.CreateMeasurementDto = CreateMeasurementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "El nombre del punto de medición es obligatorio" }),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "pointName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "expectedValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "measuredValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "status", void 0);
