-- This migration is intentionally idempotent to recover drifted dev databases.

-- Add compatibility columns expected by the current Prisma schema.
ALTER TABLE "vaccine_records"
ADD COLUMN IF NOT EXISTS "vaccineDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "vaccineName" TEXT,
ADD COLUMN IF NOT EXISTS "vetName" TEXT;

UPDATE "vaccine_records"
SET "vaccineDate" = COALESCE("vaccineDate", "administeredAt", "createdAt")
WHERE "vaccineDate" IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'vaccines'
    ) THEN
        UPDATE "vaccine_records" vr
        SET "vaccineName" = COALESCE(vr."vaccineName", v."nameEn", v."nameFr", 'Unknown')
        FROM "vaccines" v
        WHERE vr."vaccineName" IS NULL
            AND vr."vaccineId" = v."id";
    END IF;
END $$;

UPDATE "vaccine_records"
SET "vaccineName" = COALESCE("vaccineName", 'Unknown')
WHERE "vaccineName" IS NULL;

ALTER TABLE "vaccine_records"
ALTER COLUMN "vaccineDate" SET NOT NULL,
ALTER COLUMN "vaccineName" SET NOT NULL;

-- Create missing tables introduced by the schema.
CREATE TABLE IF NOT EXISTS "quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "parcelId" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ndvi_records" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgNDVI" DOUBLE PRECISION NOT NULL,
    "gridData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ndvi_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "quiz_results_userId_idx" ON "quiz_results"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "badges_userId_type_key" ON "badges"("userId", "type");
CREATE INDEX IF NOT EXISTS "ndvi_records_fieldId_idx" ON "ndvi_records"("fieldId");
CREATE INDEX IF NOT EXISTS "soil_measurements_parcel_id_idx" ON "soil_measurements"("parcel_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quiz_results_userId_fkey'
    ) THEN
        ALTER TABLE "quiz_results"
        ADD CONSTRAINT "quiz_results_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'badges_userId_fkey'
    ) THEN
        ALTER TABLE "badges"
        ADD CONSTRAINT "badges_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ndvi_records_fieldId_fkey'
    ) THEN
        ALTER TABLE "ndvi_records"
        ADD CONSTRAINT "ndvi_records_fieldId_fkey"
        FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'soil_measurements_parcel_id_fkey'
    ) THEN
        ALTER TABLE "soil_measurements"
        ADD CONSTRAINT "soil_measurements_parcel_id_fkey"
        FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
