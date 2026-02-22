import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFieldDto {
  @ApiProperty({ example: 'Field A', description: 'Name of the field' })
  @IsNotEmpty({ message: 'Field name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Wheat', description: 'Type of crop' })
  @IsOptional()
  @IsString()
  cropType?: string;

  @ApiProperty({
    example: '[[10.1234, 20.5678], [10.1235, 20.5679], [10.1236, 20.5680], [10.1237, 20.5681]]',
    description: 'GeoJSON coordinates array [[lat, lng], ...]',
  })
  @IsNotEmpty({ message: 'Area coordinates are required' })
  @IsArray()
  areaCoordinates: number[][];

  @ApiPropertyOptional({ example: 50000, description: 'Area size in square meters' })
  @IsOptional()
  areaSize?: number;
}
