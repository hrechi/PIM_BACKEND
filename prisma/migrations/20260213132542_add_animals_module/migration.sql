-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "animalType" TEXT NOT NULL,
    "breed" TEXT,
    "age" INTEGER NOT NULL,
    "ageYears" INTEGER NOT NULL DEFAULT 0,
    "sex" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "color" TEXT,
    "healthStatus" TEXT NOT NULL DEFAULT 'OPTIMAL',
    "vitalityScore" INTEGER NOT NULL DEFAULT 100,
    "bodyTemp" DOUBLE PRECISION,
    "activityLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "lastVetCheck" TIMESTAMP(3),
    "vaccination" BOOLEAN NOT NULL DEFAULT false,
    "milkYield" DOUBLE PRECISION,
    "fatContent" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "feedIntakeRecorded" TIMESTAMP(3),
    "dewormingScheduled" TIMESTAMP(3),
    "profileImage" TEXT,
    "tagNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "animals_nodeId_key" ON "animals"("nodeId");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
