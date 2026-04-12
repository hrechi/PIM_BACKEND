import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

type SoilMeasurementRow = {
  id: string;
  legacy_code: string | null;
  parcel_id: string | null;
  ph: number;
  soil_moisture: number;
  temperature: number;
  nutrients: Record<string, unknown> | null;
  soil_type: string | null;
  latitude: number | null;
  longitude: number | null;
  parcel_location: string | null;
  region: string | null;
  recovery_action: string | null;
  recovery_duration_weeks: number | null;
  vector_data?: unknown;
};

type FingerprintLibraryItem = {
  id: string;
  parcel_location: string;
  region: string;
  recovery_action: string;
  recovery_duration_weeks: number;
  soil_data: Record<string, unknown>;
  vector?: number[];
};

type FingerprintMatchRow = {
  id: string;
  parcel_location: string | null;
  region: string | null;
  recovery_action: string | null;
  recovery_duration_weeks: number | null;
  ph: number;
  soil_moisture: number;
  temperature: number;
  nutrients: Record<string, unknown> | null;
  soil_type: string | null;
  similarity_score: number;
};

type AlertRow = {
  id: string;
  parcel_id: string;
  soil_measurement_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  action: string | null;
  weather_data: Record<string, unknown> | null;
  soil_data: Record<string, unknown> | null;
  triggered_at: Date;
  is_read: boolean;
};

@Injectable()
export class SoilIntelligenceService {
  private readonly logger = new Logger(SoilIntelligenceService.name);
  private readonly aiServiceUrl: string;
  private readonly openWeatherApiKey: string | null;
  private readonly fingerprintLibraryFilePath = resolve(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'soil-fingerprint-library.json',
  );
  private vectorSupportChecked = false;
  private vectorSupported = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    const rawAiUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.aiServiceUrl = rawAiUrl.endsWith('/') ? rawAiUrl.slice(0, -1) : rawAiUrl;
    this.openWeatherApiKey = this.configService.get<string>('OPENWEATHER_API_KEY') || null;
  }

  async fingerprint(body: Record<string, unknown>) {
    const soilMeasurementId = this.getMeasurementId(body);
    const topK = this.getTopK(body);

    const [measurement] = await this.prisma.$queryRaw<SoilMeasurementRow[]>`
      SELECT
        id,
        parcel_id,
        ph,
        soil_moisture,
        temperature,
        nutrients,
        soil_type,
        latitude,
        longitude,
        parcel_location,
        region
      FROM soil_measurements
      WHERE id = ${soilMeasurementId}
      LIMIT 1
    `;

    if (!measurement) {
      throw new NotFoundException(`Soil measurement ${soilMeasurementId} not found`);
    }

    const vectorizePayload = {
      ph: this.toNumber(body.ph, measurement.ph),
      moisture: this.toNumber(body.moisture, measurement.soil_moisture),
      temperature: this.toNumber(body.temperature, measurement.temperature),
      nitrogen: this.toNumber(
        body.nitrogen,
        this.extractNutrient(measurement.nutrients, ['N', 'nitrogen']),
      ),
      phosphorus: this.toNumber(
        body.phosphorus,
        this.extractNutrient(measurement.nutrients, ['P', 'phosphorus']),
      ),
      potassium: this.toNumber(
        body.potassium,
        this.extractNutrient(measurement.nutrients, ['K', 'potassium']),
      ),
      soil_type: this.toStringValue(body.soilType) || this.toStringValue(body.soil_type) || measurement.soil_type || 'Sandy',
    };

    const vectorResponse = await axios.post<{ vector: number[] }>(
      `${this.aiServiceUrl}/soil/vectorize`,
      vectorizePayload,
      { timeout: 12000 },
    );

    if (!Array.isArray(vectorResponse.data?.vector) || vectorResponse.data.vector.length !== 7) {
      throw new BadRequestException('AI service returned an invalid soil vector.');
    }

    const vector = vectorResponse.data.vector.map((value) => Number(value));
    const vectorLiteral = this.toVectorLiteral(vector);
    const vectorJson = JSON.stringify(vector);

    const parcelLocation = this.toStringValue(body.parcelLocation) || this.toStringValue(body.parcel_location);
    const region = this.toStringValue(body.region);

    const canUsePgVector = await this.hasVectorSupport();

    if (canUsePgVector) {
      await this.prisma.$executeRaw`
        UPDATE soil_measurements
        SET
          vector = ${vectorLiteral}::vector,
          vector_data = ${vectorJson}::jsonb,
          parcel_location = COALESCE(${parcelLocation || null}, parcel_location),
          region = COALESCE(${region || null}, region),
          updated_at = NOW()
        WHERE id = ${soilMeasurementId}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE soil_measurements
        SET
          vector_data = ${vectorJson}::jsonb,
          parcel_location = COALESCE(${parcelLocation || null}, parcel_location),
          region = COALESCE(${region || null}, region),
          updated_at = NOW()
        WHERE id = ${soilMeasurementId}
      `;
    }

    const historical = await this.prisma.$queryRaw<SoilMeasurementRow[]>`
      SELECT
        id,
        legacy_code,
        ph,
        soil_moisture,
        temperature,
        nutrients,
        soil_type,
        parcel_location,
        region,
        recovery_action,
        recovery_duration_weeks,
        vector_data
      FROM soil_measurements
      WHERE
        outcome = 'SUCCESS'
        AND recovery_action IS NOT NULL
        AND id <> ${soilMeasurementId}
        AND (legacy_code IS NULL OR legacy_code = '')
      ORDER BY created_at DESC
      LIMIT 250
    `;

    const databaseLibrary: FingerprintLibraryItem[] = historical.map((row) => ({
      id: row.id,
      parcel_location: row.parcel_location || 'Unknown location',
      region: row.region || 'Tunisia',
      recovery_action: row.recovery_action || 'No recovery action recorded.',
      recovery_duration_weeks: row.recovery_duration_weeks || 0,
      soil_data: {
        ph: row.ph,
        moisture: row.soil_moisture,
        temperature: row.temperature,
        nitrogen: this.extractNutrient(row.nutrients, ['N', 'nitrogen']),
        phosphorus: this.extractNutrient(row.nutrients, ['P', 'phosphorus']),
        potassium: this.extractNutrient(row.nutrients, ['K', 'potassium']),
        soil_type: row.soil_type,
      },
      vector: this.readVectorData(row.vector_data) || undefined,
    }));

    const staticLibrary = await this.loadStaticFingerprintLibrary();
    const library = [...databaseLibrary, ...staticLibrary]
      .filter((item) => item.id !== soilMeasurementId)
      .slice(0, 500);

    if (library.length === 0) {
      return {
        vector,
        matches: [],
      };
    }

    const pythonMatches = await axios.post<{
      matches: Array<{
        similarity_score: number;
        parcel_location: string;
        recovery_action: string;
        recovery_duration_weeks: number;
        soil_data: Record<string, unknown>;
        id?: string;
        region?: string;
      }>;
    }>(
      `${this.aiServiceUrl}/soil/find-similar`,
      {
        vector,
        top_k: topK,
        library,
      },
      { timeout: 15000 },
    );

    const matches = (pythonMatches.data.matches || []).map((match) => ({
      id: match.id || '',
      similarity_score: Number(match.similarity_score || 0),
      parcel_location: match.parcel_location || 'Unknown location',
      region: (match.region as string) || 'Tunisia',
      recovery_action: match.recovery_action || 'No recovery action recorded.',
      recovery_duration_weeks: Number(match.recovery_duration_weeks || 0),
      soil_data: match.soil_data || {},
    }));

    return {
      vector,
      matches,
    };
  }

  async triggerWeatherAlert(body: Record<string, unknown>) {
    const soilMeasurementId = this.getMeasurementId(body);

    const [measurement] = await this.prisma.$queryRaw<SoilMeasurementRow[]>`
      SELECT
        id,
        parcel_id,
        ph,
        soil_moisture,
        temperature,
        nutrients,
        soil_type,
        latitude,
        longitude,
        parcel_location,
        region
      FROM soil_measurements
      WHERE id = ${soilMeasurementId}
      LIMIT 1
    `;

    if (!measurement) {
      throw new NotFoundException(`Soil measurement ${soilMeasurementId} not found`);
    }

    const parcelId =
      this.toStringValue(body.parcelId) ||
      this.toStringValue(body.parcel_id) ||
      measurement.parcel_id;

    if (!parcelId) {
      throw new BadRequestException('parcelId is required (or the soil measurement must already have parcel_id).');
    }

    const lat = Number.isFinite(measurement.latitude)
      ? Number(measurement.latitude)
      : 36.8065;
    const lon = Number.isFinite(measurement.longitude)
      ? Number(measurement.longitude)
      : 10.1815;

    const weatherSummary = await this.fetchWeatherSummary(lat, lon);
    const soilSummary = {
      moisture: measurement.soil_moisture,
      ph: measurement.ph,
      temperature: measurement.temperature,
    };

    const aiResponse = await axios.post<{ alerts: Array<Record<string, unknown>> }>(
      `${this.aiServiceUrl}/soil/weather-alert`,
      {
        parcel_id: parcelId,
        soil: soilSummary,
        weather: weatherSummary,
      },
      { timeout: 12000 },
    );

    const alerts = Array.isArray(aiResponse.data?.alerts) ? aiResponse.data.alerts : [];
    if (alerts.length === 0) {
      return {
        alerts: [],
        weather: weatherSummary,
      };
    }

    const insertedAlerts: AlertRow[] = [];

    for (const alert of alerts) {
      const type = this.toStringValue(alert.type) || 'UNKNOWN';
      const severity = (this.toStringValue(alert.severity) || 'LOW').toUpperCase();
      const message = this.toStringValue(alert.message) || 'Alert generated';
      const action = this.toStringValue(alert.action) || null;

      const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM soil_weather_alerts
        WHERE parcel_id = ${parcelId}
          AND soil_measurement_id = ${soilMeasurementId}
          AND alert_type = ${type}
          AND severity = ${severity}
          AND message = ${message}
          AND is_read = FALSE
          AND triggered_at >= NOW() - INTERVAL '6 hours'
        LIMIT 1
      `;

      if (existing.length > 0) {
        continue;
      }

      const [inserted] = await this.prisma.$queryRaw<AlertRow[]>`
        INSERT INTO soil_weather_alerts (
          parcel_id,
          soil_measurement_id,
          alert_type,
          severity,
          message,
          action,
          weather_data,
          soil_data
        )
        VALUES (
          ${parcelId},
          ${soilMeasurementId},
          ${type},
          ${severity},
          ${message},
          ${action},
          ${JSON.stringify(weatherSummary)}::jsonb,
          ${JSON.stringify(soilSummary)}::jsonb
        )
        RETURNING
          id,
          parcel_id,
          soil_measurement_id,
          alert_type,
          severity,
          message,
          action,
          weather_data,
          soil_data,
          triggered_at,
          is_read
      `;

      if (inserted) {
        insertedAlerts.push(inserted);
        this.notifyParcelOwnerSoilAlert(parcelId, inserted).catch((error) => {
          this.logger.warn(`Failed to send soil alert push notification: ${error}`);
        });
      }
    }

    return {
      alerts: insertedAlerts.map((alert) => this.mapAlert(alert)),
      weather: weatherSummary,
    };
  }

  async getUnreadAlerts(parcelId: string) {
    if (!parcelId) {
      throw new BadRequestException('parcelId is required.');
    }

    const alerts = await this.prisma.$queryRaw<AlertRow[]>`
      SELECT
        id,
        parcel_id,
        soil_measurement_id,
        alert_type,
        severity,
        message,
        action,
        weather_data,
        soil_data,
        triggered_at,
        is_read
      FROM soil_weather_alerts
      WHERE parcel_id = ${parcelId}
        AND is_read = FALSE
      ORDER BY
        CASE severity
          WHEN 'CRITICAL' THEN 4
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 1
          ELSE 0
        END DESC,
        triggered_at DESC
    `;

    return alerts.map((alert) => this.mapAlert(alert));
  }

  async markAlertAsRead(alertId: string) {
    const [updated] = await this.prisma.$queryRaw<AlertRow[]>`
      UPDATE soil_weather_alerts
      SET is_read = TRUE
      WHERE id = ${alertId}
      RETURNING
        id,
        parcel_id,
        soil_measurement_id,
        alert_type,
        severity,
        message,
        action,
        weather_data,
        soil_data,
        triggered_at,
        is_read
    `;

    if (!updated) {
      throw new NotFoundException(`Alert ${alertId} not found.`);
    }

    return this.mapAlert(updated);
  }

  private async fetchWeatherSummary(lat: number, lon: number) {
    if (!this.openWeatherApiKey) {
      throw new BadRequestException('OPENWEATHER_API_KEY is missing in environment variables.');
    }

    const response = await axios.get<{ list: Array<Record<string, any>> }>(
      'https://api.openweathermap.org/data/2.5/forecast',
      {
        params: {
          lat,
          lon,
          units: 'metric',
          appid: this.openWeatherApiKey,
        },
        timeout: 15000,
      },
    );

    const entries = Array.isArray(response.data?.list)
      ? response.data.list.slice(0, 16)
      : [];

    if (entries.length === 0) {
      this.logger.warn('OpenWeather returned no forecast entries. Falling back to neutral weather defaults.');
      return {
        rain_mm_48h: 0,
        temp_forecast_max: 28,
        temp_forecast_min: 18,
        wind_speed: 0,
      };
    }

    let rain48h = 0;
    let maxTemp = Number.NEGATIVE_INFINITY;
    let minTemp = Number.POSITIVE_INFINITY;
    let maxWind = 0;

    for (const item of entries) {
      const rain3h = this.toNumber(item?.rain?.['3h'], 0);
      const tempMax = this.toNumber(item?.main?.temp_max, this.toNumber(item?.main?.temp, 0));
      const tempMin = this.toNumber(item?.main?.temp_min, this.toNumber(item?.main?.temp, 0));
      const wind = this.toNumber(item?.wind?.speed, 0);

      rain48h += rain3h;
      maxTemp = Math.max(maxTemp, tempMax);
      minTemp = Math.min(minTemp, tempMin);
      maxWind = Math.max(maxWind, wind);
    }

    return {
      rain_mm_48h: Number(rain48h.toFixed(2)),
      temp_forecast_max: Number(maxTemp.toFixed(2)),
      temp_forecast_min: Number(minTemp.toFixed(2)),
      wind_speed: Number(maxWind.toFixed(2)),
    };
  }

  private mapAlert(alert: AlertRow) {
    return {
      id: alert.id,
      parcel_id: alert.parcel_id,
      soil_measurement_id: alert.soil_measurement_id,
      type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      action: alert.action,
      weather_data: alert.weather_data,
      soil_data: alert.soil_data,
      triggered_at: alert.triggered_at,
      is_read: alert.is_read,
    };
  }

  private getMeasurementId(body: Record<string, unknown>): string {
    const measurementId =
      this.toStringValue(body.soilMeasurementId) ||
      this.toStringValue(body.soil_measurement_id) ||
      this.toStringValue(body.measurementId);

    if (!measurementId) {
      throw new BadRequestException('soilMeasurementId is required.');
    }

    return measurementId;
  }

  private getTopK(body: Record<string, unknown>): number {
    const raw = this.toNumber(body.topK, this.toNumber(body.top_k, 3));
    const topK = Math.floor(raw);
    if (!Number.isFinite(topK) || topK < 1) {
      return 3;
    }
    return Math.min(topK, 10);
  }

  private toVectorLiteral(vector: number[]): string {
    return `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
  }

  private readVectorData(value: unknown): number[] | null {
    if (Array.isArray(value) && value.length === 7) {
      return value.map((item) => Number(item));
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length === 7) {
          return parsed.map((item) => Number(item));
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async loadStaticFingerprintLibrary(): Promise<FingerprintLibraryItem[]> {
    try {
      const raw = await readFile(this.fingerprintLibraryFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;

      const rows = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)
          ? (parsed as { items: unknown[] }).items
          : [];

      return rows
        .map((row, index) => this.normalizeStaticLibraryRow(row, index))
        .filter((row): row is FingerprintLibraryItem => row !== null);
    } catch (error) {
      this.logger.warn(
        `Static fingerprint library could not be loaded from ${this.fingerprintLibraryFilePath}. ` +
          `Fallback will use database-only history.`,
      );
      return [];
    }
  }

  private normalizeStaticLibraryRow(row: unknown, index: number): FingerprintLibraryItem | null {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const value = row as Record<string, unknown>;
    const soilDataCandidate =
      (value.soil_data as Record<string, unknown> | undefined) ||
      (value.soilData as Record<string, unknown> | undefined);

    const soilData: Record<string, unknown> = soilDataCandidate && typeof soilDataCandidate === 'object'
      ? soilDataCandidate
      : {
          ph: this.toNumber(value.ph, 6.5),
          moisture: this.toNumber(value.moisture, 40),
          temperature: this.toNumber(value.temperature, 25),
          nitrogen: this.toNumber(value.nitrogen, 0),
          phosphorus: this.toNumber(value.phosphorus, 0),
          potassium: this.toNumber(value.potassium, 0),
          soil_type: this.toStringValue(value.soil_type) || this.toStringValue(value.soilType) || 'Sandy',
        };

    return {
      id: this.toStringValue(value.id) || `static-${index + 1}`,
      parcel_location:
        this.toStringValue(value.parcel_location) ||
        this.toStringValue(value.parcelLocation) ||
        'Unknown location',
      region: this.toStringValue(value.region) || 'Tunisia',
      recovery_action:
        this.toStringValue(value.recovery_action) ||
        this.toStringValue(value.recoveryAction) ||
        'No recovery action recorded.',
      recovery_duration_weeks: Math.max(
        0,
        Math.floor(
          this.toNumber(value.recovery_duration_weeks, this.toNumber(value.recoveryDurationWeeks, 0)),
        ),
      ),
      soil_data: soilData,
      vector:
        this.readVectorData(value.vector) ||
        this.readVectorData(value.vector_data) ||
        undefined,
    };
  }

  private async hasVectorSupport(): Promise<boolean> {
    if (this.vectorSupportChecked) {
      return this.vectorSupported;
    }

    try {
      const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
        SELECT (
          EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
          AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'soil_measurements'
              AND column_name = 'vector'
          )
        ) AS ok
      `;
      this.vectorSupported = rows[0]?.ok === true;
    } catch {
      this.vectorSupported = false;
    }

    this.vectorSupportChecked = true;
    return this.vectorSupported;
  }

  private extractNutrient(
    nutrients: Record<string, unknown> | null,
    keys: string[],
  ): number {
    if (!nutrients || typeof nutrients !== 'object') {
      return 0;
    }

    for (const key of keys) {
      const value = nutrients[key];
      if (value !== undefined && value !== null) {
        return this.toNumber(value, 0);
      }
    }

    return 0;
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toStringValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async notifyParcelOwnerSoilAlert(parcelId: string, alert: AlertRow): Promise<void> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      select: {
        farmer: {
          select: {
            id: true,
            fcmToken: true,
          },
        },
      },
    });

    const token = parcel?.farmer?.fcmToken;
    if (!token) {
      this.logger.warn(`No FCM token for parcel owner of parcel ${parcelId}; skipping soil push.`);
      return;
    }

    await this.notificationService.sendSoilWeatherAlert(token, {
      alertId: alert.id,
      parcelId,
      severity: alert.severity,
      alertType: alert.alert_type,
      message: alert.message,
      action: alert.action,
    });
  }
}
