import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @IsInt()
  customerId: number;

  // A lo sumo uno de los dos: un pago puede aplicarse a una orden de
  // reparación, a una venta, o a ninguna (abono general a la cuenta del
  // cliente — Regla 9: "un pago puede aplicarse parcialmente a una orden").
  @IsOptional()
  @IsInt()
  repairOrderId?: number;

  @IsOptional()
  @IsInt()
  saleId?: number;

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
