import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDeviceDto {
  @IsInt()
  customerId: number;

  @IsInt()
  deviceTypeId: number;

  @IsOptional()
  @IsInt()
  brandId?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  boardModel?: string;

  @IsOptional()
  @IsString()
  cpu?: string;

  @IsOptional()
  @IsString()
  ram?: string;

  @IsOptional()
  @IsString()
  disk?: string;

  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
