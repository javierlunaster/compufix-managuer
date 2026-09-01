import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { CustomerType } from "@prisma/client";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre completo / razón social es obligatorio" })
  fullName: string;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail({}, { message: "El correo no es válido" })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Si el creador ya sabe que es el mismo cliente que un registro existente
   * marcado como posible duplicado (ver CustomersService.create), puede
   * reenviar la creación con este flag para confirmar que quiere crearlo
   * de todas formas como un cliente nuevo y distinto.
   */
  @IsOptional()
  confirmCreateDespiteDuplicate?: boolean;
}
