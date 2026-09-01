"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
// Campos seguros para devolver al cliente — nunca se expone passwordHash.
const SAFE_SELECT = {
    id: true,
    fullName: true,
    documentId: true,
    email: true,
    phone: true,
    username: true,
    roleId: true,
    role: { select: { id: true, name: true } },
    specialty: true,
    status: true,
    createdAt: true,
};
let UsersService = class UsersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actingUserId) {
        const existing = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existing) {
            throw new common_1.ConflictException("Ya existe un usuario con ese nombre de usuario");
        }
        const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
        if (!role) {
            throw new common_1.NotFoundException("El rol indicado no existe");
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                fullName: dto.fullName,
                documentId: dto.documentId,
                email: dto.email,
                phone: dto.phone,
                username: dto.username,
                passwordHash,
                roleId: dto.roleId,
                specialty: dto.specialty,
            },
            select: SAFE_SELECT,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "User",
            entityId: user.id,
            newValue: { username: user.username, roleId: user.roleId },
        });
        return user;
    }
    findAll() {
        return this.prisma.user.findMany({
            select: SAFE_SELECT,
            orderBy: { fullName: "asc" },
        });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: SAFE_SELECT,
        });
        if (!user) {
            throw new common_1.NotFoundException("Usuario no encontrado");
        }
        return user;
    }
    async update(id, dto, actingUserId) {
        const before = await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: dto,
            select: SAFE_SELECT,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "User",
            entityId: id,
            previousValue: before,
            newValue: user,
        });
        return user;
    }
    async resetPassword(id, dto, actingUserId) {
        await this.findOne(id); // 404 si no existe
        const passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({ where: { id }, data: { passwordHash } });
        await this.audit.log({
            userId: actingUserId,
            action: "PASSWORD_RESET",
            entityType: "User",
            entityId: id,
        });
        return { message: "Contraseña restablecida correctamente" };
    }
    /**
     * Nunca se borra un usuario físicamente (Regla 1 del brief): se marca
     * INACTIVE. JwtStrategy.validate() ya rechaza tokens de usuarios inactivos
     * en cada request, así que el acceso se corta de inmediato.
     */
    async deactivate(id, actingUserId) {
        const before = await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: { status: "INACTIVE" },
            select: SAFE_SELECT,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "DEACTIVATE",
            entityType: "User",
            entityId: id,
            previousValue: { status: before.status },
            newValue: { status: user.status },
        });
        return user;
    }
    async reactivate(id, actingUserId) {
        const before = await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: { status: "ACTIVE" },
            select: SAFE_SELECT,
        });
        await this.audit.log({
            userId: actingUserId,
            action: "REACTIVATE",
            entityType: "User",
            entityId: id,
            previousValue: { status: before.status },
            newValue: { status: user.status },
        });
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], UsersService);
