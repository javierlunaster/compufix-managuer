import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

@Module({
  // RepairOrdersService.assertTechnicianAccess() — un Técnico solo puede
  // ver/subir/borrar fotos de una orden que le hayan asignado.
  imports: [RepairOrdersModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
