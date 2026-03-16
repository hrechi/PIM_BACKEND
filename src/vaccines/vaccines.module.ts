import { Module } from '@nestjs/common';
import { VaccinesController } from './vaccines.controller';
import { VaccinesService } from './vaccines.service';
import { VaccineRegionalModule } from '../vaccine-regional/regional.module';
import { NotificationModule } from '../notification/notification.module';
import { VaccineReminderCron } from '../vaccine-reminders/vaccine-reminder.cron';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [VaccineRegionalModule, NotificationModule],
    controllers: [VaccinesController],
    providers: [VaccinesService, VaccineReminderCron, PrismaService],
    exports: [VaccinesService],
})
export class VaccinesModule { }
