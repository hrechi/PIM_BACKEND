import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class VaccineReminderCron {
    private readonly logger = new Logger(VaccineReminderCron.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationService,
    ) { }

    /** Rappels intelligents — 7h00 chaque jour */
    @Cron('0 7 * * *')
    async sendVaccineReminders() {
        const now = new Date();
        const in30days = new Date(now.getTime() + 30 * 86400000);

        const pending: any[] = await this.prisma.vaccineSchedule.findMany({
            where: {
                status: { in: ['PENDING', 'NOTIFIED'] },
                scheduledDate: { lte: in30days },
            },
            include: {
                animal: {
                    include: {
                        field: { include: { user: true } },
                    },
                },
                vaccine: true,
            },
        });

        let sent = 0;
        for (const schedule of pending) {
            const daysLeft = Math.round(
                (schedule.scheduledDate.getTime() - now.getTime()) / 86400000,
            );

            if (![14, 7, 3, 1, 0].includes(daysLeft)) continue;

            const animalName = schedule.animal.name;
            const vaccineName = schedule.vaccine.nameFr;
            const fcmToken = (schedule.animal.field?.user as any)?.fcmToken as string | undefined;
            if (!fcmToken) continue;

            let title: string;
            let body: string;
            let type: string;

            if (daysLeft <= 0) {
                title = `💉 Aujourd'hui : ${vaccineName}`;
                body = `Vacciniser ${animalName} contre ${vaccineName}. Marquez comme fait dans l'app.`;
                type = 'DUE_TODAY';
            } else if (daysLeft <= 3) {
                title = `🚨 Urgent : ${vaccineName} dans ${daysLeft}j`;
                body = `${animalName} doit être vacciné(e) contre ${vaccineName} dans ${daysLeft} jour(s).`;
                type = 'URGENT_D3';
            } else {
                title = `⏰ Rappel vaccin dans ${daysLeft}j`;
                body = `${animalName} — ${vaccineName} prévu le ${schedule.scheduledDate.toLocaleDateString('fr-FR')}.`;
                type = 'REMINDER';
            }

            await this.notifications.sendToDevice(fcmToken, {
                notification: { title, body },
                data: {
                    type,
                    animalId: schedule.animalId,
                    scheduleId: schedule.id,
                    vaccineCode: schedule.vaccine.code,
                },
            });

            await this.prisma.vaccineNotificationLog.create({
                data: { scheduleId: schedule.id, type, title, body },
            });

            await this.prisma.vaccineSchedule.update({
                where: { id: schedule.id },
                data: { status: 'NOTIFIED' },
            });
            sent++;
        }
        this.logger.log(`✅ ${sent} rappels vaccins envoyés`);
    }

    /** Marquer OVERDUE — 6h00 chaque jour */
    @Cron('0 6 * * *')
    async markOverdue() {
        const result = await this.prisma.vaccineSchedule.updateMany({
            where: {
                status: { in: ['PENDING', 'NOTIFIED'] },
                scheduledDate: { lt: new Date() },
            },
            data: { status: 'OVERDUE' },
        });
        this.logger.log(`🔴 ${result.count} plannings marqués OVERDUE`);
    }
}
