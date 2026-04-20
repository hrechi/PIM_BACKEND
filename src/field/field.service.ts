import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class FieldService {
  constructor(
    private prisma: PrismaService,
    private readonly geoService: GeoService,
  ) {}

  async createField(userId: string, dto: CreateFieldDto) {
    const created = await this.prisma.field.create({
      data: {
        userId,
        name: dto.name,
        cropType: dto.cropType || null,
        areaCoordinates: dto.areaCoordinates,
        areaSize: dto.areaSize || null,
      },
    });

    await this.geoService.resolveAndCacheFieldLocation(created.id, {
      forceRefresh: true,
    });

    const enriched = await this.prisma.field.findUnique({
      where: { id: created.id },
    });

    return enriched ?? created;
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

    const updated = await this.prisma.field.update({
      where: { id },
      data: updateData,
    });

    if (dto.areaCoordinates) {
      await this.geoService.resolveAndCacheFieldLocation(updated.id, {
        forceRefresh: true,
      });

      const enriched = await this.prisma.field.findUnique({
        where: { id: updated.id },
      });

      return enriched ?? updated;
    }

    return updated;
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
