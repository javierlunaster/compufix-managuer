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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../prisma/prisma.service");
/**
 * Estrategia separada de la del personal (JwtStrategy) — nombre distinto
 * ("customer-jwt" vs "jwt") a propósito, para que Passport nunca las
 * confunda entre sí sin importar qué guard se use. Comparte el mismo
 * JWT_SECRET por simplicidad (no hace falta una segunda variable de
 * entorno), pero exige que el payload tenga `type: "customer"` — un
 * token del personal, aunque esté firmado con el mismo secreto, no tiene
 * esa forma y esta estrategia lo rechaza.
 */
let CustomerJwtStrategy = class CustomerJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, "customer-jwt") {
    constructor(config, prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get("JWT_SECRET") ?? "",
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        if (payload.type !== "customer") {
            throw new common_1.UnauthorizedException("Token no válido para el portal de clientes");
        }
        const customer = await this.prisma.customer.findUnique({
            where: { id: payload.sub },
        });
        // Se vuelve a consultar el cliente en cada request (igual que hace
        // JwtStrategy con el personal) para que desactivar un cliente le
        // corte el acceso al portal de inmediato, sin esperar a que expire
        // el token.
        if (!customer || customer.status !== "ACTIVE") {
            throw new common_1.UnauthorizedException("Cliente inválido o inactivo");
        }
        return { id: customer.id, fullName: customer.fullName };
    }
};
exports.CustomerJwtStrategy = CustomerJwtStrategy;
exports.CustomerJwtStrategy = CustomerJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], CustomerJwtStrategy);
