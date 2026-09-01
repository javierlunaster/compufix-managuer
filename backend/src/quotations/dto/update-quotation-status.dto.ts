import { IsIn } from "class-validator";
import { QuotationStatus } from "@prisma/client";

// CONVERTED se excluye a propósito: ese estado solo lo puede poner
// QuotationsService.convert(), nunca este endpoint genérico — convertir
// implica efectos reales (consumir inventario, crear RepairService,
// actualizar la orden), no es un simple cambio de estado.
const ASSIGNABLE_STATUSES = [
  QuotationStatus.DRAFT,
  QuotationStatus.SENT,
  QuotationStatus.PENDING,
  QuotationStatus.APPROVED,
  QuotationStatus.REJECTED,
  QuotationStatus.EXPIRED,
] as const;

export { ASSIGNABLE_STATUSES };

export class UpdateQuotationStatusDto {
  @IsIn(ASSIGNABLE_STATUSES, {
    message: `El estado debe ser uno de: ${ASSIGNABLE_STATUSES.join(", ")}`,
  })
  newStatus: QuotationStatus;
}
