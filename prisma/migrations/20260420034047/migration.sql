-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SaleCatalogue" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3),
    "location" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "showPrices" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "shareViewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueAnimal" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CatalogueAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleCatalogue_shareToken_key" ON "SaleCatalogue"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueAnimal_catalogueId_animalId_key" ON "CatalogueAnimal"("catalogueId", "animalId");

-- AddForeignKey
ALTER TABLE "SaleCatalogue" ADD CONSTRAINT "SaleCatalogue_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueAnimal" ADD CONSTRAINT "CatalogueAnimal_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "SaleCatalogue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueAnimal" ADD CONSTRAINT "CatalogueAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
