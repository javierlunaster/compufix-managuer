-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "repairLogId" INTEGER;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_repairLogId_fkey" FOREIGN KEY ("repairLogId") REFERENCES "repair_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
