import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateVaccineScheduleDto {
  @IsString()
  animalId: string;

  @IsString()
  vaccineCode: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  recurrenceDays?: number;

  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
