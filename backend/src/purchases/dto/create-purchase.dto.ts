import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { CreatePurchaseItemDto } from "./create-purchase-item.dto";

export class CreatePurchaseDto {
  @IsInt()
  supplierId: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  @ArrayMinSize(1, { message: "La compra debe tener al menos un ítem" })
  items: CreatePurchaseItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
