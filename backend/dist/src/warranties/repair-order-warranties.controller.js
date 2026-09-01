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
exports.RepairOrderWarrantiesController = void 0;
const common_1 = require("@nestjs/common");
const warranties_service_1 = require("./warranties.service");
const create_warranty_dto_1 = require("./dto/create-warranty.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let RepairOrderWarrantiesController = class RepairOrderWarrantiesController {
    constructor(warrantiesService) {
        this.warrantiesService = warrantiesService;
    }
    create(orderId, dto, actingUser) {
        return this.warrantiesService.create(orderId, dto, actingUser.id);
    }
    findAll(orderId) {
        return this.warrantiesService.findAllForOrder(orderId);
    }
};
exports.RepairOrderWarrantiesController = RepairOrderWarrantiesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_warranty_dto_1.CreateWarrantyDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrderWarrantiesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RepairOrderWarrantiesController.prototype, "findAll", null);
exports.RepairOrderWarrantiesController = RepairOrderWarrantiesController = __decorate([
    (0, common_1.Controller)("repair-orders/:orderId/warranties"),
    __metadata("design:paramtypes", [warranties_service_1.WarrantiesService])
], RepairOrderWarrantiesController);
