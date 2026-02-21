import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { CreateCropDto, CreateFertilizationDto, CreatePestDiseaseDto, CreateHarvestDto } from './dto/nested.dto';

@Injectable()
export class ParcelsService {
  constructor(private prisma: PrismaService) { }

  async create(farmerId: string, dto: CreateParcelDto) {
    return this.prisma.parcel.create({
      data: {
        ...dto,
        farmerId,
      },
    });
  }

  async findAll(farmerId: string) {
    return this.prisma.parcel.findMany({
      where: { farmerId },
      include: {
        crops: true,
        fertilizations: true,
        pests: true,
        harvests: true,
      },
    });
  }

  async findOne(id: string, farmerId: string) {
    const parcel = await this.prisma.parcel.findFirst({
      where: { id, farmerId },
      include: {
        crops: true,
        fertilizations: true,
        pests: true,
        harvests: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel not found or you don't have access`);
    }

    return parcel;
  }

  async update(id: string, farmerId: string, dto: UpdateParcelDto) {
    await this.findOne(id, farmerId); // verify access

    return this.prisma.parcel.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, farmerId: string) {
    await this.findOne(id, farmerId); // verify access

    return this.prisma.parcel.delete({
      where: { id },
    });
  }

  async addCrop(parcelId: string, farmerId: string, dto: CreateCropDto) {
    await this.findOne(parcelId, farmerId); // verify access

    return this.prisma.crop.create({
      data: {
        cropName: dto.cropName,
        variety: dto.variety,
        plantingDate: new Date(dto.plantingDate),
        expectedHarvestDate: new Date(dto.expectedHarvestDate),
        parcelId,
      },
    });
  }

  async addFertilization(parcelId: string, farmerId: string, dto: CreateFertilizationDto) {
    await this.findOne(parcelId, farmerId); // verify access

    return this.prisma.fertilization.create({
      data: {
        fertilizerType: dto.fertilizerType,
        quantityUsed: dto.quantityUsed,
        applicationDate: new Date(dto.applicationDate),
        parcelId,
      },
    });
  }

  async addPest(parcelId: string, farmerId: string, dto: CreatePestDiseaseDto) {
    await this.findOne(parcelId, farmerId); // verify access

    return this.prisma.pestDisease.create({
      data: {
        issueType: dto.issueType,
        treatmentUsed: dto.treatmentUsed,
        treatmentDate: dto.treatmentDate ? new Date(dto.treatmentDate) : undefined,
        parcelId,
      },
    });
  }

  async addHarvest(parcelId: string, farmerId: string, dto: CreateHarvestDto) {
    await this.findOne(parcelId, farmerId); // verify access

    return this.prisma.harvest.create({
      data: {
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        totalYield: dto.totalYield,
        yieldPerHectare: dto.yieldPerHectare,
        parcelId,
      },
    });
  }
}
