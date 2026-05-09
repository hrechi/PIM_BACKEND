import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SimulatorScenario =
  | 'saine'
  | 'mammite'
  | 'fievre'
  | 'boiterie'
  | 'stress_thermique';

@Injectable()
export class SensorSimulatorService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly PHYSIO = {
    temp_mean: 38.7,
    hr_mean: 65,
    activity_mean: 45,
  };

  private readonly DISEASES: Record<
    SimulatorScenario,
    { temp: number; hr: number; activity: number }
  > = {
    saine:            { temp: 0,    hr: 0,   activity: 0   },
    mammite:          { temp: 0.9,  hr: 12,  activity: -25 },
    fievre:           { temp: 1.8,  hr: 20,  activity: -40 },
    boiterie:         { temp: 0.3,  hr: 8,   activity: -35 },
    stress_thermique: { temp: 1.1,  hr: 15,  activity: -20 },
  };

  private rand(std: number) {
    return (Math.random() - 0.5) * 2 * std;
  }

  generateReading(animalId: string, scenario: SimulatorScenario = 'saine') {
    const d = this.DISEASES[scenario];
    const intensity = 0.5 + Math.random() * 0.5; // entre 50% et 100%

    const temperature   = +(this.PHYSIO.temp_mean + d.temp * intensity + this.rand(0.15)).toFixed(2);
    const heartRate     = +(this.PHYSIO.hr_mean   + d.hr   * intensity + this.rand(3)).toFixed(1);
    const activityScore = +Math.max(0, Math.min(100,
      this.PHYSIO.activity_mean + d.activity * intensity + this.rand(8),
    )).toFixed(1);

    // Accéléromètre : boiterie = asymétrie sur accX
    const accX = scenario === 'boiterie'
      ? +(0.8 + 0.4 * intensity + this.rand(0.1)).toFixed(3)
      : +(Math.random() * 0.3).toFixed(3);
    const accY = +(9.7 + this.rand(0.05)).toFixed(3); // gravité
    const accZ = +(Math.random() * 0.4).toFixed(3);

    return {
      animalId,
      temperature,
      heartRate,
      activityScore,
      accX,
      accY,
      accZ,
      isSimulated: true,
      simulatedScenario: scenario,
      timestamp: new Date(),
    };
  }

  async saveReading(animalId: string, scenario: SimulatorScenario) {
    const reading = this.generateReading(animalId, scenario);
    return this.prisma.sensorReading.create({ data: reading });
  }

  async generateHistory(
    animalId: string,
    scenario: SimulatorScenario,
    days = 7,
  ) {
    const readings: ReturnType<typeof this.generateReading>[] = [];
    const now = Date.now();
    const intervalMs = 15 * 60 * 1000; // toutes les 15 minutes

    for (let i = days * 24 * 4; i >= 0; i--) {
      const reading = this.generateReading(animalId, scenario);
      reading.timestamp = new Date(now - i * intervalMs);
      readings.push(reading);
    }

    await this.prisma.sensorReading.createMany({ data: readings });
    return { created: readings.length, scenario, animalId };
  }
}
