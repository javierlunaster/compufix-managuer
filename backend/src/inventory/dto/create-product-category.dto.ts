import { IsNotEmpty, IsString } from "class-validator";

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre de la categoría es obligatorio" })
  name: string;
}
