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
exports.RepairOrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const encryption_util_1 = require("../common/utils/encryption.util");
const normalize_name_util_1 = require("../common/utils/normalize-name.util");
// Incluye estándar para el "expediente técnico" (sección 30 del brief).
// Deliberadamente NO selecciona devicePasswordEncrypted: esa contraseña
// solo se expone por el endpoint dedicado y restringido por rol.
const ORDER_DETAIL_INCLUDE = {
    customer: true,
    technician: {
        select: { id: true, fullName: true, specialty: true },
    },
    device: { include: { deviceType: true, brand: true } },
    statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { user: { select: { id: true, fullName: true } } },
    },
    procedures: { orderBy: { performedAt: "desc" } },
    diagnostics: {
        orderBy: { createdAt: "desc" },
        include: {
            measurements: true,
            technician: { select: { id: true, fullName: true } },
            photos: { orderBy: { uploadedAt: "asc" } },
        },
    },
    logs: {
        orderBy: { date: "asc" },
        include: {
            technician: { select: { id: true, fullName: true } },
            photos: { orderBy: { uploadedAt: "asc" } },
        },
    },
    partsUsed: {
        include: { product: { select: { id: true, sku: true, description: true } } },
    },
    servicesUsed: {
        include: { service: { select: { id: true, code: true, name: true } } },
    },
    quotations: {
        select: { id: true, quotationNumber: true, status: true, total: true },
    },
    payments: {
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { date: "desc" },
    },
    warranties: { orderBy: { deliveryDate: "desc" } },
    photos: {
        where: { repairLogId: null },
        orderBy: { uploadedAt: "desc" },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
    },
};
function withBalance(order) {
    const balance = order.totalValue.minus(order.paidAmount);
    return { ...order, balance };
}
let RepairOrdersService = class RepairOrdersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actingUserId) {
        if (!dto.deviceId && !dto.newDevice) {
            throw new common_1.BadRequestException("Debes indicar un equipo existente (deviceId) o los datos de un equipo nuevo (newDevice)");
        }
        if (dto.deviceId && dto.newDevice) {
            throw new common_1.BadRequestException("Envía solo uno: deviceId (equipo ya registrado) o newDevice (equipo nuevo), no ambos");
        }
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException("El cliente indicado no existe");
        }
        if (dto.deviceId) {
            const device = await this.prisma.device.findUnique({
                where: { id: dto.deviceId },
            });
            if (!device) {
                throw new common_1.NotFoundException("El equipo indicado no existe");
            }
            if (device.customerId !== dto.customerId) {
                throw new common_1.BadRequestException("El equipo indicado no pertenece a este cliente");
            }
        }
        const order = await this.prisma.$transaction(async (tx) => {
            let deviceId = dto.deviceId;
            if (dto.newDevice) {
                const newDevice = await tx.device.create({
                    data: { ...dto.newDevice, customerId: dto.customerId },
                });
                deviceId = newDevice.id;
            }
            // orderCode depende del id autogenerado, así que se crea primero con
            // un valor temporal único y se corrige en la misma transacción.
            const created = await tx.repairOrder.create({
                data: {
                    orderCode: `TEMP-${Date.now()}`,
                    customerId: dto.customerId,
                    deviceId: deviceId,
                    technicianId: dto.technicianId,
                    chargerReceived: dto.chargerReceived ?? false,
                    batteryReceived: dto.batteryReceived ?? false,
                    keyboardReceived: dto.keyboardReceived ?? false,
                    mouseReceived: dto.mouseReceived ?? false,
                    physicalCondition: dto.physicalCondition,
                    accessoriesNotes: dto.accessoriesNotes,
                    devicePasswordEncrypted: dto.devicePassword
                        ? (0, encryption_util_1.encryptSecret)(dto.devicePassword)
                        : undefined,
                    entryReason: dto.entryReason,
                    reportedIssue: dto.reportedIssue,
                    notes: dto.notes,
                    status: client_1.RepairStatus.RECEIVED,
                },
            });
            // Código visible al cliente, ej. "C11061" — 'C' + id, consistente con
            // el formato ya usado en el histórico del Excel (ver Fase 1).
            const withCode = await tx.repairOrder.update({
                where: { id: created.id },
                data: { orderCode: `C${created.id}` },
            });
            await tx.repairStatusHistory.create({
                data: {
                    repairOrderId: created.id,
                    previousStatus: null,
                    newStatus: client_1.RepairStatus.RECEIVED,
                    userId: actingUserId,
                    notes: "Ingreso inicial del equipo",
                },
            });
            return withCode;
        });
        await this.audit.log({
            userId: actingUserId,
            action: "CREATE",
            entityType: "RepairOrder",
            entityId: order.id,
            newValue: { orderCode: order.orderCode, customerId: order.customerId },
        });
        return this.findOne(order.id);
    }
    /**
     * Búsqueda / listado. `search` cubre el caso de uso más común de la
     * sección 25 (búsqueda global) para esta fase: encontrar una orden por su
     * código, por el nombre del cliente o por el serial del equipo. El resto
     * de la búsqueda global (repuestos, pagos, cotizaciones...) se completa
     * en fases posteriores cuando esos módulos existan.
     */
    async findAll(params) {
        const where = { recordStatus: "ACTIVE" };
        if (params.status) {
            where.status = params.status;
        }
        if (params.technicianId) {
            where.technicianId = params.technicianId;
        }
        if (params.search) {
            const raw = params.search.trim();
            const codeGuess = raw.toUpperCase().startsWith("C") ? raw.toUpperCase() : `C${raw}`;
            const normalizedTerm = (0, normalize_name_util_1.normalizeName)(raw);
            where.OR = [
                { orderCode: { equals: codeGuess } },
                { orderCode: { contains: raw, mode: "insensitive" } },
                { customer: { normalizedName: { contains: normalizedTerm } } },
                { device: { serialNumber: { contains: raw, mode: "insensitive" } } },
            ];
        }
        return this.prisma.repairOrder.findMany({
            where,
            include: {
                customer: { select: { id: true, fullName: true, phone: true } },
                device: { select: { id: true, model: true, serialNumber: true } },
                technician: { select: { id: true, fullName: true } },
            },
            orderBy: { entryDate: "desc" },
            take: 100,
        });
    }
    async findOne(id) {
        const order = await this.prisma.repairOrder.findUnique({
            where: { id },
            include: ORDER_DETAIL_INCLUDE,
        });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return withBalance(order);
    }
    async findByCode(orderCode) {
        const normalized = orderCode.toUpperCase().startsWith("C")
            ? orderCode.toUpperCase()
            : `C${orderCode}`;
        const order = await this.prisma.repairOrder.findUnique({
            where: { orderCode: normalized },
            include: ORDER_DETAIL_INCLUDE,
        });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return withBalance(order);
    }
    async update(id, dto, actingUserId) {
        await this.ensureExists(id);
        const order = await this.prisma.repairOrder.update({
            where: { id },
            data: {
                ...dto,
                deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
            },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "UPDATE",
            entityType: "RepairOrder",
            entityId: id,
            newValue: dto,
        });
        return this.findOne(order.id);
    }
    /**
     * Cambia el estado y deja constancia en RepairStatusHistory (estado
     * anterior, estado nuevo, fecha, usuario, observación — sección 7 del
     * brief). No se valida una máquina de estados estricta en esta fase (el
     * MVP definido en la Fase 1 prioriza flexibilidad); si más adelante el
     * negocio pide restringir transiciones inválidas, se agrega aquí.
     */
    async updateStatus(id, dto, actingUserId) {
        const current = await this.ensureExists(id);
        const [order] = await this.prisma.$transaction([
            this.prisma.repairOrder.update({
                where: { id },
                data: { status: dto.newStatus },
            }),
            this.prisma.repairStatusHistory.create({
                data: {
                    repairOrderId: id,
                    previousStatus: current.status,
                    newStatus: dto.newStatus,
                    userId: actingUserId,
                    notes: dto.notes,
                },
            }),
        ]);
        await this.audit.log({
            userId: actingUserId,
            action: "STATUS_CHANGE",
            entityType: "RepairOrder",
            entityId: id,
            previousValue: { status: current.status },
            newValue: { status: order.status },
        });
        return this.findOne(id);
    }
    async assignTechnician(id, dto, actingUserId) {
        await this.ensureExists(id);
        const technician = await this.prisma.user.findUnique({
            where: { id: dto.technicianId },
        });
        if (!technician || technician.status !== "ACTIVE") {
            throw new common_1.NotFoundException("El técnico indicado no existe o está inactivo");
        }
        await this.prisma.repairOrder.update({
            where: { id },
            data: { technicianId: dto.technicianId },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "ASSIGN_TECHNICIAN",
            entityType: "RepairOrder",
            entityId: id,
            newValue: { technicianId: dto.technicianId },
        });
        return this.findOne(id);
    }
    async addProcedure(id, dto, actingUserId) {
        await this.ensureExists(id);
        const procedure = await this.prisma.repairProcedure.create({
            data: { repairOrderId: id, description: dto.description },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "ADD_PROCEDURE",
            entityType: "RepairOrder",
            entityId: id,
            newValue: { description: dto.description },
        });
        return procedure;
    }
    /**
     * Revela la contraseña del equipo en texto plano — SOLO para roles
     * autorizados (ver @Roles() en el controller) y queda auditado el acceso,
     * no solo la escritura, porque leer un dato sensible también es una
     * operación que debe dejar rastro (sección 26/32 del brief).
     */
    async revealDevicePassword(id, actingUserId) {
        const order = await this.prisma.repairOrder.findUnique({
            where: { id },
            select: { devicePasswordEncrypted: true },
        });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        if (!order.devicePasswordEncrypted) {
            return { password: null };
        }
        await this.audit.log({
            userId: actingUserId,
            action: "REVEAL_DEVICE_PASSWORD",
            entityType: "RepairOrder",
            entityId: id,
        });
        return { password: (0, encryption_util_1.decryptSecret)(order.devicePasswordEncrypted) };
    }
    /**
     * Purga la contraseña una vez entregado el equipo — mecanismo explícito
     * pedido en la sección 32 del brief, no solo cifrado sino también
     * eliminación cuando ya no hace falta.
     */
    async purgeDevicePassword(id, actingUserId) {
        await this.ensureExists(id);
        await this.prisma.repairOrder.update({
            where: { id },
            data: { devicePasswordEncrypted: null },
        });
        await this.audit.log({
            userId: actingUserId,
            action: "PURGE_DEVICE_PASSWORD",
            entityType: "RepairOrder",
            entityId: id,
        });
        return { message: "Contraseña del equipo eliminada" };
    }
    async ensureExists(id) {
        const order = await this.prisma.repairOrder.findUnique({ where: { id } });
        if (!order) {
            throw new common_1.NotFoundException("Orden de reparación no encontrada");
        }
        return order;
    }
};
exports.RepairOrdersService = RepairOrdersService;
exports.RepairOrdersService = RepairOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RepairOrdersService);
