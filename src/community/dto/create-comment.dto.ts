import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great advice, thanks for sharing this.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    description: 'Parent comment id when creating a reply',
    example: 'a4d95f0b-19fd-42cc-9fd5-2f6f81717b6b',
  })
  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
