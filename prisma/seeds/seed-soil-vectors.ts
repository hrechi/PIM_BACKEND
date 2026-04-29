import 'dotenv/config';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fieldly';
const libraryFilePath = resolve(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'soil-fingerprint-library.json',
);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureSchema(): Promise<void> {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE soil_measurements
    ADD COLUMN IF NOT EXISTS parcel_id TEXT,
    ADD COLUMN IF NOT EXISTS legacy_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vector_data JSONB,
    ADD COLUMN IF NOT EXISTS parcel_location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Tunisia',
    ADD COLUMN IF NOT EXISTS recovery_action TEXT,
    ADD COLUMN IF NOT EXISTS recovery_duration_weeks INTEGER,
    ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS soil_weather_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parcel_id TEXT REFERENCES parcels(id),
      soil_measurement_id TEXT REFERENCES soil_measurements(id),
      alert_type VARCHAR(50),
      severity VARCHAR(20),
      message TEXT,
      action TEXT,
      weather_data JSONB,
      soil_data JSONB,
      triggered_at TIMESTAMP DEFAULT NOW(),
      is_read BOOLEAN DEFAULT FALSE
    );
  `);
}

async function validateStaticLibraryFile(): Promise<void> {
  const raw = await readFile(libraryFilePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('soil-fingerprint-library.json must be a JSON array.');
  }

  if (parsed.length === 0) {
    throw new Error('soil-fingerprint-library.json cannot be empty.');
  }

  for (const [index, item] of parsed.entries()) {
    if (!item || typeof item !== 'object') {
      throw new Error(`Library row at index ${index} is invalid.`);
    }

    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || row.id.trim().length === 0) {
      throw new Error(`Library row at index ${index} is missing id.`);
    }

    const soilData = row.soil_data;
    if (!soilData || typeof soilData !== 'object') {
      throw new Error(`Library row ${row.id} is missing soil_data object.`);
    }
  }

  console.log(`✓ Fingerprint library file loaded: ${parsed.length} rows`);
}

async function cleanupLegacySeededRows(): Promise<void> {
  const deleted = await prisma.$executeRawUnsafe(`
    DELETE FROM soil_measurements
    WHERE legacy_code LIKE 'hist-%';
  `);

  console.log(`✓ Removed ${Number(deleted)} old seeded fake soil rows from soil_measurements`);
}

async function seedDemoAlert(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    INSERT INTO soil_weather_alerts (parcel_id, alert_type, severity, message, action, weather_data, soil_data)
    SELECT
      p.id,
      'FLOOD_RISK',
      'HIGH',
      'Flood Risk: 28mm rain expected in 48h and your soil is already at 72% moisture. Root rot risk is HIGH.',
      'Stop all irrigation immediately. Dig drainage channels before rain arrives.',
      '{"rain_mm_48h": 28, "temp_forecast_max": 31, "temp_forecast_min": 18}'::jsonb,
      '{"moisture": 72, "ph": 5.8, "temperature": 29}'::jsonb
    FROM parcels p
    WHERE NOT EXISTS (
      SELECT 1 FROM soil_weather_alerts swa
      WHERE swa.parcel_id = p.id
        AND swa.is_read = FALSE
        AND swa.alert_type = 'FLOOD_RISK'
        AND swa.severity = 'HIGH'
    )
    LIMIT 1;
  `);

  console.log('✓ Demo weather alert inserted (if at least one parcel exists).');
}

async function main(): Promise<void> {
  await ensureSchema();
  await validateStaticLibraryFile();
  await cleanupLegacySeededRows();
  await seedDemoAlert();
  console.log('✅ Soil fingerprint file setup complete (file-based library active).');
}

main()
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
