import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { BusinessSettingsModule } from "../business-settings/business-settings.module";

// @Global: igual que StorageModule — varios módulos sin relación entre sí
// (repair-orders, quotations, y potencialmente más adelante warranties o
// payments) necesitan mandar una notificación puntual, sin que cada uno
// tenga que declarar la importación.
@Global()
@Module({
  imports: [BusinessSettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
