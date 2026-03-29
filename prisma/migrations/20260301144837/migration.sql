/*
  Warnings:

  - You are about to drop the column `vaccineDate` on the `vaccine_records` table. All the data in the column will be lost.
  - You are about to drop the column `vaccineName` on the `vaccine_records` table. All the data in the column will be lost.
  - You are about to drop the column `vetName` on the `vaccine_records` table. All the data in the column will be lost.
  - Added the required column `administeredAt` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `administeredBy` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doseGiven` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vaccineId` to the `vaccine_records` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM ('MANDATORY', 'MANDATORY_ZONES', 'MANDATORY_CONDITIONAL', 'RECOMMENDED', 'VOLUNTARY', 'FORBIDDEN', 'FORBIDDEN_ZONES', 'NOT_APPLICABLE', 'UNDER_ERADICATION');

-- CreateEnum
CREATE TYPE "FMDZoneStatus" AS ENUM ('ENDEMIC_WITH_VAX', 'FREE_WITH_VAX', 'FREE_WITHOUT_VAX', 'SURVEILLANCE');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'NOTIFIED', 'DONE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VaccineRoute" AS ENUM ('SUBCUTANEOUS', 'INTRAMUSCULAR', 'INTRANASAL', 'ORAL');

-- CreateEnum
CREATE TYPE "VaccinePriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "OIERegion" AS ENUM ('AFRICA_NORTH', 'AFRICA_SUB_SAHARAN', 'EUROPE_WEST', 'EUROPE_EAST', 'AMERICAS_NORTH', 'AMERICAS_SOUTH', 'AMERICAS_CENTRAL', 'ASIA_PACIFIC', 'MIDDLE_EAST');

-- AlterTable
ALTER TABLE "fields" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "fmdFreeZone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regionCode" TEXT,
ADD COLUMN     "regionId" TEXT;

-- AlterTable
ALTER TABLE "vaccine_records" DROP COLUMN "vaccineDate",
DROP COLUMN "vaccineName",
DROP COLUMN "vetName",
ADD COLUMN     "administeredAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "administeredBy" TEXT NOT NULL,
ADD COLUMN     "bodyWeight" DOUBLE PRECISION,
ADD COLUMN     "dateEstimated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doseGiven" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "doseUnit" TEXT NOT NULL DEFAULT 'ml',
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "route" "VaccineRoute" NOT NULL DEFAULT 'SUBCUTANEOUS',
ADD COLUMN     "scheduleId" TEXT,
ADD COLUMN     "vaccineId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameAr" TEXT,
    "vetAuthority" TEXT NOT NULL,
    "vetAuthorityUrl" TEXT,
    "oieRegion" "OIERegion" NOT NULL,
    "fmdZoneStatus" "FMDZoneStatus" NOT NULL DEFAULT 'ENDEMIC_WITH_VAX',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_regions" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fmdZoneStatus" "FMDZoneStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "field_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "targetSpecies" JSONB NOT NULL,
    "manufacturer" TEXT,
    "doseUnit" TEXT NOT NULL DEFAULT 'ml',
    "defaultIntervalDays" INTEGER NOT NULL DEFAULT 365,
    "isCoreVaccine" BOOLEAN NOT NULL DEFAULT false,
    "intervalDaysOverride" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_regulations" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT,
    "vaccineId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "status" "RegulationStatus" NOT NULL,
    "frequency" TEXT,
    "intervalDays" INTEGER NOT NULL,
    "ageMinDays" INTEGER,
    "ageMaxDays" INTEGER,
    "mandatoryFor" TEXT,
    "legalBasis" TEXT,
    "isFreeNational" BOOLEAN NOT NULL DEFAULT false,
    "isSubsidized" BOOLEAN NOT NULL DEFAULT false,
    "subsidyAmount" DOUBLE PRECISION,
    "seasonalMonthStart" INTEGER,
    "seasonalMonthEnd" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_campaign_periods" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "vaccineCode" TEXT NOT NULL,
    "species" JSONB NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isSubsidized" BOOLEAN NOT NULL DEFAULT false,
    "subsidyAmount" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "vaccine_campaign_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_schedules" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "regulationId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceDays" INTEGER,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "priority" "VaccinePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_notification_logs" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vaccine_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "field_regions_countryId_code_key" ON "field_regions"("countryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_regulations_countryId_regionId_vaccineId_species_key" ON "vaccine_regulations"("countryId", "regionId", "vaccineId", "species");

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "field_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_regions" ADD CONSTRAINT "field_regions_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "field_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_campaign_periods" ADD CONSTRAINT "vaccine_campaign_periods_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_schedules" ADD CONSTRAINT "vaccine_schedules_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_schedules" ADD CONSTRAINT "vaccine_schedules_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_notification_logs" ADD CONSTRAINT "vaccine_notification_logs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "vaccine_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "vaccine_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
