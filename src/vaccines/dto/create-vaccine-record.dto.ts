import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';

export class CreateVaccineRecordDto {
    @IsString()
    animalId: string;

    @IsString()
    vaccineCode: string;

    @IsString()
    administeredBy: string;

    @IsDateString()
    administeredAt: string;

    @IsNumber()
    doseGiven: number;

    @IsOptional()
    @IsString()
    doseUnit?: string;

    @IsOptional()
    @IsString()
    lotNumber?: string;

    @IsOptional()
    @IsNumber()
    bodyWeight?: number;

    @IsOptional()
    @IsString()
    scheduleId?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
