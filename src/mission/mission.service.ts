import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Injectable()
export class MissionService {
  constructor(private prisma: PrismaService) {}

  async createMission(userId: string, dto: CreateMissionDto) {
    // Verify field exists and belongs to user
    const field = await this.prisma.field.findUnique({
      where: { id: dto.fieldId },
    });

    if (!field || field.userId !== userId) {
      throw new BadRequestException('Field not found or unauthorized');
    }

    return this.prisma.mission.create({
      data: {
        userId,
        fieldId: dto.fieldId,
        title: dto.title,
        description: dto.description || null,
        missionType: dto.missionType || 'OTHER',
        status: dto.status || 'PENDING',
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedDuration: dto.estimatedDuration || null,
        notes: dto.notes || null,
        progress: 0,
      },
    });
  }

  async getMissionsByUser(userId: string, fieldId?: string) {
    const where: any = { userId };
    if (fieldId) {
      where.fieldId = fieldId;
    }

    return this.prisma.mission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { field: true },
    });
  }

  async getMissionById(id: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { field: true },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this mission');
    }

    return mission;
  }

  async updateMission(id: string, userId: string, dto: UpdateMissionDto) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this mission');
    }

    return this.prisma.mission.update({
      where: { id },
      data: {
        title: dto.title ?? mission.title,
        description: dto.description ?? mission.description,
        missionType: dto.missionType ?? mission.missionType,
        status: dto.status ?? mission.status,
        priority: dto.priority ?? mission.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : mission.dueDate,
        estimatedDuration: dto.estimatedDuration ?? mission.estimatedDuration,
        actualDuration: dto.actualDuration ?? mission.actualDuration,
        progress: dto.progress ?? mission.progress,
        notes: dto.notes ?? mission.notes,
      },
      include: { field: true },
    });
  }

  async updateMissionStatus(id: string, userId: string, status: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this mission');
    }

    const completedAt = status === 'COMPLETED' ? new Date() : null;

    return this.prisma.mission.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
      include: { field: true },
    });
  }

  async updateMissionProgress(id: string, userId: string, progress: number) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this mission');
    }

    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    return this.prisma.mission.update({
      where: { id },
      data: { progress },
      include: { field: true },
    });
  }

  async deleteMission(id: string, userId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this mission');
    }

    await this.prisma.mission.delete({ where: { id } });
    return { message: 'Mission deleted successfully' };
  }
}
