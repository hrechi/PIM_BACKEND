import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePostDto {
  @ApiProperty({
    description: 'Post content (text)',
    example: 'Updated post content',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}
