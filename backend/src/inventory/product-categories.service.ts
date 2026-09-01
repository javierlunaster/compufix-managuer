import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";

@Injectable()
export class ProductCategoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateProductCategoryDto, actingUserId: number) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException("Ya existe una categoría con ese nombre");
    }

    const category = await this.prisma.productCategory.create({ data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "ProductCategory",
      entityId: category.id,
      newValue: { name: category.name },
    });

    return category;
  }

  findAll() {
    return this.prisma.productCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  async deactivate(id: number, actingUserId: number) {
    const category = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException("Categoría no encontrada");
    }

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "ProductCategory",
      entityId: id,
    });

    return updated;
  }
}
