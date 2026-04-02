import { Module } from '@nestjs/common';
import { VaccinesController } from './vaccines.controller';
import { VaccinesService } from './vaccines.service';
import { VaccineRegionalModule } from '../vaccine-regional/regional.module';
import { NotificationModule } from '../notification/notification.module';
import { VaccineReminderCron } from '../vaccine-reminders/vaccine-reminder.cron';

@Module({
    imports: [VaccineRegionalModule, NotificationModule],
    controllers: [VaccinesController],
    providers: [VaccinesService, VaccineReminderCron],
    exports: [VaccinesService],
})
export class VaccinesModule { }
