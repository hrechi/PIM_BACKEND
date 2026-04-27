import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum SessionCondition {
  GOOD = 'GOOD',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export class EndAssetSessionDto {
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @IsString()
  @IsOptional()
  issues?: string;

  @IsString()
  @IsOptional()
  maintenanceNote?: string;

  @IsEnum(SessionCondition)
  condition: SessionCondition;
}
