import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { RolesService } from "./roles.service";

// Cualquier usuario autenticado puede listar roles (lo necesita, por
// ejemplo, el formulario de creación de usuarios). No lleva @Roles():
// la sola autenticación (guard global) ya es suficiente aquí.
@Controller("roles")
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }
}
