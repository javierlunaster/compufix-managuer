-- AlterTable
ALTER TABLE "warranties" ADD COLUMN     "repairPartId" INTEGER,
ADD COLUMN     "repairServiceId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "warranties_repairPartId_key" ON "warranties"("repairPartId");

-- CreateIndex
CREATE UNIQUE INDEX "warranties_repairServiceId_key" ON "warranties"("repairServiceId");

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_repairPartId_fkey" FOREIGN KEY ("repairPartId") REFERENCES "repair_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_repairServiceId_fkey" FOREIGN KEY ("repairServiceId") REFERENCES "repair_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
