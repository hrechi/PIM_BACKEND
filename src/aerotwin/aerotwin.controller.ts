import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { AeroTwinService } from './aerotwin.service';
import { IsString, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SimulationParamsDto {
  @IsNumber()
  irrigationChange: number;

  @IsNumber()
  temperature: number;

  @IsNumber()
  nitrogenLevel: number;
}

export class SimulateDto {
  @IsString()
  fieldId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SimulationParamsDto)
  params: SimulationParamsDto;
}

@Controller('aerotwin')
export class AeroTwinController {
  constructor(private readonly aerotwinService: AeroTwinService) {}

  @Get('ndvi')
  async getNDVI(@Query('fieldId') fieldId: string) {
    if (!fieldId) throw new BadRequestException("fieldId is required");
    return this.aerotwinService.getNDVI(fieldId);
  }

  @Get('history')
  async getHistory(@Query('fieldId') fieldId: string) {
    if (!fieldId) throw new BadRequestException("fieldId is required");
    return this.aerotwinService.getHistory(fieldId);
  }

  @Get('alerts')
  async getAlerts(@Query('fieldId') fieldId: string) {
    if (!fieldId) throw new BadRequestException("fieldId is required");
    return this.aerotwinService.getAlerts(fieldId);
  }

  @Post('simulate')
  async simulate(@Body() body: SimulateDto) {
    if (!body.fieldId || !body.params) {
      throw new BadRequestException("fieldId and params are required");
    }
    return this.aerotwinService.simulateNDVI(body.fieldId, body.params);
  }
}
