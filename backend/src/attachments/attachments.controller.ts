import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { AttachmentsService } from "./attachments.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";
import { photoUploadOptions } from "./multer.config";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller()
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post("repair-orders/:orderId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  async uploadForOrder(
    @Param("orderId", ParseIntPipe) orderId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.attachmentsService.uploadForOrder(orderId, files, dto, actingUser.id);
  }

  @Get("repair-orders/:orderId/photos")
  async findGeneralPhotos(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.attachmentsService.findGeneralPhotosForOrder(orderId);
  }

  @Post("repair-orders/:orderId/logs/:logId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  async uploadForLog(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("logId", ParseIntPipe) logId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.attachmentsService.uploadForLog(orderId, logId, files, dto, actingUser.id);
  }

  @Post("repair-orders/:orderId/diagnostics/:diagnosticId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  async uploadForDiagnostic(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("diagnosticId", ParseIntPipe) diagnosticId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.attachmentsService.uploadForDiagnostic(orderId, diagnosticId, files, dto, actingUser.id);
  }

  @Delete("attachments/:id")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.attachmentsService.getOrderId(id);
    if (orderId !== null) {
      await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    }
    return this.attachmentsService.remove(id, actingUser.id);
  }
}
