import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class AdjustOrderTotalDto {
  // Siempre un descuento (ver RepairOrdersService.adjustTotal) — cuánto
  // restar de totalValue, nunca cuánto sumar.
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty({ message: "Indica el motivo del ajuste" })
  reason: string;
}
