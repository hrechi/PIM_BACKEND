import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MilkProductionService {
    constructor(private prisma: PrismaService) { }

    async create(data: any, farmerId: string) {
        const { animalId, date, morningL, eveningL, notes } = data;

        // Verify animal exists and belongs to farmer
        const animal = await this.prisma.animal.findFirst({
            where: { id: animalId, farmerId },
        });

        if (!animal) {
            throw new NotFoundException(`Animal with ID ${animalId} not found or access denied`);
        }

        if (animal.animalType.toLowerCase() !== 'cow') {
            throw new BadRequestException('Only cows can have milk production records');
        }

        const morning = parseFloat(morningL || 0);
        const evening = parseFloat(eveningL || 0);
        const total = morning + evening;

        return this.prisma.milkProduction.create({
            data: {
                animalId,
                date: new Date(date),
                morningL: morning,
                eveningL: evening,
                totalL: total,
                notes,
            },
            include: {
                animal: true,
            },
        });
    }

    async findAllByFarmer(farmerId: string, animalId?: string) {
        const where: any = {
            animal: {
                farmerId,
            },
        };

        if (animalId) {
            where.animalId = animalId;
        }

        return this.prisma.milkProduction.findMany({
            where,
            include: {
                animal: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
    }

    async remove(id: string, farmerId: string) {
        const record = await this.prisma.milkProduction.findFirst({
            where: {
                id,
                animal: {
                    farmerId,
                },
            },
        });

        if (!record) {
            throw new NotFoundException(`Milk record with ID ${id} not found or access denied`);
        }

        return this.prisma.milkProduction.delete({
            where: { id },
        });
    }

    async update(id: string, data: any, farmerId: string) {
        const record = await this.prisma.milkProduction.findFirst({
            where: {
                id,
                animal: { farmerId },
            },
        });

        if (!record) {
            throw new NotFoundException(`Milk record with ID ${id} not found or access denied`);
        }

        const { date, morningL, eveningL, notes } = data;

        // Recalculate total if volumes are updated
        const morning = morningL !== undefined ? parseFloat(morningL || 0) : Number(record.morningL);
        const evening = eveningL !== undefined ? parseFloat(eveningL || 0) : Number(record.eveningL);
        const total = morning + evening;

        return this.prisma.milkProduction.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                morningL: morning,
                eveningL: evening,
                totalL: total,
                notes,
            },
            include: {
                animal: true,
            },
        });
    }

    async getAnalytics(farmerId: string, timeframe: string = 'week', selectedYear?: number, selectedMonth?: number) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let startDate: Date;
        let endDate: Date;
        let compareStartDate: Date;
        let trendStartDate: Date;

        const effectiveYear = selectedYear || now.getFullYear();
        const effectiveMonth = (selectedMonth !== undefined) ? (selectedMonth - 1) : now.getMonth();

        switch (timeframe) {
            case 'month':
                startDate = new Date(effectiveYear, effectiveMonth, 1);
                endDate = new Date(effectiveYear, effectiveMonth + 1, 1);
                compareStartDate = new Date(effectiveYear, effectiveMonth - 1, 1);
                trendStartDate = new Date(startDate);
                trendStartDate.setDate(trendStartDate.getDate() - 30);
                break;
            case 'year':
                startDate = new Date(effectiveYear, 0, 1);
                endDate = new Date(effectiveYear + 1, 0, 1);
                compareStartDate = new Date(effectiveYear - 1, 0, 1);
                trendStartDate = startDate;
                break;
            case 'week':
            default:
                startDate = new Date(startOfToday);
                startDate.setDate(startDate.getDate() - 7);
                endDate = new Date(now);
                endDate.setDate(endDate.getDate() + 1);
                compareStartDate = new Date(startDate);
                compareStartDate.setDate(compareStartDate.getDate() - 7);
                trendStartDate = new Date(startOfToday);
                trendStartDate.setDate(trendStartDate.getDate() - 30);
                break;
        }

        // 1. Current Period Total
        const currentTotal = await this.prisma.milkProduction.aggregate({
            where: {
                animal: { farmerId },
                date: { gte: startDate, lt: endDate },
            },
            _sum: { totalL: true },
        });

        // 2. Comparison Period Total
        const compareTotal = await this.prisma.milkProduction.aggregate({
            where: {
                animal: { farmerId },
                date: { gte: compareStartDate, lt: startDate },
            },
            _sum: { totalL: true },
        });

        const currentL = Number(currentTotal._sum.totalL || 0);
        const compareL = Number(compareTotal._sum.totalL || 0);
        let trend = 0;
        if (compareL > 0) {
            trend = ((currentL - compareL) / compareL) * 100;
        } else if (currentL > 0) {
            trend = 100;
        }

        // 3. Trend Data
        let dailyTrend: { date: string, value: number }[] = [];

        if (timeframe === 'year') {
            const rawMonthlyTrend = await this.prisma.milkProduction.findMany({
                where: {
                    animal: { farmerId },
                    date: { gte: startDate, lt: endDate },
                },
                select: {
                    date: true,
                    totalL: true,
                },
                orderBy: { date: 'asc' },
            });

            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const monthlySum = new Map<number, number>();
            rawMonthlyTrend.forEach(row => {
                const month = row.date.getMonth();
                monthlySum.set(month, (monthlySum.get(month) || 0) + Number(row.totalL));
            });

            dailyTrend = months.map((monthName, index) => ({
                date: monthName,
                value: monthlySum.get(index) || 0,
            }));
        } else {
            // For month view, we want to show daily data for the selected month
            // or the last 30 days if it's the current month and timeframe is 'week'
            const trendEndOfDate = timeframe === 'month' ? endDate : now;

            const rawDailyTrend = await this.prisma.milkProduction.groupBy({
                by: ['date'],
                where: {
                    animal: { farmerId },
                    date: { gte: trendStartDate, lt: trendEndOfDate },
                },
                _sum: { totalL: true },
                orderBy: { date: 'asc' },
            });

            dailyTrend = rawDailyTrend.map(d => ({
                date: d.date.toISOString().split('T')[0],
                value: Number(d._sum.totalL || 0)
            }));
        }

        // 4. Herd Details
        const herdStats = await this.prisma.milkProduction.groupBy({
            by: ['animalId'],
            where: {
                animal: { farmerId },
                date: { gte: startDate, lt: endDate },
            },
            _sum: { morningL: true, eveningL: true, totalL: true },
            orderBy: { _sum: { totalL: 'desc' } },
        });

        const herdDetails = await Promise.all(herdStats.map(async (stat) => {
            const animal = await this.prisma.animal.findUnique({
                where: { id: stat.animalId },
                select: { name: true, nodeId: true, profileImage: true },
            });
            return {
                id: stat.animalId,
                name: animal?.name || 'Unknown',
                nodeId: animal?.nodeId || 'N/A',
                profileImage: animal?.profileImage,
                morningL: Number(stat._sum.morningL || 0),
                eveningL: Number(stat._sum.eveningL || 0),
                totalL: Number(stat._sum.totalL || 0),
            };
        }));

        // 5. Statistics (Active Cattle & Avg Yield)
        const uniqueAnimals = new Set(herdStats.map(s => s.animalId)).size;

        let avgDailyYield = 0;
        const periodDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

        // If the selected period is in the future or current, cap days by 'today'
        let denominator = periodDays;
        if (startDate < now && endDate > now) {
            denominator = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (startDate > now) {
            denominator = 1; // Future
        }

        avgDailyYield = currentL / denominator;

        return {
            totalLiters: currentL,
            trend,
            compareLiters: compareL,
            dailyTrend,
            herdDetails,
            activeCattle: uniqueAnimals,
            avgDailyYield,
            periodName: timeframe === 'month' ?
                new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(startDate) :
                effectiveYear.toString()
        };
    }
}
