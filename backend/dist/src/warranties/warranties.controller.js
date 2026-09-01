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
exports.WarrantiesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const warranties_service_1 = require("./warranties.service");
const update_warranty_dto_1 = require("./dto/update-warranty.dto");
const claim_warranty_dto_1 = require("./dto/claim-warranty.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let WarrantiesController = class WarrantiesController {
    constructor(warrantiesService) {
        this.warrantiesService = warrantiesService;
    }
    // GET /warranties?status=ACTIVE&expiringWithinDays=30
    findAll(status, expiringWithinDays) {
        return this.warrantiesService.findAll({
            status,
            expiringWithinDays: expiringWithinDays ? Number(expiringWithinDays) : undefined,
        });
    }
    findOne(id) {
        return this.warrantiesService.findOne(id);
    }
    update(id, dto, actingUser) {
        return this.warrantiesService.update(id, dto, actingUser.id);
    }
    claim(id, dto, actingUser) {
        return this.warrantiesService.claim(id, dto, actingUser.id);
    }
};
exports.WarrantiesController = WarrantiesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("status")),
    __param(1, (0, common_1.Query)("expiringWithinDays")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WarrantiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], WarrantiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_warranty_dto_1.UpdateWarrantyDto, Object]),
    __metadata("design:returntype", void 0)
], WarrantiesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/claim"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, claim_warranty_dto_1.ClaimWarrantyDto, Object]),
    __metadata("design:returntype", void 0)
], WarrantiesController.prototype, "claim", null);
exports.WarrantiesController = WarrantiesController = __decorate([
    (0, common_1.Controller)("warranties"),
    __metadata("design:paramtypes", [warranties_service_1.WarrantiesService])
], WarrantiesController);
