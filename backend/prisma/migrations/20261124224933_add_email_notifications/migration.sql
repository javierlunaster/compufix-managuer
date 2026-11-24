-- CreateEnum
CREATE TYPE "EmailNotificationEvent" AS ENUM ('ORDER_RECEIVED', 'ORDER_READY', 'QUOTATION_SENT');

-- CreateEnum
CREATE TYPE "EmailNotificationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" SERIAL NOT NULL,
    "repairOrderId" INTEGER NOT NULL,
    "event" "EmailNotificationEvent" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailNotificationStatus" NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
