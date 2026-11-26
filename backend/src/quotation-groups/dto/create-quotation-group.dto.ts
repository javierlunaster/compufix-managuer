import { ArrayMinSize, IsInt, IsOptional, IsString } from "class-validator";

export class CreateQuotationGroupDto {
  @IsInt()
  customerId: number;

  // Al menos 2: con una sola no hay nada que "unificar" — para eso ya
  // está la cotización individual.
  @ArrayMinSize(2, { message: "Un grupo debe tener al menos 2 cotizaciones" })
  @IsInt({ each: true })
  quotationIds: number[];

  @IsOptional()
  @IsString()
  notes?: string;
}
