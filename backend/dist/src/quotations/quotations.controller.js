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
exports.QuotationsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const quotations_service_1 = require("./quotations.service");
const create_quotation_dto_1 = require("./dto/create-quotation.dto");
const update_quotation_dto_1 = require("./dto/update-quotation.dto");
const update_quotation_status_dto_1 = require("./dto/update-quotation-status.dto");
const create_quotation_item_dto_1 = require("./dto/create-quotation-item.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let QuotationsController = class QuotationsController {
    constructor(quotationsService) {
        this.quotationsService = quotationsService;
    }
    create(dto, actingUser) {
        return this.quotationsService.create(dto, actingUser.id);
    }
    // GET /quotations?search=&status=&customerId=
    findAll(search, status, customerId) {
        return this.quotationsService.findAll({
            search,
            status,
            customerId: customerId ? Number(customerId) : undefined,
        });
    }
    findOne(id) {
        return this.quotationsService.findOne(id);
    }
    update(id, dto, actingUser) {
        return this.quotationsService.update(id, dto, actingUser.id);
    }
    updateStatus(id, dto, actingUser) {
        return this.quotationsService.updateStatus(id, dto, actingUser.id);
    }
    addItem(id, dto, actingUser) {
        return this.quotationsService.addItem(id, dto, actingUser.id);
    }
    removeItem(id, itemId, actingUser) {
        return this.quotationsService.removeItem(id, itemId, actingUser.id);
    }
    convert(id, actingUser) {
        return this.quotationsService.convert(id, actingUser.id);
    }
};
exports.QuotationsController = QuotationsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_quotation_dto_1.CreateQuotationDto, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("search")),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("customerId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_quotation_dto_1.UpdateQuotationDto, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(":id/status"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_quotation_status_dto_1.UpdateQuotationStatusDto, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(":id/items"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_quotation_item_dto_1.CreateQuotationItemDto, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "addItem", null);
__decorate([
    (0, common_1.Delete)(":id/items/:itemId"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)("itemId", common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "removeItem", null);
__decorate([
    (0, common_1.Post)(":id/convert"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "convert", null);
exports.QuotationsController = QuotationsController = __decorate([
    (0, common_1.Controller)("quotations"),
    __metadata("design:paramtypes", [quotations_service_1.QuotationsService])
], QuotationsController);
