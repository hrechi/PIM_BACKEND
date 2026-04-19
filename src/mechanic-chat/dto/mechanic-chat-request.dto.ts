import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssetContextDto {
  @ApiProperty({ description: 'Asset brand (e.g., Mahindra, John Deere)' })
  @IsString()
  @IsOptional()
  brand?: string = undefined;

  @ApiProperty({ description: 'Asset model (e.g., 575 DI 50 A)' })
  @IsString()
  @IsOptional()
  model?: string = undefined;

  @ApiProperty({ description: 'Asset category (e.g., TRACTOR, HARVESTER)' })
  @IsString()
  @IsOptional()
  category?: string = undefined;
}

export class MechanicChatRequestDto {
  @ApiProperty({ description: 'User message about machinery/mechanics' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Optional asset context for more accurate answers',
    required: false,
    type: AssetContextDto,
  })
  @IsObject()
  @IsOptional()
  asset?: AssetContextDto = undefined;

  @ApiProperty({
    description: 'Conversation ID (optional, creates new conversation if not provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string = undefined;
}
