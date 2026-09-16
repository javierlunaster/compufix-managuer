import {
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
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RepairStatus } from "@prisma/client";
import { RepairOrdersService } from "./repair-orders.service";
import { CreateRepairOrderDto } from "./dto/create-repair-order.dto";
import { UpdateRepairOrderDto } from "./dto/update-repair-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddProcedureDto } from "./dto/add-procedure.dto";
import { photoUploadOptions } from "../attachments/multer.config";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders")
export class RepairOrdersController {
  constructor(private repairOrdersService: RepairOrdersService) {}

  @Post()
  create(
    @Body() dto: CreateRepairOrderDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    // Un Técnico puede recibir un equipo y crear la orden, pero la
    // asignación de técnico es exclusiva de Administrador/Gerente (ver
    // assignTechnician más abajo) — nunca se auto-asigna ni asigna a otro
    // colega colando el campo en el body de creación.
    if (actingUser.roleName === "Técnico") {
      dto.technicianId = undefined;
    }
    return this.repairOrdersService.create(dto, actingUser.id);
  }

  // GET /repair-orders?search=C11061&status=RECEIVED&technicianId=3
  @Get()
  findAll(
    @CurrentUser() actingUser: AuthenticatedUser,
    @Query("search") search?: string,
    @Query("status") status?: RepairStatus,
    @Query("technicianId") technicianId?: string,
  ) {
    return this.repairOrdersService.findAll(
      {
        search,
        status,
        technicianId: technicianId ? Number(technicianId) : undefined,
      },
      actingUser,
    );
  }

  // Atajo para el caso de uso más frecuente: encontrar por código exacto
  // (sección 25 del brief — "al ingresar C11061 debe encontrar de inmediato...").
  @Get("by-code/:code")
  async findByCode(
    @Param("code") code: string,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const order = await this.repairOrdersService.findByCode(code);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, order.id);
    return order;
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRepairOrderDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.update(id, dto, actingUser.id);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.updateStatus(id, dto, actingUser.id);
  }

  // Asignar (o reasignar) el técnico responsable es una decisión de
  // gestión, no algo que el técnico mismo controle — de ahí la
  // restricción de rol, distinta del resto de endpoints de esta orden
  // (que se permiten si la orden ya es suya).
  @Patch(":id/assign-technician")
  @Roles("Administrador", "Gerente")
  assignTechnician(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.assignTechnician(id, dto, actingUser.id);
  }

  @Post(":id/procedures")
  async addProcedure(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddProcedureDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.addProcedure(id, dto, actingUser.id);
  }

  // Restringido: leer la contraseña del equipo es un dato sensible
  // (sección 32 del brief) — no cualquier rol necesita verla.
  @Get(":id/device-password")
  @Roles("Administrador", "Gerente", "Técnico")
  async revealDevicePassword(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.revealDevicePassword(id, actingUser.id);
  }

  @Delete(":id/device-password")
  @Roles("Administrador", "Gerente", "Técnico")
  async purgeDevicePassword(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.purgeDevicePassword(id, actingUser.id);
  }

  // Firma digital del cliente en la entrega — ver docstring del service.
  @Post(":id/signature")
  @UseInterceptors(FileInterceptor("file", photoUploadOptions))
  async setSignature(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.setSignature(id, file, actingUser.id);
  }

  @Delete(":id/signature")
  async clearSignature(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, id);
    return this.repairOrdersService.clearSignature(id, actingUser.id);
  }

  // Corrección de datos (no un flujo normal): reemplaza totalValue por la
  // suma de las cotizaciones convertidas de la orden — ver el docstring de
  // recalculateTotal. Restringido igual que Finanzas porque toca un total
  // financiero directamente, sin pasar por el flujo habitual (cotización).
  @Post(":id/recalculate-total")
  @Roles("Administrador", "Gerente")
  recalculateTotal(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.recalculateTotal(id, actingUser.id);
  }
}
