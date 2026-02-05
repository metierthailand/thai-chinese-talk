-- Drop old BookingCompanion (join table bookingId + customerId)
-- Replace with group model: one row per companion group per trip
ALTER TABLE "BookingCompanion" DROP CONSTRAINT IF EXISTS "BookingCompanion_bookingId_fkey";
ALTER TABLE "BookingCompanion" DROP CONSTRAINT IF EXISTS "BookingCompanion_customerId_fkey";
DROP TABLE "BookingCompanion";

-- Create new BookingCompanion (group table)
CREATE TABLE "BookingCompanion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCompanion_pkey" PRIMARY KEY ("id")
);

-- Add companionGroupId to Booking
ALTER TABLE "Booking" ADD COLUMN "companionGroupId" TEXT;

-- FK: BookingCompanion.tripId -> Trip
ALTER TABLE "BookingCompanion" ADD CONSTRAINT "BookingCompanion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: Booking.companionGroupId -> BookingCompanion
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companionGroupId_fkey" FOREIGN KEY ("companionGroupId") REFERENCES "BookingCompanion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for lookups by trip
CREATE INDEX "BookingCompanion_tripId_idx" ON "BookingCompanion"("tripId");
