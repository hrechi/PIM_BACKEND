import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const allRecords = await prisma.milkProduction.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { animal: true }
    });

    console.log('--- Latest 5 Milk Records ---');
    allRecords.forEach(r => {
        console.log(`ID: ${r.id}, Date: ${r.date.toISOString()}, Animal: ${r.animal?.name}, Total: ${r.totalL}L`);
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.milkProduction.count({
        where: {
            date: {
                gte: todayStart,
                lte: todayEnd,
            },
        },
    });

    console.log(`\nToday Start: ${todayStart.toISOString()}`);
    console.log(`Today End: ${todayEnd.toISOString()}`);
    console.log(`Records found for today: ${todayCount}`);

    const totalSum = await prisma.milkProduction.aggregate({
        _sum: { totalL: true }
    });
    console.log(`Total Sum All Time: ${totalSum._sum.totalL}L`);

    process.exit(0);
}

check();
