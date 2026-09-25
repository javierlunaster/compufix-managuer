import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { CashModule } from "../cash/cash.module";
import { PurchasesController } from "./purchases.controller";
import { PurchasesService } from "./purchases.service";

@Module({
  imports: [InventoryModule, CashModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
