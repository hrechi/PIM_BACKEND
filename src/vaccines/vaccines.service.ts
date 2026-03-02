import {
    Injectable, NotFoundException, BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVaccineRecordDto } from './dto/create-vaccine-record.dto';
import { CreateVaccineScheduleDto } from './dto/create-vaccine-schedule.dto';

@Injectable()
export class VaccinesService {
    constructor(private prisma: PrismaService) { }

    // ── Référentiel ─────────────────────────────────────────────────────────

    async listVaccines(species?: string) {
        return this.prisma.vaccine.findMany({
            where: species
                ? { targetSpecies: { array_contains: species } }
                : undefined,
            orderBy: [{ isCoreVaccine: 'desc' }, { nameEn: 'asc' }],
        });
    }

    async listCountries() {
        return this.prisma.country.findMany({
            orderBy: { nameEn: 'asc' },
            include: { regions: true },
        });
    }

    async getCountryRegulations(countryCode: string, species?: string) {
        const country = await this.prisma.country.findUnique({ where: { code: countryCode.toUpperCase() } });
        if (!country) throw new NotFoundException(`Pays ${countryCode} non trouvé`);

        return this.prisma.vaccineRegulation.findMany({
            where: {
                countryId: country.id,
                ...(species ? { species } : {}),
            },
            include: { vaccine: true, region: true },
            orderBy: [{ status: 'asc' }, { vaccine: { nameEn: 'asc' } }],
        });
    }

    // ── Records ─────────────────────────────────────────────────────────────

    async getRecords(animalId: string) {
        return this.prisma.vaccineRecord.findMany({
            where: { animalId },
            include: { vaccine: true, schedule: true },
            orderBy: { administeredAt: 'desc' },
        });
    }

    async createRecord(dto: CreateVaccineRecordDto) {
        const vaccine = await this.prisma.vaccine.findUnique({ where: { code: dto.vaccineCode } });
        if (!vaccine) throw new NotFoundException(`Vaccin ${dto.vaccineCode} inconnu`);

        const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
        if (!animal) throw new NotFoundException('Animal introuvable');

        const administeredAt = new Date(dto.administeredAt);
        const nextDueDate = dto.notes?.includes('ONCE')
            ? null
            : new Date(administeredAt.getTime() + vaccine.defaultIntervalDays * 86400000);

        return this.prisma.vaccineRecord.create({
            data: {
                animalId: dto.animalId,
                vaccineId: vaccine.id,
                scheduleId: dto.scheduleId ?? null,
                administeredBy: dto.administeredBy,
                administeredAt,
                doseGiven: dto.doseGiven,
                doseUnit: dto.doseUnit ?? 'ml',
                lotNumber: dto.lotNumber ?? null,
                bodyWeight: dto.bodyWeight ?? null,
                nextDueDate,
                observations: dto.notes ?? null,
            },
            include: { vaccine: true },
        });
    }

    // ── Schedules ────────────────────────────────────────────────────────────

    async getSchedules(animalId: string) {
        return this.prisma.vaccineSchedule.findMany({
            where: { animalId },
            include: { vaccine: true },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    async getUpcoming(fieldId: string, days = 30) {
        const until = new Date(Date.now() + days * 86400000);
        const animals = await this.prisma.animal.findMany({ where: { fieldId }, select: { id: true } });
        const animalIds = animals.map(a => a.id);

        return this.prisma.vaccineSchedule.findMany({
            where: {
                animalId: { in: animalIds },
                status: { in: ['PENDING', 'NOTIFIED', 'OVERDUE'] },
                scheduledDate: { lte: until },
            },
            include: { vaccine: true, animal: true },
            orderBy: [{ isMandatory: 'desc' }, { scheduledDate: 'asc' }],
        });
    }

    async createSchedule(dto: CreateVaccineScheduleDto) {
        const vaccine = await this.prisma.vaccine.findUnique({ where: { code: dto.vaccineCode } });
        if (!vaccine) throw new NotFoundException(`Vaccin ${dto.vaccineCode} inconnu`);

        return this.prisma.vaccineSchedule.create({
            data: {
                animalId: dto.animalId,
                vaccineId: vaccine.id,
                scheduledDate: new Date(dto.scheduledDate),
                isMandatory: dto.isMandatory ?? false,
                isRecurring: dto.isRecurring ?? false,
                recurrenceDays: dto.recurrenceDays ?? null,
                reminderDaysBefore: dto.reminderDaysBefore ?? 14,
                notes: dto.notes ?? null,
            },
            include: { vaccine: true },
        });
    }

    async markDone(scheduleId: string, body: { administeredBy: string; doseGiven: number; lotNumber?: string }) {
        const schedule = await this.prisma.vaccineSchedule.findUnique({
            where: { id: scheduleId },
            include: { vaccine: true },
        });
        if (!schedule) throw new NotFoundException('Planning introuvable');

        const now = new Date();

        // Créer le record
        const record = await this.prisma.vaccineRecord.create({
            data: {
                animalId: schedule.animalId,
                vaccineId: schedule.vaccineId,
                scheduleId: schedule.id,
                administeredBy: body.administeredBy,
                administeredAt: now,
                doseGiven: body.doseGiven,
                doseUnit: schedule.vaccine.doseUnit,
                lotNumber: body.lotNumber ?? null,
                nextDueDate: schedule.isRecurring && schedule.recurrenceDays
                    ? new Date(now.getTime() + schedule.recurrenceDays * 86400000)
                    : null,
            },
        });

        // Mettre à jour le statut du planning
        await this.prisma.vaccineSchedule.update({
            where: { id: scheduleId },
            data: { status: 'DONE' },
        });

        // Si récurrent, créer le prochain planning
        if (schedule.isRecurring && schedule.recurrenceDays) {
            const nextDate = new Date(now.getTime() + schedule.recurrenceDays * 86400000);
            await this.prisma.vaccineSchedule.create({
                data: {
                    animalId: schedule.animalId,
                    vaccineId: schedule.vaccineId,
                    scheduledDate: nextDate,
                    isMandatory: schedule.isMandatory,
                    isRecurring: true,
                    recurrenceDays: schedule.recurrenceDays,
                    reminderDaysBefore: schedule.reminderDaysBefore,
                },
            });
        }

        return record;
    }
}
