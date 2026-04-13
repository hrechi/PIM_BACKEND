import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldService {
  constructor(
    private prisma: PrismaService,
    private geoService: GeoService,
  ) {}

  private getCurrencySymbol(currency: string): string {
    const symbols = {
      'TND': 'TND', 'MAD': 'DH', 'DZD': 'DA',
      'EUR': '€', 'GBP': '£', 'CHF': 'CHF',
      'USD': '$', 'CAD': 'CA$', 'BRL': 'R$', 'ARS': '$',
      'AUD': 'A$', 'INR': '₹', 'CNY': '¥', 'TRY': '₺'
    };
    return symbols[currency] || '$';
  }

  async createField(userId: string, dto: CreateFieldDto) {
    let currency = dto.currency;

    // If no currency specified, try to detect from coordinates
    if (!currency) {
      const centroid = this.geoService.extractCentroid(dto.areaCoordinates);
      if (centroid) {
        const countryCode = await this.geoService.resolveCountryCode(centroid.lat, centroid.lng);
        if (countryCode) {
          currency = this.geoService.suggestCurrency(countryCode);
        }
      }
    }

    currency = currency || 'USD';
    const currencySymbol = this.getCurrencySymbol(currency);

    return this.prisma.field.create({
      data: {
        userId,
        name: dto.name,
        cropType: dto.cropType || null,
        areaCoordinates: dto.areaCoordinates,
        areaSize: dto.areaSize || null,
        currency,
        currencySymbol,
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

    if (dto.currency) {
      updateData.currency = dto.currency;
      updateData.currencySymbol = this.getCurrencySymbol(dto.currency);
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
