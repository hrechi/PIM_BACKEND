import { IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type CropDecision =
  | 'CAN_PLANT'
  | 'CAN_PLANT_WITH_IMPROVEMENT'
  | 'CANNOT_PLANT';

export type PhStatus = 'ACIDIC' | 'NEUTRAL' | 'ALKALINE';
export type NutrientStatus = 'BALANCED' | 'DEFICIENT';
export type OverallSuitability = 'SUITABLE' | 'LIMITED' | 'POOR';

export class SoilProfileDto {
  @IsNumber()
  soilHealthScore: number;

  @IsNumber()
  fertilityIndex: number;

  @IsString()
  phStatus: PhStatus;

  @IsString()
  nutrientStatus: NutrientStatus;
}

export class CropAnalysisItemDto {
  @IsString()
  crop: string;

  @IsNumber()
  probability: number;

  @IsString()
  decision: CropDecision;

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class AnalyzeExistingCropsResponseDto {
  @ValidateNested()
  @Type(() => SoilProfileDto)
  soilProfile: SoilProfileDto;

  @IsArray()
  cropsAnalysis: CropAnalysisItemDto[];

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class RecommendedCropDto {
  @IsString()
  crop: string;

  probability: number;

  @IsString()
  decision: CropDecision;
}

export class RecommendCropsResponseDto {
  @ValidateNested()
  @Type(() => SoilProfileDto)
  soilProfile: SoilProfileDto;

  @IsArray()
  recommendedCrops: RecommendedCropDto[];

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}
