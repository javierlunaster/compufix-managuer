import { Module } from "@nestjs/common";
import { RepairOrdersModule } from "../repair-orders/repair-orders.module";
import { WarrantiesModule } from "../warranties/warranties.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  // RepairOrdersModule: reutiliza RepairOrdersService.findOne() para no
  // duplicar la consulta del expediente técnico completo, y
  // assertTechnicianAccess() para restringir la descarga a lo asignado.
  // WarrantiesModule: resolver a qué orden pertenece un certificado de
  // garantía antes de generarlo.
  imports: [RepairOrdersModule, WarrantiesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
