import { Injectable, Logger } from '@nestjs/common';
import { SessionCondition } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

type MaintenanceAlertInput = {
  ownerId: string;
  assetId: string;
  assetName: string;
  sessionId: string;
  operatingHours: number;
  condition: SessionCondition;
  issues?: string | null;
};

@Injectable()
export class AssetMaintenanceNotificationService {
  private readonly logger = new Logger(AssetMaintenanceNotificationService.name);
  private readonly sentKeys = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async notifyAfterSessionEnd(input: MaintenanceAlertInput): Promise<void> {
    const alerts: Array<{ key: string; title: string; message: string }> = [];

    const threshold = Number(process.env.ASSET_MAINTENANCE_THRESHOLD_HOURS ?? 200);
    if (Number.isFinite(threshold) && input.operatingHours >= threshold) {
      alerts.push({
        key: 'maintenance-threshold',
        title: 'Maintenance Required',
        message: `${input.assetName} has reached ${input.operatingHours.toFixed(1)} operating hours and needs service.`,
      });
    }

    if (input.condition === SessionCondition.CRITICAL) {
      alerts.push({
        key: 'critical-condition',
        title: 'Critical Condition Alert',
        message: `${input.assetName} was marked critical after the last session.`,
      });
    }

    const repeatedIssue = await this.hasRepeatedIssue(input.assetId, input.issues);
    if (repeatedIssue) {
      alerts.push({
        key: `repeated-issue:${this.normalizeIssue(input.issues ?? '')}`,
        title: 'Repeated Issue Detected',
        message: `${input.assetName} has shown the same issue more than once in recent logs.`,
      });
    }

    for (const alert of alerts) {
      await this.sendOnce(input.ownerId, input.assetId, input.sessionId, alert);
    }
  }

  private async sendOnce(
    ownerId: string,
    assetId: string,
    sessionId: string,
    alert: { key: string; title: string; message: string },
  ): Promise<void> {
    const dedupeKey = `${ownerId}:${assetId}:${sessionId}:${alert.key}`;
    const now = Date.now();
    const expiresAt = this.sentKeys.get(dedupeKey);

    if (expiresAt && expiresAt > now) {
      return;
    }

    this.sentKeys.set(dedupeKey, now + 10 * 60 * 1000);

    try {
      await this.notificationService.sendNotification(ownerId, alert.title, alert.message, {
        screen: 'ASSET_DETAILS',
        type: 'ASSET_MAINTENANCE_ALERT',
        assetId,
        sessionId,
        rule: alert.key,
      });
    } catch (error) {
      this.logger.error(`Failed to send maintenance notification (${alert.key})`, error as Error);
    }
  }

  private async hasRepeatedIssue(assetId: string, issues?: string | null): Promise<boolean> {
    const currentIssue = this.normalizeIssue(issues ?? '');
    if (!currentIssue) {
      return false;
    }

    const recentLogs = await this.prisma.usageLog.findMany({
      where: {
        assetId,
        endTime: { not: null },
        issues: { not: null },
      },
      orderBy: { endTime: 'desc' },
      take: 10,
      select: { issues: true },
    });

    const matches = recentLogs.filter(
      (log) => this.normalizeIssue(log.issues ?? '') === currentIssue,
    );

    return matches.length >= 2;
  }

  private normalizeIssue(issue: string): string {
    return issue.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}