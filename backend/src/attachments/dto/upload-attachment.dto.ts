import { IsOptional, IsString } from "class-validator";

export class UploadAttachmentDto {
  // Texto libre a propósito, igual que las categorías de caja (sección 22
  // del brief da ejemplos: equipo_recibido, daño_fisico, placa, serial,
  // diagnostico, resultado_final...) sin convertirlas en catálogo cerrado.
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
