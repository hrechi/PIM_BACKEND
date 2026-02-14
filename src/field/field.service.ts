import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldService {
  constructor(private prisma: PrismaService) {}

  async createField(userId: string, dto: CreateFieldDto) {
    return this.prisma.field.create({
      data: {
        userId,
        name: dto.name,
        cropType: dto.cropType || null,
        areaCoordinates: dto.areaCoordinates,
        areaSize: dto.areaSize || null,
      },
    });
  }

  async getFieldsByUser(userId: string) {
    return this.prisma.field.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFieldById(id: string, userId: string) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      include: { missions: true },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this field');
    }

    return field;
  }

  async updateField(id: string, userId: string, dto: UpdateFieldDto) {
    const field = await this.prisma.field.findUnique({ where: { id } });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this field');
    }

    const updateData: any = {
      name: dto.name ?? field.name,
      cropType: dto.cropType ?? field.cropType,
      areaSize: dto.areaSize ?? field.areaSize,
    };

    if (dto.areaCoordinates) {
      updateData.areaCoordinates = dto.areaCoordinates;
    }

    return this.prisma.field.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteField(id: string, userId: string) {
    const field = await this.prisma.field.findUnique({ where: { id } });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this field');
    }

    await this.prisma.field.delete({ where: { id } });
    return { message: 'Field deleted successfully' };
  }
}
