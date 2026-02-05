-- DropIndex
DROP INDEX "BookingCompanion_tripId_idx";

-- AlterTable
ALTER TABLE "BookingCompanion" ALTER COLUMN "updatedAt" DROP DEFAULT;
