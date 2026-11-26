-- AlterTable
ALTER TABLE "customer_quotations" ADD COLUMN     "groupId" INTEGER;

-- CreateTable
CREATE TABLE "quotation_groups" (
    "id" SERIAL NOT NULL,
    "groupNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "quotation_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotation_groups_groupNumber_key" ON "quotation_groups"("groupNumber");

-- AddForeignKey
ALTER TABLE "customer_quotations" ADD CONSTRAINT "customer_quotations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "quotation_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_groups" ADD CONSTRAINT "quotation_groups_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
