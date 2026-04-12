import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { AeroTwinService } from './aerotwin.service';

@Controller('aerotwin')
export class AeroTwinController {
  constructor(private readonly aerotwinService: AeroTwinService) {}

  @Get('ndvi')
  async getNDVI(@Query('fieldId') fieldId: string, @Query('date') date: string) {
    if (!fieldId) throw new BadRequestException("fieldId is required");
    const targetDate = date ? date : new Date().toISOString();
    return this.aerotwinService.getOrComputeNDVI(fieldId, targetDate);
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
  async simulate(@Body() body: { fieldId: string; params: { irrigationChange: number; temperature: number; nitrogenLevel: number } }) {
    if (!body.fieldId || !body.params) {
      throw new BadRequestException("fieldId and params are required");
    }
    return this.aerotwinService.simulateNDVI(body.fieldId, body.params);
  }
}
