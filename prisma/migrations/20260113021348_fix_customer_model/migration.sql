/*
  Warnings:

  - The values [MS] on the enum `Title` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `nationality` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `issuingDate` to the `Passport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FoodAllergyType" AS ENUM ('DIARY', 'EGGS', 'FISH', 'CRUSTACEAN', 'GLUTEN', 'PEANUT_AND_NUTS', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "Title_new" AS ENUM ('MR', 'MRS', 'MISS', 'MASTER', 'OTHER');
ALTER TABLE "Customer" ALTER COLUMN "title" TYPE "Title_new" USING ("title"::text::"Title_new");
ALTER TYPE "Title" RENAME TO "Title_old";
ALTER TYPE "Title_new" RENAME TO "Title";
DROP TYPE "public"."Title_old";
COMMIT;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "nationality",
DROP COLUMN "phone",
DROP COLUMN "preferences",
DROP COLUMN "type",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "Passport" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "issuingDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "CustomerType";

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "subDistrict" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodAllergy" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "note" TEXT,
    "types" "FoodAllergyType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodAllergy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodAllergy" ADD CONSTRAINT "FoodAllergy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
