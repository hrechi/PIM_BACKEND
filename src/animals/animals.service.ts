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
        const { vaccines, ...rest } = data;

        // Transform incoming data to match schema
        const transformedData: any = {
            ...rest,
            farmerId // Explicitly set foreign key from JWT
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
            transformedData.vaccineRecords = {
                create: vaccines.filter(v => v.name || v.vaccineName).map((v: any) => ({
                    vaccineName: v.name || v.vaccineName,
                    vaccineDate: new Date(v.date || v.vaccineDate),
                    nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
                    vetName: v.vetName,
                    lotNumber: v.lotNumber,
                })),
            };
        }

        return this.prisma.animal.create({
            data: transformedData,
        });
    }

    async findAllByFarmer(farmerId: string) {
        return this.prisma.animal.findMany({
            where: { farmerId },
            include: {
                _count: {
                    select: { medicalEvents: true }
                },
                vaccineRecords: true
            },
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
                await tx.vaccineRecord.deleteMany({
                    where: { animalId: animal.id },
                });

                // 2. Create new records
                const vaccinationData = vaccines.filter(v => v.name || v.vaccineName).map((v: any) => ({
                    vaccineName: v.name || v.vaccineName,
                    vaccineDate: new Date(v.date || v.vaccineDate),
                    nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
                    vetName: v.vetName,
                    lotNumber: v.lotNumber,
                    animalId: animal.id, // Explicitly set the animal link
                }));

                if (vaccinationData.length > 0) {
                    await tx.vaccineRecord.createMany({
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

    async getStatistics(farmerId: string) {
        const totalAnimals = await this.prisma.animal.count({
            where: { farmerId },
        });

        // Simple health percentage simulation for now
        const healthyAnimals = await this.prisma.animal.count({
            where: { farmerId, healthStatus: 'OPTIMAL' },
        });

        const healthPercentage = totalAnimals > 0
            ? Math.round((healthyAnimals / totalAnimals) * 100)
            : 100;

        return {
            totalAnimals,
            healthPercentage,
        };
    }
}

