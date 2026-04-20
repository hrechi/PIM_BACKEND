import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsUUID,
  IsString,
} from 'class-validator';

export class CreateSoilDto {
  @ApiProperty({
    description: 'Soil pH level',
    minimum: 0,
    maximum: 14,
    example: 6.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'pH must be between 0 and 14' })
  @Max(14, { message: 'pH must be between 0 and 14' })
  ph: number;

  @ApiProperty({
    description: 'Soil moisture percentage',
    minimum: 0,
    maximum: 100,
    example: 45.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Soil moisture must be between 0 and 100' })
  @Max(100, { message: 'Soil moisture must be between 0 and 100' })
  soilMoisture: number;

  @ApiProperty({
    description: 'Sunlight intensity',
    example: 850.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  sunlight: number;

  @ApiProperty({
    description: 'Soil nutrients as JSON object',
    example: { nitrogen: 20, phosphorus: 15, potassium: 25 },
  })
  @IsNotEmpty()
  @IsObject()
  nutrients: Record<string, any>;

  @ApiProperty({
    description: 'Temperature in Celsius',
    example: 22.5,
  })
  @IsNotEmpty()
  @IsNumber()
  temperature: number;

  @ApiProperty({
    description: 'Latitude coordinate',
    minimum: -90,
    maximum: 90,
    example: 40.7128,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    minimum: -180,
    maximum: 180,
    example: -74.006,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  longitude: number;

  @ApiProperty({
    description: 'Field ID this measurement belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Field ID must be a valid UUID' })
  fieldId?: string;

  @ApiProperty({
    description: 'Parcel ID this measurement belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Parcel ID must be a string' })
  parcelId?: string;

  @ApiProperty({
    description: 'Path to uploaded soil image',
    example: 'uploads/soil/soil-1234567890-xyz.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiProperty({
    description: 'Detected soil type from image analysis',
    example: 'Loam',
    required: false,
  })
  @IsOptional()
  @IsString()
  soilType?: string;

  @ApiProperty({
    description: 'Confidence score of soil type detection (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.85,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  detectionConfidence?: number;
}
