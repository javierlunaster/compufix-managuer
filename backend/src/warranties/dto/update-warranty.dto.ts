import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateWarrantyDto {
  @IsOptional()
  @IsString()
  coverageDescription?: string;

  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;
}
