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
exports.PurchasesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const purchases_service_1 = require("./purchases.service");
const create_purchase_dto_1 = require("./dto/create-purchase.dto");
const update_purchase_payment_status_dto_1 = require("./dto/update-purchase-payment-status.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let PurchasesController = class PurchasesController {
    constructor(purchasesService) {
        this.purchasesService = purchasesService;
    }
    create(dto, actingUser) {
        return this.purchasesService.create(dto, actingUser.id);
    }
    findAll(supplierId, paymentStatus) {
        return this.purchasesService.findAll({
            supplierId: supplierId ? Number(supplierId) : undefined,
            paymentStatus,
        });
    }
    findOne(id) {
        return this.purchasesService.findOne(id);
    }
    updatePaymentStatus(id, dto, actingUser) {
        return this.purchasesService.updatePaymentStatus(id, dto, actingUser.id);
    }
};
exports.PurchasesController = PurchasesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_purchase_dto_1.CreatePurchaseDto, Object]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("supplierId")),
    __param(1, (0, common_1.Query)("paymentStatus")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id/payment-status"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_purchase_payment_status_dto_1.UpdatePurchasePaymentStatusDto, Object]),
    __metadata("design:returntype", void 0)
], PurchasesController.prototype, "updatePaymentStatus", null);
exports.PurchasesController = PurchasesController = __decorate([
    (0, common_1.Controller)("purchases"),
    (0, roles_decorator_1.Roles)("Administrador", "Inventario", "Gerente"),
    __metadata("design:paramtypes", [purchases_service_1.PurchasesService])
], PurchasesController);
