import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsNumber()
  @IsOptional()
  startMileage?: number;

  @IsNumber()
  @IsOptional()
  startOperatingHours?: number;

  @IsString()
  @IsOptional()
  taskType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
