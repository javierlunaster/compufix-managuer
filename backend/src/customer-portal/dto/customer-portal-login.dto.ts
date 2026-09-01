import { IsNotEmpty, IsString } from "class-validator";

export class CustomerPortalLoginDto {
  @IsString()
  @IsNotEmpty({ message: "El número de documento es obligatorio" })
  documentId: string;

  @IsString()
  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  password: string;
}
