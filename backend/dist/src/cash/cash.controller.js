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
exports.CashController = void 0;
const common_1 = require("@nestjs/common");
const cash_service_1 = require("./cash.service");
const open_cash_register_dto_1 = require("./dto/open-cash-register.dto");
const close_cash_register_dto_1 = require("./dto/close-cash-register.dto");
const create_cash_movement_dto_1 = require("./dto/create-cash-movement.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let CashController = class CashController {
    constructor(cashService) {
        this.cashService = cashService;
    }
    open(dto, actingUser) {
        return this.cashService.open(dto, actingUser.id);
    }
    close(id, dto, actingUser) {
        return this.cashService.close(id, dto, actingUser.id);
    }
    findCurrent() {
        return this.cashService.findCurrent();
    }
    findAll() {
        return this.cashService.findAll();
    }
    findOne(id) {
        return this.cashService.findOne(id);
    }
    createMovement(dto, actingUser) {
        return this.cashService.createMovement(dto, actingUser.id);
    }
};
exports.CashController = CashController;
__decorate([
    (0, common_1.Post)("open"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [open_cash_register_dto_1.OpenCashRegisterDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "open", null);
__decorate([
    (0, common_1.Post)(":id/close"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, close_cash_register_dto_1.CloseCashRegisterDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "close", null);
__decorate([
    (0, common_1.Get)("current"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CashController.prototype, "findCurrent", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CashController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)("movements"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cash_movement_dto_1.CreateCashMovementDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "createMovement", null);
exports.CashController = CashController = __decorate([
    (0, common_1.Controller)("cash-registers"),
    (0, roles_decorator_1.Roles)("Administrador", "Gerente", "Recepción", "Ventas"),
    __metadata("design:paramtypes", [cash_service_1.CashService])
], CashController);
