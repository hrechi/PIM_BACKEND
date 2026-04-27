import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddCatalogueAnimalsDto,
  CreateSaleCatalogueDto,
  PreviewCatalogueFilterDto,
  UpdateCatalogueAnimalDto,
  UpdateSaleCatalogueDto,
} from './dto/catalogue.dto';

@Injectable()
export class CataloguesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string | Date | undefined | null): Date | null {
    if (!value) return null;
    return typeof value === 'string' ? new Date(value) : value;
  }

  async createCatalogue(farmerId: string, dto: CreateSaleCatalogueDto) {
    const settings: Prisma.InputJsonValue =
      dto.settings !== null &&
      dto.settings !== undefined &&
      typeof dto.settings === 'object' &&
      !Array.isArray(dto.settings)
        ? (dto.settings as Prisma.InputJsonValue)
        : {};

    return this.prisma.saleCatalogue.create({
      data: {
        farmerId,
        title: dto.title,
        saleDate: this.parseDate(dto.saleDate) ?? undefined,
        location: dto.location,
        currency: dto.currency ?? 'TND',
        showPrices: dto.showPrices ?? false,
        settings,
      },
    });
  }

  async listCatalogues(farmerId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = Math.max(page - 1, 0) * limit;

    const [items, total] = await Promise.all([
      this.prisma.saleCatalogue.findMany({
        where: { farmerId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { animals: { include: { animal: true } } },
      }),
      this.prisma.saleCatalogue.count({ where: { farmerId } }),
    ]);

    return { items, total, page, limit };
  }

  async getCatalogueById(id: string, farmerId: string) {
    return this.prisma.saleCatalogue.findFirst({
      where: { id, farmerId },
      include: {
        animals: { include: { animal: true } },
      },
    });
  }

  async updateCatalogue(
    farmerId: string,
    id: string,
    dto: UpdateSaleCatalogueDto,
  ) {
    const existing = await this.prisma.saleCatalogue.findFirst({
      where: { id, farmerId },
    });
    if (!existing) {
      throw new NotFoundException('Catalogue not found');
    }

    return this.prisma.saleCatalogue.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        saleDate: dto.saleDate !== undefined ? this.parseDate(dto.saleDate) : existing.saleDate,
        location: dto.location ?? existing.location,
        currency: dto.currency ?? existing.currency,
        showPrices: dto.showPrices ?? existing.showPrices,
        settings:
          dto.settings !== undefined
            ? dto.settings === null
              ? {}
              : (dto.settings as Prisma.InputJsonValue)
            : (existing.settings as Prisma.InputJsonValue),
        status: dto.status ?? existing.status,
      },
    });
  }

  async deleteCatalogue(farmerId: string, id: string) {
    const existing = await this.prisma.saleCatalogue.findFirst({
      where: { id, farmerId },
    });
    if (!existing) {
      throw new NotFoundException('Catalogue not found');
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only draft catalogues can be deleted');
    }

    await this.prisma.catalogueAnimal.deleteMany({
      where: { catalogueId: id },
    });
    return this.prisma.saleCatalogue.delete({ where: { id } });
  }

  async addAnimals(farmerId: string, catalogueId: string, dto: AddCatalogueAnimalsDto) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
      include: { animals: true },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }

    const existingIds = new Set(catalogue.animals.map((item) => item.animalId));
    const currentMaxOrder = catalogue.animals.reduce(
      (max, item) => Math.max(max, item.sortOrder ?? 0),
      0,
    );

    const created: Promise<any>[] = [];
    let nextOrder = currentMaxOrder + 1;

    for (const animalId of dto.animalIds) {
      if (existingIds.has(animalId)) {
        continue;
      }
      created.push(
        this.prisma.catalogueAnimal.create({
          data: {
            catalogueId,
            animalId,
            sortOrder: nextOrder++,
          },
        }),
      );
    }

    return Promise.all(created);
  }

  async removeAnimal(farmerId: string, catalogueId: string, animalId: string) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }

    return this.prisma.catalogueAnimal.delete({
      where: { catalogueId_animalId: { catalogueId, animalId } },
    });
  }

  async updateCatalogueAnimal(
    farmerId: string,
    catalogueId: string,
    animalId: string,
    dto: UpdateCatalogueAnimalDto,
  ) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }

    return this.prisma.catalogueAnimal.update({
      where: { catalogueId_animalId: { catalogueId, animalId } },
      data: {
        sortOrder: dto.sortOrder,
        priceOverride: dto.priceOverride,
        notes: dto.notes,
      },
    });
  }

  async getCataloguePdf(farmerId: string, catalogueId: string) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
      include: { animals: { include: { animal: true } } },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }
    return {
      message:
        'PDF generation is available through the dedicated rendering service. This endpoint returns the catalogue payload for PDF generation.',
      catalogue,
    };
  }

  async previewFilter(farmerId: string, dto: PreviewCatalogueFilterDto) {
    console.log('Preview filter DTO:', dto); // Debug log

    const where: any = { farmerId, status: 'active' };

    if (dto.species) {
      // Convert species to lowercase to match AnimalType enum
      where.animalType = dto.species.toLowerCase() as any;
      console.log('Filtering by species:', where.animalType);
    }
    if (dto.sex) {
      // Convert sex to lowercase to match Sex enum
      where.sex = dto.sex.toLowerCase() as any;
      console.log('Filtering by sex:', where.sex);
    }
    if (dto.fieldId) {
      where.fieldId = dto.fieldId;
      console.log('Filtering by fieldId:', where.fieldId);
    }
    if (dto.minAgeMonths !== undefined || dto.maxAgeMonths !== undefined) {
      where.age = {};
      if (dto.minAgeMonths !== undefined) {
        where.age.gte = dto.minAgeMonths;
        console.log('Filtering by min age:', dto.minAgeMonths);
      }
      if (dto.maxAgeMonths !== undefined) {
        where.age.lte = dto.maxAgeMonths;
        console.log('Filtering by max age:', dto.maxAgeMonths);
      }
    }
    if (dto.minWeight !== undefined || dto.maxWeight !== undefined) {
      where.weight = {};
      if (dto.minWeight !== undefined) {
        where.weight.gte = dto.minWeight;
        console.log('Filtering by min weight:', dto.minWeight);
      }
      if (dto.maxWeight !== undefined) {
        where.weight.lte = dto.maxWeight;
        console.log('Filtering by max weight:', dto.maxWeight);
      }
    }
    if (dto.vaccinationStatus) {
      if (dto.vaccinationStatus === 'up_to_date') {
        where.vaccination = true;
      } else if (dto.vaccinationStatus === 'incomplete') {
        where.vaccination = false;
      }
      console.log('Filtering by vaccination:', where.vaccination);
    }
    if (dto.reproductionStatus) {
      if (dto.reproductionStatus === 'pregnant') {
        where.isPregnant = true;
      } else if (dto.reproductionStatus === 'not_pregnant') {
        where.isPregnant = false;
      }
      console.log('Filtering by reproduction:', where.isPregnant);
    }
    if (dto.tagNumber) {
      where.tagNumber = { contains: dto.tagNumber };
      console.log('Filtering by tag number:', dto.tagNumber);
    }
    if (dto.isFattening !== undefined) {
      where.isFattening = dto.isFattening;
      console.log('Filtering by isFattening:', dto.isFattening);
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2));

    const result = await this.prisma.animal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        field: true,
        vaccineRecords: true,
      } as any,
    });

    console.log('Found animals:', result.length);
    return result;
  }

  async generateShareLink(farmerId: string, catalogueId: string) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    return this.prisma.saleCatalogue.update({
      where: { id: catalogueId },
      data: {
        shareToken: token,
        shareExpiresAt: expiresAt,
        shareViewCount: 0,
        status: catalogue.status === 'DRAFT' ? 'PUBLISHED' : catalogue.status,
      },
    });
  }

  async revokeShareLink(farmerId: string, catalogueId: string) {
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { id: catalogueId, farmerId },
    });
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }

    return this.prisma.saleCatalogue.update({
      where: { id: catalogueId },
      data: {
        shareToken: null,
        shareExpiresAt: null,
      },
    });
  }

  async getPublicCatalogueByToken(shareToken: string) {
    return this.prisma.saleCatalogue.findFirst({
      where: { shareToken, shareExpiresAt: { gt: new Date() } },
      include: {
        animals: { include: { animal: true } },
      },
    });
  }
}
