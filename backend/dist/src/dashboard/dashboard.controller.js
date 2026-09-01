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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
// Restringido a nivel gerencial: incluye cifras financieras (dinero
// pendiente de clientes, ingresos/gastos del mes, ganancia estimada) que
// no todos los roles deberían ver de un vistazo.
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getSummary() {
        return this.dashboardService.getSummary();
    }
    getOrdersByStatus() {
        return this.dashboardService.getOrdersByStatus();
    }
    getRepairsByMonth(months) {
        return this.dashboardService.getRepairsByMonth(months ? Number(months) : 6);
    }
    getRevenueByMonth(months) {
        return this.dashboardService.getRevenueByMonth(months ? Number(months) : 6);
    }
    getTopBrands(limit) {
        return this.dashboardService.getTopBrands(limit ? Number(limit) : 10);
    }
    getCommonIssues(limit) {
        return this.dashboardService.getCommonIssues(limit ? Number(limit) : 10);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)("summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)("charts/orders-by-status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getOrdersByStatus", null);
__decorate([
    (0, common_1.Get)("charts/repairs-by-month"),
    __param(0, (0, common_1.Query)("months")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getRepairsByMonth", null);
__decorate([
    (0, common_1.Get)("charts/revenue-by-month"),
    __param(0, (0, common_1.Query)("months")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getRevenueByMonth", null);
__decorate([
    (0, common_1.Get)("charts/top-brands"),
    __param(0, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getTopBrands", null);
__decorate([
    (0, common_1.Get)("charts/common-issues"),
    __param(0, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getCommonIssues", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)("dashboard"),
    (0, roles_decorator_1.Roles)("Administrador", "Gerente"),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
