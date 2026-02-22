/*
  Warnings:

  - You are about to drop the column `color` on the `animals` table. All the data in the column will be lost.
  - You are about to drop the column `farmerId` on the `animals` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `animals` table. All the data in the column will be lost.
  - You are about to drop the column `vaccines` on the `animals` table. All the data in the column will be lost.
  - The `status` column on the `missions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `missions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `userId` to the `animals` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `animalType` on the `animals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sex` on the `animals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `missionType` on the `missions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `fieldId` to the `soil_measurements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('cow', 'horse', 'sheep', 'dog', 'goat', 'chicken', 'pig');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('active', 'sold', 'deceased');

-- CreateEnum
CREATE TYPE "RaceCategory" AS ENUM ('course', 'loisir', 'sport');

-- CreateEnum
CREATE TYPE "TrainingLevel" AS ENUM ('debutant', 'intermediaire', 'avance', 'confirme', 'elite');

-- CreateEnum
CREATE TYPE "MeatGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "DogRole" AS ENUM ('garde', 'berger', 'compagnie');

-- CreateEnum
CREATE TYPE "MedicalEventType" AS ENUM ('visit', 'disease', 'surgery', 'treatment', 'checkup', 'vaccination', 'other');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('PLANTING', 'HARVESTING', 'IRRIGATION', 'FERTILIZING', 'PEST_CONTROL', 'MAINTENANCE', 'MONITORING', 'ANIMAL_CARE', 'FEEDING', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "animals" DROP CONSTRAINT "animals_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_fieldId_fkey";

-- DropIndex
DROP INDEX "soil_measurements_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "animals" DROP COLUMN "color",
DROP COLUMN "farmerId",
DROP COLUMN "role",
DROP COLUMN "vaccines",
ADD COLUMN     "bestRaceTime" DECIMAL(8,3),
ADD COLUMN     "birthCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyMilkAvgL" DECIMAL(5,2),
ADD COLUMN     "diseaseHistoryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dogRole" "DogRole",
ADD COLUMN     "estimatedValue" DECIMAL(10,2),
ADD COLUMN     "expectedBirthDate" TIMESTAMP(3),
ADD COLUMN     "fieldId" TEXT,
ADD COLUMN     "healthRiskScore" DOUBLE PRECISION,
ADD COLUMN     "lactationNumber" INTEGER,
ADD COLUMN     "meatGrade" "MeatGrade",
ADD COLUMN     "milkPeakDate" TIMESTAMP(3),
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchasePrice" DECIMAL(10,2),
ADD COLUMN     "raceCategory" "RaceCategory",
ADD COLUMN     "saleDate" TIMESTAMP(3),
ADD COLUMN     "salePrice" DECIMAL(10,2),
ADD COLUMN     "status" "AnimalStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "trainingLevel" "TrainingLevel",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "woolLastShearDate" TIMESTAMP(3),
DROP COLUMN "animalType",
ADD COLUMN     "animalType" "AnimalType" NOT NULL,
DROP COLUMN "sex",
ADD COLUMN     "sex" "Sex" NOT NULL;

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "animalId" TEXT,
ALTER COLUMN "fieldId" DROP NOT NULL,
DROP COLUMN "missionType",
ADD COLUMN     "missionType" "MissionType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "MissionStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "priority",
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "security_incidents" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "soil_measurements" ADD COLUMN     "fieldId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "vaccine_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccineDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "vetName" TEXT,
    "lotNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccine_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_events" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" "MedicalEventType" NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "vetName" TEXT,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_alerts" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "alertTime" TIMESTAMP(3) NOT NULL,
    "alertLevel" "AlertLevel" NOT NULL,
    "predictedDisease" TEXT,
    "confidence" DOUBLE PRECISION,
    "anomalyScore" DOUBLE PRECISION,
    "vetConfirmed" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "collarId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "temperature" DOUBLE PRECISION,
    "heartRate" DOUBLE PRECISION,
    "accX" DOUBLE PRECISION,
    "accY" DOUBLE PRECISION,
    "accZ" DOUBLE PRECISION,
    "activityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milk_productions" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "morningL" DECIMAL(6,2),
    "eveningL" DECIMAL(6,2),
    "totalL" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milk_productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_performances" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "raceName" TEXT,
    "position" INTEGER,
    "timeSeconds" DECIMAL(8,3),
    "distanceM" INTEGER,
    "trackCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "race_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "measuredDate" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(7,2) NOT NULL,
    "measuredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT,
    "animalId" TEXT,
    "missionId" TEXT,
    "userId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sensor_readings_animalId_timestamp_idx" ON "sensor_readings"("animalId", "timestamp");

-- CreateIndex
CREATE INDEX "missions_animalId_idx" ON "missions"("animalId");

-- CreateIndex
CREATE INDEX "soil_measurements_fieldId_idx" ON "soil_measurements"("fieldId");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_events" ADD CONSTRAINT "medical_events_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_alerts" ADD CONSTRAINT "health_alerts_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_productions" ADD CONSTRAINT "milk_productions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_performances" ADD CONSTRAINT "race_performances_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
