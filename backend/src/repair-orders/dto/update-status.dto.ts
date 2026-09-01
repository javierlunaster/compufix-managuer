import { IsEnum, IsOptional, IsString } from "class-validator";
import { RepairStatus } from "@prisma/client";

export class UpdateStatusDto {
  @IsEnum(RepairStatus, { message: "Estado inválido" })
  newStatus: RepairStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
