/*
  Warnings:

  - You are about to drop the `plants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "plants" DROP CONSTRAINT "plants_farmerId_fkey";

-- DropTable
DROP TABLE "plants";

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "areaSize" DOUBLE PRECISION NOT NULL,
    "boundariesDescription" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "soilPh" DOUBLE PRECISION,
    "nitrogenLevel" DOUBLE PRECISION,
    "phosphorusLevel" DOUBLE PRECISION,
    "potassiumLevel" DOUBLE PRECISION,
    "waterSource" TEXT NOT NULL,
    "irrigationMethod" TEXT NOT NULL,
    "irrigationFrequency" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fertilizations" (
    "id" TEXT NOT NULL,
    "fertilizerType" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fertilizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pest_diseases" (
    "id" TEXT NOT NULL,
    "issueType" TEXT,
    "treatmentUsed" TEXT,
    "treatmentDate" TIMESTAMP(3),
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pest_diseases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "totalYield" DOUBLE PRECISION,
    "yieldPerHectare" DOUBLE PRECISION,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fertilizations" ADD CONSTRAINT "fertilizations_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pest_diseases" ADD CONSTRAINT "pest_diseases_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
