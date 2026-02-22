import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum MissionType {
  PLANTING = 'PLANTING',
  WATERING = 'WATERING',
  FERTILIZING = 'FERTILIZING',
  PESTICIDE = 'PESTICIDE',
  HARVESTING = 'HARVESTING',
  OTHER = 'OTHER',
}

enum MissionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

enum MissionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateMissionDto {
  @ApiProperty({ example: 'field-uuid-123', description: 'Field ID' })
  @IsNotEmpty({ message: 'Field ID is required' })
  @IsString()
  fieldId: string;

  @ApiProperty({ example: 'Spring Planting', description: 'Mission title' })
  @IsNotEmpty({ message: 'Mission title is required' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Plant wheat seeds in the north section' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'PLANTING', description: 'Type of mission' })
  @IsOptional()
  @IsEnum(MissionType)
  missionType?: MissionType = MissionType.OTHER;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus = MissionStatus.PENDING;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsEnum(MissionPriority)
  priority?: MissionPriority = MissionPriority.MEDIUM;

  @ApiPropertyOptional({ example: '2024-02-29T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 480, description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ example: 'Coordinate with farm team' })
  @IsOptional()
  @IsString()
  notes?: string;
}
