import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

/**
 * Gestión de usuarios del sistema (sección 21 del brief). Restringido a
 * Administrador: crear/editar/desactivar personal no es una tarea de
 * recepción, ventas ni técnicos.
 */
@Controller("users")
@Roles("Administrador")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.usersService.create(dto, actingUser.id);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actingUser.id);
  }

  @Patch(":id/reset-password")
  resetPassword(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.usersService.deactivate(id, actingUser.id);
  }

  @Patch(":id/reactivate")
  reactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.usersService.reactivate(id, actingUser.id);
  }
}
