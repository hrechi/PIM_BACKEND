import { IsString, IsNumber, IsOptional, IsPositive, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCropDto {
    @IsString()
    cropName: string;

    @IsString()
    variety: string;

    @IsDateString()
    plantingDate: string;

    @IsDateString()
    expectedHarvestDate: string;
}

export class CreateFertilizationDto {
    @IsString()
    fertilizerType: string;

    @IsNumber()
    @IsPositive()
    quantityUsed: number;

    @IsDateString()
    applicationDate: string;
}

export class CreatePestDiseaseDto {
    @IsOptional()
    @IsString()
    issueType?: string;

    @IsOptional()
    @IsString()
    treatmentUsed?: string;

    @IsOptional()
    @IsDateString()
    treatmentDate?: string;
}

export class CreateHarvestDto {
    @IsOptional()
    @IsDateString()
    harvestDate?: string;

    @IsOptional()
    @IsNumber()
    totalYield?: number;

    @IsOptional()
    @IsNumber()
    yieldPerHectare?: number;
}
