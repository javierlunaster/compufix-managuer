import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportService } from "./import.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — de sobra para este Excel

/**
 * Restringido a Administrador: importar el histórico es una operación
 * excepcional (se hace una vez, no en el día a día) con capacidad de
 * crear cientos de clientes/equipos/órdenes de golpe — no es algo que
 * cualquier rol deba poder disparar por accidente.
 */
@Controller("import/excel")
@Roles("Administrador")
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post("preview")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async preview(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Sube el archivo Excel en el campo 'file' (multipart/form-data)");
    }
    return this.importService.preview(file.buffer);
  }

  @Post("commit/:importId")
  async commit(
    @Param("importId") importId: string,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.importService.commit(importId, actingUser.id);
  }
}
