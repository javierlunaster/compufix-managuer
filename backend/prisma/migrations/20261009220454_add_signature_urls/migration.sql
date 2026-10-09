-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "ownerSignatureUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "signatureUrl" TEXT;
