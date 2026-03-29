import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthScoreService {
  constructor(private prisma: PrismaService) {}

  async calculateParcelHealthScore(parcelId: string, farmerId: string) {
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: parcelId, farmerId },
      include: {
        crops: true,
        harvests: { orderBy: { harvestDate: 'desc' }, take: 5 },
        pests: {
          where: {
            createdAt: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const recommendations: string[] = [];

    // 1. Soil Quality (30 pts)
    let soilScore = 0;
    
    // pH (10 pts)
    if (parcel.soilPh !== null) {
      if (parcel.soilPh >= 6.0 && parcel.soilPh <= 7.5) {
        soilScore += 10;
      } else if (parcel.soilPh >= 5.5 && parcel.soilPh <= 8.0) {
        soilScore += 5;
        recommendations.push('Soil pH is slightly outside optimal range (6.0-7.5). Consider adjusting with lime or sulfur.');
      } else {
        recommendations.push('Soil pH is critically imbalanced. Urgent soil treatment recommended.');
      }
    } else {
      soilScore += 5; // Neutral if unknown
      recommendations.push('Soil pH data missing. Testing is highly recommended.');
    }

    // NPK (20 pts)
    const n = parcel.nitrogenLevel ?? 0;
    const p = parcel.phosphorusLevel ?? 0;
    const k = parcel.potassiumLevel ?? 0;

    if (n > 40) soilScore += 7;
    else if (n > 20) soilScore += 4;
    else recommendations.push('Low Nitrogen detected. Consider Nitrogen-rich fertilizers.');

    if (p > 30) soilScore += 7;
    else if (p > 15) soilScore += 4;
    else recommendations.push('Low Phosphorus detected. Check root health and consider phosphate application.');

    if (k > 150) soilScore += 6;
    else if (k > 80) soilScore += 3;
    else recommendations.push('Potassium levels are low. This may affect crop resistance.');

    // 2. Yield Performance (30 pts)
    let yieldScore = 15; // Start neutral
    if (parcel.harvests.length > 0) {
      const avgYield = parcel.harvests.reduce((acc, h) => acc + (h.yieldPerHectare ?? 0), 0) / parcel.harvests.length;
      if (avgYield >= 5.0) yieldScore = 30;
      else if (avgYield >= 3.5) yieldScore = 20;
      else {
        yieldScore = 10;
        recommendations.push('Historical yield is below regional averages. Review crop suitablity.');
      }
    }

    // 3. Pest Issues (20 pts)
    const recentPests = parcel.pests.length;
    const pestScore = Math.max(0, 20 - (recentPests * 5));
    if (recentPests > 1) {
      recommendations.push(`High frequency of pests (${recentPests} incidents) in last 6 months. Review pest management plan.`);
    }

    // 4. Irrigation (20 pts)
    let irrigationScore = 0;
    const freq = (parcel.irrigationFrequency ?? 'None').toLowerCase();
    if (freq.includes('daily') || freq.includes('auto')) irrigationScore = 20;
    else if (freq.includes('twice') || freq.includes('2')) irrigationScore = 15;
    else if (freq.includes('weekly')) irrigationScore = 10;
    else if (freq.includes('manual')) irrigationScore = 5;
    else recommendations.push('Irrigation frequency is insufficient or undocumented.');

    const totalScore = Math.round(soilScore + yieldScore + pestScore + irrigationScore);

    return {
      parcelId,
      parcelName: parcel.location,
      score: totalScore,
      breakdown: {
        soil: { score: soilScore, max: 30 },
        yield: { score: yieldScore, max: 30 },
        pests: { score: pestScore, max: 20 },
        irrigation: { score: irrigationScore, max: 20 },
      },
      recommendations: recommendations.slice(0, 4), // Limit to top 4 recommendations
    };
  }
}
