import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnimalsService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        return this.prisma.animal.create({
            data,
        });
    }

    async findAllByFarmer(farmerId: string) {
        return this.prisma.animal.findMany({
            where: { farmerId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(nodeId: string, data: any) {
        const animal = await this.prisma.animal.findUnique({
            where: { nodeId },
        });

        if (!animal) {
            throw new NotFoundException(`Animal with NodeID ${nodeId} not found`);
        }

        return this.prisma.animal.update({
            where: { nodeId },
            data,
        });
    }

    async remove(nodeId: string) {
        const animal = await this.prisma.animal.findUnique({
            where: { nodeId },
        });

        if (!animal) {
            throw new NotFoundException(`Animal with NodeID ${nodeId} not found`);
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

