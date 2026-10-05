import { Module } from "@nestjs/common";
import { BusinessSettingsController } from "./business-settings.controller";
import { BusinessSettingsService } from "./business-settings.service";

@Module({
  controllers: [BusinessSettingsController],
  providers: [BusinessSettingsService],
  // Se exporta para que DocumentsModule y MailModule puedan leer el
  // nombre/lema del negocio al generar PDFs y correos.
  exports: [BusinessSettingsService],
})
export class BusinessSettingsModule {}
