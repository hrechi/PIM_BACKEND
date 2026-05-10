-- Migration: add revenues table
-- Safe to run: only adds new table and columns, no data loss

-- Create revenues table
CREATE TABLE IF NOT EXISTS revenues (
  id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "farmId"    TEXT,
  "fieldId"   TEXT,
  date        TIMESTAMP   NOT NULL,
  category    TEXT        NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMP   NOT NULL DEFAULT NOW(),

  CONSTRAINT revenues_pkey PRIMARY KEY (id),
  CONSTRAINT revenues_farmId_fkey  FOREIGN KEY ("farmId")  REFERENCES users(id)  ON DELETE SET NULL,
  CONSTRAINT revenues_fieldId_fkey FOREIGN KEY ("fieldId") REFERENCES fields(id) ON DELETE SET NULL
);

-- Index for fast queries by field and date
CREATE INDEX IF NOT EXISTS idx_revenues_fieldId_date ON revenues ("fieldId", date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_farmId       ON revenues ("farmId");
