import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SimulationParams {
  irrigationChange: number; // percentage change (e.g., -10 for 10% decrease)
  temperature: number; // absolute temperature in C
  nitrogenLevel: number; // nitrogen available (0 to 1)
}

@Injectable()
export class AeroTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 1. Fetches mock multispectral satellite data (B4 Red + B8 NIR).
   */
  async fetchSatelliteData(fieldId: string, date: string): Promise<{ b4: number[][]; b8: number[][] }> {
    // Generate a 10x10 mock grid for B4 and B8
    const size = 10;
    const b4: number[][] = [];
    const b8: number[][] = [];

    for (let i = 0; i < size; i++) {
      const b4Row = [];
      const b8Row = [];
      for (let j = 0; j < size; j++) {
        // Red usually lower in vegetation, NIR higher
        // Create some pseudo-random spatial pattern mimicking plants
        const baseRed = 0.05 + Math.random() * 0.1; 
        const baseNIR = 0.4 + Math.random() * 0.4; 
        b4Row.push(baseRed);
        b8Row.push(baseNIR);
      }
      b4.push(b4Row);
      b8.push(b8Row);
    }

    return { b4, b8 };
  }

  /**
   * 2. Computes NDVI for each pixel
   * NDVI = (NIR - Red) / (NIR + Red)
   */
  computeNDVI(b8Grid: number[][], b4Grid: number[][]): { avgNDVI: number, ndviGrid: number[][] } {
    const size = b8Grid.length;
    const ndviGrid: number[][] = [];
    let sum = 0;
    let count = 0;

    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < b8Grid[i].length; j++) {
        const nir = b8Grid[i][j];
        const red = b4Grid[i][j];
        const denom = (nir + red) === 0 ? 0.0001 : (nir + red); // prevent division by zero
        const ndvi = (nir - red) / denom;
        row.push(ndvi);
        sum += ndvi;
        count++;
      }
      ndviGrid.push(row);
    }

    return {
      avgNDVI: sum / count,
      ndviGrid
    };
  }

  /**
   * Retrieve NDVI or compute and store it if not cached for the day
   */
  async getOrComputeNDVI(fieldId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    
    // Check if field exists first
    const field = await this.prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) {
        throw new BadRequestException(`Field with ID ${fieldId} not found`);
    }

    // Check if we already have it
    let record = await this.prisma.nDVIRecord.findFirst({
      where: {
        fieldId,
        date: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lte: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      }
    });

    if (record) {
      return record;
    }

    // Mock fetch satellite data
    const { b4, b8 } = await this.fetchSatelliteData(fieldId, dateStr);
    
    // Compute NDVI
    const { avgNDVI, ndviGrid } = this.computeNDVI(b8, b4);

    // Save to database
    record = await this.prisma.nDVIRecord.create({
      data: {
        fieldId,
        date: new Date(dateStr),
        avgNDVI,
        gridData: ndviGrid
      }
    });

    return record;
  }

  /**
   * Get historical NDVI data
   */
  async getHistory(fieldId: string) {
    return this.prisma.nDVIRecord.findMany({
      where: { fieldId },
      orderBy: { date: 'asc' }
    });
  }

  /**
   * Groq AI based Stress Detection
   */
  async getAlerts(fieldId: string) {
    const history = await this.getHistory(fieldId);

    if (history.length === 0) {
      return { 
        zone: "General", 
        severity: "low", 
        message: "No NDVI history available to detect stress. Generate latest NDVI data." 
      };
    }

    const latest = history[history.length - 1];
    
    // Simple rule-based validation
    if (history.length === 1 && latest.avgNDVI < 0.3) {
       return {
         zone: "Entire Field",
         severity: "high",
         message: `Immediate attention required: Average NDVI is ${latest.avgNDVI.toFixed(2)}, indicating severe stress.`
       };
    } else if (history.length === 1 && latest.avgNDVI >= 0.3) {
      return {
         zone: "Entire Field",
         severity: "low",
         message: `Field health is stable. Average NDVI is ${latest.avgNDVI.toFixed(2)}.`
       };
    }

    // Trend analysis over time
    const prev = history[history.length - 2];
    const trend = latest.avgNDVI - prev.avgNDVI;

    let preEvaluatedSeverity = "low";
    let preEvaluatedMessage = "Field is healthy.";

    if (latest.avgNDVI < 0.3) {
      preEvaluatedSeverity = "high";
      preEvaluatedMessage = "Severe stress detected. Avg NDVI is critically low (< 0.3).";
    } else if (trend < -0.1) {
      preEvaluatedSeverity = "medium";
      preEvaluatedMessage = "Warning: NDVI is decreasing over time. Potential emerging stress.";
    } else if (latest.avgNDVI >= 0.3 && latest.avgNDVI < 0.5) {
        preEvaluatedSeverity = "medium";
        preEvaluatedMessage = "Warning: Vegetation health is sub-optimal (NDVI < 0.5). Monitor nutrients."; 
    }

    // Ask Groq to interpret the trend and explain
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl = this.configService.get<string>('GROQ_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    const model = this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      // Fallback if no Groq API KEY
      return {
         zone: "Entire Field",
         severity: preEvaluatedSeverity,
         message: preEvaluatedMessage,
       };
    }

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
            { 
              role: 'system', 
              content: 'You are Fieldly AI, an expert agricultural analyst predicting crop stress from NDVI metrics. Be concise.' 
            },
            {
              role: 'user',
              content: `Given historical NDVI data (Oldest to newest avg): ${history.map(h => h.avgNDVI.toFixed(2)).join(', ')}. Analyze the trend and suggest if there is water stress, disease risk, or if it is healthy. Give me a maximum 2 sentence summary.`
            }
          ],
          temperature: 0.3,
        })
      });

      if (!response.ok) {
         throw new Error("Failed to fetch Groq");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      return {
        zone: "Entire Field",
        severity: preEvaluatedSeverity,
        message: content ? content.trim() : preEvaluatedMessage
      };
    } catch(err) {
      return {
        zone: "Entire Field",
        severity: preEvaluatedSeverity,
        message: `${preEvaluatedMessage} (AI analysis temporarily unavailable)`
      };
    }
  }

  /**
   * Digital Twin Simulation
   * futureNDVI = currentNDVI + (waterEffect + nitrogenEffect - stressFactor)
   */
  async simulateNDVI(fieldId: string, params: SimulationParams) {
    // Get current state
    const todayStr = new Date().toISOString();
    const currentRecord = await this.getOrComputeNDVI(fieldId, todayStr);
    
    const { irrigationChange, temperature, nitrogenLevel } = params;

    // Simulate simple model effects
    // irrigationChange: -10% => -0.05 effect. +10% => 0.05
    const waterEffect = (irrigationChange / 100) * 0.5;
    
    // nitrogenLevel: 0 to 1 => max effect 0.2
    const nitrogenEffect = (nitrogenLevel - 0.5) * 0.4;
    
    // temperature: ideal is 25C. 
    // If temp > 35C => severe stress. If temp < 10 => slow growth.
    let stressFactor = 0;
    if (temperature > 35) {
      stressFactor = ((temperature - 35) / 10) * 0.3; 
    } else if (temperature < 15) {
      stressFactor = ((15 - temperature) / 10) * 0.1;
    }

    const currentGrid = currentRecord.gridData as number[][];
    const size = currentGrid.length;
    
    const futureGrid: number[][] = [];
    let futureSum = 0;
    let count = 0;

    let riskZones = 0;

    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < currentGrid[i].length; j++) {
        let currentNDVI = currentGrid[i][j];
        
        let futurePixel = currentNDVI + (waterEffect + nitrogenEffect - stressFactor);
        
        // Clamp to -1 to 1
        futurePixel = Math.max(-1, Math.min(1, futurePixel));
        row.push(futurePixel);
        futureSum += futurePixel;
        count++;

        if (futurePixel < 0.3) {
          riskZones++;
        }
      }
      futureGrid.push(row);
    }

    return {
      predictedAvgNDVI: futureSum / count,
      predictedGrid: futureGrid,
      riskZonesCount: riskZones,
      totalZones: count,
      stressFactor,
      waterEffect,
      nitrogenEffect
    };
  }
}
