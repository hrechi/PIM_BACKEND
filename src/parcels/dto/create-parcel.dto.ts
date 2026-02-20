import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateParcelDto {
    @IsString()
    location: string;

    @IsNumber()
    @IsPositive()
    areaSize: number;

    @IsString()
    boundariesDescription: string;

    @IsString()
    soilType: string;

    @IsOptional()
    @IsNumber()
    soilPh?: number;

    @IsOptional()
    @IsNumber()
    nitrogenLevel?: number;

    @IsOptional()
    @IsNumber()
    phosphorusLevel?: number;

    @IsOptional()
    @IsNumber()
    potassiumLevel?: number;

    @IsString()
    waterSource: string;

    @IsString()
    irrigationMethod: string;

    @IsString()
    irrigationFrequency: string;
}

