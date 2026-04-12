import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SimulationParams {
  irrigationChange: number; // -50 to +50
  temperature: number;      // 0 to 50
  nitrogenLevel: number;    // 0 to 1
}

@Injectable()
export class AeroTwinService {
  private readonly logger = new Logger(AeroTwinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a simple 10x10 matrix of NDVI values.
   * Logic: Stable, no Turf.js, random numbers between 0.3 and 0.8.
   */
  private generateSimpleGrid(): number[][] {
    const grid: number[][] = [];
    for (let i = 0; i < 10; i++) {
      const row: number[] = [];
      for (let j = 0; j < 10; j++) {
        // Random between 0.3 and 0.8
        row.push(Number((0.3 + Math.random() * 0.5).toFixed(3)));
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Fetches the current NDVI grid for a field or generates a new one.
   */
  async getOrComputeNDVI(fieldId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    // Check if field exists
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId }
    });

    if (!field) {
      throw new NotFoundException(`Field ${fieldId} not found.`);
    }

    // Attempt to find existing record for today
    let record = await this.prisma.nDVIRecord.findFirst({
      where: {
        fieldId,
        date: {
          gte: new Date(new Date(targetDate).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(targetDate).setHours(23, 59, 59, 999))
        }
      }
    });

    if (record) return record;

    // Generate fresh grid
    const grid = this.generateSimpleGrid();
    const avgNDVI = grid.flat().reduce((a, b) => a + b, 0) / 100;

    record = await this.prisma.nDVIRecord.create({
      data: {
        fieldId,
        date: targetDate,
        avgNDVI,
        gridData: grid as any,
      }
    });

    return record;
  }

  async getHistory(fieldId: string) {
    return this.prisma.nDVIRecord.findMany({
      where: { fieldId },
      orderBy: { date: 'desc' },
      take: 10,
    });
  }

  /**
   * Runs the core simulation formula requested by the USER.
   */
  async simulateNDVI(fieldId: string, params: SimulationParams) {
    // 1. Get current baseline (usually latest record)
    const latest = await this.getOrComputeNDVI(fieldId);
    const baseGrid = latest.gridData as number[][];

    const { irrigationChange, temperature, nitrogenLevel } = params;

    const simulatedGrid: number[][] = [];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      const row: number[] = [];
      for (let j = 0; j < 10; j++) {
        const baseVal = baseGrid[i][j];
        
        // Formula: newNDVI = baseNDVI + (irrigation * 0.001) + (nitrogen * 0.1) - (temperature > 35 ? 0.1 : 0)
        let newVal = baseVal 
          + (irrigationChange * 0.001) 
          + (nitrogenLevel * 0.1) 
          - (temperature > 35 ? 0.1 : 0);

        // Add 5% random noise for realism
        newVal += (Math.random() - 0.5) * 0.05;

        // Clamp between 0 and 1
        newVal = Math.max(0, Math.min(1, newVal));
        
        row.push(Number(newVal.toFixed(3)));
        sum += newVal;
      }
      simulatedGrid.push(row);
    }

    const predictedAvgNDVI = sum / 100;

    return {
      predictedAvgNDVI,
      predictedGrid: simulatedGrid,
      params // Echo back params
    };
  }

  /**
   * Fetches AI insights using the Groq API.
   * Returns strict JSON format.
   */
  async getAlerts(fieldId: string, simParams?: SimulationParams) {
    const history = await this.getHistory(fieldId);
    const latest = history[0];

    if (!latest) {
      return { 
        issue: "initializing", 
        confidence: 0, 
        recommendation: "System is collecting initial data." 
      };
    }

    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      // Return realistic mock alerts if API key is missing
      return {
        issue: latest.avgNDVI < 0.4 ? "low_biomass" : "nominal",
        confidence: 0.9,
        recommendation: latest.avgNDVI < 0.4 
          ? "Increase nitrogen fertilization and check irrigation pumps." 
          : "Conditions are optimal. Continue current schedule."
      };
    }

    try {
      const prompt = `Analyze crop health for a field based on historical data and user simulation.
        Current Avg NDVI: ${latest.avgNDVI.toFixed(2)}.
        Recent Trend: ${history.map(h => h.avgNDVI.toFixed(2)).join(' -> ')}.
        Simulated Parameters: ${simParams ? JSON.stringify(simParams) : 'Baseline (no changes)'}.
        
        Provide a detailed analysis. Your "recommendation" must include:
        1. How to treat any detected stress or "bad effects" from the simulation.
        2. Prevention steps to avoid these problems in the future.
        
        Respond ONLY with a JSON object:
        { "issue": "string", "confidence": number, "recommendation": "string" }`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from AI service');
      }

      const content = JSON.parse(data.choices[0].message.content);
      return content;
    } catch (err) {
      this.logger.error(`Groq AI Error: ${err.message}`);
      return { 
        issue: "analysis_error", 
        confidence: 0.5, 
        recommendation: "Manual inspection recommended. AI service returned unexpected data." 
      };
    }
  }
}
