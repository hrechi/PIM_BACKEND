import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class EndSessionDto {
  @IsString()
  @IsNotEmpty()
  usageLogId: string;

  @IsNumber()
  @IsOptional()
  endMileage?: number;

  @IsNumber()
  @IsOptional()
  endOperatingHours?: number;

  @IsNumber()
  @IsOptional()
  fuelLevel?: number;

  @IsString()
  @IsOptional()
  conditionNote?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
