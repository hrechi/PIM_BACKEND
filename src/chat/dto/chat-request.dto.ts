import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: 'User message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Conversation ID (optional, creates new conversation if not provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string;
}
