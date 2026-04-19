import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';

const FORBIDDEN_STATUSES = [
  'FORBIDDEN',
  'FORBIDDEN_ZONES',
  'NOT_APPLICABLE',
  'UNDER_ERADICATION',
];

@Injectable()
export class RegionalVaccineService {
  constructor(
    private prisma: PrismaService,
    private geo: GeoService,
  ) {}

  async generateSmartPlan(animalId: string) {
    // 1. Charger l'animal avec son field direct
    const animal: any = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { field: true },
    });
    if (!animal) throw new NotFoundException('Animal introuvable');

    const field = animal.field;
    if (!field)
      throw new BadRequestException(
        'Aucune exploitation associée à cet animal',
      );

    // 2. Résoudre le pays depuis les coordonnées GPS si pas encore fait
    if (!field.countryCode) {
      await this.geo.resolveAndCacheFieldCountry(field.id);
    }

    const resolvedField = await this.prisma.field.findUnique({
      where: { id: field.id },
    });
    if (!resolvedField?.countryCode) {
      throw new BadRequestException(
        'Impossible de déterminer le pays depuis les coordonnées GPS',
      );
    }

    // 3. Trouver le pays
    const country = await this.prisma.country.findUnique({
      where: { code: resolvedField.countryCode },
    });
    if (!country) {
      return {
        animalId,
        countryCode: resolvedField.countryCode,
        regionCode: resolvedField.regionCode,
        generatedCount: 0,
        schedules: [],
      };
    }

    // 4. Récupérer les règles pour ce pays + espèce
    const regulations = await this.prisma.vaccineRegulation.findMany({
      where: {
        countryId: country.id,
        species: animal.animalType.toLowerCase(),
        OR: [
          { regionId: null },
          { regionId: resolvedField.regionId ?? undefined },
        ],
      },
      include: { vaccine: true },
    });

    // 5. Exclure les statuts interdits
    let validRegulations = regulations.filter(
      (r) => !FORBIDDEN_STATUSES.includes(r.status),
    );

    // 6. Cas spécial Argentine — FA selon la zone
    if (
      resolvedField.countryCode === 'AR' &&
      resolvedField.regionCode === 'AR-PATAGONIA'
    ) {
      validRegulations = validRegulations.filter(
        (r) => r.vaccine.code !== 'FMD',
      );
    }

    // 7. Dernier record de vaccination par vaccin
    const existingRecords = await this.prisma.vaccineRecord.findMany({
      where: { animalId },
      orderBy: { administeredAt: 'desc' },
    });
    const lastRecordByVaccine = new Map<string, Date>();
    for (const r of existingRecords) {
      if (!lastRecordByVaccine.has(r.vaccineId)) {
        lastRecordByVaccine.set(r.vaccineId, r.administeredAt);
      }
    }

    // 8. Créer les VaccineSchedule
    const created: any[] = [];
    for (const reg of validRegulations) {
      if (!reg.intervalDays) continue;

      const isLifetime = reg.frequency === 'ONCE';
      const alreadyDone = lastRecordByVaccine.has(reg.vaccineId);
      if (isLifetime && alreadyDone) continue;

      // Calculer la prochaine date
      const lastDate = lastRecordByVaccine.get(reg.vaccineId);
      let scheduledDate: Date;
      if (lastDate) {
        scheduledDate = new Date(
          lastDate.getTime() + reg.intervalDays * 86400000,
        );
      } else {
        scheduledDate = new Date();
        if (reg.status === 'RECOMMENDED') {
          scheduledDate.setDate(scheduledDate.getDate() + 30);
        }
      }

      // Éviter les doublons récents (7 jours glissants)
      const existing = await this.prisma.vaccineSchedule.findFirst({
        where: {
          animalId,
          vaccineId: reg.vaccineId,
          status: { in: ['PENDING', 'NOTIFIED'] },
          scheduledDate: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      });
      if (existing) continue;

      const schedule = await this.prisma.vaccineSchedule.create({
        data: {
          animalId,
          vaccineId: reg.vaccineId,
          scheduledDate,
          isMandatory: [
            'MANDATORY',
            'MANDATORY_ZONES',
            'MANDATORY_CONDITIONAL',
          ].includes(reg.status),
          priority: reg.status.startsWith('MANDATORY') ? 'HIGH' : 'MEDIUM',
          isRecurring: !isLifetime,
          recurrenceDays: isLifetime ? null : reg.intervalDays,
          reminderDaysBefore: 14,
        },
        include: { vaccine: true },
      });
      created.push(schedule);
    }

    return {
      animalId,
      countryCode: resolvedField.countryCode,
      regionCode: resolvedField.regionCode,
      generatedCount: created.length,
      schedules: created,
    };
  }

  /** Vérifie si un vaccin est interdit pour une espèce dans le pays du champ */
  async checkForbidden(
    vaccineCode: string,
    fieldId: string,
    species: string,
  ): Promise<boolean> {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
    });
    if (!field?.countryCode) return false;

    const country = await this.prisma.country.findUnique({
      where: { code: field.countryCode },
    });
    if (!country) return false;

    const vaccine = await this.prisma.vaccine.findUnique({
      where: { code: vaccineCode },
    });
    if (!vaccine) return false;

    const reg = await this.prisma.vaccineRegulation.findFirst({
      where: { countryId: country.id, vaccineId: vaccine.id, species },
    });

    return reg?.status === 'FORBIDDEN' || reg?.status === 'FORBIDDEN_ZONES';
  }
}
