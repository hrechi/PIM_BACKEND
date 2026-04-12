import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SimulationParams {
  irrigationChange: number; // -50 to +50
  temperature: number; // 0 to 50
  nitrogenLevel: number; // 0 to 1
}

@Injectable()
export class AeroTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a simple 10x10 NDVI grid with realistic random values.
   */
  private generateMockGrid(): number[][] {
    const grid: number[][] = [];
    for (let i = 0; i < 10; i++) {
        const row: number[] = [];
        for (let j = 0; j < 10; j++) {
            // Random between 0.3 and 0.8
            row.push(0.3 + Math.random() * 0.5);
        }
        grid.push(row);
    }
    return grid;
  }

  async getNDVI(fieldId: string) {
    const field = await this.prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Field ${fieldId} not found`);

    // Check for recent record
    let record = await this.prisma.nDVIRecord.findFirst({
        where: { fieldId },
        orderBy: { date: 'desc' },
    });

    if (!record) {
        const grid = this.generateMockGrid();
        const avg = grid.flat().reduce((a, b) => a + b, 0) / 100;
        record = await this.prisma.nDVIRecord.create({
            data: {
                fieldId,
                date: new Date(),
                avgNDVI: avg,
                gridData: grid as any,
            }
        });
    }

    return record;
  }

  async getHistory(fieldId: string) {
    return this.prisma.nDVIRecord.findMany({
      where: { fieldId },
      orderBy: { date: 'asc' },
      take: 10,
    });
  }

  async getAlerts(fieldId: string) {
    const history = await this.getHistory(fieldId);
    if (history.length === 0) {
      return { issue: "no_data", confidence: 0, recommendation: "Collect initial NDVI data." };
    }

    const latest = history[history.length - 1];
    
    // Groq Integration
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl = this.configService.get<string>('GROQ_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!apiKey) {
      return { 
        issue: latest.avgNDVI < 0.4 ? "water_stress" : "healthy", 
        confidence: 0.8, 
        recommendation: latest.avgNDVI < 0.4 ? "Increase irrigation by 15%." : "Maintain current regime." 
      };
    }

    try {
      const prompt = `Analyze crop health for a field. 
        NDVI History (last 10 days): ${history.map(h => h.avgNDVI.toFixed(2)).join(', ')}.
        Current Avg NDVI: ${latest.avgNDVI.toFixed(2)}.
        Return strictly JSON in this format: { "issue": string, "confidence": number, "recommendation": string }`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (err) {
      return { issue: "error", confidence: 0, recommendation: "AI analysis unavailable." };
    }
  }

  async simulateNDVI(fieldId: string, params: SimulationParams) {
    const current = await this.getNDVI(fieldId);
    const grid = current.gridData as number[][];
    const { irrigationChange, temperature, nitrogenLevel } = params;

    // Formula: newNDVI = baseNDVI + (irrigation * 0.001) + (nitrogen * 0.1) - (temperature > 35 ? 0.1 : 0)
    const waterEffect = irrigationChange * 0.001;
    const nitrogenEffect = nitrogenLevel * 0.1;
    const tempStress = temperature > 35 ? 0.1 : 0;

    const simulatedGrid: number[][] = [];
    let sum = 0;

    for (let i = 0; i < grid.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < grid[i].length; j++) {
        let newVal = grid[i][j] + waterEffect + nitrogenEffect - tempStress;
        // Clamp between 0 and 1
        newVal = Math.max(0, Math.min(1, newVal));
        row.push(newVal);
        sum += newVal;
      }
      simulatedGrid.push(row);
    }

    const predictedAvgNDVI = sum / 100;

    return {
      predictedAvgNDVI,
      predictedGrid: simulatedGrid,
      riskZonesCount: simulatedGrid.flat().filter(v => v < 0.3).length,
      totalZones: 100,
    };
  }
}
