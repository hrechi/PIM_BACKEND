import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);
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
   * Generate a 7-day smart irrigation schedule for a field.
   * Calls the Python microservice which fetches weather + runs Groq LLM.
   */
  async generateSchedule(fieldId: string, userId: string) {
    const field = await this.getFieldForUser(fieldId, userId);
    const coords = field.areaCoordinates as number[][];
    const centroid = this.computeCentroid(coords);

    this.logger.log(
      `Generating irrigation schedule for field "${field.name}" at (${centroid.lat}, ${centroid.lng})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.weatherServiceUrl}/irrigation-schedule`,
          {
            lat: centroid.lat,
            lng: centroid.lng,
            cropType: field.cropType,
            fieldName: field.name,
            areaSize: field.areaSize,
          },
          { timeout: 45000 },
        ),
      );

      return {
        ...data,
        field: {
          id: field.id,
          name: field.name,
          cropType: field.cropType,
          areaSize: field.areaSize,
        },
      };
    } catch (error) {
      this.logger.error(`Irrigation service error: ${error.message}`);
      throw new Error(
        `Failed to generate irrigation schedule: ${error.message}`,
      );
    }
  }
}
