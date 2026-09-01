import { IsNotEmpty, IsString } from "class-validator";

export class AddProcedureDto {
  @IsString()
  @IsNotEmpty({ message: "La descripción del procedimiento es obligatoria" })
  description: string;
}
