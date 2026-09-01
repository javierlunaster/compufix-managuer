import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateWarrantyDto {
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  // En meses, no una fecha de fin directa: es más natural para quien
  // entrega el equipo pensar "3 meses de garantía en la pantalla" que
  // calcular una fecha exacta a mano.
  @IsInt()
  @Min(1)
  warrantyMonths: number;

  @IsString()
  @IsNotEmpty({ message: "La descripción de cobertura es obligatoria" })
  coverageDescription: string;
}
