import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Assuming you have this set up

@Injectable()
export class AgronomistService {
  constructor(private prisma: PrismaService) {}

  async getAdvice(parcelId: string): Promise<string> {
    // 1. Fetch data from Prisma
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { crops: true },
    });

    if (!parcel || parcel.crops.length === 0) {
      return "No crop data found for this parcel.";
    }

    const currentCrop = parcel.crops[0];

    // 2. Build the prompt
    const prompt = `
      You are an expert agronomist. Keep your answer brief and practical.
      I am growing ${currentCrop.cropName} (${currentCrop.variety}) in ${parcel.soilType} soil.
      My irrigation method is ${parcel.irrigationMethod}.
      Give me 3 bullet points of advice for currently managing this crop.
    `;

    // 3. Call local Ollama API
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Must match the model you pulled in Step 1
          prompt: prompt,
          stream: false,   // Set to false to get the whole response at once
        }),
      });

      const data = await response.json();
      return data.response; // This contains the AI's text
    } catch (error) {
      console.error("Ollama Error:", error);
      return "Sorry, the AI agronomist is currently unavailable.";
    }
  }
}