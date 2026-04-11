import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class SellAnimalDto {
    @IsNumber()
    salePrice: number;

    @IsDateString()
    saleDate: string;

    @IsOptional()
    @IsString()
    buyerName?: string;

    @IsOptional()
    @IsNumber()
    saleWeightKg?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}
