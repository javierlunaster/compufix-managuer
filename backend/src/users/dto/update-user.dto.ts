import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";

/**
 * Todos los campos de CreateUserDto son opcionales aquí, salvo que se quita
 * `password` a propósito: la contraseña se cambia por un endpoint dedicado
 * (POST /auth/change-password o el reseteo de admin), nunca junto con una
 * edición general de datos del usuario.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password"] as const),
) {}
