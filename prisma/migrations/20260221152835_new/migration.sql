/*
  Warnings:

  - You are about to drop the column `animalId` on the `missions` table. All the data in the column will be lost.
  - The `status` column on the `missions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `missions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `latitude` on the `security_incidents` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `security_incidents` table. All the data in the column will be lost.
  - You are about to drop the column `fieldId` on the `soil_measurements` table. All the data in the column will be lost.
  - You are about to drop the `animals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `expenses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `health_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medical_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `milk_productions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `race_performances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sensor_readings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vaccine_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `weight_records` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `fieldId` on table `missions` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `missionType` on the `missions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "animals" DROP CONSTRAINT "animals_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "animals" DROP CONSTRAINT "animals_userId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_animalId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_missionId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_userId_fkey";

-- DropForeignKey
ALTER TABLE "health_alerts" DROP CONSTRAINT "health_alerts_animalId_fkey";

-- DropForeignKey
ALTER TABLE "medical_events" DROP CONSTRAINT "medical_events_animalId_fkey";

-- DropForeignKey
ALTER TABLE "milk_productions" DROP CONSTRAINT "milk_productions_animalId_fkey";

-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_animalId_fkey";

-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "race_performances" DROP CONSTRAINT "race_performances_animalId_fkey";

-- DropForeignKey
ALTER TABLE "sensor_readings" DROP CONSTRAINT "sensor_readings_animalId_fkey";

-- DropForeignKey
ALTER TABLE "soil_measurements" DROP CONSTRAINT "soil_measurements_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "vaccine_records" DROP CONSTRAINT "vaccine_records_animalId_fkey";

-- DropForeignKey
ALTER TABLE "weight_records" DROP CONSTRAINT "weight_records_animalId_fkey";

-- DropIndex
DROP INDEX "missions_animalId_idx";

-- DropIndex
DROP INDEX "soil_measurements_fieldId_idx";

-- AlterTable
ALTER TABLE "missions" DROP COLUMN "animalId",
ALTER COLUMN "fieldId" SET NOT NULL,
DROP COLUMN "missionType",
ADD COLUMN     "missionType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "security_incidents" DROP COLUMN "latitude",
DROP COLUMN "longitude";

-- AlterTable
ALTER TABLE "soil_measurements" DROP COLUMN "fieldId";

-- DropTable
DROP TABLE "animals";

-- DropTable
DROP TABLE "expenses";

-- DropTable
DROP TABLE "health_alerts";

-- DropTable
DROP TABLE "medical_events";

-- DropTable
DROP TABLE "milk_productions";

-- DropTable
DROP TABLE "race_performances";

-- DropTable
DROP TABLE "sensor_readings";

-- DropTable
DROP TABLE "vaccine_records";

-- DropTable
DROP TABLE "weight_records";

-- DropEnum
DROP TYPE "AlertLevel";

-- DropEnum
DROP TYPE "AnimalStatus";

-- DropEnum
DROP TYPE "AnimalType";

-- DropEnum
DROP TYPE "DogRole";

-- DropEnum
DROP TYPE "MeatGrade";

-- DropEnum
DROP TYPE "MedicalEventType";

-- DropEnum
DROP TYPE "MissionStatus";

-- DropEnum
DROP TYPE "MissionType";

-- DropEnum
DROP TYPE "Priority";

-- DropEnum
DROP TYPE "RaceCategory";

-- DropEnum
DROP TYPE "Sex";

-- DropEnum
DROP TYPE "TrainingLevel";

-- CreateIndex
CREATE INDEX "soil_measurements_latitude_longitude_idx" ON "soil_measurements"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
