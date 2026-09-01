import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InventoryMovementsService } from "./inventory-movements.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private movements: InventoryMovementsService,
  ) {}

  async create(dto: CreateProductDto, actingUserId: number) {
    const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existingSku) {
      throw new ConflictException("Ya existe un producto con ese SKU");
    }

    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException("La categoría indicada no existe");
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: dto.sku,
          internalCode: dto.internalCode,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          description: dto.description,
          cost: dto.cost ?? 0,
          salePrice: dto.salePrice ?? 0,
          minStock: dto.minStock ?? 0,
          location: dto.location,
          warrantyMonths: dto.warrantyMonths,
        },
      });

      if (dto.initialStock && dto.initialStock > 0) {
        await this.movements.applyMovement(tx, {
          productId: created.id,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: dto.initialStock,
          unitCost: dto.cost,
          userId: actingUserId,
          notes: "Existencia inicial al registrar el producto",
        });
      }

      return created;
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      newValue: { sku: product.sku, description: product.description },
    });

    return this.findOne(product.id);
  }

  async findAll(params: { search?: string; categoryId?: number; lowStockOnly?: boolean }) {
    const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.search) {
      where.OR = [
        { sku: { contains: params.search, mode: "insensitive" } },
        { internalCode: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy: { description: "asc" },
      take: 200,
    });

    // stock <= minStock: se filtra en memoria porque Prisma no permite
    // comparar dos columnas de la misma tabla directamente en `where` sin
    // una consulta cruda — con un catálogo de este tamaño no hay problema
    // de rendimiento; si el inventario crece mucho, esto se mueve a SQL.
    return params.lowStockOnly
      ? products.filter((p) => p.stock <= p.minStock)
      : products;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        supplierRefs: { include: { supplier: true } },
      },
    });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }
    return product;
  }

  async update(id: number, dto: UpdateProductDto, actingUserId: number) {
    await this.findOne(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "Product",
      entityId: id,
      newValue: dto,
    });

    return this.findOne(product.id);
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "Product",
      entityId: id,
    });

    return product;
  }

  async reactivate(id: number, actingUserId: number) {
    await this.findOne(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "REACTIVATE",
      entityType: "Product",
      entityId: id,
    });

    return product;
  }
}
