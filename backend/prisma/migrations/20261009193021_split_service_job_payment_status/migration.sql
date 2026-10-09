-- Separa el "pagó el cliente" del "le pagamos al técnico" (antes un solo
-- paymentStatus representaba solo lo segundo) — ver ServiceJobsService.
ALTER TABLE "service_jobs" RENAME COLUMN "paymentStatus" TO "technicianPaymentStatus";
ALTER TABLE "service_jobs" ADD COLUMN "clientPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
