-- AlterTable
ALTER TABLE "security_incidents" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcmToken" TEXT;

-- CreateTable
CREATE TABLE "crop_requirements" (
    "id" TEXT NOT NULL,
    "crop_name" TEXT NOT NULL,
    "min_ph" DOUBLE PRECISION NOT NULL,
    "max_ph" DOUBLE PRECISION NOT NULL,
    "min_moisture" DOUBLE PRECISION NOT NULL,
    "max_moisture" DOUBLE PRECISION NOT NULL,
    "nitrogen_required" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "crop_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_regions" (
    "id" TEXT NOT NULL,
    "crop_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "crop_regions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crop_requirements_crop_name_idx" ON "crop_requirements"("crop_name");

-- CreateIndex
CREATE INDEX "crop_regions_crop_name_idx" ON "crop_regions"("crop_name");

-- CreateIndex
CREATE INDEX "crop_regions_country_idx" ON "crop_regions"("country");
