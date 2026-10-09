-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "nextServiceJobAccountNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "serviceJobId" INTEGER;

-- AlterTable
ALTER TABLE "service_jobs" ADD COLUMN     "accountNumber" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "service_job_items" (
    "id" SERIAL NOT NULL,
    "serviceJobId" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "code" TEXT,
    "observation" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "service_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_jobs_accountNumber_key" ON "service_jobs"("accountNumber");

-- AddForeignKey
ALTER TABLE "service_job_items" ADD CONSTRAINT "service_job_items_serviceJobId_fkey" FOREIGN KEY ("serviceJobId") REFERENCES "service_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_serviceJobId_fkey" FOREIGN KEY ("serviceJobId") REFERENCES "service_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

