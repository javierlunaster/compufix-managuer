import { IsBoolean, IsOptional } from "class-validator";

export class RemoveRepairServiceDto {
  // Ver RemoveRepairPartDto — mismo criterio, descuenta `price` de
  // RepairOrder.totalValue si el servicio quedaba cotizado pero no se
  // prestó al final.
  @IsOptional()
  @IsBoolean()
  adjustTotal?: boolean;
}
