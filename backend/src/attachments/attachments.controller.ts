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
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";
import { photoUploadOptions } from "./multer.config";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller()
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post("repair-orders/:orderId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  uploadForOrder(
    @Param("orderId", ParseIntPipe) orderId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.attachmentsService.uploadForOrder(orderId, files, dto, actingUser.id);
  }

  @Get("repair-orders/:orderId/photos")
  findGeneralPhotos(@Param("orderId", ParseIntPipe) orderId: number) {
    return this.attachmentsService.findGeneralPhotosForOrder(orderId);
  }

  @Post("repair-orders/:orderId/logs/:logId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  uploadForLog(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("logId", ParseIntPipe) logId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.attachmentsService.uploadForLog(orderId, logId, files, dto, actingUser.id);
  }

  @Post("repair-orders/:orderId/diagnostics/:diagnosticId/photos")
  @UseInterceptors(FilesInterceptor("files", 10, photoUploadOptions))
  uploadForDiagnostic(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("diagnosticId", ParseIntPipe) diagnosticId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.attachmentsService.uploadForDiagnostic(orderId, diagnosticId, files, dto, actingUser.id);
  }

  @Delete("attachments/:id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.attachmentsService.remove(id, actingUser.id);
  }
}
