import {
    Injectable, NotFoundException, BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { CreateVaccineRecordDto } from './dto/create-vaccine-record.dto';
import { CreateVaccineScheduleDto } from './dto/create-vaccine-schedule.dto';

@Injectable()
export class VaccinesService {
    constructor(
        private prisma: PrismaService,
        private geo: GeoService,
    ) { }

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

    async getCountryRegulations(countryCode: string, species?: string, regionCode?: string) {
        const country = await this.prisma.country.findUnique({ where: { code: countryCode.toUpperCase() } });
        if (!country) throw new NotFoundException(`Pays ${countryCode} non trouvé`);

        // Resolve region if provided
        let regionId: string | undefined;
        if (regionCode) {
            const region = await this.prisma.fieldRegion.findUnique({
                where: { countryId_code: { countryId: country.id, code: regionCode } },
            });
            regionId = region?.id;
        }

        return this.prisma.vaccineRegulation.findMany({
            where: {
                countryId: country.id,
                ...(species ? { species } : {}),
                // National rules (regionId null) + region-specific rules if region is known
                ...(regionCode
                    ? {
                        OR: [
                            { regionId: null },
                            ...(regionId ? [{ regionId }] : []),
                        ],
                    }
                    : {}),
            },
            include: { vaccine: true, region: true },
            orderBy: [{ status: 'asc' }, { vaccine: { nameEn: 'asc' } }],
        });
    }

    /**
     * Resolve a field's country (via GPS if needed) and return matching regulations.
     * This is what the frontend should call — it handles the geo-resolution automatically.
     */
    async getFieldRegulations(fieldId: string, species?: string) {
        const field = await this.prisma.field.findUnique({ where: { id: fieldId } });
        if (!field) throw new NotFoundException('Field introuvable');

        // Auto-resolve country from GPS if not cached yet
        let countryCode = field.countryCode;
        if (!countryCode) {
            countryCode = await this.geo.resolveAndCacheFieldCountry(fieldId);
        }
        if (!countryCode) {
            throw new BadRequestException('Impossible de déterminer le pays depuis les coordonnées GPS du champ');
        }

        const country = await this.prisma.country.findUnique({ where: { code: countryCode.toUpperCase() } });
        if (!country) throw new NotFoundException(`Pays ${countryCode} non supporté`);

        // Check for region
        const regionCode = field.regionCode;
        let regionId: string | undefined;
        if (regionCode) {
            const region = await this.prisma.fieldRegion.findUnique({
                where: { countryId_code: { countryId: country.id, code: regionCode } },
            });
            regionId = region?.id;
        }

        return this.prisma.vaccineRegulation.findMany({
            where: {
                countryId: country.id,
                ...(species ? { species } : {}),
                ...(regionCode
                    ? {
                        OR: [
                            { regionId: null },
                            ...(regionId ? [{ regionId }] : []),
                        ],
                    }
                    : {}),
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
                vaccineName: vaccine.nameEn,
                vaccineDate: administeredAt,
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

    async updateSchedule(id: string, scheduledDate: string) {
        return this.prisma.vaccineSchedule.update({
            where: { id },
            data: { scheduledDate: new Date(scheduledDate) },
            include: { vaccine: true },
        });
    }

    async getAllSchedules(userId: string) {
        // En tant qu'admin ou fermier, on veut voir tous les vaccins de ses champs
        const fields = await this.prisma.field.findMany({
            where: { userId },
            select: { id: true },
        });
        const fieldIds = fields.map(f => f.id);

        return this.prisma.vaccineSchedule.findMany({
            where: {
                animal: { fieldId: { in: fieldIds } },
                status: { in: ['PENDING', 'NOTIFIED', 'OVERDUE'] },
            },
            include: { vaccine: true, animal: true },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    async bulkMarkDone(dto: any) {
        const results: any[] = [];
        const administeredAt = new Date(dto.administeredAt);

        const vaccine = await this.prisma.vaccine.findUnique({
            where: { code: dto.vaccineCode },
        });
        if (!vaccine) throw new NotFoundException(`Vaccin ${dto.vaccineCode} inconnu`);

        for (const animalId of dto.animalIds) {
            // 1. Trouver si un planning existe pour cet animal et ce vaccin
            const schedule = await this.prisma.vaccineSchedule.findFirst({
                where: {
                    animalId,
                    vaccineId: vaccine.id,
                    status: { in: ['PENDING', 'NOTIFIED', 'OVERDUE'] },
                },
            });

            // 2. Créer le record
            const record = await this.prisma.vaccineRecord.create({
                data: {
                    animalId,
                    vaccineId: vaccine.id,
                    scheduleId: schedule?.id ?? null,
                    administeredBy: dto.administeredBy,
                    administeredAt,
                    doseGiven: dto.doseGiven,
                    lotNumber: dto.lotNumber ?? null,
                    nextDueDate: schedule?.isRecurring && schedule?.recurrenceDays
                        ? new Date(administeredAt.getTime() + schedule.recurrenceDays * 86400000)
                        : null,
                    vaccineName: vaccine.nameEn,
                    vaccineDate: administeredAt,
                },
            });

            // 3. Mettre à jour le planning si trouvé
            if (schedule) {
                await this.prisma.vaccineSchedule.update({
                    where: { id: schedule.id },
                    data: { status: 'DONE' },
                });

                // 4. Recréer le prochain si récurrent
                if (schedule.isRecurring && schedule.recurrenceDays) {
                    const nextDate = new Date(administeredAt.getTime() + schedule.recurrenceDays * 86400000);
                    await this.prisma.vaccineSchedule.create({
                        data: {
                            animalId,
                            vaccineId: vaccine.id,
                            scheduledDate: nextDate,
                            isMandatory: schedule.isMandatory,
                            isRecurring: true,
                            recurrenceDays: schedule.recurrenceDays,
                            reminderDaysBefore: schedule.reminderDaysBefore,
                        },
                    });
                }
            }
            results.push(record);
        }
        return { count: results.length, records: results };
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
                vaccineName: schedule.vaccine.nameEn,
                vaccineDate: now,
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
