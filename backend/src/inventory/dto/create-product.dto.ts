import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: "El SKU es obligatorio" })
  sku: string;

  @IsOptional()
  @IsString()
  internalCode?: string;

  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  brandId?: number;

  @IsString()
  @IsNotEmpty({ message: "La descripción es obligatoria" })
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  warrantyMonths?: number;

  /**
   * Cantidad inicial en existencia al momento de registrar el producto
   * (por ejemplo, al migrar el inventario del Excel). Se aplica como un
   * movimiento de tipo ADJUSTMENT dentro de la misma transacción de
   * creación — nunca se escribe `stock` directamente (Regla 2 del brief).
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}
