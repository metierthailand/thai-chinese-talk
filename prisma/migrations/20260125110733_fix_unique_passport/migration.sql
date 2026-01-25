/*
  Warnings:

  - A unique constraint covering the columns `[passportNumber]` on the table `Passport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Passport_passportNumber_key" ON "Passport"("passportNumber");
