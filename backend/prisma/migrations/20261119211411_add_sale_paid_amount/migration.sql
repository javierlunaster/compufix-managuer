-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Toda venta activa ya existente se creó bajo la regla anterior (siempre
-- pagada de contado al momento de la venta) — se deja reflejado ese hecho
-- histórico en vez de que aparezcan de golpe como "con saldo pendiente".
-- Una venta cancelada no importa para este cálculo (no entra en el
-- seguimiento de saldo pendiente), pero se backfillea igual por
-- consistencia de datos.
UPDATE "sales" SET "paidAmount" = "total";
