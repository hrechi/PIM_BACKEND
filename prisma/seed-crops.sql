-- Seed script for crop requirements and crop regions
-- Run this manually if Prisma migration has issues

-- Create crop_requirements table if not exists
CREATE TABLE IF NOT EXISTS crop_requirements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    crop_name TEXT NOT NULL,
    min_ph DOUBLE PRECISION NOT NULL,
    max_ph DOUBLE PRECISION NOT NULL,
    min_moisture DOUBLE PRECISION NOT NULL,
    max_moisture DOUBLE PRECISION NOT NULL,
    nitrogen_required DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS crop_requirements_crop_name_idx ON crop_requirements(crop_name);

-- Create crop_regions table if not exists
CREATE TABLE IF NOT EXISTS crop_regions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    crop_name TEXT NOT NULL,
    country TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS crop_regions_crop_name_idx ON crop_regions(crop_name);
CREATE INDEX IF NOT EXISTS crop_regions_country_idx ON crop_regions(country);

-- Insert crop requirements
INSERT INTO crop_requirements (id, crop_name, min_ph, max_ph, min_moisture, max_moisture, nitrogen_required)
VALUES
    ('seed-cucumbers', 'Cucumbers', 6.0, 7.0, 55, 80, 150),
    ('seed-tomatoes', 'Tomatoes', 6.0, 6.8, 40, 70, 180),
    ('seed-lettuce', 'Lettuce', 6.0, 7.5, 50, 80, 90),
    ('seed-potatoes', 'Potatoes', 5.0, 7.0, 40, 70, 140),
    ('seed-carrots', 'Carrots', 6.0, 7.0, 35, 65, 120),
    ('seed-peppers', 'Peppers', 6.0, 7.0, 40, 70, 160),
    ('seed-spinach', 'Spinach', 6.5, 7.8, 55, 80, 130),
    ('seed-beans', 'Beans', 6.0, 7.5, 40, 65, 80),
    ('seed-strawberries', 'Strawberries', 5.5, 6.8, 45, 70, 100),
    ('seed-blueberries', 'Blueberries', 4.0, 6.0, 50, 80, 90),
    ('seed-olive-trees', 'Olive Trees', 6.5, 8.5, 25, 55, 120),
    ('seed-basil', 'Basil', 6.0, 7.5, 45, 70, 100)
ON CONFLICT (id) DO UPDATE SET
    crop_name = EXCLUDED.crop_name,
    min_ph = EXCLUDED.min_ph,
    max_ph = EXCLUDED.max_ph,
    min_moisture = EXCLUDED.min_moisture,
    max_moisture = EXCLUDED.max_moisture,
    nitrogen_required = EXCLUDED.nitrogen_required;

-- Insert crop regions
INSERT INTO crop_regions (crop_name, country)
VALUES
    -- Tunisia crops
    ('Cucumbers', 'Tunisia'),
    ('Tomatoes', 'Tunisia'),
    ('Potatoes', 'Tunisia'),
    ('Carrots', 'Tunisia'),
    ('Lettuce', 'Tunisia'),
    ('Peppers', 'Tunisia'),
    ('Beans', 'Tunisia'),
    ('Strawberries', 'Tunisia'),
    ('Olive Trees', 'Tunisia'),
    ('Basil', 'Tunisia'),
    
    -- Morocco crops
    ('Tomatoes', 'Morocco'),
    ('Potatoes', 'Morocco'),
    ('Carrots', 'Morocco'),
    ('Peppers', 'Morocco'),
    ('Olive Trees', 'Morocco'),
    
    -- France crops
    ('Tomatoes', 'France'),
    ('Potatoes', 'France'),
    ('Carrots', 'France'),
    ('Lettuce', 'France'),
    ('Beans', 'France'),
    ('Strawberries', 'France'),
    ('Blueberries', 'France'),
    ('Basil', 'France'),
    
    -- USA crops
    ('Tomatoes', 'USA'),
    ('Potatoes', 'USA'),
    ('Beans', 'USA'),
    ('Lettuce', 'USA'),
    ('Carrots', 'USA'),
    ('Cucumbers', 'USA'),
    ('Peppers', 'USA'),
    ('Strawberries', 'USA'),
    ('Blueberries', 'USA')
ON CONFLICT DO NOTHING;

-- Output success
SELECT 'Seed data inserted successfully!' AS message;
SELECT COUNT(*) AS crop_requirements_count FROM crop_requirements;
SELECT COUNT(*) AS crop_regions_count FROM crop_regions;
