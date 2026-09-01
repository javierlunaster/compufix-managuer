import { Module } from "@nestjs/common";
import { CashController } from "./cash.controller";
import { CashService } from "./cash.service";

@Module({
  controllers: [CashController],
  providers: [CashService],
  // Se exporta para que PaymentsModule pueda reflejar un abono como
  // ingreso de caja automáticamente, dentro de la misma transacción.
  exports: [CashService],
})
export class CashModule {}
