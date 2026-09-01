import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { normalizeName } from "../common/utils/normalize-name.util";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Antes de crear, busca clientes activos con el mismo nombre normalizado
   * (misma regla usada en el plan de migración del Excel, sección H). Si
   * encuentra coincidencias y el llamador no confirmó explícitamente que
   * quiere crear de todas formas, devuelve 409 con la lista de posibles
   * duplicados para que la interfaz le pregunte al usuario "¿es este mismo
   * cliente?" en vez de crear un registro nuevo silenciosamente.
   */
  async create(dto: CreateCustomerDto, actingUserId: number) {
    const normalizedName = normalizeName(dto.fullName);

    if (!dto.confirmCreateDespiteDuplicate) {
      const possibleDuplicates = await this.prisma.customer.findMany({
        where: { normalizedName, status: "ACTIVE" },
        select: { id: true, fullName: true, phone: true, documentId: true },
      });

      if (possibleDuplicates.length > 0) {
        throw new ConflictException({
          message:
            "Ya existe al menos un cliente con un nombre muy similar. Si es una persona distinta, reenvía la creación con confirmCreateDespiteDuplicate=true.",
          possibleDuplicates,
        });
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        normalizedName,
        customerType: dto.customerType,
        documentId: dto.documentId,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      newValue: { fullName: customer.fullName, phone: customer.phone },
    });

    return customer;
  }

  /**
   * Búsqueda rápida por nombre, teléfono o documento (sección 5 del brief).
   * El nombre se compara contra normalizedName para que sea insensible a
   * mayúsculas y tildes, igual que la lógica de detección de duplicados.
   */
  async search(term?: string) {
    if (!term || term.trim().length === 0) {
      return this.prisma.customer.findMany({
        where: { status: "ACTIVE" },
        orderBy: { fullName: "asc" },
        take: 50,
      });
    }

    const normalizedTerm = normalizeName(term);

    return this.prisma.customer.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { normalizedName: { contains: normalizedTerm } },
          { phone: { contains: term } },
          { whatsapp: { contains: term } },
          { documentId: { contains: term } },
        ],
      },
      orderBy: { fullName: "asc" },
      take: 50,
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        devices: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto, actingUserId: number) {
    const before = await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.fullName) {
      data.normalizedName = normalizeName(dto.fullName);
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Customer",
      entityId: id,
      previousValue: { fullName: before.fullName, phone: before.phone },
      newValue: { fullName: customer.fullName, phone: customer.phone },
    });

    return customer;
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "Customer",
      entityId: id,
    });

    return customer;
  }

  async reactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "REACTIVATE",
      entityType: "Customer",
      entityId: id,
    });

    return customer;
  }
}
