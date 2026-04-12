/*
  Warnings:

  - You are about to drop the column `parcelId` on the `ndvi_records` table. All the data in the column will be lost.
  - Added the required column `fieldId` to the `ndvi_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ndvi_records" DROP CONSTRAINT "ndvi_records_parcelId_fkey";

-- DropIndex
DROP INDEX "ndvi_records_parcelId_idx";

-- AlterTable
ALTER TABLE "fields" ADD COLUMN     "ndviData" JSONB;

-- AlterTable
ALTER TABLE "ndvi_records" DROP COLUMN "parcelId",
ADD COLUMN     "fieldId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ndvi_records_fieldId_idx" ON "ndvi_records"("fieldId");

-- AddForeignKey
ALTER TABLE "ndvi_records" ADD CONSTRAINT "ndvi_records_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
