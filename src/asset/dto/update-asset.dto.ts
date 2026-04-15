import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAssetDto {
  @ApiPropertyOptional({ enum: AssetStatus, example: AssetStatus.IN_USE })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ example: '2f84d53e-c76e-4708-925f-0f8d017becf5', description: 'WhitelistStaff id (or null to unassign)' })
  @IsOptional()
  @IsString()
  assignedTo?: string | null;

  @ApiPropertyOptional({ example: '2026-03-21T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  last_service_date?: string;

  @ApiPropertyOptional({ example: 'John Deere' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'X350' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional()
  modelYear?: number;

  @ApiPropertyOptional({ example: 31500 })
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({ example: 5200 })
  @IsOptional()
  operatingHours?: number;
}
