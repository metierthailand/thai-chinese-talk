-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "roommateGroupId" TEXT;

-- CreateTable
CREATE TABLE "BookingRoommateGroup" (
    "id" TEXT NOT NULL,
    "companionGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRoommateGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BookingRoommateGroup" ADD CONSTRAINT "BookingRoommateGroup_companionGroupId_fkey" FOREIGN KEY ("companionGroupId") REFERENCES "BookingCompanion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roommateGroupId_fkey" FOREIGN KEY ("roommateGroupId") REFERENCES "BookingRoommateGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
