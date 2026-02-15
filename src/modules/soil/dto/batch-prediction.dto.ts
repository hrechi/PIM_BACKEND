import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for batch prediction request
 */
export class BatchPredictionDto {
  @ApiProperty({
    description: 'Array of soil measurement UUIDs for batch prediction',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  measurementIds: string[];
}
