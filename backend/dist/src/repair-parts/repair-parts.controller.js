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
exports.RepairPartsController = void 0;
const common_1 = require("@nestjs/common");
const repair_parts_service_1 = require("./repair-parts.service");
const create_repair_part_dto_1 = require("./dto/create-repair-part.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let RepairPartsController = class RepairPartsController {
    constructor(repairPartsService) {
        this.repairPartsService = repairPartsService;
    }
    create(orderId, dto, actingUser) {
        return this.repairPartsService.create(orderId, dto, actingUser.id);
    }
    findAll(orderId) {
        return this.repairPartsService.findAllForOrder(orderId);
    }
    costSummary(orderId) {
        return this.repairPartsService.costSummary(orderId);
    }
    remove(orderId, partId, actingUser) {
        return this.repairPartsService.remove(orderId, partId, actingUser.id);
    }
};
exports.RepairPartsController = RepairPartsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_repair_part_dto_1.CreateRepairPartDto, Object]),
    __metadata("design:returntype", void 0)
], RepairPartsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RepairPartsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)("cost-summary"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RepairPartsController.prototype, "costSummary", null);
__decorate([
    (0, common_1.Delete)(":partId"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)("partId", common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], RepairPartsController.prototype, "remove", null);
exports.RepairPartsController = RepairPartsController = __decorate([
    (0, common_1.Controller)("repair-orders/:orderId/parts"),
    __metadata("design:paramtypes", [repair_parts_service_1.RepairPartsService])
], RepairPartsController);
