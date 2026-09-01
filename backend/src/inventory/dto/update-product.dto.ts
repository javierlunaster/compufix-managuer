import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateProductDto } from "./create-product.dto";

/**
 * Se excluye `initialStock`: una vez creado el producto, cualquier cambio
 * de existencias pasa por un InventoryMovement explícito (endpoint de
 * movimientos), nunca por una edición general del producto.
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ["initialStock"] as const),
) {}
