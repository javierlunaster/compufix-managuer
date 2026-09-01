import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreateDiagnosticDto {
  // Opcional: si no se envía, se asume que quien está autenticado es el
  // técnico que realiza el diagnóstico (ver DiagnosticsService.create).
  @IsOptional()
  @IsInt()
  technicianId?: number;

  @IsOptional()
  @IsString()
  boardReference?: string;

  @IsOptional()
  @IsString()
  chargerIc?: string;

  @IsOptional()
  @IsString()
  initialSymptom?: string;

  @IsOptional()
  @IsString()
  componentSuspected?: string;

  @IsOptional()
  @IsString()
  componentReplaced?: string;

  @IsOptional()
  @IsBoolean()
  biosReprogrammed?: boolean;

  @IsOptional()
  @IsBoolean()
  ecReviewed?: boolean;

  @IsOptional()
  @IsBoolean()
  ecReprogrammed?: boolean;

  @IsOptional()
  @IsString()
  proceduresPerformed?: string;

  @IsOptional()
  @IsString()
  result?: string;
}
