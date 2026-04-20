import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  YieldTrendDto,
  CropComparisonDto,
  YieldSummaryDto,
} from './analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────
  // 1. GET /analytics/yield/parcel/:parcelId
  //    Yield trend over time for one parcel (grouped by month).
  // ───────────────────────────────────────────────────────────
  async getYieldByParcel(
    parcelId: string,
    farmerId: string,
  ): Promise<YieldTrendDto[]> {
    // Ownership check — only return data for the requesting farmer
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: parcelId, farmerId },
      select: { id: true },
    });

    if (!parcel) return [];

    const harvests = await this.prisma.harvest.findMany({
      where: {
        parcelId,
        harvestDate: { not: null },
        totalYield: { not: null },
      },
      select: {
        harvestDate: true,
        totalYield: true,
        yieldPerHectare: true,
      },
      orderBy: { harvestDate: 'asc' },
    });

    // Group by YYYY-MM
    const monthMap = new Map<
      string,
      { totalYield: number; yieldPerHectareSum: number; count: number }
    >();

    for (const h of harvests) {
      if (!h.harvestDate || h.totalYield === null) continue;
      const month = h.harvestDate.toISOString().slice(0, 7); // "2024-03"
      const existing = monthMap.get(month) ?? {
        totalYield: 0,
        yieldPerHectareSum: 0,
        count: 0,
      };
      existing.totalYield += h.totalYield;
      existing.yieldPerHectareSum += h.yieldPerHectare ?? 0;
      existing.count += 1;
      monthMap.set(month, existing);
    }

    const trend: YieldTrendDto[] = [];
    for (const [month, data] of monthMap) {
      trend.push({
        month,
        totalYield: Math.round(data.totalYield * 100) / 100,
        yieldPerHectare:
          Math.round((data.yieldPerHectareSum / data.count) * 100) / 100,
        harvestCount: data.count,
      });
    }

    return trend;
  }

  // ───────────────────────────────────────────────────────────
  // 2. GET /analytics/yield/crop/:cropName
  //    Yield comparison across parcels that grew a specific crop.
  // ───────────────────────────────────────────────────────────
  async getYieldByCrop(
    cropName: string,
    farmerId: string,
  ): Promise<CropComparisonDto[]> {
    // Find all parcels belonging to this farmer that have this crop
    const parcels = await this.prisma.parcel.findMany({
      where: {
        farmerId,
        crops: {
          some: {
            cropName: { equals: cropName, mode: 'insensitive' },
          },
        },
      },
      select: {
        id: true,
        location: true,
        harvests: {
          where: {
            totalYield: { not: null },
          },
          select: {
            totalYield: true,
            yieldPerHectare: true,
          },
        },
      },
    });

    const result: CropComparisonDto[] = parcels
      .map((p) => {
        const harvestCount = p.harvests.length;
        if (harvestCount === 0) return null;

        const totalYield = p.harvests.reduce(
          (sum, h) => sum + (h.totalYield ?? 0),
          0,
        );
        const yieldPerHaSum = p.harvests.reduce(
          (sum, h) => sum + (h.yieldPerHectare ?? 0),
          0,
        );

        return {
          parcelId: p.id,
          location: p.location,
          totalYield: Math.round(totalYield * 100) / 100,
          avgYieldPerHectare:
            Math.round((yieldPerHaSum / harvestCount) * 100) / 100,
          harvestCount,
        } satisfies CropComparisonDto;
      })
      .filter((x): x is CropComparisonDto => x !== null)
      .sort((a, b) => b.totalYield - a.totalYield);

    return result;
  }

  // ───────────────────────────────────────────────────────────
  // 3. GET /analytics/yield/summary
  //    Farm-level KPIs: total yield, avg yield/ha, best parcel.
  // ───────────────────────────────────────────────────────────
  async getYieldSummary(farmerId: string): Promise<YieldSummaryDto> {
    const parcels = await this.prisma.parcel.findMany({
      where: { farmerId },
      select: {
        id: true,
        location: true,
        areaSize: true,
        harvests: {
          where: { totalYield: { not: null } },
          select: {
            harvestDate: true,
            totalYield: true,
            yieldPerHectare: true,
          },
        },
      },
    });

    let globalTotalYield = 0;
    let yieldPerHaSum = 0;
    let yieldPerHaCount = 0;
    let totalHarvests = 0;
    let bestParcel: {
      id: string;
      location: string;
      totalYield: number;
    } | null = null;

    // Monthly trend map — last 12 months
    const trendMap = new Map<string, number>();

    for (const parcel of parcels) {
      const parcelTotal = parcel.harvests.reduce(
        (sum, h) => sum + (h.totalYield ?? 0),
        0,
      );
      globalTotalYield += parcelTotal;
      totalHarvests += parcel.harvests.length;

      for (const h of parcel.harvests) {
        if (h.yieldPerHectare != null) {
          yieldPerHaSum += h.yieldPerHectare;
          yieldPerHaCount += 1;
        }

        // Build monthly trend
        if (h.harvestDate && h.totalYield !== null) {
          const month = h.harvestDate.toISOString().slice(0, 7);
          trendMap.set(month, (trendMap.get(month) ?? 0) + h.totalYield);
        }
      }

      if (
        parcel.harvests.length > 0 &&
        (bestParcel === null || parcelTotal > bestParcel.totalYield)
      ) {
        bestParcel = {
          id: parcel.id,
          location: parcel.location,
          totalYield: Math.round(parcelTotal * 100) / 100,
        };
      }
    }

    // Sort trend months and take the last 12
    const recentTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, totalYield]) => ({
        month,
        totalYield: Math.round(totalYield * 100) / 100,
      }));

    return {
      totalYield: Math.round(globalTotalYield * 100) / 100,
      avgYieldPerHectare:
        yieldPerHaCount > 0
          ? Math.round((yieldPerHaSum / yieldPerHaCount) * 100) / 100
          : 0,
      totalHarvests,
      parcelCount: parcels.length,
      bestParcel,
      recentTrend,
    };
  }
}
