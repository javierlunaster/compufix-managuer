import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateScrapBoardDto {
  @IsString()
  @IsNotEmpty({ message: "Indica el modelo de la placa (ej. DA0ZAUMB8E0)" })
  model: string;

  @IsOptional()
  @IsInt()
  brandId?: number;

  @IsOptional()
  @IsInt()
  deviceTypeId?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
