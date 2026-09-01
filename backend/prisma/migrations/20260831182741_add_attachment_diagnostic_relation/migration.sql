-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "diagnosticId" INTEGER;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "repair_diagnostics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
