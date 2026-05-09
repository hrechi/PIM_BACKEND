import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateMedicalEventDto {
  @IsString()
  eventType: string; // visit | disease | surgery | treatment | checkup | other

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  vetName?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
