import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { photoUploadOptions } from "../attachments/multer.config";
import { BusinessSettingsService } from "./business-settings.service";
import { UpdateBusinessSettingsDto } from "./dto/update-business-settings.dto";

/**
 * GET es @Public(): lo necesitan el login, el portal del cliente, el
 * catálogo público y la página de inicio — ninguno tiene sesión de
 * personal todavía cuando cargan. Escribir (PATCH/logo) sí requiere ser
 * Administrador, igual que el resto de catálogos de configuración.
 */
@Controller("business-settings")
export class BusinessSettingsController {
  constructor(private businessSettingsService: BusinessSettingsService) {}

  @Get()
  @Public()
  findOne() {
    return this.businessSettingsService.getOrCreate();
  }

  @Patch()
  @Roles("Administrador")
  update(
    @Body() dto: UpdateBusinessSettingsDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.businessSettingsService.update(dto, actingUser.id);
  }

  @Post("logo")
  @Roles("Administrador")
  @UseInterceptors(FileInterceptor("file", photoUploadOptions))
  updateLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.businessSettingsService.updateLogo(file, actingUser.id);
  }
}
