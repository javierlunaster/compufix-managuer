import { Global, Module } from "@nestjs/common";
import { StorageService } from "./storage.service";

// @Global: casi cualquier módulo que suba archivos lo necesita
// (attachments hoy, potencialmente exportación de documentos/PDF mañana),
// igual que PrismaModule.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
