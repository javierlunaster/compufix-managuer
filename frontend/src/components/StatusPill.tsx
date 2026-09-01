import type { RepairStatus } from "@/lib/types";
import { REPAIR_STATUS_LABELS } from "@/lib/types";

// Cada estado se agrupa en una de estas 4 familias de color funcional (ver
// DESIGN.md): el verde queda reservado para "resuelto/OK", nunca es el
// acento de marca.
const STATUS_COLOR: Record<RepairStatus, "warning" | "info" | "success" | "danger"> = {
  RECEIVED: "warning",
  DIAGNOSING: "warning",
  QUOTING: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "info",
  IN_REPAIR: "info",
  AWAITING_PART: "info",
  TESTING: "info",
  REPAIRED: "success",
  READY_FOR_PICKUP: "success",
  DELIVERED: "success",
  WARRANTY: "info",
  NOT_REPAIRED: "danger",
  CANCELLED: "danger",
};

const COLOR_CLASSES: Record<string, { dot: string; text: string; ring: string }> = {
  warning: { dot: "bg-warning", text: "text-warning", ring: "ring-warning/30" },
  info: { dot: "bg-info", text: "text-info", ring: "ring-info/30" },
  success: { dot: "bg-success", text: "text-success", ring: "ring-success/30" },
  danger: { dot: "bg-danger", text: "text-danger", ring: "ring-danger/30" },
};

export function StatusPill({ status }: { status: RepairStatus }) {
  const color = COLOR_CLASSES[STATUS_COLOR[status]];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs uppercase tracking-wide ${color.text} ring-4 ${color.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {REPAIR_STATUS_LABELS[status]}
    </span>
  );
}
