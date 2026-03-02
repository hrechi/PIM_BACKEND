-- Add image-related fields to soil_measurements table
ALTER TABLE "soil_measurements" ADD COLUMN "image_path" TEXT;
ALTER TABLE "soil_measurements" ADD COLUMN "soil_type" TEXT;
ALTER TABLE "soil_measurements" ADD COLUMN "detection_confidence" DOUBLE PRECISION;

-- Add index for soil_type to improve query performance
CREATE INDEX IF NOT EXISTS "soil_measurements_soil_type_idx" ON "soil_measurements"("soil_type");
