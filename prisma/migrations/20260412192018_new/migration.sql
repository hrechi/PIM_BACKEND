/*
  Warnings:

  - The primary key for the `soil_measurements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `soil_measurements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `field_id` column on the `soil_measurements` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `vaccineDate` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vaccineName` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "soil_measurements" DROP CONSTRAINT "soil_measurements_field_id_fkey";

-- AlterTable
ALTER TABLE "soil_measurements" DROP CONSTRAINT "soil_measurements_pkey",
RENAME CONSTRAINT "soil_measurements_pkey" TO "PK_26b4f52c4005e567602987343a6",
ADD COLUMN     "parcel_id" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6),
DROP COLUMN "field_id",
ADD COLUMN     "field_id" UUID,
ALTER COLUMN "image_path" SET DATA TYPE VARCHAR,
ALTER COLUMN "soil_type" SET DATA TYPE VARCHAR,
ADD CONSTRAINT "PK_26b4f52c4005e567602987343a6" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vaccine_records" ADD COLUMN     "vaccineDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vaccineName" TEXT NOT NULL,
ADD COLUMN     "vetName" TEXT;

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "parcelId" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ndvi_records" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgNDVI" DOUBLE PRECISION NOT NULL,
    "gridData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ndvi_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_userId_type_key" ON "badges"("userId", "type");

-- CreateIndex
CREATE INDEX "ndvi_records_fieldId_idx" ON "ndvi_records"("fieldId");

-- CreateIndex
CREATE INDEX "IDX_b1d30f7933303444ba94550db7" ON "soil_measurements"("field_id");

-- CreateIndex
CREATE INDEX "soil_measurements_parcel_id_idx" ON "soil_measurements"("parcel_id");

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndvi_records" ADD CONSTRAINT "ndvi_records_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "soil_measurements_created_at_idx" RENAME TO "IDX_1b5048dedf4b0c67b0e3d69028";

-- RenameIndex
ALTER INDEX "soil_measurements_field_id_idx" RENAME TO "IDX_b1d30f7933303444ba94550db7";

-- RenameIndex
ALTER INDEX "soil_measurements_latitude_longitude_idx" RENAME TO "IDX_db34dddb4edfd4e726c70f52b0";

-- RenameIndex
ALTER INDEX "soil_measurements_soil_type_idx" RENAME TO "IDX_0a742379a0b58d214968308ae8";
