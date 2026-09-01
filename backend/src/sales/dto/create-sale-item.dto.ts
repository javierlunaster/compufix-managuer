import { IsInt, IsNumber, IsOptional, Min } from "class-validator";

export class CreateSaleItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  // Si no se envía, se usa Product.salePrice — el vendedor puede ajustarlo
  // caso a caso (ej. un descuento puntual en mostrador).
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}
