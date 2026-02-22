-- AlterTable
ALTER TABLE "soil_measurements" ADD COLUMN     "field_id" TEXT;

-- CreateIndex
CREATE INDEX "soil_measurements_field_id_idx" ON "soil_measurements"("field_id");

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
