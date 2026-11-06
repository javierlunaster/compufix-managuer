import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ScrapBoardsService } from "./scrap-boards.service";
import { CreateScrapBoardDto } from "./dto/create-scrap-board.dto";
import { UpdateScrapBoardDto } from "./dto/update-scrap-board.dto";
import { CreateScrapComponentDto } from "./dto/create-scrap-component.dto";
import { UpdateScrapComponentDto } from "./dto/update-scrap-component.dto";
import { UploadScrapBoardFileDto } from "./dto/upload-scrap-board-file.dto";
import { scrapBoardFileUploadOptions } from "../attachments/multer.config";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Sin @Roles() a propósito: esta es una herramienta técnica de taller
// (buscar/registrar componentes mientras se repara), no un flujo
// financiero — cualquier personal autenticado la usa, igual criterio que
// el resto de la operación diaria de reparaciones.
@Controller()
export class ScrapBoardsController {
  constructor(private scrapBoardsService: ScrapBoardsService) {}

  // La búsqueda global va antes de ":id" para que Nest no intente
  // interpretar "search" como un id de placa.
  @Get("scrap-components/search")
  searchComponents(
    @Query("q") q: string,
    @Query("includeRemoved") includeRemoved?: string,
  ) {
    return this.scrapBoardsService.searchComponents({ q, includeRemoved: includeRemoved === "true" });
  }

  @Post("scrap-boards")
  create(@Body() dto: CreateScrapBoardDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.scrapBoardsService.create(dto, actingUser.id);
  }

  // GET /scrap-boards?search=&brandId=&deviceTypeId=&includeInactive=true
  @Get("scrap-boards")
  findAll(
    @Query("search") search?: string,
    @Query("brandId") brandId?: string,
    @Query("deviceTypeId") deviceTypeId?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.scrapBoardsService.findAll({
      search,
      brandId: brandId ? Number(brandId) : undefined,
      deviceTypeId: deviceTypeId ? Number(deviceTypeId) : undefined,
      includeInactive: includeInactive === "true",
    });
  }

  @Get("scrap-boards/:id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.scrapBoardsService.findOne(id);
  }

  @Patch("scrap-boards/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateScrapBoardDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.update(id, dto, actingUser.id);
  }

  @Patch("scrap-boards/:id/deactivate")
  deactivate(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.scrapBoardsService.deactivate(id, actingUser.id);
  }

  @Patch("scrap-boards/:id/reactivate")
  reactivate(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.scrapBoardsService.reactivate(id, actingUser.id);
  }

  @Post("scrap-boards/:id/components/import")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  importComponents(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException("Sube el archivo CSV/Excel en el campo 'file' (multipart/form-data)");
    }
    return this.scrapBoardsService.importComponentsCsv(id, file, actingUser.id);
  }

  @Post("scrap-boards/:id/components")
  addComponent(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateScrapComponentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.addComponent(id, dto, actingUser.id);
  }

  @Patch("scrap-boards/:id/components/:componentId")
  updateComponent(
    @Param("id", ParseIntPipe) id: number,
    @Param("componentId", ParseIntPipe) componentId: number,
    @Body() dto: UpdateScrapComponentDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.updateComponent(id, componentId, dto, actingUser.id);
  }

  @Delete("scrap-boards/:id/components/:componentId")
  removeComponent(
    @Param("id", ParseIntPipe) id: number,
    @Param("componentId", ParseIntPipe) componentId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.removeComponent(id, componentId, actingUser.id);
  }

  @Patch("scrap-boards/:id/components/:componentId/mark-used")
  markComponentUsed(
    @Param("id", ParseIntPipe) id: number,
    @Param("componentId", ParseIntPipe) componentId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.markComponentUsed(id, componentId, actingUser.id);
  }

  @Patch("scrap-boards/:id/components/:componentId/mark-available")
  markComponentAvailable(
    @Param("id", ParseIntPipe) id: number,
    @Param("componentId", ParseIntPipe) componentId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.markComponentAvailable(id, componentId, actingUser.id);
  }

  @Post("scrap-boards/:id/files")
  @UseInterceptors(FilesInterceptor("files", 10, scrapBoardFileUploadOptions))
  uploadFiles(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadScrapBoardFileDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.scrapBoardsService.uploadFiles(id, files, dto, actingUser.id);
  }

  @Delete("scrap-board-files/:fileId")
  removeFile(@Param("fileId", ParseIntPipe) fileId: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.scrapBoardsService.removeFile(fileId, actingUser.id);
  }
}
