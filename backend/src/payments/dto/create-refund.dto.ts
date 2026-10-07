import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreateRefundDto {
  @IsInt()
  repairOrderId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod, { message: "Método de pago inválido" })
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
