import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class HarvestOptimizationService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly defaultPrices = {
    Wheat: 4.5,
    Corn: 3.2,
    Soybean: 5.8,
    Oats: 2.1,
    Barley: 3.0,
    Default: 4.0
  };

  private readonly defaultGrowthDays = {
    Wheat: 120,
    Corn: 90,
    Soybean: 100,
    Oats: 80,
    Barley: 90,
    Default: 100
  };

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async getOptimization(parcelId: string, cropId?: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        crops: {
          where: cropId ? { id: cropId } : undefined,
          orderBy: { plantingDate: 'desc' },
          take: 1
        }
      }
    });

    if (!parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    if (!parcel.crops || parcel.crops.length === 0) {
      return {
        crop: "None",
        status: "NOT READY",
        bestHarvestDate: null,
        daysRemaining: 0,
        profitAnalysis: {
          profitNow: 0,
          profitOptimal: 0,
          difference: 0
        },
        recommendation: "No crops found in this parcel. Please add a crop first to get harvest optimization insights."
      }
    }

    const crop = parcel.crops[0];
    const cropTypeMatch = Object.keys(this.defaultGrowthDays).find(k => crop.cropName.toLowerCase().includes(k.toLowerCase()));
    
    const cropKey = cropTypeMatch || 'Default';
    
    const growthDays: number = (this.defaultGrowthDays as any)[cropKey];
    const pricePerUnit: number = (this.defaultPrices as any)[cropKey];
    
    const plantDate = new Date(crop.plantingDate);
    // best harvest date
    const bestDate = new Date(plantDate.getTime());
    bestDate.setDate(bestDate.getDate() + growthDays);

    const now = new Date();
    const diffTime = bestDate.getTime() - now.getTime();
    const daysRemaining = Math.max(-999, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let status = "OPTIMAL";
    if (daysRemaining > 7) {
      status = "NOT READY";
    } else if (daysRemaining < -7) {
      status = "OVERDUE";
    }

    // Profit logic (Assuming parcel area size * potential yield)
    // base yield: 5 tons per hectare -> 5000 kg per ha.
    const baseYieldKg = 5000 * parcel.areaSize; 

    let yieldNow = baseYieldKg;
    const optimalYield = baseYieldKg;

    if (daysRemaining > 10) {
      // 2% less yield for every day early
      yieldNow = optimalYield * Math.pow(0.98, daysRemaining);
    } else if (daysRemaining < -10) {
      // 1.5% drop in quality/price value for every day late
      yieldNow = optimalYield * Math.pow(0.985, Math.abs(daysRemaining));
    }

    const profitNow = Math.round(yieldNow * pricePerUnit);
    const profitOptimal = Math.round(optimalYield * pricePerUnit);
    const difference = Math.abs(profitOptimal - profitNow);

    let fallbackRec = "Harvest is in optimal range.";
    if (status === "NOT READY") {
      fallbackRec = `Wait ${daysRemaining} days to maximize yield and profit.`;
    } else if (status === "OVERDUE") {
      fallbackRec = "Harvest immediately to prevent further quality degradation.";
    }

    let recommendation = fallbackRec;
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are an expert agronomist AI for a smart farming application. 
        A farmer is growing ${crop.cropName} on a ${parcel.areaSize} hectare parcel.
        The crop was planted on ${plantDate.toISOString().split('T')[0]}. 
        The optimal harvest date is estimated to be ${bestDate.toISOString().split('T')[0]}.
        Currently, the status is ${status}. If they harvest now, estimated profit is $${profitNow}. If they wait for the optimal window, estimated profit is $${profitOptimal}.
        Provide an explanation for the farmer so they understand exactly what this means. Give a short, 3-sentence actionable recommendation educating them on the math, the yield curve, and whether to harvest now or wait. Keep it purely professional avoiding emojis.`;

        const result = await model.generateContent(prompt);
        recommendation = result.response.text().trim();
      } catch (err) {
        console.error("Gemini failed, using fallback", err);
      }
    }

    return {
      crop: crop.cropName,
      status,
      bestHarvestDate: bestDate.toISOString().split('T')[0],
      daysRemaining: daysRemaining < 0 ? 0 : daysRemaining,
      profitAnalysis: {
        profitNow,
        profitOptimal,
        difference
      },
      recommendation
    };
  }
}
