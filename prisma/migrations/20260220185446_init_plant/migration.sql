-- CreateTable
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datePlanted" TIMESTAMP(3) NOT NULL,
    "specificType" TEXT NOT NULL,
    "parcelLength" DOUBLE PRECISION NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
