import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// ─── Static lookup maps ────────────────────────────────────────────────────
const CROP_DURATION_DAYS: Record<string, number> = {
  wheat: 120,
  corn: 100,
  maize: 100,
  rice: 130,
  tomato: 90,
  tomatoes: 90,
  potato: 80,
  potatoes: 80,
  soybean: 110,
  soybeans: 110,
  cotton: 160,
  sunflower: 100,
  barley: 90,
  sorghum: 110,
  default: 90,
};

const CROP_PRICE_PER_TON: Record<string, number> = {
  wheat: 280,
  corn: 220,
  maize: 220,
  rice: 420,
  tomato: 600,
  tomatoes: 600,
  potato: 190,
  potatoes: 190,
  soybean: 450,
  soybeans: 450,
  cotton: 1800,
  sunflower: 380,
  barley: 200,
  sorghum: 210,
  default: 300,
};

const YIELD_PER_HECTARE: Record<string, number> = {
  wheat: 3.5,
  corn: 5.0,
  maize: 5.0,
  rice: 4.5,
  tomato: 40.0,
  tomatoes: 40.0,
  potato: 20.0,
  potatoes: 20.0,
  soybean: 2.8,
  soybeans: 2.8,
  cotton: 1.5,
  sunflower: 2.0,
  barley: 3.0,
  sorghum: 3.5,
  default: 3.0,
};

function normalizeCrop(name: string): string {
  return name.toLowerCase().trim();
}

function lookup<T>(map: Record<string, T>, crop: string): T {
  const key = normalizeCrop(crop);
  return map[key] ?? map['default'];
}

// ─── Types ─────────────────────────────────────────────────────────────────
export type HarvestStatus = 'NOT_READY' | 'OPTIMAL' | 'OVERDUE';

export interface CropProfit {
  cropName: string;
  variety: string;
  plantingDate: Date;
  daysSincePlanting: number;
  optimalGrowthDuration: number;
  daysUntilOptimal: number;
  status: HarvestStatus;
  profitNow: number;
  profitOptimal: number;
  expectedYieldTons: number;
  pricePerTon: number;
}

export interface HarvestOptimizationResult {
  parcelId: string;
  parcelName: string;
  areaSize: number;
  activeCrop: CropProfit | null;
  allCrops: CropProfit[];
  aiExplanation: string;
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class HarvestOptimizationService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) { }

  async getHarvestOptimization(
    parcelId: string,
    farmerId: string,
  ): Promise<HarvestOptimizationResult> {
    // ── 1. Fetch parcel with active crops ───────────────────────────────────
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: parcelId, farmerId },
      include: {
        crops: { orderBy: { plantingDate: 'desc' } },
      },
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const now = new Date();
    const areaSize = parcel.areaSize ?? 1;

    // ── 2. Calculate metrics for every crop ────────────────────────────────
    const allCrops: CropProfit[] = parcel.crops.map((crop) => {
      const plantingDate = new Date(crop.plantingDate);
      const daysSincePlanting = Math.floor(
        (now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const optimalGrowthDuration = lookup(CROP_DURATION_DAYS, crop.cropName);
      const daysUntilOptimal = Math.max(
        0,
        optimalGrowthDuration - daysSincePlanting,
      );

      let status: HarvestStatus;
      if (daysSincePlanting < optimalGrowthDuration * 0.85) {
        status = 'NOT_READY';
      } else if (daysSincePlanting <= optimalGrowthDuration * 1.1) {
        status = 'OPTIMAL';
      } else {
        status = 'OVERDUE';
      }

      const pricePerTon = lookup(CROP_PRICE_PER_TON, crop.cropName);
      const yieldPerHa = lookup(YIELD_PER_HECTARE, crop.cropName);
      const expectedYieldTons = yieldPerHa * areaSize;

      // Maturity ratio drives profit now
      const maturityRatio = Math.min(
        1,
        daysSincePlanting / optimalGrowthDuration,
      );
      // Overdue degrades: every extra day beyond optimal loses 0.5%
      const overdueDays = Math.max(0, daysSincePlanting - optimalGrowthDuration);
      const overduePenalty = Math.max(0, 1 - overdueDays * 0.005);

      const profitOptimal =
        Math.round(expectedYieldTons * pricePerTon * 100) / 100;
      const profitNow =
        Math.round(
          expectedYieldTons * pricePerTon * maturityRatio * overduePenalty * 100,
        ) / 100;

      return {
        cropName: crop.cropName,
        variety: crop.variety,
        plantingDate,
        daysSincePlanting,
        optimalGrowthDuration,
        daysUntilOptimal,
        status,
        profitNow,
        profitOptimal,
        expectedYieldTons,
        pricePerTon,
      };
    });

    // ── 3. Pick "active crop" (most recently planted) ──────────────────────
    const activeCrop = allCrops.length > 0 ? allCrops[0] : null;

    // ── 4. Call Groq for AI explanation ──────────────────────────────────
    let aiExplanation = 'No AI explanation available.';
    try {
      aiExplanation = await this._generateAiExplanation(
        parcel.location,
        activeCrop,
        areaSize,
      );
    } catch (_) {
      // Groq failure should not block the response
    }

    return {
      parcelId,
      parcelName: parcel.location,
      areaSize,
      activeCrop,
      allCrops,
      aiExplanation,
    };
  }

  // ── Groq helper ─────────────────────────────────────────────────────────
  private async _generateAiExplanation(
    parcelName: string,
    crop: CropProfit | null,
    areaSize: number,
  ): Promise<string> {
    if (!crop) {
      return 'No active crops found on this parcel. Consider planting a new crop soon.';
    }

    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const apiUrl = this.config.get<string>('GROQ_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    const model = this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      return 'AI explanation is not configured. Please set GROQ_API_KEY.';
    }

    const prompt = `
You are an expert agronomist. Given the following parcel data, provide a concise 2-3 sentence harvest recommendation in plain English (no markdown, no bullet points):

Parcel: ${parcelName} (${areaSize} ha)
Crop: ${crop.cropName} (${crop.variety})
Days since planting: ${crop.daysSincePlanting} days
Optimal growth duration: ${crop.optimalGrowthDuration} days
Status: ${crop.status}
Estimated profit if harvested NOW: $${crop.profitNow.toFixed(0)}
Estimated profit at OPTIMAL time: $${crop.profitOptimal.toFixed(0)}
Days until optimal harvest: ${crop.daysUntilOptimal}

Give practical, specific advice about when to harvest and how to maximize profit.
    `.trim();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an agricultural advisor.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) return 'AI service currently unavailable.';

      const data = await response.json() as GroqResponse;
      return data.choices?.[0]?.message?.content?.trim() ?? 'No recommendations available.';
    } catch {
      return 'Unable to reach AI service.';
    }
  }
}

