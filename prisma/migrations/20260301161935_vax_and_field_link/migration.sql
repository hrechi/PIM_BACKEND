/*
  Warnings:

  - Added the required column `fieldId` to the `animals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "fieldId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
