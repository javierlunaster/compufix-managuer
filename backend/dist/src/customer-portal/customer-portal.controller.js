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
exports.CustomerPortalController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_1 = require("../common/decorators/public.decorator");
const customer_portal_service_1 = require("./customer-portal.service");
const customer_portal_login_dto_1 = require("./dto/customer-portal-login.dto");
const customer_jwt_auth_guard_1 = require("./customer-jwt-auth.guard");
const current_customer_decorator_1 = require("./current-customer.decorator");
/**
 * @Public() a nivel de todo el controlador: así el guard GLOBAL del
 * personal (JwtAuthGuard, registrado en AppModule) ignora por completo
 * este controlador — nunca hay riesgo de que interfiera. La protección
 * real de las rutas que sí la necesitan viene de @UseGuards(CustomerJwtAuthGuard)
 * puesto explícitamente en cada una.
 */
let CustomerPortalController = class CustomerPortalController {
    constructor(customerPortalService) {
        this.customerPortalService = customerPortalService;
    }
    // El documento como contraseña es adivinable con suficientes intentos
    // — limitar los intentos por IP es la única barrera real disponible
    // dado ese diseño. Mismo patrón que ya usa el login del personal
    // (Fase 14).
    login(dto) {
        return this.customerPortalService.login(dto);
    }
    findMyOrders(customer) {
        return this.customerPortalService.findMyOrders(customer.id);
    }
    findMyOrderDetail(customer, orderId) {
        return this.customerPortalService.findMyOrderDetail(customer.id, orderId);
    }
    findMyQuotations(customer) {
        return this.customerPortalService.findMyQuotations(customer.id);
    }
    findMyQuotationDetail(customer, quotationId) {
        return this.customerPortalService.findMyQuotationDetail(customer.id, quotationId);
    }
    approveMyQuotation(customer, quotationId) {
        return this.customerPortalService.approveMyQuotation(customer.id, quotationId);
    }
    rejectMyQuotation(customer, quotationId) {
        return this.customerPortalService.rejectMyQuotation(customer.id, quotationId);
    }
};
exports.CustomerPortalController = CustomerPortalController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_portal_login_dto_1.CustomerPortalLoginDto]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Get)("my-orders"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "findMyOrders", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Get)("my-orders/:id"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "findMyOrderDetail", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Get)("my-quotations"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "findMyQuotations", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Get)("my-quotations/:id"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "findMyQuotationDetail", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Post)("my-quotations/:id/approve"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "approveMyQuotation", null);
__decorate([
    (0, common_1.UseGuards)(customer_jwt_auth_guard_1.CustomerJwtAuthGuard),
    (0, common_1.Post)("my-quotations/:id/reject"),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CustomerPortalController.prototype, "rejectMyQuotation", null);
exports.CustomerPortalController = CustomerPortalController = __decorate([
    (0, common_1.Controller)("customer-portal"),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [customer_portal_service_1.CustomerPortalService])
], CustomerPortalController);
