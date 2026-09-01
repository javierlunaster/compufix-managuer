import { OmitType } from "@nestjs/mapped-types";
import { CreateDeviceDto } from "../../devices/dto/create-device.dto";

/**
 * Igual a CreateDeviceDto pero sin `customerId`: cuando se recibe un equipo
 * nuevo (que nunca había pasado por el taller) al mismo tiempo que se crea
 * la orden, el cliente ya se conoce por `CreateRepairOrderDto.customerId` —
 * no tiene sentido pedirlo dos veces.
 */
export class NewDeviceDto extends OmitType(CreateDeviceDto, [
  "customerId",
] as const) {}
