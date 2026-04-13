import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Updated comment text',
    required: true,
  })
  @IsString()
  @MinLength(1)
  content: string;
}
