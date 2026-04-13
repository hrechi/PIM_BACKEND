import { IsOptional, IsString, IsArray, IsNumber, IsIn } from 'class-validator';
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

  //Ajouter pour le module finance : la monnaie utilisée pour ce champ


  @ApiPropertyOptional({ 
    example: 'TND', 
    description: 'Currency code (ISO 4217)',
    enum: ['TND', 'MAD', 'DZD', 'EUR', 'GBP', 'CHF', 'USD', 'CAD', 'BRL', 'ARS', 'AUD', 'INR', 'CNY', 'TRY']
  })
  @IsOptional()
  @IsString()
  @IsIn(['TND', 'MAD', 'DZD', 'EUR', 'GBP', 'CHF', 'USD', 'CAD', 'BRL', 'ARS', 'AUD', 'INR', 'CNY', 'TRY'])
  currency?: string;
}
