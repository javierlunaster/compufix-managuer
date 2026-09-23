import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { CashModule } from "../cash/cash.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [InventoryModule, CashModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
