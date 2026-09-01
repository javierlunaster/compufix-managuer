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
} from "@nestjs/common";
import { RepairStatus } from "@prisma/client";
import { RepairOrdersService } from "./repair-orders.service";
import { CreateRepairOrderDto } from "./dto/create-repair-order.dto";
import { UpdateRepairOrderDto } from "./dto/update-repair-order.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddProcedureDto } from "./dto/add-procedure.dto";
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
    return this.repairOrdersService.create(dto, actingUser.id);
  }

  // GET /repair-orders?search=C11061&status=RECEIVED&technicianId=3
  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: RepairStatus,
    @Query("technicianId") technicianId?: string,
  ) {
    return this.repairOrdersService.findAll({
      search,
      status,
      technicianId: technicianId ? Number(technicianId) : undefined,
    });
  }

  // Atajo para el caso de uso más frecuente: encontrar por código exacto
  // (sección 25 del brief — "al ingresar C11061 debe encontrar de inmediato...").
  @Get("by-code/:code")
  findByCode(@Param("code") code: string) {
    return this.repairOrdersService.findByCode(code);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.repairOrdersService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRepairOrderDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.update(id, dto, actingUser.id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.updateStatus(id, dto, actingUser.id);
  }

  @Patch(":id/assign-technician")
  assignTechnician(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.assignTechnician(id, dto, actingUser.id);
  }

  @Post(":id/procedures")
  addProcedure(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddProcedureDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.addProcedure(id, dto, actingUser.id);
  }

  // Restringido: leer la contraseña del equipo es un dato sensible
  // (sección 32 del brief) — no cualquier rol necesita verla.
  @Get(":id/device-password")
  @Roles("Administrador", "Gerente", "Técnico")
  revealDevicePassword(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.revealDevicePassword(id, actingUser.id);
  }

  @Delete(":id/device-password")
  @Roles("Administrador", "Gerente", "Técnico")
  purgeDevicePassword(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairOrdersService.purgeDevicePassword(id, actingUser.id);
  }
}
