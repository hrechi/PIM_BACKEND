import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionCondition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AssetInsightsRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AssetInsightsResult = {
  riskLevel: AssetInsightsRiskLevel;
  warnings: string[];
  recommendations: string[];
};

@Injectable()
export class AssetInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssetInsights(assetId: string): Promise<AssetInsightsResult> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        operatingHours: true,
        mileage: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const logs = await this.prisma.usageLog.findMany({
      where: {
        assetId,
        endTime: { not: null },
      },
      orderBy: { endTime: 'desc' },
      take: 20,
      select: {
        issues: true,
        condition: true,
        duration: true,
        endTime: true,
        startTime: true,
        endOperatingHours: true,
      },
    });

    if (logs.length === 0) {
      return {
        riskLevel: 'LOW',
        warnings: [],
        recommendations: [],
      };
    }

    const warnings = new Set<string>();
    const recommendations = new Set<string>();

    this.collectRepeatedIssues(logs).forEach((issue) => {
      warnings.add(`Repeated issue detected: ${issue}`);
    });

    const conditionSummary = this.collectConditionSummary(logs);
    if (conditionSummary.warningOrCriticalCount >= 2) {
      warnings.add('Machine condition degrading');
    }

    if (conditionSummary.criticalCount >= 1) {
      warnings.add('Critical condition detected in recent usage logs');
    }

    if (this.hasHighUsage(logs)) {
      recommendations.add('High usage detected, consider maintenance');
    }

    const maintenanceThreshold = Number(
      process.env.ASSET_MAINTENANCE_THRESHOLD_HOURS ?? 200,
    );
    if (
      Number.isFinite(maintenanceThreshold) &&
      (asset.operatingHours ?? 0) >= maintenanceThreshold
    ) {
      recommendations.add('Maintenance recommended based on operating hours');
    }

    const riskLevel = this.resolveRiskLevel({
      warnings: Array.from(warnings),
      recommendations: Array.from(recommendations),
      hasCriticalCondition: conditionSummary.criticalCount >= 1,
      repeatedIssueCount: this.collectRepeatedIssues(logs).length,
    });

    return {
      riskLevel,
      warnings: Array.from(warnings),
      recommendations: Array.from(recommendations),
    };
  }

  private collectRepeatedIssues(
    logs: Array<{ issues: string | null }>,
  ): string[] {
    const counts = new Map<string, { label: string; count: number }>();

    for (const log of logs) {
      const issue = this.normalizeIssue(log.issues);
      if (!issue) {
        continue;
      }

      const existing = counts.get(issue);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(issue, { label: this.formatIssueLabel(log.issues), count: 1 });
      }
    }

    return Array.from(counts.values())
      .filter((entry) => entry.count >= 2)
      .map((entry) => entry.label);
  }

  private collectConditionSummary(logs: Array<{ condition: SessionCondition | null }>) {
    let warningOrCriticalCount = 0;
    let criticalCount = 0;

    for (const log of logs) {
      if (log.condition === SessionCondition.WARNING || log.condition === SessionCondition.CRITICAL) {
        warningOrCriticalCount += 1;
      }
      if (log.condition === SessionCondition.CRITICAL) {
        criticalCount += 1;
      }
    }

    return { warningOrCriticalCount, criticalCount };
  }

  private hasHighUsage(
    logs: Array<{ duration: number | null; endTime: Date | null; startTime: Date }>,
  ): boolean {
    const recentWindowDays = 7;
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - recentWindowDays);

    const recentLogs = logs.filter((log) => {
      const referenceTime = log.endTime ?? log.startTime;
      return referenceTime >= recentCutoff;
    });

    const totalRecentHours = recentLogs.reduce(
      (sum, log) => sum + (log.duration ?? 0),
      0,
    );

    return recentLogs.length >= 4 && totalRecentHours >= 12;
  }

  private resolveRiskLevel(input: {
    warnings: string[];
    recommendations: string[];
    hasCriticalCondition: boolean;
    repeatedIssueCount: number;
  }): AssetInsightsRiskLevel {
    if (input.hasCriticalCondition || input.repeatedIssueCount >= 2) {
      return 'HIGH';
    }

    if (input.warnings.length > 0 || input.recommendations.length > 0) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private normalizeIssue(issue?: string | null): string {
    return (issue ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private formatIssueLabel(issue?: string | null): string {
    return (issue ?? '').trim();
  }
}