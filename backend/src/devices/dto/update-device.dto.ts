import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateDeviceDto } from "./create-device.dto";

/**
 * Se quita `customerId`: si un equipo cambió de dueño, se registra como un
 * Device nuevo (y se conserva el histórico bajo el cliente original) en vez
 * de reasignarlo — reasignar borraría silenciosamente a quién perteneció.
 */
export class UpdateDeviceDto extends PartialType(
  OmitType(CreateDeviceDto, ["customerId"] as const),
) {}
