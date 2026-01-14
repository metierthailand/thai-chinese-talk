/*
  Warnings:

  - You are about to drop the column `leadId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDueDate` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `visaStatus` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firstPaymentId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[secondPaymentId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[thirdPaymentId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstPaymentId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salesUserId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('DOUBLE_BED', 'TWIN_BED');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('WINDOW', 'MIDDLE', 'AISLE');

-- CreateEnum
CREATE TYPE "SeatClass" AS ENUM ('FIRST_CLASS', 'BUSINESS_CLASS', 'LONG_LEG');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DEPOSIT_PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentRatio" AS ENUM ('FIRST_PAYMENT_100', 'FIRST_PAYMENT_50', 'FIRST_PAYMENT_30');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_leadId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "leadId",
DROP COLUMN "paidAmount",
DROP COLUMN "paymentDueDate",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
DROP COLUMN "visaStatus",
ADD COLUMN     "bagNote" TEXT,
ADD COLUMN     "discountNote" TEXT,
ADD COLUMN     "discountPrice" DECIMAL(10,2),
ADD COLUMN     "extraBed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extraPriceForSingleTraveller" DECIMAL(10,2),
ADD COLUMN     "extraPricePerBag" DECIMAL(10,2),
ADD COLUMN     "extraPricePerBed" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "extraPricePerSeat" DECIMAL(10,2),
ADD COLUMN     "firstPaymentId" TEXT NOT NULL,
ADD COLUMN     "firstPaymentRatio" "PaymentRatio" NOT NULL DEFAULT 'FIRST_PAYMENT_50',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'DEPOSIT_PENDING',
ADD COLUMN     "roomNote" TEXT,
ADD COLUMN     "roomType" "RoomType" NOT NULL DEFAULT 'DOUBLE_BED',
ADD COLUMN     "salesUserId" TEXT NOT NULL,
ADD COLUMN     "seatClass" "SeatClass",
ADD COLUMN     "seatNote" TEXT,
ADD COLUMN     "seatType" "SeatType" NOT NULL DEFAULT 'WINDOW',
ADD COLUMN     "secondPaymentId" TEXT,
ADD COLUMN     "thirdPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "method",
DROP COLUMN "note",
ADD COLUMN     "proofOfPayment" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "VisaStatus";

-- CreateTable
CREATE TABLE "_CompanionCustomers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanionCustomers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CompanionCustomers_B_index" ON "_CompanionCustomers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_firstPaymentId_key" ON "Booking"("firstPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_secondPaymentId_key" ON "Booking"("secondPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_thirdPaymentId_key" ON "Booking"("thirdPaymentId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_salesUserId_fkey" FOREIGN KEY ("salesUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_firstPaymentId_fkey" FOREIGN KEY ("firstPaymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_secondPaymentId_fkey" FOREIGN KEY ("secondPaymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_thirdPaymentId_fkey" FOREIGN KEY ("thirdPaymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanionCustomers" ADD CONSTRAINT "_CompanionCustomers_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanionCustomers" ADD CONSTRAINT "_CompanionCustomers_B_fkey" FOREIGN KEY ("B") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
