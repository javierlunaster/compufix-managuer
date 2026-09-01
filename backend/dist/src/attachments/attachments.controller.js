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
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const attachments_service_1 = require("./attachments.service");
const upload_attachment_dto_1 = require("./dto/upload-attachment.dto");
const multer_config_1 = require("./multer.config");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let AttachmentsController = class AttachmentsController {
    constructor(attachmentsService) {
        this.attachmentsService = attachmentsService;
    }
    uploadForOrder(orderId, files, dto, actingUser) {
        return this.attachmentsService.uploadForOrder(orderId, files, dto, actingUser.id);
    }
    findGeneralPhotos(orderId) {
        return this.attachmentsService.findGeneralPhotosForOrder(orderId);
    }
    uploadForLog(orderId, logId, files, dto, actingUser) {
        return this.attachmentsService.uploadForLog(orderId, logId, files, dto, actingUser.id);
    }
    uploadForDiagnostic(orderId, diagnosticId, files, dto, actingUser) {
        return this.attachmentsService.uploadForDiagnostic(orderId, diagnosticId, files, dto, actingUser.id);
    }
    remove(id, actingUser) {
        return this.attachmentsService.remove(id, actingUser.id);
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Post)("repair-orders/:orderId/photos"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 10, multer_config_1.photoUploadOptions)),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array, upload_attachment_dto_1.UploadAttachmentDto, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "uploadForOrder", null);
__decorate([
    (0, common_1.Get)("repair-orders/:orderId/photos"),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "findGeneralPhotos", null);
__decorate([
    (0, common_1.Post)("repair-orders/:orderId/logs/:logId/photos"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 10, multer_config_1.photoUploadOptions)),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)("logId", common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Array, upload_attachment_dto_1.UploadAttachmentDto, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "uploadForLog", null);
__decorate([
    (0, common_1.Post)("repair-orders/:orderId/diagnostics/:diagnosticId/photos"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("files", 10, multer_config_1.photoUploadOptions)),
    __param(0, (0, common_1.Param)("orderId", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)("diagnosticId", common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Array, upload_attachment_dto_1.UploadAttachmentDto, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "uploadForDiagnostic", null);
__decorate([
    (0, common_1.Delete)("attachments/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "remove", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService])
], AttachmentsController);
