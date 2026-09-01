import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { NewDeviceDto } from "./new-device.dto";

export class CreateRepairOrderDto {
  @IsInt()
  customerId: number;

  // Debe venir exactamente uno de los dos: un equipo ya registrado
  // (búsqueda previa por serial, sección 6) o los datos de un equipo nuevo.
  // La validación de "exactamente uno" se hace en el service porque
  // class-validator no expresa bien un XOR entre dos campos opcionales.
  @IsOptional()
  @IsInt()
  deviceId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewDeviceDto)
  newDevice?: NewDeviceDto;

  @IsOptional()
  @IsInt()
  technicianId?: number;

  @IsOptional()
  @IsBoolean()
  chargerReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  batteryReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  keyboardReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  mouseReceived?: boolean;

  @IsOptional()
  @IsString()
  physicalCondition?: string;

  @IsOptional()
  @IsString()
  accessoriesNotes?: string;

  // Texto plano en la entrada — el service lo cifra antes de guardarlo
  // (nunca se persiste en texto plano, sección 32 del brief).
  @IsOptional()
  @IsString()
  devicePassword?: string;

  @IsOptional()
  @IsString()
  entryReason?: string;

  @IsString()
  @IsNotEmpty({ message: "La falla reportada por el cliente es obligatoria" })
  reportedIssue: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
