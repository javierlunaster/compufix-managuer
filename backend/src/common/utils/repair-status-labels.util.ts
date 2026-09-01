import { RepairStatus } from "@prisma/client";

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: "Ingresado",
  DIAGNOSING: "En diagnóstico",
  QUOTING: "Cotizando",
  AWAITING_APPROVAL: "Esperando aprobación",
  APPROVED: "Aprobado",
  IN_REPAIR: "En reparación",
  AWAITING_PART: "Esperando repuesto",
  TESTING: "En pruebas",
  REPAIRED: "Reparado",
  READY_FOR_PICKUP: "Listo para entrega",
  DELIVERED: "Entregado",
  NOT_REPAIRED: "No reparado",
  CANCELLED: "Cancelado",
  WARRANTY: "En garantía",
};
