import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";
import { normalizeName } from "../common/utils/normalize-name.util";
import { CreateScrapBoardDto } from "./dto/create-scrap-board.dto";
import { UpdateScrapBoardDto } from "./dto/update-scrap-board.dto";
import { CreateScrapComponentDto } from "./dto/create-scrap-component.dto";
import { UpdateScrapComponentDto } from "./dto/update-scrap-component.dto";
import { UploadScrapBoardFileDto } from "./dto/upload-scrap-board-file.dto";

interface ImportRowIssue {
  row: number;
  message: string;
}

export interface ImportComponentsResult {
  imported: number;
  errors: ImportRowIssue[];
}

// Alias aceptados por columna — normalizados (sin tildes, minúsculas) al
// comparar, así que "Designador", "designador" o "DESIGNADOR" calzan
// igual. Varias formas de escribir lo mismo porque este archivo lo llena
// a mano cada técnico, no un sistema que siempre use el mismo encabezado.
const HEADER_ALIASES = {
  designator: ["designador", "designator", "cirgrafia", "serigrafia"],
  reference: ["referencia", "reference"],
  description: ["descripcion", "description"],
  quantity: ["cantidad", "quantity", "cant"],
} as const;

function cellToNonEmptyString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

const BOARD_DETAIL_INCLUDE = {
  brand: true,
  deviceType: true,
  components: { orderBy: { designator: "asc" as const } },
  files: {
    orderBy: { uploadedAt: "desc" as const },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  },
} satisfies Prisma.ScrapBoardInclude;

const SEARCH_RESULT_INCLUDE = {
  scrapBoard: {
    select: {
      id: true,
      code: true,
      model: true,
      location: true,
      status: true,
      brand: { select: { id: true, name: true } },
      deviceType: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ScrapComponentInclude;

/**
 * Inventario de placas base de SCRAP — placas donadas/desechadas que se
 * conservan solo como fuente de componentes (IC, MOSFET, conectores...)
 * para reparar OTRAS placas. El problema que resuelve: antes de esto,
 * saber si algún componente ya disponible en SCRAP sirve para una
 * reparación tomaba horas de revisar placa por placa a mano — ver
 * searchComponents(), el método que de verdad ataca ese problema.
 */
@Injectable()
export class ScrapBoardsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  private async ensureCatalogRefsExist(dto: { brandId?: number; deviceTypeId?: number }) {
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException("La marca indicada no existe");
    }
    if (dto.deviceTypeId) {
      const deviceType = await this.prisma.deviceType.findUnique({ where: { id: dto.deviceTypeId } });
      if (!deviceType) throw new NotFoundException("El tipo de equipo indicado no existe");
    }
  }

  /**
   * `code` se arma como "PB" + id, pensado para escribirse en un sticker
   * físico pegado a la placa — mismo patrón de dos pasos que
   * RepairOrder.orderCode (crear con un valor temporal, corregir dentro
   * de la misma transacción una vez se conoce el id).
   */
  async create(dto: CreateScrapBoardDto, actingUserId: number) {
    await this.ensureCatalogRefsExist(dto);

    const board = await this.prisma.$transaction(async (tx) => {
      const created = await tx.scrapBoard.create({
        data: {
          code: `TEMP-${Date.now()}`,
          model: dto.model,
          brandId: dto.brandId,
          deviceTypeId: dto.deviceTypeId,
          location: dto.location,
          notes: dto.notes,
        },
      });
      return tx.scrapBoard.update({
        where: { id: created.id },
        data: { code: `PB${created.id}` },
      });
    });

    await this.audit.log({
      userId: actingUserId,
      action: "CREATE",
      entityType: "ScrapBoard",
      entityId: board.id,
      newValue: { code: board.code, model: board.model },
    });

    return this.findOne(board.id);
  }

  async findAll(params: { search?: string; brandId?: number; deviceTypeId?: number; includeInactive?: boolean }) {
    const where: Prisma.ScrapBoardWhereInput = params.includeInactive ? {} : { status: "ACTIVE" };

    if (params.brandId) where.brandId = params.brandId;
    if (params.deviceTypeId) where.deviceTypeId = params.deviceTypeId;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: "insensitive" } },
        { model: { contains: params.search, mode: "insensitive" } },
        { location: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.scrapBoard.findMany({
      where,
      include: {
        brand: true,
        deviceType: true,
        _count: { select: { components: { where: { status: "AVAILABLE" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findOne(id: number) {
    const board = await this.prisma.scrapBoard.findUnique({
      where: { id },
      include: BOARD_DETAIL_INCLUDE,
    });
    if (!board) {
      throw new NotFoundException("Placa de SCRAP no encontrada");
    }
    return board;
  }

  async update(id: number, dto: UpdateScrapBoardDto, actingUserId: number) {
    await this.findOne(id);
    await this.ensureCatalogRefsExist(dto);

    await this.prisma.scrapBoard.update({ where: { id }, data: dto });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE",
      entityType: "ScrapBoard",
      entityId: id,
      newValue: dto,
    });

    return this.findOne(id);
  }

  async deactivate(id: number, actingUserId: number) {
    await this.findOne(id);
    await this.prisma.scrapBoard.update({ where: { id }, data: { status: "INACTIVE" } });
    await this.audit.log({
      userId: actingUserId,
      action: "DEACTIVATE",
      entityType: "ScrapBoard",
      entityId: id,
    });
    return this.findOne(id);
  }

  async reactivate(id: number, actingUserId: number) {
    await this.findOne(id);
    await this.prisma.scrapBoard.update({ where: { id }, data: { status: "ACTIVE" } });
    await this.audit.log({
      userId: actingUserId,
      action: "REACTIVATE",
      entityType: "ScrapBoard",
      entityId: id,
    });
    return this.findOne(id);
  }

  // --- Componentes -----------------------------------------------------

  async addComponent(boardId: number, dto: CreateScrapComponentDto, actingUserId: number) {
    await this.findOne(boardId);

    const component = await this.prisma.scrapComponent.create({
      data: {
        scrapBoardId: boardId,
        designator: dto.designator,
        reference: dto.reference,
        description: dto.description,
        quantity: dto.quantity ?? 1,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "ADD_COMPONENT",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { componentId: component.id, designator: component.designator, reference: component.reference },
    });

    return this.findOne(boardId);
  }

  /**
   * Carga masiva de componentes desde un CSV/Excel — pensado para cuando
   * el listado de componentes de una placa viene de otra fuente (un
   * esquemático/boardview que el técnico ya revisó aparte, o simplemente
   * se armó la lista completa en una hoja de cálculo antes de cargarla
   * aquí) en vez de capturarlo fila por fila en el formulario. No valida
   * contra el resto del sistema (a diferencia de ImportService, que
   * fusiona clientes/equipos): cada fila es independiente, así que un
   * error en una fila no bloquea las demás.
   */
  async importComponentsCsv(
    boardId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    actingUserId: number,
  ): Promise<ImportComponentsResult> {
    await this.findOne(boardId);

    // Un .xlsx/.xls es un ZIP con XML en UTF-8 — SheetJS lo decodifica
    // bien directo del buffer. Un .csv es texto plano sin codificación
    // declarada, y SheetJS asume Latin-1 si se le pasa el buffer crudo,
    // dejando cualquier encabezado con tilde (ej. "Descripción")
    // convertido en basura silenciosa ("DescripciÃ³n") que nunca calza
    // con HEADER_ALIASES. Decodificar el buffer como UTF-8 a mano antes
    // de pasárselo a XLSX (como texto, no como buffer) evita que SheetJS
    // adivine mal la codificación.
    const isCsv = /\.csv$/i.test(file.originalname) || file.mimetype === "text/csv";
    const workbook = isCsv
      ? XLSX.read(file.buffer.toString("utf-8"), { type: "string" })
      : XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new BadRequestException("El archivo no tiene ninguna hoja con datos");
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    if (rows.length === 0) {
      throw new BadRequestException(
        "El archivo no tiene filas de datos — revisa que la primera fila traiga los encabezados " +
          "(Designador, Referencia, Descripción, Cantidad) y que haya al menos una fila debajo",
      );
    }

    // Encabezados reales del archivo → a cuál columna esperada corresponde
    // cada uno, comparando normalizado (ver HEADER_ALIASES arriba).
    const actualHeaders = Object.keys(rows[0]);
    const headerFor = (field: keyof typeof HEADER_ALIASES) =>
      actualHeaders.find((h) => (HEADER_ALIASES[field] as readonly string[]).includes(normalizeName(h)));

    const designatorHeader = headerFor("designator");
    const referenceHeader = headerFor("reference");
    if (!designatorHeader || !referenceHeader) {
      throw new BadRequestException(
        "El archivo debe tener al menos las columnas 'Designador' y 'Referencia' " +
          "('Descripción' y 'Cantidad' son opcionales)",
      );
    }
    const descriptionHeader = headerFor("description");
    const quantityHeader = headerFor("quantity");

    const errors: ImportRowIssue[] = [];
    const toCreate: { designator: string; reference: string; description: string | null; quantity: number }[] = [];

    rows.forEach((row, i) => {
      const excelRow = i + 2; // fila 1 = encabezados
      if (Object.values(row).every((c) => c === null || String(c).trim() === "")) {
        return; // fila totalmente vacía, se ignora en silencio
      }

      const designator = String(row[designatorHeader] ?? "").trim();
      const reference = String(row[referenceHeader] ?? "").trim();
      if (!designator || !reference) {
        errors.push({ row: excelRow, message: "Falta Designador o Referencia — fila omitida" });
        return;
      }

      const description = descriptionHeader
        ? cellToNonEmptyString(row[descriptionHeader])
        : null;

      let quantity = 1;
      if (quantityHeader && row[quantityHeader] !== null) {
        const parsed = Number(row[quantityHeader]);
        if (!Number.isInteger(parsed) || parsed < 1) {
          errors.push({
            row: excelRow,
            message: `Cantidad inválida "${row[quantityHeader]}" — se importó con cantidad 1`,
          });
        } else {
          quantity = parsed;
        }
      }

      toCreate.push({ designator, reference, description, quantity });
    });

    if (toCreate.length > 0) {
      await this.prisma.scrapComponent.createMany({
        data: toCreate.map((c) => ({ ...c, scrapBoardId: boardId })),
      });
    }

    await this.audit.log({
      userId: actingUserId,
      action: "IMPORT_COMPONENTS",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { imported: toCreate.length, errors: errors.length },
    });

    return { imported: toCreate.length, errors };
  }

  private async ensureComponentBelongsToBoard(boardId: number, componentId: number) {
    const component = await this.prisma.scrapComponent.findUnique({ where: { id: componentId } });
    if (!component || component.scrapBoardId !== boardId) {
      throw new NotFoundException("Componente no encontrado en esta placa");
    }
    return component;
  }

  async updateComponent(
    boardId: number,
    componentId: number,
    dto: UpdateScrapComponentDto,
    actingUserId: number,
  ) {
    await this.ensureComponentBelongsToBoard(boardId, componentId);

    await this.prisma.scrapComponent.update({
      where: { id: componentId },
      data: {
        designator: dto.designator,
        reference: dto.reference,
        description: dto.description,
        quantity: dto.quantity,
      },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "UPDATE_COMPONENT",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { componentId, ...dto },
    });

    return this.findOne(boardId);
  }

  /**
   * Corrección de un dato mal capturado (ej. se duplicó la fila por
   * error) — a diferencia de "marcar usado" (abajo), esto SÍ borra la
   * fila: no es un hecho real que haya ocurrido, es un error de captura.
   */
  async removeComponent(boardId: number, componentId: number, actingUserId: number) {
    const component = await this.ensureComponentBelongsToBoard(boardId, componentId);

    await this.prisma.scrapComponent.delete({ where: { id: componentId } });

    await this.audit.log({
      userId: actingUserId,
      action: "REMOVE_COMPONENT",
      entityType: "ScrapBoard",
      entityId: boardId,
      previousValue: { componentId, designator: component.designator, reference: component.reference },
    });

    return this.findOne(boardId);
  }

  /**
   * Marca el componente como ya extraído/usado — nunca se borra la fila
   * (a diferencia de removeComponent): queda como historial de qué salió
   * de esta placa, para no confundir después por qué aparece con menos
   * componentes de los que un técnico recuerda haber visto ahí.
   */
  async markComponentUsed(boardId: number, componentId: number, actingUserId: number) {
    const component = await this.ensureComponentBelongsToBoard(boardId, componentId);
    if (component.status === "REMOVED") {
      throw new BadRequestException("Este componente ya estaba marcado como usado");
    }

    await this.prisma.scrapComponent.update({
      where: { id: componentId },
      data: { status: "REMOVED", removedAt: new Date() },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "MARK_COMPONENT_USED",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { componentId, designator: component.designator, reference: component.reference },
    });

    return this.findOne(boardId);
  }

  /** Deshace un marcado por error. */
  async markComponentAvailable(boardId: number, componentId: number, actingUserId: number) {
    const component = await this.ensureComponentBelongsToBoard(boardId, componentId);
    if (component.status === "AVAILABLE") {
      throw new BadRequestException("Este componente ya estaba disponible");
    }

    await this.prisma.scrapComponent.update({
      where: { id: componentId },
      data: { status: "AVAILABLE", removedAt: null },
    });

    await this.audit.log({
      userId: actingUserId,
      action: "MARK_COMPONENT_AVAILABLE",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { componentId },
    });

    return this.findOne(boardId);
  }

  /**
   * La búsqueda que resuelve el problema real (ver docstring de la
   * clase): dado un designador de serigrafía o una referencia, dice en
   * qué placa(s) del inventario está disponible. Por defecto solo
   * componentes AVAILABLE de placas ACTIVE — un componente ya usado o en
   * una placa desechada no sirve para encontrar nada ahora mismo.
   */
  async searchComponents(params: { q: string; includeRemoved?: boolean }) {
    const term = params.q?.trim();
    if (!term || term.length < 2) {
      return [];
    }

    const where: Prisma.ScrapComponentWhereInput = {
      OR: [
        { designator: { contains: term, mode: "insensitive" } },
        { reference: { contains: term, mode: "insensitive" } },
      ],
      scrapBoard: { status: "ACTIVE" },
    };
    if (!params.includeRemoved) {
      where.status = "AVAILABLE";
    }

    return this.prisma.scrapComponent.findMany({
      where,
      include: SEARCH_RESULT_INCLUDE,
      orderBy: { reference: "asc" },
      take: 200,
    });
  }

  // --- Archivos (fotos, esquemáticos, boardview) ------------------------

  async uploadFiles(
    boardId: number,
    files: Express.Multer.File[],
    dto: UploadScrapBoardFileDto,
    actingUserId: number,
  ) {
    await this.findOne(boardId);
    if (!files || files.length === 0) {
      throw new BadRequestException("No se recibió ningún archivo");
    }

    for (const file of files) {
      const uploaded = await this.storage.upload(file, `scrap-boards/${boardId}`);
      await this.prisma.scrapBoardFile.create({
        data: {
          scrapBoardId: boardId,
          fileUrl: uploaded.publicUrl,
          fileType: uploaded.contentType,
          category: dto.category,
          description: dto.description,
          uploadedById: actingUserId,
        },
      });
    }

    await this.audit.log({
      userId: actingUserId,
      action: "UPLOAD_FILE",
      entityType: "ScrapBoard",
      entityId: boardId,
      newValue: { category: dto.category, count: files.length },
    });

    return this.findOne(boardId);
  }

  async removeFile(fileId: number, actingUserId: number) {
    const file = await this.prisma.scrapBoardFile.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException("Archivo no encontrado");
    }

    await this.storage.remove(this.storage.pathFromPublicUrl(file.fileUrl));
    await this.prisma.scrapBoardFile.delete({ where: { id: fileId } });

    await this.audit.log({
      userId: actingUserId,
      action: "REMOVE_FILE",
      entityType: "ScrapBoard",
      entityId: file.scrapBoardId,
      previousValue: { fileId, category: file.category },
    });

    return { message: "Archivo eliminado" };
  }
}
