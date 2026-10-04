-- DropForeignKey
ALTER TABLE "repair_services" DROP CONSTRAINT "repair_services_serviceId_fkey";

-- AlterTable
ALTER TABLE "repair_services" ADD COLUMN     "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ALTER COLUMN "serviceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "repair_services" ADD CONSTRAINT "repair_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
