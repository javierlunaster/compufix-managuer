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
exports.InventoryMovementsController = void 0;
const common_1 = require("@nestjs/common");
const inventory_movements_service_1 = require("./inventory-movements.service");
const create_inventory_movement_dto_1 = require("./dto/create-inventory-movement.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let InventoryMovementsController = class InventoryMovementsController {
    constructor(movementsService) {
        this.movementsService = movementsService;
    }
    create(dto, actingUser) {
        return this.movementsService.createManual(dto, actingUser.id);
    }
    // GET /inventory-movements?productId=5  → historial de un producto
    findAllForProduct(productId) {
        return this.movementsService.findAllForProduct(productId);
    }
};
exports.InventoryMovementsController = InventoryMovementsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)("Administrador", "Inventario"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_movement_dto_1.CreateInventoryMovementDto, Object]),
    __metadata("design:returntype", void 0)
], InventoryMovementsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("productId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], InventoryMovementsController.prototype, "findAllForProduct", null);
exports.InventoryMovementsController = InventoryMovementsController = __decorate([
    (0, common_1.Controller)("inventory-movements"),
    __metadata("design:paramtypes", [inventory_movements_service_1.InventoryMovementsService])
], InventoryMovementsController);
