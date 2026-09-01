import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

/**
 * Campos editables de una orden ya creada. Deliberadamente NO incluye
 * `status` (tiene su propio endpoint con historial, ver update-status.dto),
 * ni `customerId`/`deviceId` (una orden no cambia de dueño ni de equipo —
 * si se equivocaron, se cancela y se crea una nueva).
 */
export class UpdateRepairOrderDto {
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

  @IsOptional()
  @IsString()
  entryReason?: string;

  @IsOptional()
  @IsString()
  reportedIssue?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
