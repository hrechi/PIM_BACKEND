/*
  Warnings:

  - You are about to drop the column `currency` on the `fields` table. All the data in the column will be lost.
  - You are about to drop the column `currencySymbol` on the `fields` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fields" DROP COLUMN "currency",
DROP COLUMN "currencySymbol";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "currencySymbol" TEXT NOT NULL DEFAULT '$';
