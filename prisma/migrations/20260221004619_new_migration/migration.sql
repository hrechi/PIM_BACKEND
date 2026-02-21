-- CreateTable
CREATE TABLE "soil_measurements" (
    "id" TEXT NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "soil_moisture" DOUBLE PRECISION NOT NULL,
    "sunlight" DOUBLE PRECISION NOT NULL,
    "nutrients" JSONB NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soil_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "soil_measurements_created_at_idx" ON "soil_measurements"("created_at");

-- CreateIndex
CREATE INDEX "soil_measurements_latitude_longitude_idx" ON "soil_measurements"("latitude", "longitude");
