import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { QuotationItemType } from "@prisma/client";

export class CreateQuotationItemDto {
  @IsEnum(QuotationItemType, { message: "Tipo de ítem inválido" })
  type: QuotationItemType;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsInt()
  serviceId?: number;

  @IsString()
  @IsNotEmpty({ message: "La descripción del ítem es obligatoria" })
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
