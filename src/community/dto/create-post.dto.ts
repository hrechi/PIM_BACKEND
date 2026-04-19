import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'Post content (optional for vote posts)',
    example: 'Anyone tried drip irrigation for tomatoes this week?',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Poll question (required when creating a vote post)',
    example: 'Which crop should I try next season?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pollQuestion?: string;

  @ApiPropertyOptional({
    description: 'Poll options (2 to 6 options). Presence creates a vote post.',
    type: [String],
    example: ['Tomatoes', 'Peppers', 'Cucumbers'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pollOptions?: string[];

  @ApiPropertyOptional({
    description: 'Poll end date in ISO format',
    example: '2026-04-05T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  pollEndsAt?: string;
}
