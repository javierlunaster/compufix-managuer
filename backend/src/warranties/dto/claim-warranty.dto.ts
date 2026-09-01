import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ClaimWarrantyDto {
  @IsString()
  @IsNotEmpty({ message: "Describe la falla por la que vuelve el equipo" })
  reportedIssue: string;

  @IsString()
  @IsNotEmpty({ message: "La observación del reclamo es obligatoria" })
  claimNotes: string;

  // Por defecto es el mismo cliente de la orden original; se permite
  // indicar otro por si alguien más trae el equipo a reclamar (ej. un
  // familiar) sin que eso rompa la trazabilidad del cliente original.
  @IsOptional()
  @IsInt()
  claimingCustomerId?: number;
}
