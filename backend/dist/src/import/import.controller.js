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
exports.ImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const import_service_1 = require("./import.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — de sobra para este Excel
/**
 * Restringido a Administrador: importar el histórico es una operación
 * excepcional (se hace una vez, no en el día a día) con capacidad de
 * crear cientos de clientes/equipos/órdenes de golpe — no es algo que
 * cualquier rol deba poder disparar por accidente.
 */
let ImportController = class ImportController {
    constructor(importService) {
        this.importService = importService;
    }
    async preview(file) {
        if (!file) {
            throw new common_1.BadRequestException("Sube el archivo Excel en el campo 'file' (multipart/form-data)");
        }
        return this.importService.preview(file.buffer);
    }
    async commit(importId, actingUser) {
        return this.importService.commit(importId, actingUser.id);
    }
};
exports.ImportController = ImportController;
__decorate([
    (0, common_1.Post)("preview"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)("commit/:importId"),
    __param(0, (0, common_1.Param)("importId")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "commit", null);
exports.ImportController = ImportController = __decorate([
    (0, common_1.Controller)("import/excel"),
    (0, roles_decorator_1.Roles)("Administrador"),
    __metadata("design:paramtypes", [import_service_1.ImportService])
], ImportController);
