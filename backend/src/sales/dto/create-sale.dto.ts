import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { PaymentMethod } from "@prisma/client";
import { CreateSaleItemDto } from "./create-sale-item.dto";

export class CreateSaleDto {
  // Opcional: el brief permite venta rápida tipo POS, que no siempre tiene
  // un cliente registrado en el sistema (mostrador anónimo).
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  @ArrayMinSize(1, { message: "La venta debe tener al menos un ítem" })
  items: CreateSaleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsEnum(PaymentMethod, { message: "Método de pago inválido" })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  // Cuánto paga el cliente en este momento — si se omite, se asume la
  // venta completa (el caso normal, venta de mostrador pagada de una
  // vez). Si es menor al total, la venta queda con saldo pendiente (ver
  // SalesService.create) y por eso requiere un cliente registrado: sin
  // eso no hay a quién cobrarle el resto después.
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;
}
