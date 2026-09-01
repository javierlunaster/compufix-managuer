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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const documents_service_1 = require("./documents.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
function asAttachment(filename) {
    return `attachment; filename="${filename}"`;
}
let DocumentsController = class DocumentsController {
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async technicalReport(orderId, actingUser) {
        const { buffer, filename } = await this.documentsService.generateTechnicalReport(orderId, actingUser.id);
        return new common_1.StreamableFile(buffer, {
            type: "application/pdf",
            disposition: asAttachment(filename),
        });
    }
    async intakeReceipt(orderId) {
        const { buffer, filename } = await this.documentsService.generateIntakeReceipt(orderId);
        return new common_1.StreamableFile(buffer, {
            type: "application/pdf",
            disposition: asAttachment(filename),
        });
    }
    async deliveryReceipt(orderId) {
        const { buffer, filename } = await this.documentsService.generateDeliveryReceipt(orderId);
        return new common_1.StreamableFile(buffer, {
            type: "application/pdf",
            disposition: asAttachment(filename),
        });
    }
    async warrantyCertificate(warrantyId) {
        const { buffer, filename } = await this.documentsService.generateWarrantyCertificate(warrantyId);
        return new common_1.StreamableFile(buffer, {
            type: "application/pdf",
            disposition: asAttachment(filename),
        });
    }
    async quotationPdf(quotationId, actingUser) {
        const { buffer, filename } = await this.documentsService.generateQuotationPdf(quotationId, actingUser.id);
        return new common_1.StreamableFile(buffer, {
            type: "application/pdf",
            disposition: asAttachment(filename),
        });
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)("repair-orders/:orderId/documents/technical-report"),
    (0, common_1.Header)("Content-Type", "application/pdf"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "technicalReport", null);
__decorate([
    (0, common_1.Get)("repair-orders/:orderId/documents/intake-receipt"),
    (0, common_1.Header)("Content-Type", "application/pdf"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "intakeReceipt", null);
__decorate([
    (0, common_1.Get)("repair-orders/:orderId/documents/delivery-receipt"),
    (0, common_1.Header)("Content-Type", "application/pdf"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "deliveryReceipt", null);
__decorate([
    (0, common_1.Get)("warranties/:warrantyId/document"),
    (0, common_1.Header)("Content-Type", "application/pdf"),
    __param(0, (0, common_1.Param)("warrantyId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "warrantyCertificate", null);
__decorate([
    (0, common_1.Get)("quotations/:quotationId/document"),
    (0, common_1.Header)("Content-Type", "application/pdf"),
    __param(0, (0, common_1.Param)("quotationId", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "quotationPdf", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
