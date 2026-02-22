-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('cow', 'horse', 'sheep', 'dog');

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
CREATE TYPE "MedicalEventType" AS ENUM ('visit', 'disease', 'surgery', 'treatment', 'checkup', 'other');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "animalType" "AnimalType" NOT NULL,
    "breed" TEXT,
    "sex" "Sex" NOT NULL,
    "tagNumber" TEXT,
    "profileImage" TEXT,
    "notes" TEXT,
    "age" INTEGER NOT NULL,
    "ageYears" INTEGER NOT NULL DEFAULT 0,
    "isPregnant" BOOLEAN,
    "lastInseminationDate" TIMESTAMP(3),
    "lastBirthDate" TIMESTAMP(3),
    "expectedBirthDate" TIMESTAMP(3),
    "birthCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AnimalStatus" NOT NULL DEFAULT 'active',
    "healthStatus" TEXT NOT NULL DEFAULT 'OPTIMAL',
    "vitalityScore" INTEGER NOT NULL DEFAULT 100,
    "bodyTemp" DOUBLE PRECISION,
    "activityLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "lastVetCheck" TIMESTAMP(3),
    "vaccination" BOOLEAN NOT NULL DEFAULT false,
    "healthRiskScore" DOUBLE PRECISION,
    "diseaseHistoryCount" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION,
    "milkYield" DOUBLE PRECISION,
    "woolYield" DOUBLE PRECISION,
    "fatContent" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "productionHabit" TEXT,
    "feedIntakeRecorded" TIMESTAMP(3),
    "dewormingScheduled" TIMESTAMP(3),
    "birthHistory" JSONB,
    "dailyMilkAvgL" DECIMAL(5,2),
    "milkPeakDate" TIMESTAMP(3),
    "lactationNumber" INTEGER,
    "raceCategory" "RaceCategory",
    "bestRaceTime" DECIMAL(8,3),
    "trainingLevel" "TrainingLevel",
    "woolLastShearDate" TIMESTAMP(3),
    "meatGrade" "MeatGrade",
    "dogRole" "DogRole",
    "purchasePrice" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "estimatedValue" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2),
    "saleDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

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
    "animalId" TEXT,
    "farmId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "animals_nodeId_key" ON "animals"("nodeId");

-- CreateIndex
CREATE INDEX "sensor_readings_animalId_timestamp_idx" ON "sensor_readings"("animalId", "timestamp");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_events" ADD CONSTRAINT "medical_events_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_alerts" ADD CONSTRAINT "health_alerts_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_productions" ADD CONSTRAINT "milk_productions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_performances" ADD CONSTRAINT "race_performances_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
