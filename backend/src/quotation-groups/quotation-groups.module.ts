import { Module } from "@nestjs/common";
import { QuotationsModule } from "../quotations/quotations.module";
import { QuotationGroupsController } from "./quotation-groups.controller";
import { QuotationGroupsService } from "./quotation-groups.service";

@Module({
  // QuotationsModule exporta QuotationsService — se reutiliza su
  // updateStatus() para aprobar/rechazar cada cotización del grupo.
  imports: [QuotationsModule],
  controllers: [QuotationGroupsController],
  providers: [QuotationGroupsService],
  exports: [QuotationGroupsService],
})
export class QuotationGroupsModule {}
