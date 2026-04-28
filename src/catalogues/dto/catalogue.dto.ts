import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Prisma, CatalogueStatus } from '@prisma/client';

export class CreateSaleCatalogueDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, default: 'TND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  settings?: Prisma.JsonValue;
}

export class UpdateSaleCatalogueDto extends PartialType(CreateSaleCatalogueDto) {
  @ApiProperty({ required: false, enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const)
  status?: CatalogueStatus;
}

export class AddCatalogueAnimalsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  animalIds: string[];
}

export class UpdateCatalogueAnimalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priceOverride?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PreviewCatalogueFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minAgeMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxAgeMonths?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vaccinationStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reproductionStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tagNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFattening?: boolean;
}
