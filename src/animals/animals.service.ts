import { Injectable, NotFoundException } from '@nestjs/common';
// Triggering reload to sync Prisma Client
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnimalsService {
    constructor(private prisma: PrismaService) { }

    private calculateExpectedBirthDate(animalType: string, lastInseminationDate: Date): Date {
        const gestationPeriods: Record<string, number> = {
            cow: 283,
            horse: 340,
            sheep: 152,
            dog: 63,
        };
        const days = gestationPeriods[animalType.toLowerCase()] ?? 283;
        const expectedDate = new Date(lastInseminationDate);
        expectedDate.setDate(expectedDate.getDate() + days);
        return expectedDate;
    }

    async create(data: any, farmerId: string) {
        const { vaccines, fieldId, ...rest } = data;

        // Transform incoming data to match schema
        const transformedData: any = {
            ...rest,
            farmerId, // Explicitly set foreign key from JWT
            fieldId  // Explicitly set field association
        };

        // Handle species-specific gestation calculation
        if (transformedData.lastInseminationDate && transformedData.animalType) {
            transformedData.expectedBirthDate = this.calculateExpectedBirthDate(
                transformedData.animalType,
                new Date(transformedData.lastInseminationDate),
            );
        }

        // Handle date fields to ensure they are actual Date objects if provided as strings
        const dateFields = [
            'lastInseminationDate', 'lastBirthDate', 'expectedBirthDate', 'lastVetCheck',
            'feedIntakeRecorded', 'dewormingScheduled', 'milkPeakDate', 'woolLastShearDate',
            'purchaseDate', 'saleDate'
        ];

        dateFields.forEach(field => {
            if (transformedData[field] && typeof transformedData[field] === 'string') {
                transformedData[field] = new Date(transformedData[field]);
            }
        });

        // Map vaccines to vaccineRecords relation
        if (vaccines && Array.isArray(vaccines)) {
            const otherVaccine = await this.prisma.vaccine.findUnique({ where: { code: 'OTHER' } });

            transformedData.vaccineRecords = {
                create: vaccines.filter(v => v.name || v.vaccineName || v.vaccineId).map((v: any) => ({
                    vaccineId: v.vaccineId || otherVaccine?.id || '',
                    administeredAt: new Date(v.date || v.vaccineDate || v.administeredAt || new Date()),
                    administeredBy: v.administeredBy || v.vetName || 'System',
                    doseGiven: v.doseGiven || 1.0,
                    lotNumber: v.lotNumber,
                    nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
                    observations: v.notes || v.observations || (v.name || v.vaccineName),
                })),
            };
        }

        return this.prisma.animal.create({
            data: transformedData,
        });
    }

    async findAllByFarmer(farmerId: string, animalType?: string, fieldId?: string) {
        const where: any = { farmerId };
        if (animalType) {
            where.animalType = animalType.toLowerCase();
        }
        if (fieldId) {
            where.fieldId = fieldId;
        }

        return this.prisma.animal.findMany({
            where,
            include: {
                medicalEvents: true,
                vaccineRecords: true
            } as any,
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(nodeId: string, data: any, farmerId: string) {
        // Find by nodeId AND farmerId for security
        const animal = await this.prisma.animal.findFirst({
            where: { nodeId, farmerId },
        });

        if (!animal) {
            throw new NotFoundException(`Animal with NodeID ${nodeId} not found or access denied`);
        }

        const { vaccines, ...rest } = data;
        const transformedData = { ...rest };

        // Handle species-specific gestation calculation
        if (transformedData.lastInseminationDate || transformedData.animalType) {
            const type = transformedData.animalType || animal.animalType;
            const insDate = transformedData.lastInseminationDate
                ? new Date(transformedData.lastInseminationDate)
                : animal.lastInseminationDate;

            if (insDate) {
                transformedData.expectedBirthDate = this.calculateExpectedBirthDate(type, insDate);
            }
        }

        // Handle date fields
        const dateFields = [
            'lastInseminationDate', 'lastBirthDate', 'expectedBirthDate', 'lastVetCheck',
            'feedIntakeRecorded', 'dewormingScheduled', 'milkPeakDate', 'woolLastShearDate',
            'purchaseDate', 'saleDate'
        ];

        dateFields.forEach(field => {
            if (transformedData[field] && typeof transformedData[field] === 'string') {
                transformedData[field] = new Date(transformedData[field]);
            }
        });

        // Clean up data
        delete transformedData.id;
        delete transformedData.farmerId;
        delete transformedData.nodeId;

        // Synchronize vaccineRecords if provided
        if (vaccines && Array.isArray(vaccines)) {
            // Transaction to ensure atomicity
            return this.prisma.$transaction(async (tx) => {
                // 1. Delete existing records
                await (tx as any).vaccineRecord.deleteMany({
                    where: { animalId: animal.id },
                });

                // 2. Create new records
                const otherVaccine = await tx.vaccine.findUnique({ where: { code: 'OTHER' } });
                const vaccinationData = vaccines.filter(v => v.name || v.vaccineName || v.vaccineId).map((v: any) => ({
                    vaccineId: v.vaccineId || otherVaccine?.id || '',
                    administeredAt: new Date(v.date || v.vaccineDate || v.administeredAt || new Date()),
                    administeredBy: v.administeredBy || v.vetName || 'System',
                    doseGiven: v.doseGiven || 1.0,
                    lotNumber: v.lotNumber,
                    nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
                    observations: v.notes || v.observations || (v.name || v.vaccineName),
                    animalId: animal.id, // Explicitly set the animal link
                }));

                if (vaccinationData.length > 0) {
                    await (tx as any).vaccineRecord.createMany({
                        data: vaccinationData,
                    });
                }

                // 3. Update the animal
                return tx.animal.update({
                    where: { nodeId },
                    data: transformedData,
                });
            });
        }

        return this.prisma.animal.update({
            where: { nodeId },
            data: transformedData,
        });
    }

    async remove(nodeId: string, farmerId: string) {
        const animal = await this.prisma.animal.findFirst({
            where: { nodeId, farmerId },
        });

        if (!animal) {
            throw new NotFoundException(`Animal with NodeID ${nodeId} not found or access denied`);
        }

        return this.prisma.animal.delete({
            where: { nodeId },
        });
    }

    async getStatistics(farmerId: string, fieldId?: string) {
        const baseWhere: any = { farmerId, status: 'active' };
        if (fieldId) {
            baseWhere.fieldId = fieldId;
        }

        const [
            totalCount,
            lowHealthCount,
            speciesCounts,
            attentionList,
            vaccinesDueCount,
            todayMilk,
            yesterdayMilk,
        ] = await Promise.all([
            this.prisma.animal.count({ where: baseWhere }),
            this.prisma.animal.count({ where: { ...baseWhere, vitalityScore: { lt: 50 } } }),
            this.prisma.animal.groupBy({
                by: ['animalType'],
                where: baseWhere,
                _count: true,
            }),
            this.prisma.animal.findMany({
                where: { ...baseWhere, vitalityScore: { lt: 80 } },
                orderBy: { vitalityScore: 'asc' },
                take: 5,
            }),
            (this.prisma as any).vaccineRecord.count({
                where: {
                    animal: baseWhere,
                    nextDueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // Due within 7 days
                },
            }),
            this.prisma.milkProduction.aggregate({
                where: {
                    animal: baseWhere,
                    date: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
                _sum: { totalL: true },
            }),
            this.prisma.milkProduction.aggregate({
                where: {
                    animal: baseWhere,
                    date: {
                        gte: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0)),
                        lt: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(23, 59, 59, 999)),
                    },
                },
                _sum: { totalL: true },
            }),
        ]);

        const speciesDistribution = speciesCounts.reduce((acc, curr) => {
            acc[curr.animalType.toLowerCase()] = curr._count;
            return acc;
        }, {} as Record<string, number>);

        // Monthly Spend Placeholder (Logic can be expanded with an Expense model)
        const monthlySpend = 2450.00;

        return {
            totalAnimals: totalCount,
            healthAlerts: lowHealthCount,
            vaccinesDue: vaccinesDueCount,
            monthlySpend,
            speciesDistribution,
            needingAttention: attentionList,
            todayMilk: todayMilk._sum.totalL ? Number(todayMilk._sum.totalL) : 0,
            yesterdayMilk: yesterdayMilk._sum.totalL ? Number(yesterdayMilk._sum.totalL) : 0,
            reminders: [
                { id: '1', title: 'Vaccine due (Bessie)', subtitle: 'Scheduled for morning session', time: 'ASAP', type: 'vaccine' },
                { id: '2', title: 'Vet visit', subtitle: 'General herd inspection', time: '14:00', type: 'visit' }
            ]
        };
    }
}

