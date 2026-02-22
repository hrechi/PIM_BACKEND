-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "isPregnant" BOOLEAN,
ADD COLUMN     "lastBirthDate" TIMESTAMP(3),
ADD COLUMN     "lastInseminationDate" TIMESTAMP(3),
ADD COLUMN     "role" TEXT;
