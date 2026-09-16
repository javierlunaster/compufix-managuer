-- AlterTable
ALTER TABLE "repair_orders" ADD COLUMN     "customerSignatureDate" TIMESTAMP(3),
ADD COLUMN     "customerSignatureUrl" TEXT;
