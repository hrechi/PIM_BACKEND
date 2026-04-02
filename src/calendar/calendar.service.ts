import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getParcelCalendar(parcelId: string, farmerId: string) {
    // ... existing logic ...
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        crops: { orderBy: { plantingDate: 'asc' } },
        harvests: { orderBy: { harvestDate: 'desc' } },
      },
    });

    if (!parcel || parcel.farmerId !== farmerId) {
      throw new NotFoundException('Parcel not found');
    }

    return this.mapCropsToCalendar(parcel.crops, parcel.harvests, parcel.location);
  }

  async getAllCalendar(farmerId: string) {
    const parcels = await this.prisma.parcel.findMany({
      where: { farmerId },
      include: {
        crops: { orderBy: { plantingDate: 'asc' } },
        harvests: { orderBy: { harvestDate: 'desc' } },
      },
    });

    const allCalendarItems: any[] = [];
    for (const parcel of parcels) {
      const items = this.mapCropsToCalendar(parcel.crops, parcel.harvests, parcel.location);
      allCalendarItems.push(...items);
    }

    // Sort all by planting date across all parcels
    return allCalendarItems.sort((a, b) => 
      new Date(a.plantingDate).getTime() - new Date(b.plantingDate).getTime()
    );
  }

  private mapCropsToCalendar(crops: any[], harvests: any[], parcelName: string) {
    const now = new Date();
    return crops.map((crop) => {
      const plantingDate = new Date(crop.plantingDate);
      const expectedHarvestDate = new Date(crop.expectedHarvestDate);
      
      let status = 'GROWING';
      if (now < plantingDate) {
        status = 'PLANTED';
      } else if (now >= expectedHarvestDate) {
        status = 'READY';
      }

      const hasHarvestAfterPlanting = harvests.some(
        (h) => h.harvestDate && new Date(h.harvestDate) >= plantingDate,
      );

      if (hasHarvestAfterPlanting) {
        status = 'HARVESTED';
      }

      return {
        id: crop.id,
        cropName: crop.cropName,
        variety: crop.variety,
        plantingDate: crop.plantingDate,
        expectedHarvestDate: crop.expectedHarvestDate,
        status,
        parcelName,
      };
    });
  }
}
