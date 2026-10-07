import { IsBoolean, IsOptional } from "class-validator";

export class RemoveRepairPartDto {
  /**
   * Si es true, además de revertir el movimiento de inventario, descuenta
   * el valor de este repuesto (unitPrice * quantity) de RepairOrder.totalValue
   * — para el caso de "se cotizó pero al final no se usó", donde además de
   * quitarlo del registro hay que dejar de cobrarlo. Por defecto false:
   * la mayoría de remociones son correcciones de captura (se agregó por
   * error) donde el total nunca se vio afectado en primer lugar.
   */
  @IsOptional()
  @IsBoolean()
  adjustTotal?: boolean;
}
