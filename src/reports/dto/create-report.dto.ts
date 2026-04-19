import { IsNotEmpty, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Summary must not be empty' })
  summary: string;

  @IsInt()
  @Min(0, { message: 'totalIncidents must be a positive number' })
  totalIncidents: number;

  @IsInt()
  @Min(0, { message: 'criticalAlerts must be a positive number' })
  criticalAlerts: number;

  @IsInt()
  @Min(0, { message: 'peakActivityHour must be between 0 and 23' })
  @Max(23, { message: 'peakActivityHour must be between 0 and 23' })
  peakActivityHour: number;

  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'], {
    message: 'averageThreatLevel must be one of: low, medium, high, critical',
  })
  averageThreatLevel: string;
}
