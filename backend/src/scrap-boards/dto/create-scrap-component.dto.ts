import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateScrapComponentDto {
  // Designador de serigrafía ("cirgrafía") impreso junto al componente en
  // la placa — ej. "U4", "Q12", "IC3".
  @IsString()
  @IsNotEmpty({ message: "Indica el designador de serigrafía (ej. U4, Q12)" })
  designator: string;

  // Referencia/marcación real del componente — ej. "BQ24780S".
  @IsString()
  @IsNotEmpty({ message: "Indica la referencia del componente" })
  reference: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
