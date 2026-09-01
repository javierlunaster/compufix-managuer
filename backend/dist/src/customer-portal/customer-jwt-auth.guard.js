"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerJwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
/**
 * A diferencia de JwtAuthGuard (del personal), este NO está registrado
 * globalmente — se aplica explícitamente solo en las rutas del portal de
 * clientes que lo necesitan (@UseGuards(CustomerJwtAuthGuard)). El
 * controlador completo se marca @Public() para que el guard global del
 * personal lo ignore, y este guard es el único que realmente protege
 * estas rutas.
 */
let CustomerJwtAuthGuard = class CustomerJwtAuthGuard extends (0, passport_1.AuthGuard)("customer-jwt") {
};
exports.CustomerJwtAuthGuard = CustomerJwtAuthGuard;
exports.CustomerJwtAuthGuard = CustomerJwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], CustomerJwtAuthGuard);
