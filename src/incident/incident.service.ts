import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createIncident(
    userId: string,
    createIncidentDto: CreateIncidentDto,
    imagePath: string,
  ) {
    const incident = await this.prisma.securityIncident.create({
      data: {
        type: createIncidentDto.type,
        imagePath,
        userId,
      },
    });

    // Fire-and-forget FCM push to the farm owner
    this.sendPushNotification(userId, incident).catch((err) =>
      this.logger.error('Push notification failed:', err),
    );

    return incident;
  }

  private async sendPushNotification(
    userId: string,
    incident: { id: string; type: string; imagePath: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      this.logger.warn(`No FCM token for user ${userId} — skipping push`);
      return;
    }

    await this.notificationService.sendIncidentAlert(user.fcmToken, incident);
  }

  async getAllIncidents(userId: string) {
    return this.prisma.securityIncident.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getIncidentById(id: string, userId: string) {
    return this.prisma.securityIncident.findFirst({
      where: { id, userId },
    });
  }

  async deleteIncident(id: string, userId: string) {
    return this.prisma.securityIncident.deleteMany({
      where: { id, userId },
    });
  }
}
