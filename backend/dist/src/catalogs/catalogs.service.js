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
exports.CatalogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
/**
 * Solo lectura por ahora, igual que RolesService: estos catálogos ya se
 * cargaron en el seed de la Fase 1 (marcas y tipos de equipo normalizados
 * de las variantes detectadas en el Excel). Crear/editar catálogos nuevos
 * queda para el módulo de Configuración.
 */
let CatalogsService = class CatalogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAllBrands() {
        return this.prisma.brand.findMany({
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
        });
    }
    findAllDeviceTypes() {
        return this.prisma.deviceType.findMany({
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
        });
    }
    /**
     * Lista de técnicos para el selector de "asignar técnico" en una orden
     * de reparación (sección 6 del brief). Se agregó aquí, no en
     * `UsersController` (restringido a Administrador desde la Fase 2),
     * porque Recepción y los propios técnicos también necesitan poder
     * asignar una reparación sin tener permiso para administrar usuarios —
     * mismo criterio que brands/deviceTypes: solo los campos necesarios
     * para poblar un desplegable, nunca username/documento/rol completo.
     */
    findTechnicians() {
        return this.prisma.user.findMany({
            where: { status: "ACTIVE", role: { name: "Técnico" } },
            select: { id: true, fullName: true },
            orderBy: { fullName: "asc" },
        });
    }
    /**
     * Sugerencias de modelo para el formulario de equipo — no un catálogo
     * cerrado como marcas/tipos, sino texto libre ya usado antes (los
     * modelos se repiten mucho: "E14 GEN 3", "Ideapad 330", etc.). Filtrar
     * por marca cuando se conoce reduce el ruido — no tiene sentido
     * sugerir modelos de HP al escribir un equipo Lenovo.
     */
    async findDeviceModels(brandId, deviceTypeId) {
        const devices = await this.prisma.device.findMany({
            where: {
                model: { not: null },
                ...(brandId ? { brandId } : {}),
                ...(deviceTypeId ? { deviceTypeId } : {}),
            },
            select: { model: true },
            distinct: ["model"],
            orderBy: { model: "asc" },
            take: 50,
        });
        return devices.map((d) => d.model).filter((m) => !!m && m.trim().length > 0);
    }
};
exports.CatalogsService = CatalogsService;
exports.CatalogsService = CatalogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogsService);
