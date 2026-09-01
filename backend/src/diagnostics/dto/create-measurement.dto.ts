import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Un punto de medición libre — ej. ACDET, ACOK, PLTRST, "Consumo S0"...
 * No hay valores esperados predefinidos por el sistema (sección 8 del
 * brief: "Los valores esperados deben ser configurables y depender del
 * circuito/modelo"), así que `expectedValue` también es texto libre que
 * el técnico ingresa según la placa que esté revisando.
 */
export class CreateMeasurementDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre del punto de medición es obligatorio" })
  pointName: string;

  @IsOptional()
  @IsString()
  expectedValue?: string;

  @IsOptional()
  @IsString()
  measuredValue?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
