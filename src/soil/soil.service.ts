import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SoilMeasurement } from './soil.entity';
import { CreateSoilDto } from './dto/create-soil.dto';
import { UpdateSoilDto } from './dto/update-soil.dto';
import { QuerySoilDto } from './dto/query-soil.dto';
import { PhStatus, MoistureStatus } from './enums';
import { SoilMeasurementWithStatus, PaginatedResponse } from './interfaces';
import * as fs from 'fs';
import axios from 'axios';
import FormData = require('form-data');

@Injectable()
export class SoilService {
  private readonly logger = new Logger(SoilService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(SoilMeasurement)
    private readonly soilRepository: Repository<SoilMeasurement>,
  ) {
    // Ensure URL doesn't end with slash to avoid double slashes
    const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.aiServiceUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.logger.log(`🤖 AI Service URL configured: ${this.aiServiceUrl}`);
  }

  /**
   * Create a new soil measurement
   */
  async create(
    createSoilDto: CreateSoilDto,
  ): Promise<SoilMeasurementWithStatus> {
    try {
      const measurement = this.soilRepository.create(createSoilDto);
      const savedMeasurement = await this.soilRepository.save(measurement);
      return this.enrichWithStatus(savedMeasurement);
    } catch (error) {
      throw new HttpException(
        'Failed to create soil measurement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create soil measurement with image classification
   * Calls AI service to detect soil type from photo
   */
  async createWithImage(
    createSoilDto: CreateSoilDto,
    imagePath: string,
    imageFilePath: string,
  ): Promise<SoilMeasurementWithStatus> {
    try {
      // Call AI service to classify soil image
      let soilType = 'Unknown';
      let detectionConfidence = 0.0;
      let estimatedPh = createSoilDto.ph;
      let estimatedMoisture = createSoilDto.soilMoisture;

      try {
        this.logger.log('Calling AI service to classify soil image...');

        // Read image file and create form data
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imageFilePath));

        const fullUrl = `${this.aiServiceUrl}/classify-soil-image`;
        this.logger.log(`📡 Calling AI endpoint: ${fullUrl}`);

        const response = await axios.post(fullUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 15000, // 15 second timeout
        });

        const aiResult = response.data;
        this.logger.log(
          `✅ AI Classification result: ${JSON.stringify(aiResult)}`,
        );

        soilType = aiResult.soilType || 'Unknown';
        detectionConfidence = aiResult.confidence || 0.0;

        // Use AI estimates if values weren't manually provided or if confidence is high
        if (detectionConfidence >= 0.7) {
          // Only suggest values if confidence is high enough
          if (!createSoilDto.ph && aiResult.estimatedPh) {
            estimatedPh = aiResult.estimatedPh;
          }
          if (!createSoilDto.soilMoisture && aiResult.estimatedMoisture) {
            estimatedMoisture = aiResult.estimatedMoisture;
          }
        }
      } catch (aiError) {
        this.logger.error(
          `❌ AI service classification failed: ${aiError.message}`,
        );
        if (aiError.response) {
          this.logger.error(`Response status: ${aiError.response.status}`);
          this.logger.error(
            `Response data: ${JSON.stringify(aiError.response.data)}`,
          );
        }
        if (aiError.code === 'ECONNREFUSED') {
          this.logger.error(
            `⚠️ Cannot connect to AI service at ${this.aiServiceUrl}`,
          );
        }
        // Continue with Unknown soil type - don't fail the whole request
      }

      // Create measurement with AI-detected soil type
      const measurementData = {
        ...createSoilDto,
        imagePath,
        soilType,
        detectionConfidence,
        // Use estimated values only if not provided by user
        ph: createSoilDto.ph || estimatedPh,
        soilMoisture: createSoilDto.soilMoisture || estimatedMoisture,
      };

      const measurement = this.soilRepository.create(measurementData);
      const savedMeasurement = await this.soilRepository.save(measurement);

      this.logger.log(
        `✅ Soil measurement created with type: ${soilType} (confidence: ${detectionConfidence})`,
      );
      this.logger.log(
        `📊 Saved measurement data: ${JSON.stringify({
          id: savedMeasurement.id,
          soilType: savedMeasurement.soilType,
          detectionConfidence: savedMeasurement.detectionConfidence,
          imagePath: savedMeasurement.imagePath,
        })}`,
      );

      const enriched = this.enrichWithStatus(savedMeasurement);
      this.logger.log(
        `📤 Returning to client: soilType=${enriched.soilType}, confidence=${enriched.detectionConfidence}`,
      );

      return enriched;
    } catch (error) {
      this.logger.error('Failed to create soil measurement with image:', error);
      throw new HttpException(
        'Failed to create soil measurement with image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all soil measurements with advanced filtering, pagination, and sorting
   */
  async findAll(
    query: QuerySoilDto,
  ): Promise<PaginatedResponse<SoilMeasurementWithStatus>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'DESC';

    const skip = (page - 1) * limit;

    // Build dynamic where clause for filtering
    const whereClause: any = {};

    // pH filtering
    if (query.minPh !== undefined && query.maxPh !== undefined) {
      whereClause.ph = Between(query.minPh, query.maxPh);
    } else if (query.minPh !== undefined) {
      whereClause.ph = MoreThanOrEqual(query.minPh);
    } else if (query.maxPh !== undefined) {
      whereClause.ph = LessThanOrEqual(query.maxPh);
    }

    // Moisture filtering
    if (query.minMoisture !== undefined && query.maxMoisture !== undefined) {
      whereClause.soilMoisture = Between(query.minMoisture, query.maxMoisture);
    } else if (query.minMoisture !== undefined) {
      whereClause.soilMoisture = MoreThanOrEqual(query.minMoisture);
    } else if (query.maxMoisture !== undefined) {
      whereClause.soilMoisture = LessThanOrEqual(query.maxMoisture);
    }

    // Temperature filtering
    if (
      query.minTemperature !== undefined &&
      query.maxTemperature !== undefined
    ) {
      whereClause.temperature = Between(
        query.minTemperature,
        query.maxTemperature,
      );
    } else if (query.minTemperature !== undefined) {
      whereClause.temperature = MoreThanOrEqual(query.minTemperature);
    } else if (query.maxTemperature !== undefined) {
      whereClause.temperature = LessThanOrEqual(query.maxTemperature);
    }

    try {
      const [measurements, total] = await this.soilRepository.findAndCount({
        where: whereClause,
        order: { [sortBy]: order } as any,
        skip,
        take: limit,
      });

      const enrichedMeasurements = measurements.map((m) =>
        this.enrichWithStatus(m),
      );

      return {
        data: enrichedMeasurements,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch soil measurements',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find the latest soil measurement (by createdAt)
   */
  async findLatest(): Promise<SoilMeasurementWithStatus> {
    const [measurement] = await this.soilRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    if (!measurement) {
      throw new NotFoundException('No soil measurements found');
    }

    return this.enrichWithStatus(measurement);
  }

  /**
   * Find a single soil measurement by ID
   */
  async findOne(id: string): Promise<SoilMeasurementWithStatus> {
    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid UUID format');
    }

    const measurement = await this.soilRepository.findOne({ where: { id } });

    if (!measurement) {
      throw new NotFoundException(`Soil measurement with ID ${id} not found`);
    }

    return this.enrichWithStatus(measurement);
  }

  /**
   * Update a soil measurement
   */
  async update(
    id: string,
    updateSoilDto: UpdateSoilDto,
  ): Promise<SoilMeasurementWithStatus> {
    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid UUID format');
    }

    const measurement = await this.soilRepository.findOne({ where: { id } });

    if (!measurement) {
      throw new NotFoundException(`Soil measurement with ID ${id} not found`);
    }

    try {
      // Merge updates
      Object.assign(measurement, updateSoilDto);
      const updatedMeasurement = await this.soilRepository.save(measurement);
      return this.enrichWithStatus(updatedMeasurement);
    } catch (error) {
      throw new HttpException(
        'Failed to update soil measurement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a soil measurement
   */
  async remove(id: string): Promise<void> {
    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid UUID format');
    }

    const measurement = await this.soilRepository.findOne({ where: { id } });

    if (!measurement) {
      throw new NotFoundException(`Soil measurement with ID ${id} not found`);
    }

    try {
      await this.soilRepository.remove(measurement);
    } catch (error) {
      throw new HttpException(
        'Failed to delete soil measurement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enrich measurement with computed status fields
   */
  private enrichWithStatus(
    measurement: SoilMeasurement,
  ): SoilMeasurementWithStatus {
    return {
      ...measurement,
      phStatus: this.calculatePhStatus(measurement.ph),
      moistureStatus: this.calculateMoistureStatus(measurement.soilMoisture),
    };
  }

  /**
   * Calculate pH status based on pH value
   * Acidic: < 6.5
   * Neutral: 6.5 - 7.5
   * Alkaline: > 7.5
   */
  private calculatePhStatus(ph: number): PhStatus {
    if (ph < 6.5) {
      return PhStatus.ACIDIC;
    } else if (ph <= 7.5) {
      return PhStatus.NEUTRAL;
    } else {
      return PhStatus.ALKALINE;
    }
  }

  /**
   * Calculate moisture status based on soil moisture percentage
   * Dry: < 30%
   * Optimal: 30% - 60%
   * Wet: > 60%
   */
  private calculateMoistureStatus(soilMoisture: number): MoistureStatus {
    if (soilMoisture < 30) {
      return MoistureStatus.DRY;
    } else if (soilMoisture <= 60) {
      return MoistureStatus.OPTIMAL;
    } else {
      return MoistureStatus.WET;
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
