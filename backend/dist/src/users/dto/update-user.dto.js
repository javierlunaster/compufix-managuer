"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_user_dto_1 = require("./create-user.dto");
/**
 * Todos los campos de CreateUserDto son opcionales aquí, salvo que se quita
 * `password` a propósito: la contraseña se cambia por un endpoint dedicado
 * (POST /auth/change-password o el reseteo de admin), nunca junto con una
 * edición general de datos del usuario.
 */
class UpdateUserDto extends (0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(create_user_dto_1.CreateUserDto, ["password"])) {
}
exports.UpdateUserDto = UpdateUserDto;
