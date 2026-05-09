import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

const AI_URL = process.env.PYTHON_AI_API_URL ?? 'http://localhost:8001';

/** Réponse brute FastAPI (snake_case) */
export interface DiagnosisResult {
  animal_id: string;
  health_score: number;
  alert_level: 'low' | 'medium' | 'critical';
  predicted_disease: string | null;
  confidence: number;
  iso_score: number;
  all_probabilities: Record<string, number>;
  explanation?: Record<string, unknown>;
  bovine_model_applied?: boolean;
  species_note?: string | null;
  anomaly_score_norm?: number;
  estrus?: {
    estrus_probability: number;
    estrus_window_hours: number;
    estrus_detected: boolean;
    estrus_score_detail: Record<string, number>;
  } | null;
}

/** Payload renvoyé au client Flutter (camelCase) */
export interface DiagnosisApiPayload {
  animalId: string;
  healthScore: number;
  alertLevel: 'healthy' | 'medium' | 'critical';
  predictedDisease: string | null;
  confidence: number;
  isoScore: number;
  allProbabilities: Record<string, number>;
  explanation?: Record<string, unknown>;
  timestamp: string;
  isStaticFallback: boolean;
  bovineModelApplied: boolean;
  speciesNote: string | null;
  anomalyScoreNorm?: number;
  estrus?: {
    probability: number;
    windowHours: number;
    detected: boolean;
  } | null;
}

@Injectable()
export class AnimalHealthService {
  private readonly logger = new Logger(AnimalHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  /**
   * Baselines physiologiques par espèce (vache = notebook PastureAI).
   * Les autres espèces utilisent des ordres de grandeur littérature / monitoring général
   * — le modèle XGB/Isolation Forest reste entraîné uniquement sur bovins.
   */
  private speciesBaselines(animalType: string): {
    tempMean: number;
    hrMean: number;
    activityMean: number;
  } {
    const t = (animalType || 'cow').toLowerCase();
    if (t === 'cow' || t === 'cattle' || t === 'vache') {
      return { tempMean: 38.7, hrMean: 65, activityMean: 45 };
    }
    if (t === 'horse' || t === 'cheval') {
      return { tempMean: 37.8, hrMean: 38, activityMean: 50 };
    }
    if (t === 'sheep' || t === 'mouton') {
      return { tempMean: 39.0, hrMean: 75, activityMean: 40 };
    }
    if (t === 'dog' || t === 'chien') {
      return { tempMean: 38.5, hrMean: 90, activityMean: 55 };
    }
    return { tempMean: 38.7, hrMean: 65, activityMean: 45 };
  }

  /** Convertit la réponse Python + métadonnées Nest en JSON camelCase pour Flutter. */
  private mapDiagnosisToFlutter(
    raw: DiagnosisResult,
    isStaticFallback: boolean,
  ): DiagnosisApiPayload {
    const exp = raw.explanation;
    let explanationOut: Record<string, unknown> | undefined;

    if (exp && typeof exp === 'object') {
      const e = exp as Record<string, unknown>;
      const diseaseRaw = (e.disease_info ?? e.diseaseInfo) as
        | Record<string, unknown>
        | undefined;
      const sensorRaw = (e.sensor_readings ?? e.sensorReadings) as
        | Record<string, unknown>
        | undefined;
      const triggersRaw = (e.triggers as unknown[]) ?? [];

      explanationOut = {
        summary: e.summary,
        recommendation: e.recommendation,
        anomalyScorePct:
          (e.anomaly_score_pct as number) ?? (e.anomalyScorePct as number) ?? 0,
        diseaseInfo: diseaseRaw
          ? {
              label: diseaseRaw.label,
              description: diseaseRaw.description,
              symptoms: diseaseRaw.symptoms,
            }
          : undefined,
        sensorReadings: sensorRaw
          ? {
              temperature: sensorRaw.temperature,
              heartRate: sensorRaw.heart_rate ?? sensorRaw.heartRate,
              activityScore:
                sensorRaw.activity_score ?? sensorRaw.activityScore,
              lyingPct6h: sensorRaw.lying_pct_6h ?? sensorRaw.lyingPct6h,
              accAsymmetry:
                sensorRaw.acc_asymmetry ?? sensorRaw.accAsymmetry,
              deltaTemp: sensorRaw.delta_temp ?? sensorRaw.deltaTemp,
              deltaHr: sensorRaw.delta_hr ?? sensorRaw.deltaHr,
              activityDrop:
                sensorRaw.activity_drop ?? sensorRaw.activityDrop,
            }
          : undefined,
        triggers: triggersRaw.map((tr) => {
          const x = tr as Record<string, unknown>;
          return {
            label: x.label,
            value: x.value,
            unit: x.unit,
            normalRange: x.normal_range ?? x.normalRange,
            direction: x.direction,
            severity: x.severity,
          };
        }),
      };
    }

    const alert =
      raw.alert_level === 'low' ? 'healthy' : raw.alert_level;

    return {
      animalId: raw.animal_id,
      healthScore: raw.health_score,
      alertLevel: alert as 'healthy' | 'medium' | 'critical',
      predictedDisease: raw.predicted_disease,
      confidence: raw.confidence,
      isoScore: raw.iso_score,
      allProbabilities: raw.all_probabilities ?? {},
      explanation: explanationOut,
      timestamp: new Date().toISOString(),
      isStaticFallback,
      bovineModelApplied: raw.bovine_model_applied !== false,
      speciesNote: raw.species_note ?? null,
      anomalyScoreNorm: raw.anomaly_score_norm,
      estrus: raw.estrus
        ? {
            probability: raw.estrus.estrus_probability,
            windowHours: raw.estrus.estrus_window_hours,
            detected: raw.estrus.estrus_detected,
          }
        : null,
    };
  }

  // ── Feature engineering from raw sensor readings ─────────────────────────

  private async buildFeatures(animalId: string, animalType: string) {
    const now = new Date();
    const h1  = new Date(now.getTime() - 1  * 3600_000);
    const h6  = new Date(now.getTime() - 6  * 3600_000);
    const h24 = new Date(now.getTime() - 24 * 3600_000);

    // Fetch readings for each window in parallel
    const [r1h, r6h, r24h] = await Promise.all([
      this.prisma.sensorReading.findMany({ where: { animalId, timestamp: { gte: h1  } } }),
      this.prisma.sensorReading.findMany({ where: { animalId, timestamp: { gte: h6  } } }),
      this.prisma.sensorReading.findMany({ where: { animalId, timestamp: { gte: h24 } } }),
    ]);

    // ── Pas assez de données réelles → retourner null pour activer le fallback ──
    // On exige au moins 4 lectures sur 24h pour un calcul significatif
    const totalReadings = r24h.length;
    if (totalReadings < 4) {
      this.logger.warn(`[buildFeatures] animalId=${animalId} — only ${totalReadings} readings in 24h, will use static fallback`);
      return null;
    }

    const avg  = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max  = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const std  = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const m = avg(arr);
      return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
    };
    const trend = (arr: number[]) => {
      if (arr.length < 4) return 0;
      const mid  = Math.floor(arr.length / 2);
      return avg(arr.slice(mid)) - avg(arr.slice(0, mid));
    };

    const temps1h  = r1h.map(r => r.temperature  ?? 0).filter(v => v > 0);
    const temps6h  = r6h.map(r => r.temperature  ?? 0).filter(v => v > 0);
    const temps24h = r24h.map(r => r.temperature ?? 0).filter(v => v > 0);
    const hr1h     = r1h.map(r => r.heartRate    ?? 0).filter(v => v > 0);
    const hr6h     = r6h.map(r => r.heartRate    ?? 0).filter(v => v > 0);
    const act1h    = r1h.map(r => r.activityScore ?? 0).filter(v => v >= 0);
    const act24h   = r24h.map(r => r.activityScore ?? 0).filter(v => v >= 0);

    // Accelerometer magnitude & asymmetry from latest reading
    const latest = r1h.at(-1) ?? r6h.at(-1) ?? r24h.at(-1);
    const accX   = latest?.accX ?? 0;
    const accY   = latest?.accY ?? 9.7;
    const accZ   = latest?.accZ ?? 0;
    const acc_magnitude  = Math.sqrt(accX ** 2 + accY ** 2 + accZ ** 2);
    const accXs = r1h
      .map((r) => r.accX)
      .filter((x): x is number => x !== null && x !== undefined);
    const acc_asymmetry =
      accXs.length >= 2
        ? std(accXs)
        : Math.abs(accX) / (acc_magnitude || 1);

    // Lying estimate: activity < 30 → lying proxy (more robust threshold)
    const lying6h  = r6h.filter(r  => (r.activityScore ?? 100) < 30).length;
    const lying24h = r24h.filter(r => (r.activityScore ?? 100) < 30).length;
    const lying_pct_6h  = r6h.length  ? (lying6h  / r6h.length)  * 100 : 45;
    const lying_pct_24h = r24h.length ? (lying24h / r24h.length) * 100 : 45;

    const { tempMean: TEMP_MEAN, hrMean: HR_MEAN, activityMean: ACT_MEAN } =
      this.speciesBaselines(animalType);

    // Use 24h avg as baseline if 1h window is empty (animal was just added)
    const temp_mean_1h  = temps1h.length  ? avg(temps1h)  : (temps24h.length ? avg(temps24h) : TEMP_MEAN);
    const temp_mean_24h = temps24h.length ? avg(temps24h) : TEMP_MEAN;
    const hr_mean_1h    = hr1h.length     ? avg(hr1h)     : (hr6h.length ? avg(hr6h) : HR_MEAN);
    const act_mean_1h   = act1h.length    ? avg(act1h)    : ACT_MEAN;
    const act_mean_24h  = act24h.length   ? avg(act24h)   : ACT_MEAN;

    // Notebook PastureAI: activity_drop_6h = moyenne 24h - moyenne 1h (baisse récente d'activité).
    const activity_drop_6h = act_mean_24h - act_mean_1h;

    this.logger.log(
      `[buildFeatures] animalId=${animalId} | readings: 1h=${r1h.length} 6h=${r6h.length} 24h=${r24h.length} | ` +
      `temp=${temp_mean_1h.toFixed(2)} hr=${hr_mean_1h.toFixed(1)} act=${act_mean_1h.toFixed(1)} | ` +
      `delta_temp=${(temp_mean_1h - TEMP_MEAN).toFixed(2)} delta_hr=${(hr_mean_1h - HR_MEAN).toFixed(1)} act_drop=${activity_drop_6h.toFixed(1)}`
    );

    return {
      temp_mean_1h,
      temp_max_6h:          temps6h.length  ? max(temps6h)  : temp_mean_1h,
      temp_std_6h:          std(temps6h),
      temp_mean_24h,
      temp_trend_6h:        trend(temps6h),
      hr_mean_1h,
      hr_max_6h:            hr6h.length     ? max(hr6h)     : hr_mean_1h,
      hr_std_1h:            std(hr1h),
      hr_trend_6h:          trend(hr6h),
      activity_mean_1h:     act_mean_1h,
      activity_mean_24h:    act_mean_24h,
      activity_drop_6h:     +activity_drop_6h.toFixed(2),
      acc_magnitude:        +acc_magnitude.toFixed(3),
      acc_asymmetry:        +acc_asymmetry.toFixed(4),
      lying_pct_6h:         +lying_pct_6h.toFixed(1),
      lying_pct_24h:        +lying_pct_24h.toFixed(1),
      delta_temp_baseline:  +(temp_mean_1h - TEMP_MEAN).toFixed(3),
      delta_hr_baseline:    +(hr_mean_1h   - HR_MEAN).toFixed(3),
    };
  }

  // ── Diagnose one animal ───────────────────────────────────────────────────

  async diagnose(
    animalId: string,
    farmerId: string,
  ): Promise<DiagnosisApiPayload> {
    let animalType = 'cow';
    let animalSex = 'unknown';

    // Verify ownership (skip for cron calls)
    if (farmerId !== '__cron__') {
      const animal = await this.prisma.animal.findFirst({
        where: { id: animalId, farmerId },
        select: { animalType: true, sex: true },
      });
      if (!animal) throw new NotFoundException('Animal not found or access denied');
      animalType = animal.animalType ?? 'cow';
      animalSex = animal.sex ?? 'unknown';
    } else {
      const a = await this.prisma.animal.findUnique({
        where: { id: animalId },
        select: { animalType: true, sex: true },
      });
      if (a?.animalType) animalType = a.animalType;
      if (a?.sex) animalSex = a.sex;
    }

    let features = await this.buildFeatures(animalId, animalType);
    const isStaticFallback = !features;

    // ── Fallback : pas assez de données capteurs → champs statiques de l'animal ──
    if (!features) {
      const animal = await this.prisma.animal.findUnique({
        where: { id: animalId },
        select: {
          bodyTemp: true,
          activityLevel: true,
          healthStatus: true,
          name: true,
          animalType: true,
        },
      });
      if (!animal) throw new NotFoundException('Animal not found');

      animalType = animal.animalType ?? animalType;
      const { tempMean: TEMP_MEAN, hrMean: HR_MEAN, activityMean: ACT_MEAN } =
        this.speciesBaselines(animalType);

      const temp = animal.bodyTemp ?? TEMP_MEAN;
      const act  = animal.activityLevel === 'HIGH'     ? ACT_MEAN + 25
                 : animal.activityLevel === 'MODERATE' ? ACT_MEAN
                 : animal.activityLevel === 'LOW'      ? Math.max(0, ACT_MEAN - 25)
                 : ACT_MEAN;

      features = {
        temp_mean_1h:        temp,
        temp_max_6h:         temp,
        temp_std_6h:         0,
        temp_mean_24h:       temp,
        temp_trend_6h:       0,
        hr_mean_1h:          HR_MEAN,
        hr_max_6h:           HR_MEAN,
        hr_std_1h:           0,
        hr_trend_6h:         0,
        activity_mean_1h:    act,
        activity_mean_24h:   act,
        activity_drop_6h:    0,
        acc_magnitude:       9.8,
        acc_asymmetry:       0,
        lying_pct_6h:        45,
        lying_pct_24h:       45,
        delta_temp_baseline: +(temp - TEMP_MEAN).toFixed(2),
        delta_hr_baseline:   0,
      } as any;

      this.logger.warn(`[diagnose] ${animal.name} — fallback sur champs statiques (pas de capteurs)`);
    }

    // At this point features is always assigned (either from buildFeatures or the fallback above)
    const resolvedFeatures = features!;

    // Estrus check : femelles vache ou mouton uniquement
    const checkEstrus =
      animalSex.toLowerCase() === 'female' &&
      ['cow', 'sheep', 'vache', 'mouton'].includes(animalType.toLowerCase());

    const payload = {
      animal_id: animalId,
      animal_type: animalType,
      check_estrus: checkEstrus,
      ...resolvedFeatures,
    };

    const { data } = await firstValueFrom(
      this.http.post<DiagnosisResult>(`${AI_URL}/predict`, payload),
    );

    // Derive vitality score from health_score (same scale, rounded to int)
    const vitalityScore = Math.round(data.health_score);

    // Derive bodyTemp and activityLevel from real sensor features only (not static fallback)
    const bodyTempFromSensors = !isStaticFallback && resolvedFeatures.temp_mean_1h > 0
      ? +resolvedFeatures.temp_mean_1h.toFixed(1)
      : undefined;
    const activityLevelFromSensors = !isStaticFallback
      ? (resolvedFeatures.activity_mean_1h >= 60 ? 'HIGH'
        : resolvedFeatures.activity_mean_1h >= 30 ? 'MODERATE'
        : 'LOW')
      : undefined;

    // Bug 1 fix — healthRiskScore stocké comme score de santé direct (0-100)
    // 100 = parfaitement sain, 0 = critique. Même échelle que vitalityScore.
    // Flutter lit healthRiskScore directement comme pourcentage de santé.
    await this.prisma.animal.update({
      where: { id: animalId },
      data: {
        healthRiskScore: data.health_score,   // 0-100, 100 = sain
        vitalityScore,
        healthStatus:
          data.health_score >= 65 ? 'OPTIMAL'
          : data.health_score >= 55 ? 'WARNING'   // zone incertaine 55-65
          : 'CRITICAL',
        // Only update bodyTemp and activityLevel when real sensor data is available
        ...(bodyTempFromSensors !== undefined && { bodyTemp: bodyTempFromSensors }),
        ...(activityLevelFromSensors !== undefined && { activityLevel: activityLevelFromSensors }),
      },
    });

    // Persist HealthAlert si alerte moyenne / critique
    if (data.alert_level !== 'low') {
      const predicted =
        data.predicted_disease
        ?? (data.bovine_model_applied === false
          ? 'Surveillance (non bovin)'
          : 'Anomalie physiologique (bovin)');
      await this.prisma.healthAlert.create({
        data: {
          animalId,
          alertTime:        new Date(),
          alertLevel:       data.alert_level.toLowerCase() as any,
          predictedDisease: predicted,
          confidence:       data.confidence,
          anomalyScore:     data.anomaly_score_norm ?? data.iso_score,
        },
      });
    }

    // Persist HealthAlert estrus si probabilité > 0.65
    if (data.estrus?.estrus_detected) {
      const prob = data.estrus.estrus_probability;
      const windowH = data.estrus.estrus_window_hours;
      await this.prisma.healthAlert.create({
        data: {
          animalId,
          alertTime:        new Date(),
          alertLevel:       'medium',
          predictedDisease: `Estrus détecté — fenêtre ${windowH}h`,
          confidence:       prob,
          anomalyScore:     0,
        },
      });
      this.logger.log(
        `[diagnose] 🌸 Estrus alert created for animalId=${animalId} — prob=${prob} window=${windowH}h`,
      );
    }

    return this.mapDiagnosisToFlutter(data, isStaticFallback);
  }

  // ── Batch diagnose all active animals of a farmer (HTTP endpoint) ──────────

  async diagnoseAll(farmerId: string): Promise<{ processed: number; results: DiagnosisApiPayload[] }> {
    const animals = await this.prisma.animal.findMany({
      where: { farmerId, status: 'active' },
      select: { id: true, name: true, farmerId: true },
    });

    const results: DiagnosisApiPayload[] = [];
    for (const animal of animals) {
      try {
        const r = await this.diagnose(animal.id, farmerId);
        results.push(r);
      } catch (e) {
        this.logger.warn(`[diagnoseAll] skipped ${animal.name}: ${e.message}`);
      }
    }

    return { processed: results.length, results };
  }

  // ── Batch diagnose ALL animals across ALL farmers (cron only — internal) ──

  async diagnoseAllInternal(): Promise<{ processed: number; errors: number }> {
    const animals = await this.prisma.animal.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, animalType: true, sex: true },
    });

    let processed = 0;
    let errors = 0;

    for (const animal of animals) {
      try {
        // Build features directly — no ownership check needed for internal cron
        const features = await this.buildFeatures(animal.id, animal.animalType ?? 'cow');
        const isStaticFallback = !features;

        let resolvedFeatures = features;
        if (!resolvedFeatures) {
          const full = await this.prisma.animal.findUnique({
            where: { id: animal.id },
            select: { bodyTemp: true, activityLevel: true, animalType: true, name: true },
          });
          if (!full) { errors++; continue; }

          const { tempMean: TEMP_MEAN, hrMean: HR_MEAN, activityMean: ACT_MEAN } =
            this.speciesBaselines(full.animalType ?? 'cow');
          const temp = full.bodyTemp ?? TEMP_MEAN;
          const act  = full.activityLevel === 'HIGH'     ? ACT_MEAN + 25
                     : full.activityLevel === 'MODERATE' ? ACT_MEAN
                     : full.activityLevel === 'LOW'      ? Math.max(0, ACT_MEAN - 25)
                     : ACT_MEAN;

          resolvedFeatures = {
            temp_mean_1h: temp, temp_max_6h: temp, temp_std_6h: 0,
            temp_mean_24h: temp, temp_trend_6h: 0,
            hr_mean_1h: HR_MEAN, hr_max_6h: HR_MEAN, hr_std_1h: 0, hr_trend_6h: 0,
            activity_mean_1h: act, activity_mean_24h: act, activity_drop_6h: 0,
            acc_magnitude: 9.8, acc_asymmetry: 0,
            lying_pct_6h: 45, lying_pct_24h: 45,
            delta_temp_baseline: +(temp - TEMP_MEAN).toFixed(2),
            delta_hr_baseline: 0,
          } as any;
        }

        const checkEstrus =
          (animal.sex ?? '').toLowerCase() === 'female' &&
          ['cow', 'sheep', 'vache', 'mouton'].includes((animal.animalType ?? '').toLowerCase());

        const payload = {
          animal_id: animal.id,
          animal_type: animal.animalType ?? 'cow',
          check_estrus: checkEstrus,
          ...resolvedFeatures,
        };

        const { data } = await firstValueFrom(
          this.http.post<DiagnosisResult>(`${AI_URL}/predict`, payload),
        );

        const vitalityScore = Math.round(data.health_score);

        await this.prisma.animal.update({
          where: { id: animal.id },
          data: {
            healthRiskScore: data.health_score,
            vitalityScore,
            healthStatus:
              data.health_score >= 65 ? 'OPTIMAL'
              : data.health_score >= 55 ? 'WARNING'
              : 'CRITICAL',
          },
        });

        if (data.alert_level !== 'low') {
          await this.prisma.healthAlert.create({
            data: {
              animalId: animal.id,
              alertTime: new Date(),
              alertLevel: data.alert_level.toLowerCase() as any,
              predictedDisease: data.predicted_disease ?? 'Anomalie détectée',
              confidence: data.confidence,
              anomalyScore: data.anomaly_score_norm ?? data.iso_score,
            },
          });
        }

        if (data.estrus?.estrus_detected) {
          await this.prisma.healthAlert.create({
            data: {
              animalId: animal.id,
              alertTime: new Date(),
              alertLevel: 'medium',
              predictedDisease: `Estrus détecté — fenêtre ${data.estrus.estrus_window_hours}h`,
              confidence: data.estrus.estrus_probability,
              anomalyScore: 0,
            },
          });
        }

        processed++;
      } catch (e) {
        this.logger.warn(`[diagnoseAllInternal] skipped ${animal.name}: ${e.message}`);
        errors++;
      }
    }

    this.logger.log(`[diagnoseAllInternal] done — ${processed} ok, ${errors} errors`);
    return { processed, errors };
  }

  // ── Get latest health alerts for a farmer ────────────────────────────────

  async getAlerts(farmerId: string, limit = 20) {
    const animals = await this.prisma.animal.findMany({
      where: { farmerId },
      select: { id: true },
    });
    const ids = animals.map(a => a.id);

    return this.prisma.healthAlert.findMany({
      where: { animalId: { in: ids } },
      include: { animal: { select: { name: true, animalType: true, tagNumber: true } } },
      orderBy: { alertTime: 'desc' },
      take: limit,
    });
  }

  // ── Get sensor readings for one animal (for charts) ───────────────────────

  async getSensorReadings(animalId: string, farmerId: string, hours = 24) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const since = new Date(Date.now() - hours * 3600_000);
    return this.prisma.sensorReading.findMany({
      where: { animalId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });
  }

  // ── Weight records ────────────────────────────────────────────────────────

  async getWeightHistory(animalId: string, farmerId: string, days = 90) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
      select: { id: true, name: true, animalType: true, weight: true },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const since = new Date(Date.now() - days * 24 * 3600_000);
    const records = await this.prisma.weightRecord.findMany({
      where: { animalId, measuredDate: { gte: since } },
      orderBy: { measuredDate: 'asc' },
    });

    // Dernier record toutes périodes confondues (pour latestKg fiable)
    const latestRecord = await this.prisma.weightRecord.findFirst({
      where: { animalId },
      orderBy: { measuredDate: 'desc' },
    });

    // Calcul tendance kg/semaine (régression linéaire simple)
    let trendKgPerWeek: number | null = null;
    let weightLossAlert: { triggered: boolean; lossPercent: number; message: string } | null = null;

    if (records.length >= 2) {
      const n = records.length;
      const xs = records.map((_, i) => i);
      const ys = records.map(r => Number(r.weightKg));
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = ys.reduce((a, b) => a + b, 0) / n;
      const slope = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0)
                  / xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);

      // Convertir slope (par mesure) en kg/semaine
      const daysBetweenFirst = (records[n - 1].measuredDate.getTime() - records[0].measuredDate.getTime()) / 86400_000;
      const measurementsPerWeek = daysBetweenFirst > 0 ? (n / daysBetweenFirst) * 7 : 1;
      trendKgPerWeek = slope * measurementsPerWeek;

      // Alerte perte > 10% en 14 jours
      const cutoff14d = new Date(Date.now() - 14 * 24 * 3600_000);
      const recent14d = records.filter(r => r.measuredDate >= cutoff14d);
      if (recent14d.length >= 2) {
        const oldest = Number(recent14d[0].weightKg);
        const newest = Number(recent14d[recent14d.length - 1].weightKg);
        const lossPercent = ((oldest - newest) / oldest) * 100;
        if (lossPercent > 10) {
          weightLossAlert = {
            triggered: true,
            lossPercent: Math.round(lossPercent * 10) / 10,
            message: `⚠️ Weight loss of ${lossPercent.toFixed(1)}% in 14 days — possible disease precursor`,
          };
        }
      }
    }

    return {
      animal: { id: animal.id, name: animal.name, type: animal.animalType, currentWeight: animal.weight },
      records: records.map(r => ({
        id: r.id,
        date: r.measuredDate.toISOString(),
        weightKg: Number(r.weightKg),
        measuredBy: r.measuredBy,
      })),
      stats: {
        count: records.length,
        minKg: records.length ? Math.min(...records.map(r => Number(r.weightKg))) : null,
        maxKg: records.length ? Math.max(...records.map(r => Number(r.weightKg))) : null,
        latestKg: latestRecord ? Number(latestRecord.weightKg) : (animal.weight ?? null),
        trendKgPerWeek,
      },
      weightLossAlert,
    };
  }

  async addWeightRecord(animalId: string, farmerId: string, weightKg: number, measuredBy?: string, measuredDate?: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const date = measuredDate ? new Date(measuredDate) : new Date();

    const record = await this.prisma.weightRecord.create({
      data: { animalId, weightKg, measuredBy, measuredDate: date },
    });

    // Mettre à jour le poids courant de l'animal
    await this.prisma.animal.update({
      where: { id: animalId },
      data: { weight: weightKg },
    });

    return { id: record.id, date: record.measuredDate.toISOString(), weightKg: Number(record.weightKg), measuredBy: record.measuredBy };
  }

  async deleteWeightRecord(recordId: string, farmerId: string) {
    // Vérifier ownership via l'animal
    const record = await this.prisma.weightRecord.findFirst({
      where: { id: recordId },
      include: { animal: { select: { farmerId: true } } },
    });
    if (!record || record.animal.farmerId !== farmerId) {
      throw new NotFoundException('Record not found or access denied');
    }
    await this.prisma.weightRecord.delete({ where: { id: recordId } });
    return { deleted: true };
  }

  // ── Get sensor history with hourly aggregation ────────────────────────────

  async getSensorHistory(animalId: string, farmerId: string, periodHours = 24) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
      select: { id: true, name: true, animalType: true, healthStatus: true },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const since = new Date(Date.now() - periodHours * 3600_000);

    // Récupérer toutes les lectures brutes
    const readings = await this.prisma.sensorReading.findMany({
      where: { animalId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    // Récupérer les alertes sur la période
    const alerts = await this.prisma.healthAlert.findMany({
      where: { animalId, alertTime: { gte: since } },
      orderBy: { alertTime: 'asc' },
      select: {
        alertTime: true,
        alertLevel: true,
        predictedDisease: true,
        confidence: true,
        anomalyScore: true,
      },
    });

    // Agrégation horaire
    const hourlyData = new Map<string, {
      temps: number[];
      hrs: number[];
      acts: number[];
      accX: number[];
      accY: number[];
      accZ: number[];
      lying: number[];
    }>();

    readings.forEach(r => {
      const hourKey = new Date(r.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { temps: [], hrs: [], acts: [], accX: [], accY: [], accZ: [], lying: [] });
      }
      const bucket = hourlyData.get(hourKey)!;
      if (r.temperature) bucket.temps.push(r.temperature);
      if (r.heartRate) bucket.hrs.push(r.heartRate);
      if (r.activityScore !== null) bucket.acts.push(r.activityScore);
      if (r.accX !== null) bucket.accX.push(r.accX);
      if (r.accY !== null) bucket.accY.push(r.accY);
      if (r.accZ !== null) bucket.accZ.push(r.accZ);
      // Lying proxy: activityScore < 30 indicates lying (isLying not in schema)
      if (r.activityScore !== null) bucket.lying.push(r.activityScore < 30 ? 1 : 0);
    });

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const min = (arr: number[]) => arr.length ? Math.min(...arr) : null;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : null;

    const aggregated = Array.from(hourlyData.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        temperature: {
          avg: avg(data.temps),
          min: min(data.temps),
          max: max(data.temps),
        },
        heartRate: {
          avg: avg(data.hrs),
          min: min(data.hrs),
          max: max(data.hrs),
        },
        activity: {
          avg: avg(data.acts),
          min: min(data.acts),
          max: max(data.acts),
        },
        accelerometer: {
          x: avg(data.accX),
          y: avg(data.accY),
          z: avg(data.accZ),
        },
        lyingPercent: avg(data.lying) ? avg(data.lying)! * 100 : 0,
        readingsCount: data.temps.length,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Zones d'alerte (pour coloration du graphique)
    const alertZones = alerts.map(a => ({
      startTime: a.alertTime.toISOString(),
      endTime: new Date(a.alertTime.getTime() + 3600_000).toISOString(), // 1h après
      level: a.alertLevel,
      disease: a.predictedDisease,
      confidence: a.confidence,
      anomalyScore: a.anomalyScore,
    }));

    return {
      animal: {
        id: animal.id,
        name: animal.name,
        type: animal.animalType,
        healthStatus: animal.healthStatus,
      },
      period: {
        hours: periodHours,
        start: since.toISOString(),
        end: new Date().toISOString(),
      },
      data: aggregated,
      alertZones,
      summary: {
        totalReadings: readings.length,
        dataPoints: aggregated.length,
        alertsCount: alerts.length,
        avgTemperature: avg(readings.map(r => r.temperature).filter(Boolean) as number[]),
        avgHeartRate: avg(readings.map(r => r.heartRate).filter(Boolean) as number[]),
        avgActivity: avg(readings.map(r => r.activityScore).filter(v => v !== null) as number[]),
      },
    };
  }

  // ── Get health history with trends ────────────────────────────────────────

  async getHealthHistory(animalId: string, farmerId: string, days = 7) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const since = new Date(Date.now() - days * 24 * 3600_000);

    // Récupérer les alertes historiques
    const alerts = await this.prisma.healthAlert.findMany({
      where: { animalId, alertTime: { gte: since } },
      orderBy: { alertTime: 'asc' },
    });

    // Récupérer les lectures capteurs agrégées par jour
    const readings = await this.prisma.sensorReading.findMany({
      where: { animalId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    // Grouper par jour
    const dailyStats = readings.reduce((acc, r) => {
      const day = r.timestamp.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { temps: [], hrs: [], acts: [], count: 0 };
      }
      if (r.temperature) acc[day].temps.push(r.temperature);
      if (r.heartRate) acc[day].hrs.push(r.heartRate);
      if (r.activityScore) acc[day].acts.push(r.activityScore);
      acc[day].count++;
      return acc;
    }, {});

    const trends = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      avg_temp: stats.temps.length ? stats.temps.reduce((a, b) => a + b, 0) / stats.temps.length : null,
      avg_hr: stats.hrs.length ? stats.hrs.reduce((a, b) => a + b, 0) / stats.hrs.length : null,
      avg_activity: stats.acts.length ? stats.acts.reduce((a, b) => a + b, 0) / stats.acts.length : null,
      readings_count: stats.count,
    }));

    return {
      animal_id: animalId,
      animal_name: animal.name,
      period_days: days,
      alerts_count: alerts.length,
      alerts: alerts.map(a => ({
        date: a.alertTime,
        level: a.alertLevel,
        disease: a.predictedDisease,
        confidence: a.confidence,
        anomaly_score: a.anomalyScore,
      })),
      sensor_trends: trends,
    };
  }

  // ── Get herd dashboard statistics ─────────────────────────────────────────

  async getHerdDashboard(farmerId: string) {
    const animals = await this.prisma.animal.findMany({
      where: { farmerId, status: 'active' },
      select: {
        id: true,
        name: true,
        healthStatus: true,
        healthRiskScore: true,
        animalType: true,
      },
    });

    const total = animals.length;
    const healthy = animals.filter(a => a.healthStatus === 'OPTIMAL').length;
    const warning = animals.filter(a => a.healthStatus === 'WARNING').length;
    const critical = animals.filter(a => a.healthStatus === 'CRITICAL').length;

    const avgHealthScore = animals.reduce((sum, a) => {
      const score = a.healthRiskScore ? (1 - a.healthRiskScore) * 100 : 100;
      return sum + score;
    }, 0) / (total || 1);

    // Récupérer les alertes récentes (dernières 24h)
    const since24h = new Date(Date.now() - 24 * 3600_000);
    const recentAlerts = await this.prisma.healthAlert.findMany({
      where: {
        animalId: { in: animals.map(a => a.id) },
        alertTime: { gte: since24h },
      },
      include: { animal: { select: { name: true, animalType: true } } },
      orderBy: { alertTime: 'desc' },
      take: 10,
    });

    // Distribution des maladies
    const diseaseDistribution = recentAlerts.reduce((acc, alert) => {
      const disease = alert.predictedDisease || 'unknown';
      acc[disease] = (acc[disease] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_animals: total,
      healthy,
      warning,
      critical,
      avg_health_score: Math.round(avgHealthScore * 10) / 10,
      top_alerts: recentAlerts.map(a => ({
        animal_name: a.animal.name,
        animal_type: a.animal.animalType,
        alert_level: a.alertLevel,
        disease: a.predictedDisease,
        confidence: a.confidence,
        time: a.alertTime,
      })),
      disease_distribution: diseaseDistribution,
      last_updated: new Date().toISOString(),
    };
  }

  // ── Ping FastAPI ──────────────────────────────────────────────────────────

  async pingAI() {
    const { data } = await firstValueFrom(this.http.get(`${AI_URL}/health`));
    return data;
  }
}
