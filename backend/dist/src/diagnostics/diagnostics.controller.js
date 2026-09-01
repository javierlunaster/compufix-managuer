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
exports.DiagnosticsController = void 0;
const common_1 = require("@nestjs/common");
const diagnostics_service_1 = require("./diagnostics.service");
const update_diagnostic_dto_1 = require("./dto/update-diagnostic.dto");
const create_measurement_dto_1 = require("./dto/create-measurement.dto");
const bulk_create_measurements_dto_1 = require("./dto/bulk-create-measurements.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let DiagnosticsController = class DiagnosticsController {
    constructor(diagnosticsService) {
        this.diagnosticsService = diagnosticsService;
    }
    findOne(id) {
        return this.diagnosticsService.findOne(id);
    }
    update(id, dto, actingUser) {
        return this.diagnosticsService.update(id, dto, actingUser.id);
    }
    addMeasurement(id, dto, actingUser) {
        return this.diagnosticsService.addMeasurement(id, dto, actingUser.id);
    }
    bulkAddMeasurements(id, dto, actingUser) {
        return this.diagnosticsService.bulkAddMeasurements(id, dto, actingUser.id);
    }
};
exports.DiagnosticsController = DiagnosticsController;
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_diagnostic_dto_1.UpdateDiagnosticDto, Object]),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/measurements"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_measurement_dto_1.CreateMeasurementDto, Object]),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "addMeasurement", null);
__decorate([
    (0, common_1.Post)(":id/measurements/bulk"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, bulk_create_measurements_dto_1.BulkCreateMeasurementsDto, Object]),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "bulkAddMeasurements", null);
exports.DiagnosticsController = DiagnosticsController = __decorate([
    (0, common_1.Controller)("diagnostics"),
    __metadata("design:paramtypes", [diagnostics_service_1.DiagnosticsService])
], DiagnosticsController);
