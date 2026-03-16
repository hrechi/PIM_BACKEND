import {
    Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards
} from '@nestjs/common';
import { VaccinesService } from './vaccines.service';
import { RegionalVaccineService } from '../vaccine-regional/regional.service';
import { NotificationService } from '../notification/notification.service';
import { CreateVaccineRecordDto } from './dto/create-vaccine-record.dto';
import { CreateVaccineScheduleDto } from './dto/create-vaccine-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class VaccinesController {
    constructor(
        private vaccinesService: VaccinesService,
        private regionalService: RegionalVaccineService,
        private notifications: NotificationService,
        private prisma: PrismaService,
    ) { }

    // ── Référentiel ────────────────────────────────────────────────────────

    @Get('vaccines')
    listVaccines(@Query('species') species?: string) {
        return this.vaccinesService.listVaccines(species);
    }

    @Get('countries')
    listCountries() {
        return this.vaccinesService.listCountries();
    }

    @Get('countries/:code/regulations')
    getRegulations(
        @Param('code') code: string,
        @Query('species') species?: string,
        @Query('region') regionCode?: string,
    ) {
        return this.vaccinesService.getCountryRegulations(code, species, regionCode);
    }

    /** Get regulations for a specific field — auto-resolves country from GPS */
    @Get('fields/:fieldId/regulations')
    getFieldRegulations(
        @Param('fieldId') fieldId: string,
        @Query('species') species?: string,
    ) {
        return this.vaccinesService.getFieldRegulations(fieldId, species);
    }

    // ── Records ────────────────────────────────────────────────────────────

    @Get('vaccine-records')
    getRecords(@Query('animalId') animalId: string) {
        return this.vaccinesService.getRecords(animalId);
    }

    @Post('vaccine-records')
    createRecord(@Body() dto: CreateVaccineRecordDto) {
        return this.vaccinesService.createRecord(dto);
    }

    // ── Schedules ──────────────────────────────────────────────────────────

    @Get('vaccine-schedules')
    getSchedules(@Query('animalId') animalId: string) {
        return this.vaccinesService.getSchedules(animalId);
    }

    @Get('vaccine-schedules/upcoming')
    getUpcoming(@Query('fieldId') fieldId: string, @Query('days') days?: string) {
        return this.vaccinesService.getUpcoming(fieldId, days ? parseInt(days) : 30);
    }

    @Get('vaccine-schedules/all')
    getAllSchedules(@Request() req: any) {
        return this.vaccinesService.getAllSchedules(req.user.id);
    }

    @Post('vaccine-schedules')
    createSchedule(@Body() dto: CreateVaccineScheduleDto) {
        return this.vaccinesService.createSchedule(dto);
    }

    @Post('vaccine-schedules/bulk-done')
    bulkMarkDone(@Body() dto: any) {
        return this.vaccinesService.bulkMarkDone(dto);
    }

    @Post('vaccine-schedules/generate/:animalId')
    generateSmartPlan(@Param('animalId') animalId: string) {
        return this.regionalService.generateSmartPlan(animalId);
    }

    @Patch('vaccine-schedules/:id')
    updateSchedule(@Param('id') id: string, @Body('scheduledDate') date: string) {
        return this.vaccinesService.updateSchedule(id, date);
    }

    @Patch('vaccine-schedules/:id/done')
    markDone(
        @Param('id') id: string,
        @Body() body: { administeredBy: string; doseGiven: number; lotNumber?: string },
    ) {
        return this.vaccinesService.markDone(id, body);
    }

    // ── Test notification (DEV) ────────────────────────────────────────────

    /** Sends an immediate test push to the logged-in user's device.
     *  Call: GET /vaccines/test-notification  (with Authorization: Bearer <token>)
     */
    @Get('vaccines/test-notification')
    async testNotification(@Request() req: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { fcmToken: true, name: true },
        });

        if (!user?.fcmToken) {
            return {
                ok: false,
                message: 'No FCM token found. Make sure the app sent the token after login.',
            };
        }

        await this.notifications.sendToDevice(user.fcmToken, {
            notification: {
                title: '🧪 Test Notification',
                body: `Hello ${user.name ?? 'Farmer'}! Firebase push notifications are working correctly.`,
            },
            data: { type: 'TEST' },
        });

        return { ok: true, message: 'Test notification sent! Check your device.' };
    }
}
