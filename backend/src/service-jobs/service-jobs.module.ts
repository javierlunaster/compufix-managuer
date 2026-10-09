import { Module } from "@nestjs/common";
import { ServiceJobsController } from "./service-jobs.controller";
import { ServiceJobsService } from "./service-jobs.service";
import { CashModule } from "../cash/cash.module";
import { BusinessSettingsModule } from "../business-settings/business-settings.module";

@Module({
  imports: [CashModule, BusinessSettingsModule],
  controllers: [ServiceJobsController],
  providers: [ServiceJobsService],
  exports: [ServiceJobsService],
})
export class ServiceJobsModule {}
