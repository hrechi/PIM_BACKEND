import { ApiProperty } from '@nestjs/swagger';

export class RecommendedCropDto {
  @ApiProperty({ description: 'Name of the recommended crop' })
  name: string;

  @ApiProperty({ description: 'Reason for recommendation' })
  reason: string;
}

export class AvoidCropDto {
  @ApiProperty({ description: 'Name of the crop to avoid' })
  name: string;

  @ApiProperty({ description: 'Reason to avoid this crop' })
  reason: string;
}

export class RotationAnalysisDto {
  @ApiProperty({ type: [RecommendedCropDto] })
  recommendedCrops: RecommendedCropDto[];

  @ApiProperty({ type: [AvoidCropDto] })
  cropsToAvoid: AvoidCropDto[];

  @ApiProperty({ description: 'Score between 0 and 100', example: 85 })
  sustainabilityScore: number;

  @ApiProperty({ description: 'Detailed explanation of the analysis' })
  explanation: string;
}
