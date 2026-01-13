/*
  Warnings:

  - The values [WEBSITE,WALKIN,REFERRAL,SOCIAL,LINE,OTHER] on the enum `LeadSource` will be removed. If these variants are still used in the database, this will fail.
  - The values [NEW,CONTACTED,QUOTED,NEGOTIATING,CLOSED_WON,CLOSED_LOST,ABANDONED] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `closedAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `destinationInterest` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivityAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `potentialValue` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `travelDateEstimate` on the `Lead` table. All the data in the column will be lost.
  - Added the required column `salesUserId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripInterest` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadSource_new" AS ENUM ('FACEBOOK', 'YOUTUBE', 'TIKTOK', 'FRIEND');
ALTER TABLE "public"."Lead" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "source" TYPE "LeadSource_new" USING ("source"::text::"LeadSource_new");
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
ALTER TYPE "LeadSource_new" RENAME TO "LeadSource";
DROP TYPE "public"."LeadSource_old";
ALTER TABLE "Lead" ALTER COLUMN "source" SET DEFAULT 'FACEBOOK';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('INTERESTED', 'BOOKED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'INTERESTED';
COMMIT;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "closedAt",
DROP COLUMN "destinationInterest",
DROP COLUMN "lastActivityAt",
DROP COLUMN "notes",
DROP COLUMN "potentialValue",
DROP COLUMN "travelDateEstimate",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "leadNote" TEXT,
ADD COLUMN     "lineId" TEXT,
ADD COLUMN     "newCustomer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pax" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "salesUserId" TEXT NOT NULL,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "tripInterest" TEXT NOT NULL,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "source" SET DEFAULT 'FACEBOOK',
ALTER COLUMN "status" SET DEFAULT 'INTERESTED';

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_salesUserId_fkey" FOREIGN KEY ("salesUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
