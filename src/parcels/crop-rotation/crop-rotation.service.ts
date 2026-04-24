import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RotationAnalysisDto,
  RecommendedCropDto,
  AvoidCropDto,
} from './dto/rotation-analysis.dto';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class CropRotationService {
  private readonly logger = new Logger(CropRotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getCropRotationPlan(parcelId: string): Promise<RotationAnalysisDto> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        crops: {
          orderBy: { plantingDate: 'desc' },
          take: 3,
        },
        pests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel with ID ${parcelId} not found`);
    }

    const { recommendedCrops, cropsToAvoid } =
      await this.calculateRotationRules(parcel);
    const sustainabilityScore = this.calculateSustainabilityScore(
      parcel,
      cropsToAvoid.length,
    );

    let explanation =
      'Based on current soil metrics and historical crop data, the recommended crops will optimize yield while resting the soil from depleted nutrients.';

    // AI Enhancement using existing GROQ_API_KEY
    try {
      const groqExplanation = await this.generateAILogicExplanation(
        parcel,
        recommendedCrops,
        cropsToAvoid,
        sustainabilityScore,
      );
      if (groqExplanation) {
        explanation = groqExplanation;
      }
    } catch (err) {
      this.logger.error('Failed to fetch AI insights:', err.message);
    }

    return {
      recommendedCrops,
      cropsToAvoid,
      sustainabilityScore,
      explanation,
    };
  }

  private async calculateRotationRules(parcel: any): Promise<{
    recommendedCrops: RecommendedCropDto[];
    cropsToAvoid: AvoidCropDto[];
  }> {
    const recommended: RecommendedCropDto[] = [];
    const avoid: AvoidCropDto[] = [];
    const recentCrops = parcel.crops.map((c) => c.cropName.toLowerCase());

    // 1. AVOID Repetitions
    if (recentCrops.length >= 2 && recentCrops[0] === recentCrops[1]) {
      avoid.push({
        name: parcel.crops[0].cropName,
        reason:
          'Recently planted twice in a row. Planting again will diminish soil nutrients and increase disease risk.',
      });
    }

    // AVOID logic for recent diseases
    const recentDiseases = parcel.pests.map((p) =>
      (p.issueType || '').toLowerCase(),
    );
    if (
      recentDiseases.some((d) => d.includes('fungus') || d.includes('blight'))
    ) {
      avoid.push({
        name: 'Tomatoes',
        reason:
          'Parcel has a history of blight/fungus. Tomatoes are highly susceptible.',
      });
      avoid.push({
        name: 'Potatoes',
        reason: 'Parcel history of fungus increases risk for root/tuber crops.',
      });
    }

    // 2. Recommend based on Soil
    const n = parcel.nitrogenLevel ?? 0;
    const p = parcel.phosphorusLevel ?? 0;
    const k = parcel.potassiumLevel ?? 0;

    if (n < 40) {
      // e.g. low nitrogen
      recommended.push({
        name: 'Beans',
        reason: 'Legumes fix nitrogen in the soil, restoring depleted levels.',
      });
      recommended.push({
        name: 'Peas',
        reason: 'Low nitrogen demand and acts as a natural soil restorative.',
      });
    } else if (n > 80 && p > 50) {
      recommended.push({
        name: 'Corn',
        reason: 'High soil nutrients are optimal for heavy feeders like corn.',
      });
      recommended.push({
        name: 'Wheat',
        reason: 'Rich soil supports dense cereal crops.',
      });
    }

    if (parcel.soilPh !== null) {
      if (parcel.soilPh < 6.0) {
        recommended.push({
          name: 'Oats',
          reason: 'More tolerant of acidic soils.',
        });
      } else if (parcel.soilPh > 7.5) {
        recommended.push({
          name: 'Barley',
          reason: 'Handles alkaline conditions well.',
        });
      }
    }

    // Fallback if no specific condition matched
    if (recommended.length === 0) {
      recommended.push({
        name: 'Soybeans',
        reason: 'Excellent rotational crop that improves soil structure.',
      });
      recommended.push({
        name: 'Radish',
        reason: 'Deep roots help to break up compacted soil.',
      });
    }

    return {
      recommendedCrops: recommended.slice(0, 3), // Max 3
      cropsToAvoid: avoid,
    };
  }

  private calculateSustainabilityScore(
    parcel: any,
    avoidanceCount: number,
  ): number {
    let score = 100;

    // Repetition penalty
    const recentCrops = parcel.crops.map((c) => c.cropName);
    if (recentCrops.length >= 2 && recentCrops[0] === recentCrops[1])
      score -= 20;

    // Low nutrient penalty
    if (parcel.nitrogenLevel && parcel.nitrogenLevel < 30) score -= 15;
    if (parcel.phosphorusLevel && parcel.phosphorusLevel < 20) score -= 10;

    // Disease penalty
    if (parcel.pests && parcel.pests.length > 0) {
      score -= Math.min(parcel.pests.length * 5, 20);
    }

    if (avoidanceCount > 0) {
      score -= avoidanceCount * 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async generateAILogicExplanation(
    parcel: any,
    recommended: RecommendedCropDto[],
    avoid: AvoidCropDto[],
    score: number,
  ): Promise<string | null> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const apiUrl =
      this.config.get<string>('GROQ_URL') ??
      'https://api.groq.com/openai/v1/chat/completions';
    const model =
      this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY is not set. AI enhancement will be disabled.',
      );
      return null;
    }

    const prompt = `
      You are an expert agronomist AI for a Smart Farm Management System called "Fieldly".
      I have a parcel of land with a Sustainability Score of ${score}/100.
      Soil Info -> pH: ${parcel.soilPh}, Nitrogen: ${parcel.nitrogenLevel}, Phosphorus: ${parcel.phosphorusLevel}.
      Recent Crops -> ${parcel.crops.map((c) => c.cropName).join(', ')}.
      Recent Pests/Issues -> ${parcel.pests.map((p) => p.issueType).join(', ')}.

      The logic engine recommended: ${recommended.map((r) => r.name).join(', ')}.
      The logic engine said to avoid: ${avoid.map((a) => a.name).join(', ')}.

      Write a concise (max 3-4 sentences), actionable, and professional insight explaining WHY this rotation is best and how it improves long term yield. Do not use asterisks or markdown, just plain text suitable for a mobile app UI.
    `;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt.trim() }],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Groq API returned an error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as GroqResponse;
      const advice = data.choices?.[0]?.message?.content?.trim();
      return advice || null;
    } catch (err) {
      this.logger.error('Failed to contact Groq API', err);
      return null;
    }
  }
}
