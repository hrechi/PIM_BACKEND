import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SoilMeasurement } from './soil.entity';
import { CreateSoilDto } from './dto/create-soil.dto';
import { UpdateSoilDto } from './dto/update-soil.dto';
import { QuerySoilDto } from './dto/query-soil.dto';
import { PhStatus, MoistureStatus } from './enums';
import {
  SoilMeasurementWithStatus,
  PaginatedResponse,
} from './interfaces';

@Injectable()
export class SoilService {
  constructor(
    @InjectRepository(SoilMeasurement)
    private readonly soilRepository: Repository<SoilMeasurement>,
  ) {}

  /**
   * Create a new soil measurement
   */
  async create(createSoilDto: CreateSoilDto): Promise<SoilMeasurementWithStatus> {
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
    if (query.minTemperature !== undefined && query.maxTemperature !== undefined) {
      whereClause.temperature = Between(query.minTemperature, query.maxTemperature);
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
