import { Module } from "@nestjs/common";
import { CashModule } from "../cash/cash.module";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  // RepairOrdersModule: RepairOrdersService.assertTechnicianAccess() — un
  // Técnico solo puede registrar pagos de una orden que le hayan asignado.
  imports: [CashModule, RepairOrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
