import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("services")
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  // Lectura abierta: la necesita el formulario de cotizaciones para elegir
  // servicios (Recepción, Técnico, Ventas...).
  @Get()
  findAll(@Query("search") search?: string) {
    return this.servicesService.findAll(search);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @Roles("Administrador", "Gerente")
  create(@Body() dto: CreateServiceDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.servicesService.create(dto, actingUser.id);
  }

  @Patch(":id")
  @Roles("Administrador", "Gerente")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.servicesService.update(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  @Roles("Administrador", "Gerente")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.servicesService.deactivate(id, actingUser.id);
  }

  @Patch(":id/reactivate")
  @Roles("Administrador", "Gerente")
  reactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.servicesService.reactivate(id, actingUser.id);
  }
}
