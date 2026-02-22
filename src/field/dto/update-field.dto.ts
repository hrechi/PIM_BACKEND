import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFieldDto {
  @ApiPropertyOptional({ example: 'Field A Updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Wheat' })
  @IsOptional()
  @IsString()
  cropType?: string;

  @ApiPropertyOptional({ example: '[[10.1234, 20.5678], [10.1235, 20.5679]]' })
  @IsOptional()
  @IsArray()
  areaCoordinates?: number[][];

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  areaSize?: number;
}
