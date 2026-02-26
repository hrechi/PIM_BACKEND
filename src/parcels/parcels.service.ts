import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { CreateCropDto, CreateFertilizationDto, CreatePestDiseaseDto, CreateHarvestDto } from './dto/nested.dto';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class ParcelsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) { }

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
    await this.findOne(id, farmerId);
    return this.prisma.parcel.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, farmerId: string) {
    await this.findOne(id, farmerId);
    return this.prisma.parcel.delete({
      where: { id },
    });
  }

  async addCrop(parcelId: string, farmerId: string, dto: CreateCropDto) {
    await this.findOne(parcelId, farmerId);
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
    await this.findOne(parcelId, farmerId);
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
    await this.findOne(parcelId, farmerId);
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
    await this.findOne(parcelId, farmerId);
    return this.prisma.harvest.create({
      data: {
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        totalYield: dto.totalYield,
        yieldPerHectare: dto.yieldPerHectare,
        parcelId,
      },
    });
  }

  async getAiAdvice(parcelId: string, farmerId: string): Promise<{ advice: string }> {
    const parcel = await this.findOne(parcelId, farmerId);

    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const apiUrl = this.config.get<string>('GROQ_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    const model = this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      return { advice: 'AI service is not configured. Please set GROQ_API_KEY in your environment variables.' };
    }

    const context = `
PARCEL DETAILS:
- Location: ${parcel.location}
- Area Size: ${parcel.areaSize} ha/m²
- Boundaries: ${parcel.boundariesDescription}
- Soil Type: ${parcel.soilType}
- Soil pH: ${parcel.soilPh ?? 'Not recorded'}
- Nitrogen Level: ${parcel.nitrogenLevel ?? 'Not recorded'}
- Phosphorus Level: ${parcel.phosphorusLevel ?? 'Not recorded'}
- Potassium Level: ${parcel.potassiumLevel ?? 'Not recorded'}
- Water Source: ${parcel.waterSource}
- Irrigation Method: ${parcel.irrigationMethod}
- Irrigation Frequency: ${parcel.irrigationFrequency}

CROPS (${parcel.crops.length}):
${parcel.crops.length > 0
        ? parcel.crops.map(c => `  - ${c.cropName} (${c.variety}): planted ${new Date(c.plantingDate).toLocaleDateString()}, expected harvest ${new Date(c.expectedHarvestDate).toLocaleDateString()}`).join('\n')
        : '  None recorded'}

FERTILIZATION HISTORY (${parcel.fertilizations.length}):
${parcel.fertilizations.length > 0
        ? parcel.fertilizations.map(f => `  - ${f.fertilizerType}: ${f.quantityUsed} units on ${new Date(f.applicationDate).toLocaleDateString()}`).join('\n')
        : '  None recorded'}

PEST & DISEASE RECORDS (${parcel.pests.length}):
${parcel.pests.length > 0
        ? parcel.pests.map(p => `  - Issue: ${p.issueType ?? 'Unknown'}, Treatment: ${p.treatmentUsed ?? 'None'}, Date: ${p.treatmentDate ? new Date(p.treatmentDate).toLocaleDateString() : 'Unknown'}`).join('\n')
        : '  None recorded'}

HARVEST HISTORY (${parcel.harvests.length}):
${parcel.harvests.length > 0
        ? parcel.harvests.map(h => `  - Date: ${h.harvestDate ? new Date(h.harvestDate).toLocaleDateString() : 'Unknown'}, Total Yield: ${h.totalYield ?? '?'}, Per Hectare: ${h.yieldPerHectare ?? '?'}`).join('\n')
        : '  None recorded'}
    `.trim();

    const systemPrompt = `You are an expert agronomist and agricultural advisor.
Analyze the parcel data and provide clear, actionable, practical recommendations.
Format your response with these exact sections:
1. 🌱 Soil Health - improvements based on pH and nutrient levels
2. 🌾 Crop Recommendations - best crops for this soil and conditions
3. 💧 Irrigation Optimization - tips to improve water usage
4. 🧪 Fertilization Schedule - what and when to apply
5. 🐛 Pest Prevention - prevention strategies based on history
6. 📈 Harvest Optimization - strategies to maximize yield
Be specific, practical, and concise. Use bullet points within each section.`;

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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze my parcel and give me the best agricultural recommendations:\n\n${context}` },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        return { advice: 'AI service error. Please try again later.' };
      }

      const data = await response.json() as GroqResponse;
      const advice = data.choices?.[0]?.message?.content?.trim() ?? 'No recommendations available.';
      return { advice };
    } catch {
      return { advice: 'Unable to reach AI service. Please check your connection and try again.' };
    }
  }
}
