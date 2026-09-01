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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../../prisma/prisma.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(config, prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get("JWT_SECRET") ?? "",
        });
        this.prisma = prisma;
    }
    /**
     * Se ejecuta en cada request autenticada. Vuelve a consultar el usuario
     * (en vez de confiar ciegamente en lo que dice el token) para que un
     * usuario desactivado pierda acceso de inmediato, sin esperar a que
     * expire el token.
     *
     * El chequeo de `payload.type === "customer"` es defensa en profundidad:
     * los tokens del portal de clientes (customer-portal/) se firman con el
     * mismo JWT_SECRET por simplicidad, pero tienen una forma distinta
     * (`{ sub, type: "customer" }`). Sin este chequeo, un token de cliente
     * técnicamente válido podría colarse en cualquier endpoint del personal
     * que no tenga un @Roles específico (ej. catálogos de solo lectura).
     */
    async validate(payload) {
        if (payload.type === "customer") {
            throw new common_1.UnauthorizedException("Token de portal de clientes no válido aquí");
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true },
        });
        if (!user || user.status !== "ACTIVE") {
            throw new common_1.UnauthorizedException("Usuario inválido o inactivo");
        }
        return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            roleId: user.roleId,
            roleName: user.role.name,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
