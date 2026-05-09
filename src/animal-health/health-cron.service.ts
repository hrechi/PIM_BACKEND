import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnimalHealthService } from './animal-health.service';

@Injectable()
export class HealthCronService {
  private readonly logger = new Logger(HealthCronService.name);

  constructor(private readonly healthService: AnimalHealthService) {}

  /** Toutes les minutes (test) — recalcul vitalityScore + healthStatus pour tous les animaux actifs */
  @Cron('* * * * *')
  async recalculateAllScores() {
    this.logger.log('🕑 [HealthCron] Recalcul horaire démarré...');
    try {
      const result = await this.healthService.diagnoseAllInternal();
      this.logger.log(`✅ [HealthCron] ${result.processed} ok, ${result.errors} errors`);
    } catch (e) {
      this.logger.error(`❌ [HealthCron] Échec: ${e.message}`);
    }
  }
}
