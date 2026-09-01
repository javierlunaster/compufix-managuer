import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { InventoryMovementType } from "@prisma/client";

// Tipos que se pueden registrar manualmente desde este endpoint. PURCHASE y
// SALE se generan automáticamente desde los módulos de Compras/Ventas
// (Fase 8) cuando existan; USED_IN_REPAIR se genera desde el módulo de
// repuestos de reparación (ver repair-parts/), no desde aquí.
const MANUAL_MOVEMENT_TYPES = [
  InventoryMovementType.ADJUSTMENT,
  InventoryMovementType.LOSS,
  InventoryMovementType.RETURN,
  InventoryMovementType.TRANSFER,
  InventoryMovementType.WARRANTY_REPLACEMENT,
] as const;

export { MANUAL_MOVEMENT_TYPES };

export class CreateInventoryMovementDto {
  @IsInt()
  productId: number;

  @IsIn(MANUAL_MOVEMENT_TYPES, {
    message: `El tipo debe ser uno de: ${MANUAL_MOVEMENT_TYPES.join(", ")}`,
  })
  type: InventoryMovementType;

  /**
   * Positivo = entra al inventario (ej. ajuste al alza, devolución de un
   * repuesto no usado). Negativo = sale (ej. pérdida, transferencia hacia
   * otra sede). El signo lo decide quien registra el movimiento; el
   * servicio valida que el stock resultante nunca quede negativo.
   */
  @IsInt()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsString()
  @IsNotEmpty({ message: "La observación es obligatoria en un movimiento manual" })
  notes: string;
}
