import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateSupplierDto, actingUserId: number) {
    const supplier = await this.prisma.supplier.create({ data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier.id,
      newValue: { name: supplier.name },
    });

    return supplier;
  }

  findAll(search?: string) {
    return this.prisma.supplier.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        // Historial de compras (sección 14: "Historial de compras, Saldo
        // pendiente") — el saldo pendiente se calcula a partir de estas,
        // no se almacena por separado.
        purchases: { orderBy: { date: "desc" }, take: 20 },
      },
    });
    if (!supplier) {
      throw new NotFoundException("Proveedor no encontrado");
    }
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto, actingUserId: number) {
    await this.findOne(id);

    const supplier = await this.prisma.supplier.update({ where: { id }, data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Supplier",
      entityId: id,
      newValue: dto,
    });

    return supplier;
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "Supplier",
      entityId: id,
    });

    return supplier;
  }
}
