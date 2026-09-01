import { IsEnum } from "class-validator";
import { PaymentStatus } from "@prisma/client";

export class UpdatePurchasePaymentStatusDto {
  @IsEnum(PaymentStatus, { message: "Estado de pago inválido" })
  paymentStatus: PaymentStatus;
}
