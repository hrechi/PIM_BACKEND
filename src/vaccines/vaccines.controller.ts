import {
    Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards
} from '@nestjs/common';
import { VaccinesService } from './vaccines.service';
import { RegionalVaccineService } from '../vaccine-regional/regional.service';
import { CreateVaccineRecordDto } from './dto/create-vaccine-record.dto';
import { CreateVaccineScheduleDto } from './dto/create-vaccine-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class VaccinesController {
    constructor(
        private vaccinesService: VaccinesService,
        private regionalService: RegionalVaccineService,
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
    getRegulations(@Param('code') code: string, @Query('species') species?: string) {
        return this.vaccinesService.getCountryRegulations(code, species);
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

    @Post('vaccine-schedules')
    createSchedule(@Body() dto: CreateVaccineScheduleDto) {
        return this.vaccinesService.createSchedule(dto);
    }

    @Post('vaccine-schedules/generate/:animalId')
    generateSmartPlan(@Param('animalId') animalId: string) {
        return this.regionalService.generateSmartPlan(animalId);
    }

    @Patch('vaccine-schedules/:id/done')
    markDone(
        @Param('id') id: string,
        @Body() body: { administeredBy: string; doseGiven: number; lotNumber?: string },
    ) {
        return this.vaccinesService.markDone(id, body);
    }
}
