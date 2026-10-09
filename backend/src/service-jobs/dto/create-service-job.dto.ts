import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateServiceJobItemDto {
  @IsString()
  @IsNotEmpty({ message: "Indica la marca del equipo" })
  brand: string;

  // "Código de ingreso" en la cuenta de cobro impresa — texto libre
  // (deliberadamente NO un id de RepairOrder, ver ServiceJobItem).
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty({ message: "Indica la observación del trabajo realizado en este equipo" })
  observation: string;

  @IsNumber()
  @Min(0.01)
  value: number;
}

export class CreateServiceJobDto {
  @IsDateString()
  date: string;

  @IsInt()
  customerId: number;

  @IsString()
  @IsNotEmpty({ message: "Indica una descripción general del trabajo" })
  description: string;

  @IsInt()
  technicianId: number;

  // % del total que recibe el técnico — el resto se lo queda el taller.
  // Se captura por cada trabajo (no es una regla fija del negocio), ver
  // ServiceJob.retentionAmount en el schema.
  @IsNumber()
  @Min(0)
  @Max(100)
  technicianPercentage: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Agrega al menos un equipo a la cuenta de cobro" })
  @ValidateNested({ each: true })
  @Type(() => CreateServiceJobItemDto)
  items: CreateServiceJobItemDto[];
}
