import { IsHexColor, IsInt, IsOptional, IsString, IsNotEmpty, Min, MaxLength } from "class-validator";

// Todos opcionales a propósito: el formulario de Configuración envía solo
// los campos que la persona editó, no una foto completa del objeto — así
// PATCH se comporta igual que el resto del sistema (update parcial).
export class UpdateBusinessSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "El nombre del negocio no puede quedar vacío" })
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  shortName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  footerLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  footerTagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneDisplay?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneDial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  whatsappMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapsUrlOverride?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeUrl?: string;

  @IsOptional()
  @IsHexColor({ message: "El color de acento debe ser un color hexadecimal (ej. #c2884d)" })
  accentColor?: string;

  @IsOptional()
  @IsHexColor({ message: "El color de acento (resaltado) debe ser un color hexadecimal" })
  accentStrongColor?: string;

  // Identidad que firma la cuenta de cobro de Servicios externos — ver el
  // comentario en schema.prisma. Deliberadamente distinto del nombre de
  // usuario del Administrador.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerFullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ownerDocumentId?: string;

  // Para continuar la numeración en papel que ya traía el taller (ver
  // ServiceJobsService.create) — un ajuste puntual, no algo que se edite
  // seguido.
  @IsOptional()
  @IsInt()
  @Min(1)
  nextServiceJobAccountNumber?: number;
}
