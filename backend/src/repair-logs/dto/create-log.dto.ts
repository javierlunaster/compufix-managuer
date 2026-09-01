import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateLogDto {
  // Opcional: por defecto, el técnico es quien está autenticado.
  @IsOptional()
  @IsInt()
  technicianId?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  procedure?: string;

  @IsOptional()
  @IsString()
  measurement?: string;

  @IsOptional()
  @IsString()
  component?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
