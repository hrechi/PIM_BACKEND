import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, IsIn, IsEnum } from 'class-validator';

export class QuerySoilDto {
  // Pagination
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // Filtering
  @ApiPropertyOptional({
    description: 'Minimum pH value',
    minimum: 0,
    maximum: 14,
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPh?: number;

  @ApiPropertyOptional({
    description: 'Maximum pH value',
    minimum: 0,
    maximum: 14,
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPh?: number;

  @ApiPropertyOptional({
    description: 'Minimum soil moisture',
    minimum: 0,
    maximum: 100,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minMoisture?: number;

  @ApiPropertyOptional({
    description: 'Maximum soil moisture',
    minimum: 0,
    maximum: 100,
    example: 70,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxMoisture?: number;

  @ApiPropertyOptional({
    description: 'Minimum temperature',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minTemperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum temperature',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxTemperature?: number;

  // Sorting
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'ph', 'soilMoisture', 'temperature'],
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'ph', 'soilMoisture', 'temperature'])
  sortBy?: 'createdAt' | 'ph' | 'soilMoisture' | 'temperature' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
