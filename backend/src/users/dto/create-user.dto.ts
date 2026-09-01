import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre completo es obligatorio" })
  fullName: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsEmail({}, { message: "El correo no es válido" })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: "El nombre de usuario es obligatorio" })
  username: string;

  @IsString()
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsString()
  specialty?: string;
}
