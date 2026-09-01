import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { CreateQuotationItemDto } from "./create-quotation-item.dto";

export class CreateQuotationDto {
  @IsInt()
  customerId: number;

  /**
   * Si la cotización nace del diagnóstico de una orden ya en curso (el
   * flujo típico: Ingresado → Diagnóstico → Cotizando...), se referencia
   * aquí. Es lo que permite convertirla directamente en la reparación
   * (sección 10 del brief) — sin este campo, la cotización queda "suelta"
   * y no se puede convertir automáticamente (ver QuotationsService.convert).
   */
  @IsOptional()
  @IsInt()
  sourceOrderId?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  @ArrayMinSize(1, { message: "La cotización debe tener al menos un ítem" })
  items: CreateQuotationItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
