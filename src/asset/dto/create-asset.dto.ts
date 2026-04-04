import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: 'John Deere X350', description: 'Asset display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Machinery', description: 'Asset category (e.g., Machinery, Drones, Tools)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category: string;

  @ApiPropertyOptional({ enum: AssetStatus, example: AssetStatus.AVAILABLE, description: 'Current asset status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ example: '/uploads/assets/tractor.jpg', description: 'Optional asset image URL/path' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ example: 'JD-X350-2026-0001', description: 'Unique serial number per farm account' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  serial_number: string;

  @ApiPropertyOptional({ example: '2026-03-21T00:00:00.000Z', description: 'Last service date in ISO format' })
  @IsOptional()
  @IsDateString()
  last_service_date?: string;

  @ApiPropertyOptional({ example: '2f84d53e-c76e-4708-925f-0f8d017becf5', description: 'Optional WhitelistStaff id to assign this asset to' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Field ID to assign this asset to' })
  @IsString()
  @IsOptional()
  field_id?: string;
}
