-- Add SessionCondition enum safely (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionCondition') THEN
    CREATE TYPE "SessionCondition" AS ENUM ('GOOD', 'WARNING', 'CRITICAL');
  END IF;
END $$;

-- Add usage_logs checkout fields safely
ALTER TABLE "usage_logs"
  ADD COLUMN IF NOT EXISTS "field_id" TEXT,
  ADD COLUMN IF NOT EXISTS "duration" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "distance_km" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "issues" TEXT,
  ADD COLUMN IF NOT EXISTS "maintenance_note" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usage_logs' AND column_name = 'condition'
  ) THEN
    ALTER TABLE "usage_logs" ADD COLUMN "condition" "SessionCondition";
  END IF;
END $$;

-- Add FK and index for field relation when missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_logs_field_id_fkey'
  ) THEN
    ALTER TABLE "usage_logs"
      ADD CONSTRAINT "usage_logs_field_id_fkey"
      FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "usage_logs_field_id_idx" ON "usage_logs"("field_id");
