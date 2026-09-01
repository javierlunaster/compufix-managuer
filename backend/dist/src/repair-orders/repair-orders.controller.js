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
exports.RepairOrdersController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const repair_orders_service_1 = require("./repair-orders.service");
const create_repair_order_dto_1 = require("./dto/create-repair-order.dto");
const update_repair_order_dto_1 = require("./dto/update-repair-order.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const assign_technician_dto_1 = require("./dto/assign-technician.dto");
const add_procedure_dto_1 = require("./dto/add-procedure.dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let RepairOrdersController = class RepairOrdersController {
    constructor(repairOrdersService) {
        this.repairOrdersService = repairOrdersService;
    }
    create(dto, actingUser) {
        return this.repairOrdersService.create(dto, actingUser.id);
    }
    // GET /repair-orders?search=C11061&status=RECEIVED&technicianId=3
    findAll(search, status, technicianId) {
        return this.repairOrdersService.findAll({
            search,
            status,
            technicianId: technicianId ? Number(technicianId) : undefined,
        });
    }
    // Atajo para el caso de uso más frecuente: encontrar por código exacto
    // (sección 25 del brief — "al ingresar C11061 debe encontrar de inmediato...").
    findByCode(code) {
        return this.repairOrdersService.findByCode(code);
    }
    findOne(id) {
        return this.repairOrdersService.findOne(id);
    }
    update(id, dto, actingUser) {
        return this.repairOrdersService.update(id, dto, actingUser.id);
    }
    updateStatus(id, dto, actingUser) {
        return this.repairOrdersService.updateStatus(id, dto, actingUser.id);
    }
    assignTechnician(id, dto, actingUser) {
        return this.repairOrdersService.assignTechnician(id, dto, actingUser.id);
    }
    addProcedure(id, dto, actingUser) {
        return this.repairOrdersService.addProcedure(id, dto, actingUser.id);
    }
    // Restringido: leer la contraseña del equipo es un dato sensible
    // (sección 32 del brief) — no cualquier rol necesita verla.
    revealDevicePassword(id, actingUser) {
        return this.repairOrdersService.revealDevicePassword(id, actingUser.id);
    }
    purgeDevicePassword(id, actingUser) {
        return this.repairOrdersService.purgeDevicePassword(id, actingUser.id);
    }
};
exports.RepairOrdersController = RepairOrdersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_repair_order_dto_1.CreateRepairOrderDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("search")),
    __param(1, (0, common_1.Query)("status")),
    __param(2, (0, common_1.Query)("technicianId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)("by-code/:code"),
    __param(0, (0, common_1.Param)("code")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "findByCode", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_repair_order_dto_1.UpdateRepairOrderDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(":id/status"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_status_dto_1.UpdateStatusDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(":id/assign-technician"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, assign_technician_dto_1.AssignTechnicianDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "assignTechnician", null);
__decorate([
    (0, common_1.Post)(":id/procedures"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, add_procedure_dto_1.AddProcedureDto, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "addProcedure", null);
__decorate([
    (0, common_1.Get)(":id/device-password"),
    (0, roles_decorator_1.Roles)("Administrador", "Gerente", "Técnico"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "revealDevicePassword", null);
__decorate([
    (0, common_1.Delete)(":id/device-password"),
    (0, roles_decorator_1.Roles)("Administrador", "Gerente", "Técnico"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RepairOrdersController.prototype, "purgeDevicePassword", null);
exports.RepairOrdersController = RepairOrdersController = __decorate([
    (0, common_1.Controller)("repair-orders"),
    __metadata("design:paramtypes", [repair_orders_service_1.RepairOrdersService])
], RepairOrdersController);
