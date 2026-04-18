/*
  Warnings:

  - Added the required column `field_id` to the `assets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "field_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "assets_field_id_idx" ON "assets"("field_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
