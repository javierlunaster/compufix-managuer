import { IsInt, IsNumber, IsOptional, Min } from "class-validator";

export class CreateRepairPartDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  /**
   * Precio cobrado al cliente por este repuesto. Si no se envía, se usa
   * `Product.salePrice` como valor por defecto (el técnico puede ajustarlo
   * caso a caso, ej. un descuento puntual).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
