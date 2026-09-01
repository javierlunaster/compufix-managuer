/*
  Warnings:

  - You are about to drop the column `boardModel` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `brandId` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `cpu` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `deviceTypeId` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `disk` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `operatingSystem` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `ram` on the `repair_orders` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `repair_orders` table. All the data in the column will be lost.
  - Added the required column `deviceId` to the `repair_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "repair_orders" DROP CONSTRAINT "repair_orders_brandId_fkey";

-- DropForeignKey
ALTER TABLE "repair_orders" DROP CONSTRAINT "repair_orders_deviceTypeId_fkey";

-- AlterTable
ALTER TABLE "repair_orders" DROP COLUMN "boardModel",
DROP COLUMN "brandId",
DROP COLUMN "cpu",
DROP COLUMN "deviceTypeId",
DROP COLUMN "disk",
DROP COLUMN "model",
DROP COLUMN "operatingSystem",
DROP COLUMN "ram",
DROP COLUMN "serialNumber",
ADD COLUMN     "deviceId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "deviceTypeId" INTEGER NOT NULL,
    "brandId" INTEGER,
    "model" TEXT,
    "serialNumber" TEXT,
    "boardModel" TEXT,
    "cpu" TEXT,
    "ram" TEXT,
    "disk" TEXT,
    "operatingSystem" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devices_serialNumber_idx" ON "devices"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "devices_customerId_serialNumber_key" ON "devices"("customerId", "serialNumber");

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_deviceTypeId_fkey" FOREIGN KEY ("deviceTypeId") REFERENCES "device_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
