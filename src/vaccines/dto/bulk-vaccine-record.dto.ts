import { IsString, IsArray, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class BulkVaccineRecordDto {
    @IsArray()
    @IsString({ each: true })
    animalIds: string[];

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
    lotNumber?: string;
}
