import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AnimalStatus, AnimalType, Sex, Prisma } from '@prisma/client';
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
    return this.prisma.$transaction(async (tx) => {
      const catalogue = await tx.saleCatalogue.findFirst({
        where: { id: catalogueId, farmerId },
        include: { animals: { orderBy: { sortOrder: 'desc' }, take: 1 } },
      });
      if (!catalogue) throw new NotFoundException('Catalogue not found');

      // Fetch all existing animalIds inside the transaction to avoid race conditions
      const existing = await tx.catalogueAnimal.findMany({
        where: { catalogueId },
        select: { animalId: true },
      });
      const existingIds = new Set(existing.map((a) => a.animalId));

      // Start from the highest current sortOrder + 1
      let nextOrder = (catalogue.animals[0]?.sortOrder ?? -1) + 1;
      const toCreate = dto.animalIds.filter((id) => !existingIds.has(id));

      return Promise.all(
        toCreate.map((animalId) =>
          tx.catalogueAnimal.create({
            data: { catalogueId, animalId, sortOrder: nextOrder++ },
            include: { animal: true },
          }),
        ),
      );
    });
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
    const where: Prisma.AnimalWhereInput = {
      farmerId,
      status: AnimalStatus.active,
    };

    if (dto.species) {
      where.animalType = dto.species.toLowerCase() as AnimalType;
    }
    if (dto.sex) {
      where.sex = dto.sex.toLowerCase() as Sex;
    }
    if (dto.fieldId) {
      where.fieldId = dto.fieldId;
    }
    if (dto.minAgeMonths !== undefined || dto.maxAgeMonths !== undefined) {
      where.age = {
        ...(dto.minAgeMonths !== undefined && { gte: dto.minAgeMonths }),
        ...(dto.maxAgeMonths !== undefined && { lte: dto.maxAgeMonths }),
      } satisfies Prisma.IntNullableFilter;
    }
    if (dto.minWeight !== undefined || dto.maxWeight !== undefined) {
      where.weight = {
        ...(dto.minWeight !== undefined && { gte: dto.minWeight }),
        ...(dto.maxWeight !== undefined && { lte: dto.maxWeight }),
      } satisfies Prisma.FloatNullableFilter;
    }
    if (dto.vaccinationStatus === 'up_to_date') {
      where.vaccination = true;
    } else if (dto.vaccinationStatus === 'incomplete') {
      where.vaccination = false;
    }
    if (dto.reproductionStatus === 'pregnant') {
      where.isPregnant = true;
    } else if (dto.reproductionStatus === 'not_pregnant') {
      where.isPregnant = false;
    }
    if (dto.tagNumber) {
      where.tagNumber = { contains: dto.tagNumber };
    }
    if (dto.isFattening !== undefined) {
      where.isFattening = dto.isFattening;
    }

    return this.prisma.animal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        field: true,
        vaccineRecords: { include: { vaccine: true } },
        medicalEvents: true,
      },
    });
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
    const catalogue = await this.prisma.saleCatalogue.findFirst({
      where: { shareToken, shareExpiresAt: { gt: new Date() } },
      include: {
        animals: { include: { animal: true } },
      },
    });

    if (!catalogue) throw new NotFoundException('Catalogue not found or link expired');

    // Increment view count in background — fire & forget
    this.prisma.saleCatalogue
      .update({
        where: { id: catalogue.id },
        data: { shareViewCount: { increment: 1 } },
      })
      .catch(() => {});

    return catalogue;
  }
}
