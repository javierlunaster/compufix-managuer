import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { CashMovementType } from "@prisma/client";

export class CreateCashMovementDto {
  @IsEnum(CashMovementType, { message: "El tipo debe ser INCOME o EXPENSE" })
  type: CashMovementType;

  // Texto libre a propósito: el brief (sección 19) da categorías de
  // ejemplo (Reparaciones, Ventas, Servicios, Abonos, Compras, Gastos,
  // Envíos, Devoluciones, Otros) pero no las convierte en un catálogo
  // cerrado — igual que en el Excel original.
  @IsString()
  @IsNotEmpty({ message: "La categoría es obligatoria" })
  category: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
