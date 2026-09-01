import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateInventoryMovementDto } from "./dto/create-inventory-movement.dto";

// Subconjunto mínimo de PrismaService/Prisma.TransactionClient que necesita
// applyMovement — permite recibir indistintamente `this.prisma` (fuera de
// una transacción) o el `tx` que entrega `$transaction(async (tx) => ...)`,
// para poder componer este método dentro de transacciones más grandes (ver
// repair-parts/repair-parts.service.ts).
type PrismaTxClient = Pick<PrismaService, "product" | "inventoryMovement">;

@Injectable()
export class InventoryMovementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * El único lugar del sistema donde `Product.stock` se escribe (Regla 2
   * del brief: el inventario nunca se edita directo, solo por movimientos).
   * Valida que el stock resultante nunca quede negativo.
   */
  async applyMovement(
    tx: PrismaTxClient,
    params: {
      productId: number;
      type: InventoryMovementType;
      quantity: number;
      unitCost?: number;
      repairOrderId?: number;
      purchaseId?: number;
      saleId?: number;
      userId: number;
      notes?: string;
    },
  ) {
    const product = await tx.product.findUnique({ where: { id: params.productId } });
    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    const newStock = product.stock + params.quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente para "${product.description}" (disponible: ${product.stock}, se intentó descontar: ${Math.abs(params.quantity)})`,
      );
    }

    const movement = await tx.inventoryMovement.create({
      data: {
        productId: params.productId,
        type: params.type,
        quantity: params.quantity,
        unitCost: params.unitCost,
        repairOrderId: params.repairOrderId,
        purchaseId: params.purchaseId,
        saleId: params.saleId,
        userId: params.userId,
        notes: params.notes,
      },
    });

    await tx.product.update({
      where: { id: params.productId },
      data: { stock: newStock },
    });

    return movement;
  }

  async createManual(dto: CreateInventoryMovementDto, actingUserId: number) {
    const movement = await this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        userId: actingUserId,
        notes: dto.notes,
      }),
    );

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "InventoryMovement",
      entityId: movement.id,
      newValue: { productId: dto.productId, type: dto.type, quantity: dto.quantity },
    });

    return movement;
  }

  findAllForProduct(productId: number) {
    return this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
