import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// Campos seguros para una vitrina pública sin login — nunca cost, location,
// minStock, internalCode ni supplierRefs (eso es información interna del
// taller, nunca se expone fuera de la sesión autenticada del personal).
// `inStock` es un booleano a propósito, no la cantidad exacta: no hace
// falta que cualquiera con el link sepa cuánto inventario real manejan.
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  sku: true,
  description: true,
  salePrice: true,
  stock: true,
  warrantyMonths: true,
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  photos: { select: { id: true, fileUrl: true }, orderBy: { uploadedAt: "asc" as const } },
} satisfies Prisma.ProductSelect;

function toPublicProduct<T extends { stock: number }>({ stock, ...rest }: T) {
  return { ...rest, inStock: stock > 0 };
}

@Injectable()
export class PublicCatalogService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    categoryId?: number;
    brandId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.brandId) {
      where.brandId = params.brandId;
    }
    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: "insensitive" } },
        { sku: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 24;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy: { description: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: data.map(toPublicProduct), total, page, pageSize };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: "ACTIVE" },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }
    return toPublicProduct(product);
  }

  /**
   * Para los filtros del catálogo — solo categorías/marcas que de verdad
   * tienen al menos un producto activo, para no mostrar un filtro que
   * siempre devuelve "sin resultados".
   */
  async findFilters() {
    const [categories, brands] = await Promise.all([
      this.prisma.productCategory.findMany({
        where: { status: "ACTIVE", products: { some: { status: "ACTIVE" } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.brand.findMany({
        where: { status: "ACTIVE", products: { some: { status: "ACTIVE" } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { categories, brands };
  }
}
