import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/client";

// Solo los campos que de verdad se corrigen cuando alguien se equivocó al
// registrar un abono — nunca customerId/repairOrderId/saleId, eso sería
// reasignar el pago a otra cuenta/orden, no corregir un valor (ver
// PaymentsService.update).
export class UpdatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod, { message: "Método de pago inválido" })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
