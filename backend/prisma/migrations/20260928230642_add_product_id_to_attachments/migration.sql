-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "productId" INTEGER;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
