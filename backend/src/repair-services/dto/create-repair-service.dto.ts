import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateRepairServiceDto {
  // Debe venir exactamente uno de los dos: un servicio del catálogo
  // (serviceId) o un cargo de mano de obra/otro ad-hoc con su propia
  // descripción (description) — igual criterio que
  // CreateRepairOrderDto.deviceId/newDevice. Validado en el service, no
  // aquí, porque class-validator no expresa bien un XOR entre dos campos
  // opcionales.
  @IsOptional()
  @IsInt()
  serviceId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "La descripción no puede estar vacía" })
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  // Costo para el taller (mano de obra, repuesto genérico incluido en la
  // tarifa, etc). Si no se envía y hay serviceId, se toma
  // Service.estimatedCost; si tampoco hay eso, queda en 0.
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
