import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

async function main() {
  console.log('🌾 Seeding crop requirements and regions...\n');

  // ==================== CROP REQUIREMENTS ====================
  const requirements = [
    {
      cropName: 'Cucumbers',
      minPH: 6.0,
      maxPH: 7.0,
      minMoisture: 55,
      maxMoisture: 80,
      nitrogenRequired: 150,
    },
    {
      cropName: 'Tomatoes',
      minPH: 6.0,
      maxPH: 6.8,
      minMoisture: 40,
      maxMoisture: 70,
      nitrogenRequired: 180,
    },
    {
      cropName: 'Lettuce',
      minPH: 6.0,
      maxPH: 7.5,
      minMoisture: 50,
      maxMoisture: 80,
      nitrogenRequired: 90,
    },
    {
      cropName: 'Potatoes',
      minPH: 5.0,
      maxPH: 7.0,
      minMoisture: 40,
      maxMoisture: 70,
      nitrogenRequired: 140,
    },
    {
      cropName: 'Carrots',
      minPH: 6.0,
      maxPH: 7.0,
      minMoisture: 35,
      maxMoisture: 65,
      nitrogenRequired: 120,
    },
    {
      cropName: 'Peppers',
      minPH: 6.0,
      maxPH: 7.0,
      minMoisture: 40,
      maxMoisture: 70,
      nitrogenRequired: 160,
    },
    {
      cropName: 'Spinach',
      minPH: 6.5,
      maxPH: 7.8,
      minMoisture: 55,
      maxMoisture: 80,
      nitrogenRequired: 130,
    },
    {
      cropName: 'Beans',
      minPH: 6.0,
      maxPH: 7.5,
      minMoisture: 40,
      maxMoisture: 65,
      nitrogenRequired: 80,
    },
    {
      cropName: 'Strawberries',
      minPH: 5.5,
      maxPH: 6.8,
      minMoisture: 45,
      maxMoisture: 70,
      nitrogenRequired: 100,
    },
    {
      cropName: 'Blueberries',
      minPH: 4.0,
      maxPH: 6.0,
      minMoisture: 50,
      maxMoisture: 80,
      nitrogenRequired: 90,
    },
    {
      cropName: 'Olive Trees',
      minPH: 6.5,
      maxPH: 8.5,
      minMoisture: 25,
      maxMoisture: 55,
      nitrogenRequired: 120,
    },
    {
      cropName: 'Basil',
      minPH: 6.0,
      maxPH: 7.5,
      minMoisture: 45,
      maxMoisture: 70,
      nitrogenRequired: 100,
    },
  ];

  console.log('✅ Creating crop requirements...');
  for (const req of requirements) {
    await prisma.cropRequirement.upsert({
      where: { id: `seed-${req.cropName}` },
      update: req,
      create: {
        id: `seed-${req.cropName}`,
        ...req,
      },
    });
  }
  console.log(`   Created ${requirements.length} crop requirements\n`);

  // ==================== CROP REGIONS ====================
  const regions = [
    // Tunisia crops
    { cropName: 'Cucumbers', country: 'Tunisia' },
    { cropName: 'Tomatoes', country: 'Tunisia' },
    { cropName: 'Potatoes', country: 'Tunisia' },
    { cropName: 'Carrots', country: 'Tunisia' },
    { cropName: 'Lettuce', country: 'Tunisia' },
    { cropName: 'Peppers', country: 'Tunisia' },
    { cropName: 'Beans', country: 'Tunisia' },
    { cropName: 'Strawberries', country: 'Tunisia' },
    { cropName: 'Olive Trees', country: 'Tunisia' },
    { cropName: 'Basil', country: 'Tunisia' },

    // Morocco crops
    { cropName: 'Tomatoes', country: 'Morocco' },
    { cropName: 'Potatoes', country: 'Morocco' },
    { cropName: 'Carrots', country: 'Morocco' },
    { cropName: 'Peppers', country: 'Morocco' },
    { cropName: 'Olive Trees', country: 'Morocco' },

    // France crops
    { cropName: 'Tomatoes', country: 'France' },
    { cropName: 'Potatoes', country: 'France' },
    { cropName: 'Carrots', country: 'France' },
    { cropName: 'Lettuce', country: 'France' },
    { cropName: 'Beans', country: 'France' },
    { cropName: 'Strawberries', country: 'France' },
    { cropName: 'Blueberries', country: 'France' },
    { cropName: 'Basil', country: 'France' },

    // USA crops
    { cropName: 'Tomatoes', country: 'USA' },
    { cropName: 'Potatoes', country: 'USA' },
    { cropName: 'Beans', country: 'USA' },
    { cropName: 'Lettuce', country: 'USA' },
    { cropName: 'Carrots', country: 'USA' },
    { cropName: 'Cucumbers', country: 'USA' },
    { cropName: 'Peppers', country: 'USA' },
    { cropName: 'Strawberries', country: 'USA' },
    { cropName: 'Blueberries', country: 'USA' },
  ];

  console.log('✅ Creating crop regions...');
  for (const region of regions) {
    await prisma.cropRegion.create({
      data: {
        ...region,
      },
    });
  }
  console.log(`   Created ${regions.length} crop region mappings\n`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 