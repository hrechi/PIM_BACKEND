import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsLatitude,
  IsLongitude,
  IsUUID,
  IsString,
} from 'class-validator';

export class UpdateSoilDto {
  @ApiPropertyOptional({
    description: 'Soil pH level',
    minimum: 0,
    maximum: 14,
    example: 6.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'pH must be between 0 and 14' })
  @Max(14, { message: 'pH must be between 0 and 14' })
  ph?: number;

  @ApiPropertyOptional({
    description: 'Soil moisture percentage',
    minimum: 0,
    maximum: 100,
    example: 45.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Soil moisture must be between 0 and 100' })
  @Max(100, { message: 'Soil moisture must be between 0 and 100' })
  soilMoisture?: number;

  @ApiPropertyOptional({
    description: 'Sunlight intensity',
    example: 850.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sunlight?: number;

  @ApiPropertyOptional({
    description: 'Soil nutrients as JSON object',
    example: { nitrogen: 20, phosphorus: 15, potassium: 25 },
  })
  @IsOptional()
  @IsObject()
  nutrients?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Temperature in Celsius',
    example: 22.5,
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    minimum: -90,
    maximum: 90,
    example: 40.7128,
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    minimum: -180,
    maximum: 180,
    example: -74.006,
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Field ID this measurement belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Field ID must be a valid UUID' })
  fieldId?: string;

  @ApiPropertyOptional({
    description: 'Parcel ID this measurement belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString({ message: 'Parcel ID must be a string' })
  parcelId?: string;

  @ApiPropertyOptional({
    description: 'Path to uploaded soil image',
    example: 'uploads/soil/soil-1234567890-xyz.jpg',
  })
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional({
    description: 'Detected soil type from image analysis',
    example: 'Loam',
  })
  @IsOptional()
  @IsString()
  soilType?: string;

  @ApiPropertyOptional({
    description: 'Confidence score of soil type detection (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.85,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  detectionConfidence?: number;
}
