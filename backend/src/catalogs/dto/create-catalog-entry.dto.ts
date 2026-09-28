import { IsNotEmpty, IsString } from "class-validator";

// Compartido por marcas y tipos de equipo — ambos catálogos son, en esta
// fase, solo un nombre único (ver Brand/DeviceType en schema.prisma).
export class CreateCatalogEntryDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  name: string;
}
