-- CreateEnum
CREATE TYPE "HardwareTestCategory" AS ENUM ('KEYBOARD', 'CAMERA', 'SOUND', 'DISK', 'PERIPHERALS');

-- CreateEnum
CREATE TYPE "HardwareTestStatus" AS ENUM ('PASSED', 'FAILED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "hardware_test_results" (
    "id" SERIAL NOT NULL,
    "repairOrderId" INTEGER NOT NULL,
    "category" "HardwareTestCategory" NOT NULL,
    "testName" TEXT NOT NULL,
    "status" "HardwareTestStatus" NOT NULL,
    "notes" TEXT,
    "testedById" INTEGER,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hardware_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hardware_test_results_repairOrderId_idx" ON "hardware_test_results"("repairOrderId");

-- AddForeignKey
ALTER TABLE "hardware_test_results" ADD CONSTRAINT "hardware_test_results_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hardware_test_results" ADD CONSTRAINT "hardware_test_results_testedById_fkey" FOREIGN KEY ("testedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
