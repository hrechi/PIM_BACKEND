import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SessionCondition } from '@prisma/client';
import { AssetInsightsService } from './asset-insights.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

export type PredictiveMaintenanceRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type PredictiveMaintenanceResult = {
  predictions: string[];
  riskLevel: PredictiveMaintenanceRiskLevel;
  recommendedActions: string[];
  canUse: boolean;
};

type PredictiveEvaluationOptions = {
  notify?: boolean;
};

type MaintenanceSignal = {
  predictions: Set<string>;
  recommendedActions: Set<string>;
  riskLevel: PredictiveMaintenanceRiskLevel;
  canUse: boolean;
};

@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name);
  private readonly notificationSignatures = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly assetInsightsService: AssetInsightsService,
    private readonly notificationService: NotificationService,
  ) {}

  async evaluateAsset(
    assetId: string,
    options: PredictiveEvaluationOptions = {},
  ): Promise<PredictiveMaintenanceResult> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        userId: true,
        name: true,
        brand: true,
        model: true,
        category: true,
        operatingHours: true,
        mileage: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const logs = await this.prisma.usageLog.findMany({
      where: { assetId },
      orderBy: { endTime: 'desc' },
      take: 20,
      select: {
        issues: true,
        condition: true,
        duration: true,
        startTime: true,
        endTime: true,
      },
    });

    if (logs.length === 0 && (asset.operatingHours ?? 0) < 200) {
      return {
        predictions: [],
        riskLevel: 'LOW',
        recommendedActions: [],
        canUse: true,
      };
    }

    const insights = await this.assetInsightsService.getAssetInsights(assetId);
    const signal = this.buildSignals(asset.operatingHours ?? 0, logs, insights);
    const result: PredictiveMaintenanceResult = {
      predictions: Array.from(signal.predictions),
      riskLevel: signal.riskLevel,
      recommendedActions: Array.from(signal.recommendedActions),
      canUse: signal.canUse,
    };

    if (options.notify !== false && result.predictions.length > 0) {
      await this.notifyOwner(asset.id, asset.userId, asset.name, result);
    }

    return result;
  }

  async ensureSafeToUse(assetId: string): Promise<PredictiveMaintenanceResult> {
    const evaluation = await this.evaluateAsset(assetId);

    if (!evaluation.canUse) {
      throw new ConflictException(
        'Machine is in high-risk condition. Maintenance required before use.',
      );
    }

    return evaluation;
  }

  private buildSignals(
    operatingHours: number,
    logs: Array<{
      issues: string | null;
      condition: SessionCondition | null;
      duration: number | null;
      startTime: Date;
      endTime: Date | null;
    }>,
    insights: Awaited<ReturnType<AssetInsightsService['getAssetInsights']>>,
  ): MaintenanceSignal {
    const predictions = new Set<string>();
    const recommendedActions = new Set<string>();
    let riskLevel: PredictiveMaintenanceRiskLevel = 'LOW';

    const repeatedIssue = this.findRepeatedIssue(logs, 3);
    const criticalPattern = logs.some((log) => log.condition === SessionCondition.CRITICAL);
    const heavyUsage = this.hasHeavyUsagePattern(logs);
    const overMaintenanceThreshold = operatingHours >= this.getMaintenanceThreshold();

    if (overMaintenanceThreshold) {
      predictions.add('Oil change required');
      recommendedActions.add('Schedule oil change and routine service checks');
    }

    if (repeatedIssue) {
      predictions.add(`Potential recurring failure: ${repeatedIssue}`);
      recommendedActions.add('Inspect the repeatedly reported component and confirm root cause');
    }

    if (criticalPattern || insights.riskLevel === 'HIGH') {
      predictions.add('High failure risk');
      recommendedActions.add('Stop heavy usage and perform immediate inspection');
    }

    if (heavyUsage) {
      predictions.add('Wear risk increasing');
      recommendedActions.add('Reduce load, inspect consumables, and shorten service intervals');
    }

    if (insights.warnings.length > 0) {
      for (const warning of insights.warnings) {
        if (warning.toLowerCase().includes('repeated issue')) {
          predictions.add(warning.replace('Repeated issue detected:', 'Potential recurring failure:').trim());
        }
        if (warning.toLowerCase().includes('machine condition degrading')) {
          predictions.add('Wear risk increasing');
        }
      }
    }

    if (insights.recommendations.length > 0) {
      insights.recommendations.forEach((item) => recommendedActions.add(item));
    }

    if (criticalPattern || repeatedIssue) {
      riskLevel = 'HIGH';
    } else if (predictions.size > 0 || recommendedActions.size > 0 || insights.riskLevel === 'MEDIUM') {
      riskLevel = 'MEDIUM';
    }

    return {
      predictions,
      recommendedActions,
      riskLevel,
      canUse: riskLevel !== 'HIGH',
    };
  }

  private findRepeatedIssue(logs: Array<{ issues: string | null }>, minimumCount: number): string | null {
    const counts = new Map<string, { label: string; count: number }>();

    for (const log of logs) {
      const label = this.normalizeIssue(log.issues);
      if (!label) continue;

      const current = counts.get(label);
      if (current) {
        current.count += 1;
      } else {
        counts.set(label, { label, count: 1 });
      }
    }

    const repeated = Array.from(counts.values()).find((entry) => entry.count >= minimumCount);
    return repeated?.label ?? null;
  }

  private hasHeavyUsagePattern(
    logs: Array<{ duration: number | null; startTime: Date; endTime: Date | null }>,
  ): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const recentLogs = logs.filter((log) => (log.endTime ?? log.startTime) >= cutoff);
    const longSessions = recentLogs.filter((log) => (log.duration ?? 0) >= 3);
    const totalRecentHours = recentLogs.reduce((sum, log) => sum + (log.duration ?? 0), 0);

    return longSessions.length >= 3 || totalRecentHours >= 12;
  }

  private async notifyOwner(
    assetId: string,
    ownerId: string,
    assetName: string,
    result: PredictiveMaintenanceResult,
  ): Promise<void> {
    const signature = `${result.riskLevel}:${result.predictions.join('|')}:${result.recommendedActions.join('|')}`;
    if (this.notificationSignatures.get(assetId) === signature) {
      return;
    }

    this.notificationSignatures.set(assetId, signature);

    const title =
      result.riskLevel === 'HIGH'
        ? `⚠️ High risk detected — usage not recommended`
        : `🔧 Maintenance predicted for ${assetName}`;
    const body = result.predictions.length > 0
      ? `${assetName}: ${result.predictions.join('; ')}`
      : `${assetName} requires maintenance review.`;

    try {
      await this.notificationService.sendNotification(ownerId, title, body, {
        assetId,
        screen: 'ASSET_DETAILS',
        type: 'ASSET_PREDICTIVE_MAINTENANCE',
        riskLevel: result.riskLevel,
      });
    } catch (error) {
      this.logger.warn(
        `Predictive maintenance notification failed for asset ${assetId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private normalizeIssue(issue?: string | null): string {
    return (issue ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getMaintenanceThreshold(): number {
    const threshold = Number(process.env.ASSET_MAINTENANCE_THRESHOLD_HOURS ?? 200);
    return Number.isFinite(threshold) ? threshold : 200;
  }
}