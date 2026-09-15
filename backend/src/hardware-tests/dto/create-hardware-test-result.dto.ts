import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { HardwareTestCategory, HardwareTestStatus } from "@prisma/client";

/**
 * `testName` es texto libre (igual que DiagnosticMeasurement.pointName):
 * teclado/cámara/sonido siempre guardan un único nombre fijo ("Teclado
 * completo", "Cámara", "Audio"), mientras que disco/periféricos son un
 * checklist de longitud variable (ej. "Puerto USB 1", "WiFi", "Batería")
 * que el técnico puede ampliar sin que el esquema tenga que cambiar.
 */
export class CreateHardwareTestResultDto {
  @IsEnum(HardwareTestCategory)
  category: HardwareTestCategory;

  @IsString()
  @IsNotEmpty({ message: "El nombre de la prueba es obligatorio" })
  testName: string;

  @IsEnum(HardwareTestStatus, { message: "El resultado debe ser PASSED, FAILED o NOT_APPLICABLE" })
  status: HardwareTestStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
