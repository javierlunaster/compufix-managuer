import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";

// @Global: igual que StorageModule — varios módulos sin relación entre sí
// (repair-orders, quotations, y potencialmente más adelante warranties o
// payments) necesitan mandar una notificación puntual, sin que cada uno
// tenga que declarar la importación.
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
