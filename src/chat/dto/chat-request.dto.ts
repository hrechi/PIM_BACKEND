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

  @ApiProperty({
    description:
      'Preferred BCP-47 language for voice responses (ar-TN, ar-SA, fr-FR, en-US)',
    required: false,
  })
  @IsString()
  @IsOptional()
  languageCode?: string;
}
