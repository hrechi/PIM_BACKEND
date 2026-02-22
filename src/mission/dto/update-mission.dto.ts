import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

export class UpdateMissionDto {
  @ApiPropertyOptional({ example: 'Spring Planting Updated' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'PLANTING' })
  @IsOptional()
  @IsEnum(MissionType)
  missionType?: MissionType;

  @ApiPropertyOptional({ example: 'IN_PROGRESS' })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsEnum(MissionPriority)
  priority?: MissionPriority;

  @ApiPropertyOptional({ example: '2024-02-29T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  actualDuration?: number;

  @ApiPropertyOptional({ example: 50, description: 'Progress percentage 0-100' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
