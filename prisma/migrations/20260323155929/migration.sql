-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "birthCost" DOUBLE PRECISION,
ADD COLUMN     "birthWeightKg" DOUBLE PRECISION,
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "fatherId" TEXT,
ADD COLUMN     "fatteningStartDate" TIMESTAMP(3),
ADD COLUMN     "isFattening" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motherId" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'purchased',
ADD COLUMN     "saleWeightKg" DOUBLE PRECISION,
ADD COLUMN     "targetSaleDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "fieldId" TEXT;

-- AlterTable
ALTER TABLE "fields" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "currencySymbol" TEXT NOT NULL DEFAULT '$';

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
