import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly weatherServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.weatherServiceUrl =
      this.configService.get<string>('WEATHER_SERVICE_URL') ||
      'http://localhost:5000';
  }

  /**
   * Compute the centroid (average lat/lng) of a polygon's coordinates. 
   * areaCoordinates is stored as [[lat, lng], [lat, lng], ...]
   */
  private computeCentroid(areaCoordinates: number[][]): { lat: number; lng: number } {
    if (!areaCoordinates || areaCoordinates.length === 0) {
      throw new Error('Field has no area coordinates');
    }

    let totalLat = 0;
    let totalLng = 0;

    for (const coord of areaCoordinates) {
      totalLat += coord[0];
      totalLng += coord[1];
    }

    return {
      lat: totalLat / areaCoordinates.length,
      lng: totalLng / areaCoordinates.length,
    };
  }

  /**
   * Fetch and validate a field, ensuring it belongs to the requesting user.
   */
  private async getFieldForUser(fieldId: string, userId: string) {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.userId !== userId) {
      throw new ForbiddenException('You do not have access to this field');
    }

    return field;
  }

  /**
   * Get 7-day weather forecast for a field's location.
   */
  async getWeatherForField(fieldId: string, userId: string) {
    const field = await this.getFieldForUser(fieldId, userId);
    const coords = field.areaCoordinates as number[][];
    const centroid = this.computeCentroid(coords);

    this.logger.log(
      `Fetching weather for field "${field.name}" at (${centroid.lat}, ${centroid.lng})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.weatherServiceUrl}/weather`, {
          params: { lat: centroid.lat, lng: centroid.lng },
          timeout: 15000,
        }),
      );

      return {
        ...data,
        field: {
          id: field.id,
          name: field.name,
          cropType: field.cropType,
        },
      };
    } catch (error) {
      this.logger.error(`Weather service error: ${error.message}`);
      throw new Error(
        `Failed to fetch weather data: ${error.message}`,
      );
    }
  }

  /**
   * Get AI-powered agricultural recommendations for a field.
   */
  async getRecommendations(fieldId: string, userId: string) {
    const field = await this.getFieldForUser(fieldId, userId);
    const coords = field.areaCoordinates as number[][];
    const centroid = this.computeCentroid(coords);

    this.logger.log(
      `Generating recommendations for field "${field.name}" (crop: ${field.cropType || 'unknown'})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.weatherServiceUrl}/recommendations`,
          {
            lat: centroid.lat,
            lng: centroid.lng,
            cropType: field.cropType,
            fieldName: field.name,
          },
          { timeout: 30000 },
        ),
      );

      return {
        ...data,
        field: {
          id: field.id,
          name: field.name,
          cropType: field.cropType,
        },
      };
    } catch (error) {
      this.logger.error(`Recommendation service error: ${error.message}`);
      throw new Error(
        `Failed to generate recommendations: ${error.message}`,
      );
    }
  }
}
