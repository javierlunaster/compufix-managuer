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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogsController = void 0;
const common_1 = require("@nestjs/common");
const catalogs_service_1 = require("./catalogs.service");
// Cualquier usuario autenticado puede leer estos catálogos — los necesita
// cualquier formulario que registre un equipo (Recepción, Técnico, etc.).
let CatalogsController = class CatalogsController {
    constructor(catalogsService) {
        this.catalogsService = catalogsService;
    }
    findAllBrands() {
        return this.catalogsService.findAllBrands();
    }
    findAllDeviceTypes() {
        return this.catalogsService.findAllDeviceTypes();
    }
    findTechnicians() {
        return this.catalogsService.findTechnicians();
    }
    findDeviceModels(brandId, deviceTypeId) {
        return this.catalogsService.findDeviceModels(brandId ? Number(brandId) : undefined, deviceTypeId ? Number(deviceTypeId) : undefined);
    }
};
exports.CatalogsController = CatalogsController;
__decorate([
    (0, common_1.Get)("brands"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogsController.prototype, "findAllBrands", null);
__decorate([
    (0, common_1.Get)("device-types"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogsController.prototype, "findAllDeviceTypes", null);
__decorate([
    (0, common_1.Get)("technicians"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogsController.prototype, "findTechnicians", null);
__decorate([
    (0, common_1.Get)("device-models"),
    __param(0, (0, common_1.Query)("brandId")),
    __param(1, (0, common_1.Query)("deviceTypeId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CatalogsController.prototype, "findDeviceModels", null);
exports.CatalogsController = CatalogsController = __decorate([
    (0, common_1.Controller)("catalogs"),
    __metadata("design:paramtypes", [catalogs_service_1.CatalogsService])
], CatalogsController);
