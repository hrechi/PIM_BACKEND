import { IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';

export type CropDecision =
  | 'CAN_PLANT'
  | 'CAN_PLANT_WITH_IMPROVEMENT'
  | 'CANNOT_PLANT';

export class CropAnalysisItemDto {
  @IsString()
  crop: string;

  @IsBoolean()
  regionAllowed: boolean;

  @IsNumber()
  suitabilityScore: number;

  @IsString()
  decision: CropDecision;

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class AnalyzeExistingCropsResponseDto {
  @IsNumber()
  soilHealthScore: number;

  @IsString()
  wiltingRisk: string;

  @IsArray()
  cropsAnalysis: CropAnalysisItemDto[];
}

export class RecommendedCropDto {
  @IsString()
  crop: string;

  @IsNumber()
  suitabilityScore: number;

  @IsString()
  decision: CropDecision;

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class RecommendCropsResponseDto {
  @IsNumber()
  soilHealthScore: number;

  @IsString()
  wiltingRisk: string;

  @IsArray()
  recommendedCrops: RecommendedCropDto[];
}
