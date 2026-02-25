-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_passportId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "passportId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "Passport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
